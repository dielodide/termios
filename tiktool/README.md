# TikTool — Anonymous TikTok Viewer

Viewer TikTok anonyme — profils, vidéos, reposts & stories. Aucun login requis.

## Stack
- **Backend**: Node.js + TypeScript + Express
- **Frontend**: React + Vite + CSS Modules
- **Cache**: Redis (ou in-memory fallback)
- **Infra**: Docker + docker-compose

## Lancement rapide (Docker)

```bash
cd tiktool
cp backend/.env.example backend/.env
docker compose up --build
```

Frontend → http://localhost  
Backend → http://localhost:3001  

## Dev local

```bash
# Backend
cd tiktool/backend
npm install
cp .env.example .env
npm run dev

# Frontend
cd tiktool/frontend
npm install
npm run dev
```

## Variables d'environnement (backend/.env)

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3001` | Port backend |
| `CORS_ORIGIN` | `http://localhost:5173` | Origine frontend |
| `TIKTOK_USER_AGENT` | Mobile Safari | User-Agent pour les requêtes |
| `HTTP_PROXY` | *(vide)* | Proxy HTTP (ex: `http://user:pass@host:port`) |
| `REDIS_URL` | *(vide)* | URL Redis (sinon cache in-memory) |
| `RATE_LIMIT_MAX` | `30` | Requêtes max/minute par IP |
| `CACHE_PROFILE_TTL` | `300` | TTL cache profil (secondes) |
| `CACHE_VIDEOS_TTL` | `180` | TTL cache vidéos |
| `CACHE_STORIES_TTL` | `60` | TTL cache stories |

## Architecture

```
tiktool/
├── backend/
│   └── src/
│       ├── config/default.ts      # Config centralisée
│       ├── lib/
│       │   ├── tiktokClient.ts    # Toute la logique TikTok ici
│       │   ├── cache.ts           # Redis ou in-memory
│       │   └── logger.ts          # Pino logger
│       ├── routes/
│       │   ├── profile.ts         # GET /api/profile/*
│       │   └── download.ts        # GET /api/download/*
│       └── types/tiktok.ts        # Types TypeScript
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   └── ProfilePage.tsx
│       └── components/
│           ├── VideoGrid.tsx
│           └── StoriesCarousel.tsx
└── docker-compose.yml
```

## Sécurité & anonymat

- Aucune donnée visiteur loguée (IP masquée)
- Streaming proxy : les URLs TikTok ne sont jamais exposées au client
- Rate limiting par IP sur `/api/profile/*` et `/api/download/*`
- CORS restreint au domaine frontend
- Tous les secrets via ENV, jamais hardcodés
- Support proxy rotatif via `HTTP_PROXY` env
