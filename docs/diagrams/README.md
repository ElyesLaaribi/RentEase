# Diagrammes UML RentEase

Ces fichiers PlantUML corrigent les diagrammes fournis en se basant sur le code Laravel/Vue du projet.

- `use-case-diagram.puml`: cas d'utilisation corriges pour Visiteur, Client, Loueur, Admin, notifications et reset password.
- `class-diagram.puml`: classes corrigees selon les modeles Eloquent, les migrations, les controleurs et les services.
- `deployment-diagram.puml`: deploiement logique Vue 3, Laravel 10, MySQL, Sanctum, Firebase Cloud Messaging et SMTP.

Corrections principales appliquees:

- `Client` et `Loueur` ne sont pas des classes dans le code. Ce sont des valeurs de `users.role`.
- Il n'y a pas de table ou modele `Role`; le role est une colonne string.
- `Review`, `PasswordReset` et `PersonalAccessToken` existent dans le projet et doivent apparaitre dans le diagramme de classes.
- Le cas "envoyer un message" n'est pas garde comme fonctionnalite realisee: la page `DMs` est un placeholder sans route API, modele ou controleur.
- `Admin` est un modele separe avec un guard Laravel separe.

Commande de rendu:

```bash
plantuml docs/diagrams/*.puml
```

