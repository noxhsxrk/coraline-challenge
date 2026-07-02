# Architecture Decision Record -- Rock Paper Scissors

**Date:** 2026-07-02
**Scope:** Full-stack interview challenge
**Evaluator role:** Architecture Designer

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Separation & Boundaries](#2-component-separation--boundaries)
3. [Data Flow](#3-data-flow)
4. [Deployment Topology](#4-deployment-topology)
5. [Scalability Analysis](#5-scalability-analysis)
6. [Fault Tolerance & Resilience](#6-fault-tolerance--resilience)
7. [Monitoring & Observability](#7-monitoring--observability)
8. [Configuration Management](#8-configuration-management)
9. [Key Architectural Decisions](#9-key-architectural-decisions)
10. [Engineering Level Assessment](#10-engineering-level-assessment)
11. [Recommendations](#11-recommendations)

---

## 1. System Overview

```
                    ┌─────────────────────────────────┐
                    │         DNS / Public IP          │
                    │          port 3000                │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │         NGINX (port 80)          │
                    │  API Gateway / Reverse Proxy     │
                    │  Rate Limiter / Load Balancer    │
                    │  Security Headers                │
                    └──┬──────────────┬───────────────┘
                       │              │
              ┌────────▼───┐   ┌─────▼──────────┐
              │  /api/*    │   │  /socket.io/*   │
              │            │   │  (WebSocket)    │
              └──┬─────────┘   └──────┬──────────┘
                 │                    │
              ┌──▼────────────────────▼──┐
              │   Backend (NestJS)        │
              │   port 3001               │
              │                           │
              │  ┌──────────────────────┐ │
              │  │ GameModule            │ │
              │  │  GameController       │ │
              │  │  GameService          │ │
              │  └──────────┬───────────┘ │
              │             │             │
              │  ┌──────────▼───────────┐ │
              │  │ ScoreModule (@Global) │ │
              │  │  ScoreService         │ │
              │  │  IScoreService        │ │
              │  └──────────┬───────────┘ │
              │             │             │
              │  ┌──────────▼───────────┐ │
              │  │ WebSocketModule       │ │
              │  │  GameGateway          │ │
              │  └──────────────────────┘ │
              └──────┬────────────────────┘
                     │
              ┌──────▼────────────────────┐
              │  Docker Volume: rps-data   │
              │  high-score.json           │
              └───────────────────────────┘
```

### Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18, TypeScript, Vite, SCSS Modules, Socket.IO Client | SPA game UI |
| Backend | NestJS 10, TypeScript, Socket.IO, class-validator | Game logic API + real-time |
| Gateway | NGINX (multi-stage build in frontend container) | Rate limiting, load balancing, security headers |
| Container | Docker, docker-compose | Ephemeral deployment |
| Data | JSON file on Docker volume | High-score persistence |
| Tests | Jest, Vitest, Playwright, Robot Framework | Unit, integration, E2E, acceptance |

---

## 2. Component Separation & Boundaries

### 2.1 Frontend (React SPA)

**Structure:** Feature-based with cross-cutting concerns separated.

```
src/
  components/     -- 6 UI components, each with co-located .module.scss
  hooks/          -- Business logic + state management
  lib/api.ts      -- HTTP client abstraction
  types/          -- Shared TypeScript types + display constants
  styles/         -- Design tokens (SCSS variables)
```

**Boundaries:**
- Components are purely presentational (props in, UI out). No data-fetching inside components.
- `useGame` hook owns all game state (yourScore, highScore, botAction, result, history, loading guards). Isolated from rendering.
- `useHighScoreSocket` owns WebSocket lifecycle. Isolated from game logic.
- `lib/api` abstracts fetch + credential handling. Single import point for all HTTP.
- `types/game` is the single source of truth for domain types. Components consume, never redefine.

**Assessment:** Appropriate separation. The hook layer decouples state from presentation cleanly. The API client is thin (two functions) but correctly separated. No prop drilling beyond one level.

### 2.2 Backend (NestJS)

**Structure:** Three modules following NestJS convention.

```
game/       -- GameController (REST), GameService (business logic), PlayRequestDto (validation)
score/      -- ScoreService (persistence + RxJS events), IScoreService (interface)
websocket/  -- GameGateway (Socket.IO bridge)
```

**Module dependency graph:**
```
AppModule
  ├── GameModule    (depends on ScoreModule via IScoreService token)
  ├── ScoreModule   (@Global, injected into GameService)
  └── WebsocketModule (injects ScoreService directly)
```

**Boundary issues:**
- `GameService` depends on the abstract `IScoreService` (injected via `SCORE_SERVICE_TOKEN`) -- good decoupling.
- `GameGateway` depends on the concrete `ScoreService` class rather than `IScoreService` -- inconsistent abstraction.
- `GameController` directly injects `ScoreService` (concrete) for session management -- violates the abstraction boundary that GameService already uses.
- `ScoreModule` uses `@Global()` decorator. Global modules are convenient but hide dependency edges. For this scale it is acceptable; for larger projects it would be a smell.

### 2.3 Infrastructure

- NGINX is co-located inside the frontend Docker image (frontend nginx.conf). This binds the API gateway configuration to the frontend deployment, making independent scaling harder.
- Backend exposes no port externally -- only accessible through nginx.
- Single Docker Compose file orchestrates the entire stack.

**Assessment:** The frontend-container-with-nginx pattern means changing nginx config requires rebuilding the frontend image. A dedicated gateway container would be more flexible.

---

## 3. Data Flow

### 3.1 Game Play (happy path)

```
1. User clicks rock/paper/scissors button
2. GameActions onClick -> useGame.selectAction('rock')
3. selectAction sets isLocked=true (disables buttons)
4. api.playGame({ action: 'rock' })
5. fetch POST /api/game/play
6. nginx limit_req check -> proxy_pass to backend:3001
7. [NestJS] Request pipeline:
   a) cookie-parser extracts session cookie (or creates new)
   b) ValidationPipe validates PlayRequestDto using class-validator
   c) GameController routes to GameService.play('rock', sessionId)
   d) GameService:
      - randomAction() picks bot move
      - determineResult() compares player vs bot
      - scoreService.getSession() gets current score
      - scoreService.setScore() updates if win/lose
      - scoreService.updateHighScore() persists if new record
      - Returns PlayResponse
   e) GameController returns PlayResponse
   f) If new high score, ScoreService emits on highScoreChanged$ Subject
   g) GameGateway subscription broadcasts via socket.io 'highScoreUpdated'
8. fetch receives response
9. Frontend: data stored, setTimeout(2000ms) initiates reveal sequence:
   a) setBotAction(data.botAction) -- show bot's choice
   b) After 2s: setResult, update history, unlock buttons
```

### 3.2 Real-Time High Score

```
1. ScoreService.updateHighScore(newScore) called
2. If newScore > current, writes to file AND emits on highScoreChanged$
3. GameGateway.afterInit() subscribed to highScoreChanged$
4. On emission: this.server.emit('highScoreUpdated', { highScore })
5. All connected sockets receive the event
6. Frontend useHighScoreSocket hook: socket.on('highScoreUpdated') -> updateHighScore
7. ScoreBoard component re-renders with new high score
```

### 3.3 Initial Load

```
1. App mounts
2. useEffect: fetchScore() -> GET /api/score
3. Response: { highScore, yourScore } -> setHighScore, setYourScore
4. useHighScoreSocket establishes WebSocket connection
5. On connect: GameGateway.handleConnection sends current high score
```

### 3.4 Anti-Cheat Analysis

- Server-authoritative game logic. Client never generates bot action or result.
- Rate limiting at nginx: 30 requests/min on `/api/game/` with burst=5.
- Input validation via class-validator DTO (whitelist, forbidNonWhitelisted).
- Session cookie is httpOnly -- not accessible to JavaScript.
- However, client can still send arbitrary `action` values (caught by DTO validation).
- `currentScore` in request body is accepted but `GameService.play` ignores it -- it reads from server-side session. The API test script sends it (legacy), but the DTO doesn't require it and the service doesn't use it.

**Assessment:** Anti-cheat is appropriate. For a real-money game you'd want HMAC-signing or a shorter server-side session window, but for this interview challenge it is sufficient.

---

## 4. Deployment Topology

### 4.1 Docker Compose Architecture

```yaml
services:
  backend:
    build: ./backend
    restart: unless-stopped
    expose: ["3001"]
    volumes:
      - rps-data:/app/data
    environment:
      - NODE_ENV=production

  frontend:
    build: ./frontend
    container_name: rps-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  rps-data:
```

### 4.2 Build Pipeline

**Backend (multi-stage):**
```
Stage 1 (builder): node:22-alpine + pnpm -> install -> build -> /app/dist
Stage 2 (runtime): node:22-alpine -> copy dist, node_modules, package.json -> CMD ["node", "dist/main"]
```

**Frontend (multi-stage):**
```
Stage 1 (builder): node:22-alpine + pnpm -> install -> build -> /app/dist
Stage 2 (runtime): nginx:alpine -> copy /app/dist -> /usr/share/nginx/html + nginx.conf
```

### 4.3 Network Topology

- Single host deployment (Ubuntu 20 as documented in DEPLOYMENT.md).
- Only port 3000 exposed to the internet (via ufw allow).
- Backend container is on the internal Docker bridge network, accessible only by the service name `backend`.
- Docker Compose creates a default network automatically.

### 4.4 Scaling Model

```bash
docker compose up -d --scale backend=3
```

NGINX upstream block supports this:
```
upstream backend_pool {
    server backend:3001;
}
```

However, Docker Compose DNS resolves `backend` to all container IPs in round-robin, but with **no session affinity** (sticky sessions). Since sessions are in-memory, a user's subsequent requests may hit a different backend that does not have their session.

### 4.5 Deployment Documentation

DEPLOYMENT.md is in Thai, written for a non-English-speaking operator. It covers:
- SSH access, Docker/Docker Compose installation
- Git clone, docker compose up, firewall config
- Common commands (stop, start, restart, update)
- Scaling instructions (--scale backend=N)
- High-score reset command

**Assessment:** Well-documented for the target audience. The Thai-language documentation suggests this project was designed for a specific regional deployment scenario.

---

## 5. Scalability Analysis

### 5.1 Horizontal Scaling

| Component | Scalable? | Notes |
|-----------|-----------|-------|
| Backend (GameService) | Limited | Stateless game logic, but ScoreService stores sessions in-memory Map. Scale >1 breaks session continuity without sticky sessions or a shared session store |
| Backend (ScoreService persistence) | Limited | JSON file on shared Docker volume. `writeFileSync` is synchronous but fine for low volume. Concurrent writes could corrupt. No file locking |
| Backend (WebSocket) | Limited | Socket.IO with polling fallback. Sticky sessions needed for WebSocket to work behind load balancer |
| Frontend (nginx) | Not needed | Static file serving + API proxy; one instance handles all traffic |
| Docker volume rps-data | Shared across backends | All backend containers mount the same volume. File-level concurrent access is unsafe |

### 5.2 Session Storage Problem

`ScoreService` stores sessions in `Map<string, Session>`:
```typescript
private sessions = new Map<string, Session>();
```

With `--scale backend=3`:
- Backend A has session S1, Backend B does not.
- User with session cookie S1 hits Backend B via round-robin → session not found → new session created → score reset to 0.

**Impact:** High score persistence works (shared volume), but per-session scoring breaks with scale >1.

**Mitigation possibilities (not implemented):**
- Sticky sessions via nginx `ip_hash` directive
- Shared session store (Redis, etc.)
- Remove session requirement (use client-passed score)

### 5.3 High Score Persistence Bottleneck

```typescript
updateHighScore(newScore: number): number {
    const current = this.getHighScore();      // reads file
    if (newScore > current) {
        this.writeHighScore(newScore);        // writes file
        this.highScoreChanged$.next(newScore);
        return newScore;
    }
    return current;
}
```

- Synchronous I/O on every score update
- No file locking → race condition if two backends write simultaneously
- Acceptable for interview challenge with low traffic. Would not survive production load.

### 5.4 Cleanup Mechanism

`cleanupSessions(maxAgeMs = 30 * 60 * 1000)` exists in `ScoreService` but is **never called**. No scheduler (e.g., `@nestjs/schedule`, `setInterval`) triggers it. This is dead code.

---

## 6. Fault Tolerance & Resilience

### 6.1 Current State

| Concern | Implementation | Assessment |
|---------|---------------|------------|
| Container restart | `restart: unless-stopped` on both services | Good |
| Backend crash | Docker restarts container, but in-memory sessions are lost | Acceptable |
| High score data loss | File persists on Docker volume | Survives container restart |
| High score corruption | `try/catch` in `getHighScore` returns 0 on corrupted file | Graceful degradation |
| Rate limiting | nginx `limit_req` (30r/m game, 60r/m global) + `limit_conn` (20/IP) | Good for abuse prevention |
| WebSocket disconnect | Socket.IO pingTimeout: 60s, pingInterval: 25s | Standard configuration |
| Frontend loading | SPA serves static files via nginx; backend failure shows "Connection lost" error | Graceful degradation |
| Health check | GET /api/health, but **no Docker healthcheck** configured | Missing |
| depends_on | frontend depends_on backend, but only checks container start, not readiness | Weak |
| CORS | Configured for localhost origins only | Fine for production with proper domain |

### 6.2 Missing Resilience Patterns

- **No healthcheck in docker-compose:** `docker compose up` considers the backend "healthy" as soon as the process starts. If NestJS takes time to initialize, requests from nginx may fail.
- **No circuit breaker:** If backend is down, nginx continues to proxy requests, resulting in 502 errors instead of a graceful degraded state.
- **No retry logic in frontend:** API calls fail immediately on network error. The error message "Connection lost. Try again." is shown, but there is no automatic retry.
- **No graceful degradation for WebSocket:** If WebSocket connection fails, `socket.io-client` attempts polling fallback (configured), but there is no timeout or reconnection limit shown.

---

## 7. Monitoring & Observability

### 7.1 Current State

| Capability | Present? | Detail |
|------------|----------|--------|
| Health endpoint | Yes | `GET /api/health` returns `{ status: 'ok' }` |
| Security headers | Yes | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy |
| Logging | Minimal | NestJS default stdout. No structured logging |
| Metrics | No | No Prometheus, no request/response metrics |
| Tracing | No | No distributed tracing |
| Error tracking | No | No Sentry/DataDog integration |
| Docker logs | Yes | `docker compose logs` available |
| Access logs | Implicit | nginx access logs should be available but not configured explicitly |

### 7.2 Health Check Depth

The health endpoint is purely superficial -- it returns `{ status: 'ok' }` without checking if the high score file is readable, if sessions can be created, or if WebSocket is functional. A meaningful health check would verify:
- File system access (can read high-score.json)
- Memory/CPU (basic process health)
- WebSocket server state (is Socket.IO listening?)

---

## 8. Configuration Management

### 8.1 Configuration Surface

| Setting | Location | Default | Overridable? |
|---------|----------|---------|--------------|
| Backend PORT | `src/main.ts` | 3001 | via env var |
| Backend CORS_ORIGIN | `src/main.ts` | localhost:3000, localhost:5173 | via env var (comma-separated) |
| Backend NODE_ENV | docker-compose.yml | production | hardcoded in compose |
| Frontend VITE_API_URL | .env | '' | per environment |
| Frontend VITE_WS_URL | .env | '' | per environment |
| nginx rate limits | frontend/nginx.conf | game: 30r/m, global: 60r/m | hardcoded |
| nginx upstream | frontend/nginx.conf | backend:3001 | hardcoded |
| Session cookie maxAge | `GAME.controller.ts` | 7 days | hardcoded |
| Session cleanup timeout | `score.service.ts` | 30 min (function param) | never called |
| Reveal delay | `useGame.ts` | 2000ms | hardcoded |

### 8.2 Assessment

- Configuration is spread across 5+ files with no single aggregation point.
- nginx config lives inside the frontend directory, which is misleading (it proxies to backend).
- `.env.example` files exist but permission restrictions prevented review.
- Frontend uses `import.meta.env.VITE_*` which are compile-time baked (build once, deploy everywhere pattern). This means different environments need separate builds unless runtime configuration is added.

---

## 9. Key Architectural Decisions

### ADR-1: Co-located NGINX in Frontend Container
**Context:** The API gateway (nginx) is baked into the frontend Docker image rather than running as a separate service.
**Decision:** Accept. For a two-service single-host deployment, this reduces complexity. Users only manage 2 containers instead of 3.
**Trade-off:** Changing nginx configuration requires rebuilding the frontend image. Also prevents independent scaling of nginx from the SPA.

### ADR-2: In-Memory Session Store
**Context:** ScoreService stores sessions in a plain `Map<string, Session>`.
**Decision:** Accept for interview scope. Avoids external dependency (Redis, database) and keeps the project self-contained.
**Trade-off:** Breaks with horizontal scaling (no session affinity). Sessions lost on container restart. No persistence of per-session scores across deployments.

### ADR-3: JSON File for High-Score Persistence
**Context:** High score is persisted to `high-score.json` on a Docker volume.
**Decision:** Accept for interview scope. Simpler than setting up a database. Survives container restarts.
**Trade-off:** Synchronous I/O, no concurrent-write protection (acceptable at <1 request/second), not suitable for production traffic.

### ADR-4: NestJS with Interface-Based Dependency Injection
**Context:** GameService depends on `IScoreService` through the `SCORE_SERVICE_TOKEN` provider, while GameGateway depends on concrete `ScoreService`.
**Decision:** Partially accepted. The interface abstraction in GameService is good practice. The inconsistency in GameGateway is a minor flaw (should also use the interface).
**Benefit:** ScoreService can be replaced with a Redis-backed implementation without changing GameService.

### ADR-5: RxJS Subject for Cross-Module Events
**Context:** ScoreService uses `highScoreChanged$ = new Subject<number>()` to notify WebSocket gateway of high score changes.
**Decision:** Good choice. Decouples the persistence layer from the real-time layer. GameGateway subscribes without ScoreService knowing about WebSocket at all.
**Benefit:** ScoreService has zero awareness of WebSocket/Socket.IO. Clean separation of concerns.

### ADR-6: Two-Legged Real-Time Architecture
**Context:** High score updates are sent via Socket.IO, while game play results are returned via HTTP POST response.
**Decision:** Pragmatic. The game play flow is request-response (user expects immediate feedback), while high score updates benefit from push-based delivery. No need to make game play real-time.

### ADR-7: Cookie-Based Session Without Authentication
**Context:** Session is identified by a random UUID stored in an httpOnly cookie. No login, no user identity.
**Decision:** Appropriate for this use case. The game needs session tracking for scoring but has no concept of user accounts. Cookie is httpOnly for basic anti-tampering.

### ADR-8: Multiple Test Frameworks (Jest + Vitest + Playwright + Robot Framework)
**Context:** Unit tests use Jest (backend) and Vitest (frontend). E2E uses Playwright (frontend-E2E) and Robot Framework (acceptance tests).
**Decision:** Over-engineered for the application size. Jest and Vitest serve the same purpose but in different stacks (justified). Playwright E2E covers browser automation. Robot Framework adds another layer of acceptance tests that overlaps with Playwright in purpose (both test the running application).
**Trade-off:** Redundant test coverage. Robot Framework tests add maintenance burden without significant additional value over Playwright. The two test runners for unit tests (Jest + Vitest) are justified by the different runtime environments (Node.js vs jsdom).

### ADR-9: 2-Second Artificial Delay on Action Reveal
**Context:** After submitting an action, the UI waits 2 seconds before showing the bot's choice and result.
**Decision:** UX choice. Creates anticipation, disguises network latency, and makes the game feel more interactive.
**Trade-off:** Adds complexity to state management (`isLocked`, `timerRef`). Could frustrate players who want fast play.

### ADR-10: SCSS Modules with Design Tokens
**Context:** All CSS uses SCSS modules with centralized design tokens in `tokens.scss`.
**Decision:** Good architectural choice. Provides a consistent design system: colors, spacing, typography, shadows, animation curves. Modules prevent style leakage.
**Benefit:** Theme changes propagate everywhere consistently. No magic values scattered across components.

---

## 10. Engineering Level Assessment

### Scoring Rubric

| Dimension | Score (1-5) | Rationale |
|-----------|-------------|-----------|
| **Component Separation** | 4 | Clean module boundaries, clear hook-component separation. Deductions for inconsistent injection patterns |
| **Data Flow** | 4 | Well-defined request-response flow. Deduction: WebSocket for high scores adds complexity that could have been polling |
| **Deployment Topology** | 4 | Docker multi-stage builds, documented deployment guide. Deduction: nginx in frontend container couples concerns |
| **Scalability** | 2 | In-memory sessions break with scale >1. No session affinity, no shared state, no caching |
| **Fault Tolerance** | 3 | Container restart, graceful degradation on backend failure. Missing: health checks, circuit breakers, retry logic |
| **Monitoring** | 2 | Basic health endpoint only. No structured logging, no metrics, no tracing |
| **Configuration Management** | 3 | Environment-driven but scattered across files. Some values hardcoded |
| **Test Coverage** | 5 | Comprehensive three-level test strategy with good coverage |
| **Security** | 4 | Server-authoritative game logic, rate limiting, httpOnly cookies, input validation, security headers |
| **Documentation** | 5 | README, DEPLOYMENT.md (Thai), PRODUCT.md, ARCHITECTURE.md (this doc) |
| **Interview-Appropriateness** | 4 | Demonstrates understanding of modern full-stack patterns without being incomprehensible |

### Overall Assessment: 3.6 / 5

### Is This Over-Engineered?

**Slightly over-engineered in these areas:**
- Robot Framework tests are redundant with Playwright E2E tests. Two E2E frameworks for a game with 3 API endpoints is disproportionate.
- `IScoreService` interface with custom DI token when there is -- and likely never will be -- a second implementation. Abstraction without known future variation is premature.
- RxJS `Subject` for a single event type that could have been handled with a simpler callback or EventEmitter pattern. However, the RxJS approach integrates naturally with NestJS.
- SCSS token system and multiple animation states for an interview challenge. Shows design maturity but is more polished than necessary.

**Appropriately engineered:**
- NestJS module structure proves understanding of enterprise patterns.
- Multi-stage Docker builds demonstrate CI/CD awareness.
- Three test levels (unit, E2E, acceptance) show testing philosophy.
- nginx rate limiting shows security consciousness.
- Anti-cheat architecture shows system thinking.

**Under-engineered:**
- No database (JSON file persistence with race conditions).
- In-memory sessions that break scaling.
- No scheduled session cleanup (dead code).
- No Docker health checks.
- No structured logging.

### Verdict for Interview Challenge

This architecture is **well-calibrated for a senior full-stack interview challenge**. It demonstrates:

1. **Awareness of production patterns** (Docker, nginx, rate limiting, WebSocket, multi-stage builds) without actually building production infrastructure that would distract from the game itself.

2. **Clean separation of concerns** that a reviewer can quickly evaluate: frontend/backend split, module structure, hook/component split, interface-based DI.

3. **"Tells the story"** of how the game works through its architecture. The data flow is clear, the anti-cheat design is explicit, the real-time feature uses a proper pub-sub pattern.

4. **Notable gaps** (scalability, monitoring) that provide natural discussion points during an interview review. An interviewer can ask: "How would you make this handle 10,000 concurrent players?" and the candidate can discuss Redis sessions, database choices, load balancing strategies.

The architecture is intentionally not production-grade -- that would be over-engineered for a take-home challenge. It is **demonstration-grade**: good enough to ship, clean enough to review, and with enough intentional gaps to discuss.

---

## 11. Recommendations

### Low Effort / High Impact

1. **Fix inconsistent DI patterns:** Make `GameGateway` inject `IScoreService` via `SCORE_SERVICE_TOKEN` instead of the concrete `ScoreService` class.

2. **Add Docker health checks:**
```yaml
backend:
  healthcheck:
    test: ["CMD", "wget", "--spider", "http://localhost:3001/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
frontend:
  depends_on:
    backend:
      condition: service_healthy
```

3. **Schedule session cleanup:** Add `setInterval` in ScoreService constructor to call `cleanupSessions()` periodically.

4. **Remove dead code:** The `currentScore` field in the request body of `api-test.sh` and robot tests is not used by the server. Clean up for clarity.

### Medium Effort

5. **Separate nginx into its own service:** Create an `nginx` service in docker-compose.yml, separate from the frontend. This decouples the gateway from the SPA and allows independent scaling/configuration.

6. **Add structured logging:** Replace `console.log` with a structured logger (NestJS Logger, pino, winston) for better debugging and production operations.

### For Production Readiness

7. **Replace JSON file with a database (SQLite for simplicity, Postgres for scale):** Solves persistence, concurrency, and data integrity.

8. **Add a shared session store (Redis):** Enables proper horizontal scaling while maintaining session continuity across backend instances.

9. **Implement proper health check logic** that verifies full subsystem availability (filesystem, session store, WebSocket).

10. **Add nginx ip_hash for session affinity** if scaling beyond 1 backend without changing session storage.

---

## Appendix: Files Referenced

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Container orchestration |
| `backend/Dockerfile` | Multi-stage NestJS build |
| `frontend/Dockerfile` | Multi-stage React + nginx build |
| `frontend/nginx.conf` | API gateway configuration |
| `backend/src/main.ts` | Application bootstrap |
| `backend/src/app.module.ts` | Module composition |
| `backend/src/game/game.controller.ts` | REST controller |
| `backend/src/game/game.service.ts` | Game business logic |
| `backend/src/game/play-request.dto.ts` | Request validation |
| `backend/src/score/score.service.ts` | Session + persistence |
| `backend/src/score/score.interface.ts` | Service contract |
| `backend/src/score/score.module.ts` | Global module + DI token |
| `backend/src/websocket/game.gateway.ts` | Socket.IO bridge |
| `frontend/src/App.tsx` | Root component |
| `frontend/src/hooks/useGame.ts` | Game state machine |
| `frontend/src/hooks/useHighScoreSocket.ts` | WebSocket client |
| `frontend/src/lib/api.ts` | HTTP client |
| `frontend/src/types/game.ts` | Shared types + constants |
| `frontend/src/styles/tokens.scss` | Design tokens |
| `frontend/nginx.conf` | Gateway + load balancer config |
| `DEPLOYMENT.md` | Thai-language deployment guide |
| `PRODUCT.md` | Product design document |
| `README.md` | Main documentation |
