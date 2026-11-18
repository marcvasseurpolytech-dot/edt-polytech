# Emplois du temps des langues

- `/` : vue utilisateur (lecture seule, pour projeter, se met à jour toute seule).
- `/admin` : vue administrateur (mot de passe), enregistrement automatique sur le serveur, sans redéploiement.

Les données sont stockées dans Vercel Blob (store privé), pas dans git.

Variables d'environnement Vercel :
- `ADMIN_HASH` : empreinte SHA-256 (hexadécimale) du mot de passe administrateur.
- `BLOB_READ_WRITE_TOKEN` : ajouté automatiquement quand le store Blob est connecté au projet.
- `ADMIN_SECRET` (facultatif) : secret de signature des sessions.
