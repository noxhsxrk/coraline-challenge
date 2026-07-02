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
| Tests | Jest (backend) + Vitest (frontend) + Playwright (E2E) |

---

## Quick Start (Local Dev)

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run start:dev        # → http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm install
echo "VITE_API_URL=http://localhost:3001" > .env
echo "VITE_WS_URL=http://localhost:3001" >> .env
npm run dev              # → http://localhost:3000
```

---

## Quick Start (Docker)

```bash
docker-compose up -d
# → http://localhost:3000
```

Scale backend for more players:

```bash
docker-compose up -d --scale backend=3
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
│   │   ├── game/             # Game logic + controller
│   │   ├── score/            # High score persistence (JSON file)
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
| `POST` | `/api/game/play` | Play a round `{ action, currentScore }` |
| `GET` | `/api/score` | Get high score |
| `GET` | `/api/health` | Health check (for monitoring) |
| `WS` | `/socket.io/` | Real-time `highScoreUpdated` events |

---

## Anti-Cheat

- Bot action is randomized **server-side only** — client never generates it
- Result (win/lose/draw) is determined server-side
- Rate limiting via nginx: max 30 requests/min on game endpoint
- High score is server-authoritative

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
