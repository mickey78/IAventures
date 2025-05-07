# IAventures

IAventures est un jeu d'aventure textuel interactif propulsé par une intelligence artificielle (IA). Plongez dans des mondes fantastiques, explorez l'espace, devenez un pirate ou résolvez des mystères !

## Description

Dans IAventures, vous êtes le héros de votre propre histoire. Le jeu vous permet de :

*   **Choisir un Thème Principal** : Sélectionnez parmi plusieurs univers passionnants comme la Fantasy Médiévale, l'Exploration Spatiale, les Pirates, le Western, et bien d'autres, présentés sous forme de cartes illustrées.
*   **Choisir un Scénario (Optionnel)** : Affinez votre aventure en choisissant un scénario de départ spécifique (parmi 6 options par thème principal) lié au thème principal, présenté sous forme de cartes illustrées, ou laissez l'IA vous surprendre avec un début générique en cliquant sur un bouton "Commencer sans scénario spécifique".
*   **Choisir votre Héros et son Genre** : Incarnez un Guerrier, Magicien, Archer ou Voleur. Chaque héros est présenté avec une description, une icône et ses habiletés spécifiques. Vous devez également choisir le genre de votre héros (Garçon ou Fille), ce qui influencera la narration et l'apparence du personnage dans les images générées.
*   **Nommer votre Personnage** : Donnez vie à votre aventurier en lui choisissant un nom. Le narrateur IA s'adressera directement à vous par ce nom.
*   **Vivre une Aventure Unique** : L'IA génère une histoire initiale et adapte la suite en fonction de vos choix, du thème, du scénario, du genre du héros, et des capacités de votre héros. L'IA est conçue pour créer des rebondissements et des surprises pour une expérience engageante.
*   **Interagir avec l'Histoire** : Faites progresser l'aventure en sélectionnant des choix proposés ou en tapant vos propres actions via un champ de texte qui peut être affiché/masqué.
*   **Utiliser des Habiletés** : Mettez à profit les habiletés uniques de votre héros (2 par classe) pour surmonter les obstacles et résoudre les défis. Un bouton "Habiletés" (situé sous le bouton "Inventaire") ouvre un popover listant les habiletés, permettant de les sélectionner pour les utiliser.
*   **Gérer un Inventaire** : Trouvez et utilisez des objets qui vous aideront dans votre quête via un inventaire interactif. Un bouton "Inventaire" (en haut à gauche) ouvre un popover listant les objets. Vous pouvez "Inspecter", "Utiliser", "Lancer", ou "Se débarrasser" des objets. L'ajout d'un item à l'inventaire est signalé par une animation sur le bouton.
*   **Définir la Durée** : Choisissez le nombre de tours (entre 10 et 25 via un slider) que durera votre aventure pour des parties rapides ou plus longues. Un compteur de tour est visible en haut à droite.
*   **Immersion Visuelle** : Des images générées par IA (style réaliste) illustrent les moments clés de l'histoire pour une meilleure immersion. Une image est générée au début de l'aventure, et l'IA peut en générer d'autres aux moments importants. Vous pouvez aussi demander la génération d'une image pour un passage spécifique via un bouton sur la bulle de narration. Si une image ne se génère pas correctement, un bouton permet de réessayer. En cliquant sur une image, celle-ci s'affiche en plein écran avec le texte de narration correspondant.
*   **Narration Immersive** : L'histoire est présentée sous forme de bulles de conversation, distinguant les interventions du Narrateur IA et celles du joueur. La localisation actuelle du joueur est affichée dans l'en-tête.
*   **Sauvegarder et Charger** : Ne perdez jamais votre progression grâce au système de sauvegarde locale. Chargez une partie précédente ou supprimez les anciennes sauvegardes. Les boutons de sauvegarde et de retour au menu principal sont accessibles via des icônes en haut à droite.
*   **Personnaliser l'Interface** :
    *   **Couleurs Primaires** : Choisissez parmi une large palette de couleurs primaires (rouge, bleu, vert, violet, orange, cyan, rose, etc.) pour adapter l'apparence du jeu via un sélecteur dans l'en-tête.
    *   **Mode Clair/Sombre** : Basculez entre un thème clair et un thème sombre (par défaut) pour un confort visuel optimal, via un sélecteur dans l'en-tête.
