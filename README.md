# Rock Paper Scissors

Play Rock Paper Scissors against the bot. Real-time high score, responsive design, Docker-ready.

**Live Demo:** `http://<server-ip>:3000`

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18 + TypeScript + SCSS Modules |
| Backend | NestJS + TypeScript |
| Real-time | Socket.IO (WebSocket) |
| API Gateway | nginx (rate limiting, load balancing) |
| Container | Docker + docker-compose |
| Tests | Jest (backend) + Vitest (frontend) + Playwright (E2E) + Robot Framework (E2E) |

---

## Quick Start (Local Dev)

```bash
# Terminal 1 — Backend
cd backend
pnpm install
pnpm run start:dev        # → http://localhost:3001

# Terminal 2 — Frontend
cd frontend
pnpm install
echo "VITE_API_URL=http://localhost:3001" > .env
echo "VITE_WS_URL=http://localhost:3001" >> .env
pnpm run dev              # → http://localhost:3000
```

---

## Quick Start (Docker)

```bash
docker compose up -d
# → http://localhost:3000
```

Scale backend for more players:

```bash
docker compose up -d --scale backend=3
```

---

## Project Structure

```
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # Header, ScoreBoard, GameActions, BotDisplay, ResultBanner
│   │   ├── hooks/            # useGame, useHighScoreSocket
│   │   ├── lib/              # API client
│   │   └── types/            # Shared TypeScript types
│   ├── __tests__/            # Vitest component tests
│   ├── e2e/                  # Playwright E2E tests
│   ├── nginx.conf            # API Gateway + Load Balancer config
│   └── Dockerfile
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── game/             # POST /api/game/play + game logic
│   │   ├── score/            # GET /api/score + persistence + sessions
│   │   ├── nonce/            # GET /api/nonce (anti-cheat tokens)
│   │   ├── health/           # GET /api/health (monitoring)
│   │   └── websocket/        # Socket.IO real-time gateway
│   ├── test/                 # E2E tests
│   └── Dockerfile
├── robot-tests/              # Robot Framework E2E tests
│   ├── tests/                #   Test suites (smoke, ui, api)
│   ├── keywords/             #   Custom keywords (ui, api)
│   ├── resources/            #   Variables + shared settings
│   └── run.sh                #   Runner script
├── scripts/                  # API test script
├── docker-compose.yml
├── DEPLOYMENT.md             # Deployment guide (Thai)
└── README.md
```

---

## How to Play

1. Pick **Rock** , **Paper** , or **Scissors**
2. Bot reveals its choice — wait 2 seconds
3. See the result: Win 🎉 / Lose 😢 / Draw 🤝
4. Win → +1 score | Lose → score resets to 0
5. Beat the High Score and see it update in real-time across all players!

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/nonce` | Get a single-use nonce token (anti-cheat) |
| `POST` | `/api/game/play` | Play a round `{ action, nonce }` |
| `GET` | `/api/score` | Get your score + high score |
| `GET` | `/api/health` | Health check (for monitoring) |
| `WS` | `/socket.io/` | Real-time `highScoreUpdated` events |

---

## Anti-Cheat

- **Nonce tokens** — each play requires a single-use token from `GET /api/nonce`. Prevents replay and request-race attacks
- **Server-authoritative** — bot action randomized server-side, result determined server-side, score tracked per session
- **Session-bound** — score tracked in `httpOnly` cookie session, not client-controlled
- **Rate limiting** via nginx: 30 req/min on game endpoint, 5 concurrent WebSocket connections per IP
- **Input validation** — `class-validator` with `whitelist: true` rejects unknown fields

---

## Testing

```bash
# Backend unit tests (Jest)
cd backend && pnpm test

# Frontend unit tests (Vitest)
cd frontend && pnpm test

# E2E tests (Playwright)
cd frontend && pnpm test:e2e

# Robot Framework E2E tests
bash robot-tests/run.sh                     # all tests
bash robot-tests/run.sh --include smoke     # smoke only
bash robot-tests/run.sh --include api       # API only
bash robot-tests/run.sh --include ui        # UI only

# API smoke test
bash scripts/api-test.sh http://localhost:3000
```

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) — step-by-step guide for Ubuntu 20 (ภาษาไทย)

---

## License

MIT
