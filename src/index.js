/* ============================================================
   get.nsi.xyz — démonstration d'un formulaire HTTP GET
   Le calcul a lieu ICI, côté serveur (Cloudflare Worker).
   Le visiteur ne voit, dans le code source, qu'un simple HTML :
   aucun script serveur n'est exposé (comme avec PHP).
   ============================================================ */

const METHODE = "GET"; // <- "GET" pour get.nsi.xyz, "POST" pour post.nsi.xyz

/* ------------------------------------------------------------
   Feuille de style (servie sur /style.css)
   ------------------------------------------------------------ */
const CSS = `
:root { --accent: #4a5cc4; --fond: #f5f6fb; --carte: #fff; --texte: #1b1e28; --doux: #5a5f70; --bord: #e2e4ef; }
@media (prefers-color-scheme: dark) {
  :root { --accent: #b8c2ff; --fond: #10121a; --carte: #1b1e2a; --texte: #e7e9f3; --doux: #b3b8cc; --bord: #2c3040; }
}
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: var(--fond); color: var(--texte);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; padding: 24px;
  display: flex; flex-direction: column; align-items: center; gap: 16px; }
.page { width: 100%; max-width: 720px; }
h1 { font-size: clamp(1.5rem, 4vw, 2rem); margin: 0 0 4px; }
h2 { font-size: 1.15rem; margin: 24px 0 8px; }
.badge { display: inline-block; background: var(--accent); color: #fff; border-radius: 999px;
  padding: 3px 12px; font-size: .8rem; font-weight: 700; letter-spacing: .05em; vertical-align: middle; }
.carte { background: var(--carte); border: 1px solid var(--bord); border-radius: 16px; padding: 20px; }
form { display: flex; flex-direction: column; gap: 10px; max-width: 380px; }
label { font-size: .92rem; color: var(--doux); }
input[type=number] { padding: 10px 12px; border: 1px solid var(--bord); border-radius: 10px;
  background: var(--fond); color: var(--texte); font: inherit; width: 100%; }
input[type=submit] { background: var(--accent); color: #fff; border: none; border-radius: 999px;
  padding: 12px; font: inherit; font-weight: 600; cursor: pointer; }
input[type=submit]:hover { filter: brightness(1.08); }
.resultat { font-size: 2rem; font-weight: 700; margin: 8px 0; }
table { border-collapse: collapse; width: 100%; font-size: .9rem; margin-top: 6px; }
th, td { border: 1px solid var(--bord); padding: 7px 9px; text-align: left; }
th { background: var(--fond); }
code, pre { font-family: ui-monospace, Consolas, monospace; }
pre { background: var(--fond); border: 1px solid var(--bord); border-radius: 10px; padding: 10px; overflow-x: auto; }
.note { font-size: .9rem; color: var(--doux); }
.methodes { display: flex; gap: 10px; margin-top: 8px; }
.methodes a { color: var(--accent); }
footer { color: var(--doux); font-size: .85rem; margin: 8px 0 24px; }
a { color: var(--accent); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
`;

/* ------------------------------------------------------------
   Petits utilitaires
   ------------------------------------------------------------ */

// Empêche toute injection HTML (sécurité).
function echapper(valeur) {
	return String(valeur).replace(/[&<>"']/g, c => ({
		"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
	}[c]));
}

// Reproduit la conversion « à la PHP » : un texte non numérique vaut 0.
function analyser(valeur) {
	if (valeur === undefined || valeur === null) return { recu: false, texte: "", nombre: 0, type: "absent" };
	const s = String(valeur);
	if (s.trim() === "") return { recu: true, texte: s, nombre: 0, type: "vide" };
	const n = Number(s);
	if (Number.isFinite(n)) return { recu: true, texte: s, nombre: n, type: "nombre" };
	const debut = s.match(/^[+-]?(\d+(\.\d+)?|\.\d+)/);
	if (debut) return { recu: true, texte: s, nombre: Number(debut[0]), type: "nombre+texte" };
	return { recu: true, texte: s, nombre: 0, type: "texte" };
}

function interpretation(a) {
	if (a.type === "absent") return "Paramètre absent → 0";
	if (a.type === "vide") return "Valeur vide → 0";
	if (a.type === "nombre") return "Nombre valide → " + a.nombre;
	if (a.type === "nombre+texte") return "Partie numérique utilisée → " + a.nombre + " (le reste est ignoré)";
	return "Texte non numérique → compté comme 0 (comportement de PHP sans validation)";
}

/* ------------------------------------------------------------
   La page
   ------------------------------------------------------------ */