*   **Débogage (Optionnel)** : Pour les développeurs, le prompt initial envoyé à l'IA peut être affiché et inspecté.
*   **Journalisation** : Toutes les interactions (prompts envoyés, réponses reçues) sont enregistrées dans un fichier `adventure.log` pour analyse.

## Installation et Lancement

Vous avez deux options pour lancer IAventures : en utilisant Node.js directement ou via Docker.

### Option 1 : Utilisation de Node.js (Recommandé pour le développement)

1.  **Cloner le dépôt** (si vous ne l'avez pas déjà fait) :
    ```bash
    git clone <URL_DU_DEPOT>
    cd <NOM_DU_REPERTOIRE>
    ```
    Remplacez `<URL_DU_DEPOT>` et `<NOM_DU_REPERTOIRE>` par les informations appropriées si vous clonez le projet depuis une source externe. Si vous utilisez un environnement de développement comme IDX, le code est déjà présent.

2.  **Installer les dépendances** :
    Assurez-vous d'avoir Node.js (version 18 ou supérieure recommandée) et npm (ou Yarn) installés. Ouvrez un terminal dans le répertoire du projet et exécutez :
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configurer les variables d'environnement** :
    *   Renommez le fichier `.env.example` en `.env` (ou créez un nouveau fichier `.env`). Si vous n'avez pas de `.env.example`, créez un fichier `.env`.
    *   Ajoutez votre clé d'API Google Generative AI (Gemini). Vous pouvez en obtenir une gratuitement sur [Google AI Studio](https://aistudio.google.com/app/apikey).
        ```plaintext
        # .env
        GOOGLE_GENAI_API_KEY=VOTRE_CLE_API_ICI
        ```
    *   Remplacez `VOTRE_CLE_API_ICI` par votre clé réelle. **Important :** Ne partagez jamais cette clé publiquement.

4.  **Lancer l'application en mode développement** :
    Exécutez la commande suivante dans votre terminal :
    ```bash
    npm run dev
    # ou
    yarn dev
    ```
    Cette commande lance le serveur de développement Next.js (habituellement sur `http://localhost:9002`).

5.  **Ouvrir le jeu** :
    Ouvrez votre navigateur web et allez à l'adresse indiquée dans le terminal (par défaut `http://localhost:9002`).

### Option 2 : Utilisation de Docker (Recommandé pour un déploiement facile)

1.  **Prérequis** : Assurez-vous d'avoir Docker installé sur votre machine.

2.  **Configurer les variables d'environnement** :
    *   Créez un fichier `.env` à la racine du projet (comme décrit dans l'Option 1, étape 3) et ajoutez votre clé `GOOGLE_GENAI_API_KEY`.

3.  **Construire l'image Docker** :
    Ouvrez un terminal dans le répertoire du projet et exécutez :
    ```bash
    docker build -t iaventures .
    ```

4.  **Lancer le conteneur Docker** :
    Exécutez la commande suivante pour démarrer l'application. Le conteneur lira la clé API depuis votre fichier `.env` local.
    ```bash
    # Remplacez /chemin/vers/votre/.env par le chemin absolu de votre fichier .env si nécessaire, sinon Docker cherchera dans le répertoire courant.
    docker run -p 9002:9002 --env-file ./.env --name iaventures-app -d iaventures
    ```
    *   `-p 9002:9002` : Mappe le port 9002 de votre machine au port 9002 du conteneur.
    *   `--env-file ./.env` : Charge les variables d'environnement depuis votre fichier `.env` local (assurez-vous qu'il est dans le répertoire où vous lancez la commande ou spécifiez le chemin complet).
    *   `--name iaventures-app` : Donne un nom au conteneur pour une gestion facile.
    *   `-d` : Lance le conteneur en arrière-plan (detached mode).
    *   `iaventures` : Le nom de l'image que vous avez construite.

5.  **Ouvrir le jeu** :
    Ouvrez votre navigateur web et allez à l'adresse `http://localhost:9002`.

6.  **Arrêter et supprimer le conteneur (quand vous avez terminé)** :
    ```bash
    docker stop iaventures-app
    docker rm iaventures-app
    ```

Amusez-vous bien dans vos aventures!
