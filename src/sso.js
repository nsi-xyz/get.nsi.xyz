/**
 * sso.js — client du courtier d'authentification login.nsi.xyz.
 *
 * - Redirige vers /authorize (PKCE).
 * - Échange le code à /token, pose une session **host-only** propre au site.
 * - Vérifie le jeton **localement** contre le JWKS de login (aucun appel par requête).
 *
 * Config attendue (wrangler.json `vars` ou .dev.vars) :
 *   CLIENT_ID       : identifiant du site (ex. get-nsi-xyz)
 *   LOGIN_BASE_URL  : https://login.nsi.xyz (dev : http://localhost:8787)
 *   SITE_ORIGIN     : origine de ce site (dev : http://localhost:8790)
 */
import { createRemoteJWKSet, jwtVerify } from "jose";

const SESSION_COOKIE = "nsi_site";
const FLOW_COOKIE = "nsi_site_flow";
const ISSUER = "login.nsi.xyz";

function loginBase(env) {
	return String(env.LOGIN_BASE_URL || "https://login.nsi.xyz").replace(/\/+$/, "");
}
function siteOrigin(env, url) {
	return String(env.SITE_ORIGIN || url.origin).replace(/\/+$/, "");
}

export function parseCookies(header) {
	const out = {};
	if (!header) return out;
	for (const part of header.split(";")) {
		const i = part.indexOf("=");
		if (i === -1) continue;
		const name = part.slice(0, i).trim();
		if (!name) continue;
		try {
			out[name] = decodeURIComponent(part.slice(i + 1).trim());
		} catch {
			out[name] = part.slice(i + 1).trim();
		}
	}
	return out;
}

function serializeCookie(name, value, { maxAge, secure = false } = {}) {
	const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax", "HttpOnly"];
	if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
	if (secure) parts.push("Secure");
	return parts.join("; ");
}

function clearCookie(name, secure = false) {
	return serializeCookie(name, "", { maxAge: 0, secure });
}

function base64url(bytes) {
	let s = "";
	for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomToken(byteLength = 32) {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	return base64url(bytes);
}

async function codeChallenge(verifier) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
	return base64url(digest);
}

// JWKS mis en cache par isolate (createRemoteJWKSet gère aussi le cache HTTP).
let jwks = null;
function getJwks(env) {
	if (!jwks) jwks = createRemoteJWKSet(new URL(`${loginBase(env)}/jwks`));
	return jwks;
}

/** Renvoie les revendications de session si le jeton du site est valide, sinon null. */
export async function getSession(request, env) {
	const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
	if (!token || !env.CLIENT_ID) return null;
	try {
		const { payload } = await jwtVerify(token, getJwks(env), {
			issuer: ISSUER,
			audience: env.CLIENT_ID,
		});
		return payload;
	} catch {
		return null;
	}
}

/**
 * Gère les routes d'authentification.
 * Renvoie une `Response` si la route est reconnue, sinon `null`.
 */
export async function handleAuthRoutes(request, env) {
	const url = new URL(request.url);
	switch (`${request.method} ${url.pathname}`) {
		case "GET /_auth/login":
			return loginRedirect(env, url);
		case "GET /_auth/callback":
			return callback(request, env, url);
		case "GET /_auth/logout":
			return logout(url);
		case "GET /api/whoami":
			return whoami(request, env);
		default:
			return null;
	}
}

async function loginRedirect(env, url) {
	const secure = url.protocol === "https:";
	if (!env.CLIENT_ID) return errorPage("Site non raccordé (CLIENT_ID manquant)", 500);
	const state = randomToken();
	const verifier = randomToken();
	const redirectUri = `${siteOrigin(env, url)}/_auth/callback`;

	const auth = new URL(`${loginBase(env)}/authorize`);
	auth.searchParams.set("client_id", env.CLIENT_ID);
	auth.searchParams.set("redirect_uri", redirectUri);
	auth.searchParams.set("state", state);
	auth.searchParams.set("code_challenge", await codeChallenge(verifier));
	auth.searchParams.set("code_challenge_method", "S256");

	const flow = serializeCookie(FLOW_COOKIE, JSON.stringify({ state, verifier }), { maxAge: 600, secure });
	return new Response(null, { status: 302, headers: { location: auth.toString(), "set-cookie": flow } });
}

async function callback(request, env, url) {
	const raw = parseCookies(request.headers.get("cookie"))[FLOW_COOKIE];
	if (!raw) return errorPage("Connexion expirée", 400);
	let flow;
	try {
		flow = JSON.parse(raw);
	} catch {
		return errorPage("Session invalide", 400);
	}

	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	if (!code || !state || state !== flow.state) return errorPage("État invalide", 400);

	const redirectUri = `${siteOrigin(env, url)}/_auth/callback`;
	const res = await fetch(`${loginBase(env)}/token`, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			client_id: env.CLIENT_ID,
			redirect_uri: redirectUri,
			code_verifier: flow.verifier,
		}),
	});
	if (!res.ok) return errorPage("Échange de jeton refusé", 400);
	const data = await res.json();
	if (!data.access_token) return errorPage("Jeton absent", 400);

	const secure = url.protocol === "https:";
	const headers = new Headers();
	headers.append("set-cookie", serializeCookie(SESSION_COOKIE, data.access_token, { maxAge: 3600, secure }));
	headers.append("set-cookie", clearCookie(FLOW_COOKIE, secure));
	headers.set("location", "/");
	return new Response(null, { status: 302, headers });
}

function logout(url) {
	const secure = url.protocol === "https:";
	return new Response(null, {
		status: 302,
		headers: { location: "/", "set-cookie": clearCookie(SESSION_COOKIE, secure) },
	});
}

async function whoami(request, env) {
	const user = await getSession(request, env);
	if (!user) {
		return new Response(JSON.stringify({ authenticated: false }), {
			status: 401,
			headers: { "content-type": "application/json" },
		});
	}
	return new Response(
		JSON.stringify({
			authenticated: true,
			sub: user.sub,
			client_id: user.client_id ?? env.CLIENT_ID,
			name: user.name ?? null,
			role: user.role ?? "student",
		}),
		{ headers: { "content-type": "application/json" } }
	);
}

function errorPage(message, status) {
	return new Response(
		`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Erreur</title></head>` +
			`<body style="font-family:system-ui;padding:24px"><h1>${message}</h1><p><a href="/">Retour</a></p></body></html>`,
		{ status, headers: { "content-type": "text/html; charset=utf-8" } }
	);
}
