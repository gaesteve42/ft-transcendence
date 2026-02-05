# Tuto d'intégration du backend (pour Kev le goat) au sein de l'infra docker pour le projet.


## Comment déployer ton code

1. Copier l'entiereté de tes sources backend dans le dossier ./backend/
   ```bash
   cp -r ../ft-transcendance/backend/*
   ```

2. Le dockerfile et le docker compose sont déja set-up bg. Lance juste :
   ```bash
   docker compose up -d --build
   ```

## Les variables ENV fournies par le docker compose

L'app va recevoir ces variables environnement au lancement :

- `PORT=3001` — Ton app doit listen sur ce port
- `POSTGRES_HOST=postgres` — database hostname (DNS interne a Docker)
- `POSTGRES_PORT=5432`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — DB credentials dans le .env qui doit etre crée depuis le .env example. .env déja ajouté au .gitignore

## Accéder a la db

Depuis ton app NestJS, connecte toi a PostgreSQL avec:
```
Host: postgres (not localhost!)
Port: 5432
Database: findmygame_db
User: findmygame
Password: findmygame_password
```

- J'avais set-up "findmygame" au départ mais faut qu'on trouve un placeholder commun, qu'on arrete de se mélanger les pinceaux. "GameFinder" si j'ai bien pigé ?

## Hot-reload

Ton dossier  `src/` est monté en tant que volume. Les changements que tu fait en local vont trigger `nest start --watch` pour recharger automatiquement ton app.

## Tester tes endpoints

Quand ca run, ton API est dispo sur :
- Direct: `http://localhost:3001/api/...`
- Par nginx: `http://localhost/api/...`