function page(parametres, requeteBrute) {
	// Y a-t-il eu une soumission ?
	const soumis = ["nb1", "nb2"].some(nom => nom in parametres);
	const a = analyser(parametres.nb1);
	const b = analyser(parametres.nb2);
	const somme = a.nombre + b.nombre;
	const autre = METHODE === "GET" ? "POST" : "GET";
	const autreUrl = METHODE === "GET" ? "https://post.nsi.xyz/" : "https://get.nsi.xyz/";

	const resultat = soumis ? `
		<h2>Résultat du calcul</h2>
		<p class="resultat">${echapper(String(somme))}</p>
		<table>
			<tr><th>Paramètre</th><th>Valeur reçue</th><th>Interprétation</th></tr>
			<tr><td>nb1</td><td><code>${echapper(a.texte)}</code></td><td>${echapper(interpretation(a))}</td></tr>
			<tr><td>nb2</td><td><code>${echapper(b.texte)}</code></td><td>${echapper(interpretation(b))}</td></tr>
		</table>
		<p class="note">Ce calcul a été réalisé <strong>côté serveur</strong>. Affiche le code source de la page (Ctrl+U) : tu n'y verras aucun script serveur.</p>
	` : `<p class="note">Saisis deux nombres puis clique sur <strong>Additionner !</strong></p>`;

	const aideGet = `
		<h2>Expériences à mener</h2>
		<ul class="note">
			<li>Deux décimaux (impossible à saisir dans le formulaire) : <code>?nb1=1.61803&amp;nb2=3.14159</code></li>
			<li>Des mots : <code>?nb1=chat&amp;nb2=chien</code> — que renvoie le serveur ?</li>
			<li>Un seul paramètre : <code>?nb1=42</code></li>
			<li>Un paramètre en double : <code>?nb1=1&amp;nb1=100&amp;nb2=0</code></li>
			<li>Du HTML (le serveur doit l'échapper) : <code>?nb1=&lt;b&gt;coucou&lt;/b&gt;&amp;nb2=1</code></li>
		</ul>`;

	const aidePost = `
		<h2>Expériences à mener</h2>
		<ul class="note">
			<li>Après avoir validé, <strong>recharge la page (F5)</strong> : le navigateur prévient qu'il va renvoyer les données. Recommence avec le formulaire <a href="https://get.nsi.xyz/">GET</a> : ce message n'apparaît pas.</li>
			<li>Regarde la barre d'adresse : avec POST, <strong>aucun paramètre</strong> n'apparaît, contrairement à GET.</li>
			<li>Ouvre les outils de développement (F12), onglet Réseau : trouve la requête et son corps.</li>
		</ul>`;

	const methodeNote = METHODE === "GET"
		? `Avec GET, les données voyagent <strong>dans l'URL</strong> : visibles, conservées dans l'historique et les favoris, limitées en taille.`
		: `Avec POST, les données voyagent <strong>dans le corps</strong> de la requête : absentes de l'URL, non conservées dans l'historique.`;

	return `<!DOCTYPE html>
<html lang="fr">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Formulaire ${METHODE}</title>
	<link rel="stylesheet" href="/style.css">
</head>
<body>
	<div class="page">
		<h1>Formulaire ${METHODE} <span class="badge">méthode ${METHODE}</span></h1>
		<p class="note">Démonstration d'un formulaire basé sur la méthode <strong>${METHODE}</strong>, pour les <a href="https://nsi.xyz">spé NSI</a> et les autres.</p>

		<h2>Addition :</h2>
		<div class="carte">
			<form action="" method="${METHODE.toLowerCase()}">
				<label for="nb1">Saisir un premier nombre :</label>
				<input type="number" id="nb1" name="nb1" value="${echapper(a.recu ? a.texte : "")}">
				<label for="nb2">Saisir un deuxième nombre :</label>
				<input type="number" id="nb2" name="nb2" value="${echapper(b.recu ? b.texte : "")}">
				<input type="submit" value="Additionner !">
			</form>
		</div>

		${resultat}

		<h2>Ce qui se passe</h2>
		<p class="note">${methodeNote}</p>
		${soumis ? `<p class="note">Données reçues par le serveur : <code>${echapper(requeteBrute || "(vide)")}</code></p>` : ""}

		${METHODE === "GET" ? aideGet : aidePost}

		<h2>Comparer</h2>
		<div class="methodes">
			<a href="${autreUrl}">Passer au formulaire ${autre}</a>
			<a href="https://nsi.xyz">nsi.xyz</a>
		</div>
	</div>
</body>
</html>`;
}

/* ------------------------------------------------------------
   Le serveur
   ------------------------------------------------------------ */
export default {
	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === "/style.css") {
			return new Response(CSS, { headers: { "content-type": "text/css; charset=utf-8" } });
		}
		if (url.pathname !== "/") {
			return new Response("Page non trouvée", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
		}

		const methode = request.method.toUpperCase();
		let parametres = {};
		let brut = "";

		if (methode === "GET") {
			for (const [cle, valeur] of url.searchParams) {
				if (!(cle in parametres)) parametres[cle] = valeur;
			}
			brut = url.search;
		} else if (methode === "POST") {
			const donnees = await request.formData();
			for (const [cle, valeur] of donnees) {
				if (!(cle in parametres)) parametres[cle] = valeur;
			}
			brut = [...donnees.entries()].map(([k, v]) => k + "=" + v).join("&");
		} else {
			return new Response("Méthode non autorisée", { status: 405 });
		}

		return new Response(page(parametres, brut), {
			headers: { "content-type": "text/html; charset=utf-8" }
		});
	}
};
