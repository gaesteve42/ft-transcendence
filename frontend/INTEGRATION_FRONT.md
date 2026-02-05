# Tuto d'intégration du frontend (pour Guluguts le goat) au sein de l'infra docker pour le projet.


## Comment déployer ton code

1. Copier l'entiereté de tes sources frontend dans le dossier ./backend/
   ```bash
   cp -r ../ft-transcendance/frontend/*
   ```

2. Le dockerfile et le docker compose sont déja set-up bg. Lance juste :
   ```bash
   docker compose up -d --build
   ```

## Eléments necessaires pour la configuration de Vite

Ton `vite.config.ts` doit inclure ces parametres pour Docker:
```typescript
server: {
  host: true,        // Ecoute sur 0.0.0.0 (requis pour Docker)
  port: 5173,
  watch: {
    usePolling: true // Requis pour le hot-reload dans Docker
  }
}
```

## Hot-reload

Ton dossier `src/` est monté en tant que volume. Les changements en local vont trigger le HMR de Vite HMR (Hot module replacement) automatiquement, pas de rebuild nécessaire.

## Accéder a l'app

Quand ca run, ton app est dispo sur les endpoint suivants :
- Direct: `http://localhost:5173`
- Par nginx: `http://localhost` (port 80)

## Appeler l'API backend

Depuis ton code React, les appels au backend se font font via les chemins relatifs :
```typescript
fetch('/api/lobbies')  // Nginx proxy ca au backend:3001
```

Pas besoin de hardcode `localhost:3001`, nginx s\occupe du routing.
