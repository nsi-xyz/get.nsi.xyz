<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Formulaire GET</title>
  <style>
    @import url(style.css);
  </style>
  <script type="text/javascript">
  function init()
  {
  var submit = document.getElementById("sub");
  p.onclick = hideTextShowNumber;
};

function hideTextShowNumber()
{
  document.getElementById("start_text").hidden = true;
  document.getElementById("output").hidden = false
}
  </script>
</head>
<body>
  <script src="https://package.nsi.xyz/api/"></script>
  <nsi-xyz add="menu" ref="NSI's tools" theme="light"></nsi-xyz>
  <header>
    <h1>
      get.nsi.xyz
    </h1>
    <h2>
      La méthode GET dans les formulaires d'une page web
    </h2>
  </header>
<div id="box">
  <div>
    <h3>Les formulaires sur le web</h3>
    <p>
      Les formulaires sur les pages web peuvent peut être codé pour utiliser la méthode GET ou la méthode POST. 
    </p>
    <h3>Au programme de la spécialité NSI</h3>
    <p>
      En spécialité NSI, l'étude de ces deux méthodes est au programme, l'objectif est d'analyser le fonctionnement d'un formulaire simple, de distinguer les transmissions de
paramètres par les requêtes
POST ou GET
    </p>
    <h3>Que dois je faire sur ce site ?</h3>
    <p>
      Consulte ton document de cours, il contient les exercices ou activités à faire sur ce site web. 
    </p>
    
  </div>
  <div>
    <h3>Formulaire web basé sur la méthode GET</h3>
    <!-- début du formulaire web -->
    	<form action="" method="get">
		  <p>Saisir un premier nombre : <input type="number" name="nb1" value="<?php echo $_GET [ 'nb1' ] ;?>"></p>
		  <p>Saisir un deuxième nombre : <input type="number" name="nb2" value="<?php echo $_GET [ 'nb2' ] ;?>"></p>
		   <p> <input type="submit" value="Additionner !" id="sub"></p>
		 
	</form>
    <!-- fin du formulaire web -->

    <h3>Résultat du calcul :</h3>
    <p id="start_text"><h4>Rien pour le moment</h4></p><p id="output" hidden><h4><?php echo $_GET [ 'nb1' ] + $_GET [ 'nb2' ] ;?></h4></p>
    <!-- RADIO BTN POUR CACHER LE MESSAGE RIEN POUR LE MOMENT-->
    <h3>Autres actions</h3>
    <p>
      Réinitialiser cette page en <a href="http://get.nsi.xyz/">http</a>, <a href="https://get.nsi.xyz/">https</a><br>
      Voir un formulaire basé sur la méthode <a href="https://post.nsi.xyz/">POST</a>
      
      
    </p>
    
  </div>
  
</div>  
  
  <footer>
    <h2>
      get.nsi.xyz
    </h2>
    <p>
      Interactions entre l’homme et la machine sur le Web en spécialité nsi
    </p>
    <p>
      Mini site web de démonstration, crée en 2019 par Vincent Robert. Découvrir ce <a href="">projet</a>, ses <a href="">contributeurs</a>.
    </p>
  </footer>
</body>
</html>