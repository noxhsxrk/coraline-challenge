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
- Input validation via class-validator DTO (whitelist + forbidNonWhitelisted + transform).
- Session cookie is httpOnly with sameSite=strict -- not accessible to JavaScript.
- `forbidNonWhitelisted: true` in ValidationPipe rejects any unexpected request body fields (e.g., `currentScore`). This is a tight validation stance.

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

### 5.4 Cleanup Mechanism (FIXED)

`cleanupSessions(maxAgeMs = 30 * 60 * 1000)` in `ScoreService` is now **scheduled** via `setInterval` in `onModuleInit()`:
```typescript
onModuleInit(): void {
    this.cleanupTimer = setInterval(() => this.cleanupSessions(), SESSION_CLEANUP_MS);
}
```
- SESSION_CLEANUP_MS = 5 minutes
- Sessions older than 30 minutes are evicted
- Timer is cleared in `onModuleDestroy()`
- Unit tested (cleanupSessions spec covers expiry)

**This resolves the dead-code issue identified in the initial audit.**

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
| Graceful shutdown | SIGTERM/SIGINT handlers call `app.close()` then `process.exit(0)` | Added since initial audit |
| CORS | Configured for localhost origins only | Fine for production with proper domain |

### 6.2 Missing Resilience Patterns

- **No healthcheck in docker-compose:** `docker compose up` considers the backend "healthy" as soon as the process starts. If NestJS takes time to initialize, requests from nginx may fail.
- **No circuit breaker:** If backend is down, nginx continues to proxy requests, resulting in 502 errors instead of a graceful degraded state.
- **No retry logic in frontend:** API calls fail immediately on network error. The error message "Connection lost. Try again." is shown, but there is no automatic retry.
- **No graceful degradation for WebSocket:** If WebSocket connection fails, `socket.io-client` attempts polling fallback (configured), and auto-reconnection is enabled by default (reconnectionAttempts: Infinity). This is acceptable.

---

## 7. Monitoring & Observability

### 7.1 Current State

| Capability | Present? | Detail |
|------------|----------|--------|
| Health endpoint | Yes | `GET /api/health` returns `{ status: 'ok' }` |
| Security headers | Yes | Helmet middleware + nginx headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, Content-Security-Policy |
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
| Session cleanup interval | `score.service.ts` | 5 min | hardcoded |
| Session cleanup maxAge | `score.service.ts` | 30 min | function parameter, only one call-site |
| Reveal delay | `useGame.ts` | 2000ms | hardcoded |
| High score validation | `score.service.ts` | int, non-negative, finite checks | hardcoded |

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
**Context:** GameService depends on `IScoreService` through the `SCORE_SERVICE_TOKEN` provider, while GameGateway and GameController depend on concrete `ScoreService`.
**Decision:** Partially accepted. The interface abstraction in GameService is good practice. The inconsistency in GameGateway and GameController is a minor flaw (should also use the interface).
**Benefit:** ScoreService can be replaced with a Redis-backed implementation without changing GameService.

### ADR-5: RxJS Subject for Cross-Module Events
**Context:** ScoreService uses `highScoreChanged$ = new Subject<number>()` to notify WebSocket gateway of high score changes.
**Decision:** Good choice. Decouples the persistence layer from the real-time layer. GameGateway subscribes without ScoreService knowing about WebSocket at all.
**Benefit:** ScoreService has zero awareness of WebSocket/Socket.IO. Clean separation of concerns. Subject is properly completed on ModuleDestroy, and GameGateway unsubscribes on destroy -- no resource leaks.

### ADR-6: Two-Legged Real-Time Architecture
**Context:** High score updates are sent via Socket.IO, while game play results are returned via HTTP POST response.
**Decision:** Pragmatic. The game play flow is request-response (user expects immediate feedback), while high score updates benefit from push-based delivery. No need to make game play real-time.

### ADR-7: Cookie-Based Session Without Authentication
**Context:** Session is identified by a random UUID stored in an httpOnly cookie with sameSite=strict and secure flag in production. No login, no user identity.
**Decision:** Appropriate for this use case. The game needs session tracking for scoring but has no concept of user accounts. Cookie hardening (httpOnly + sameSite + secure) added since initial audit.

### ADR-8: Multiple Test Frameworks (Jest + Vitest + Playwright + Robot Framework)
**Context:** Unit tests use Jest (backend) and Vitest (frontend). E2E uses Playwright (frontend-E2E) and Robot Framework (acceptance tests).
**Decision:** Over-engineered for the application size. Jest and Vitest serve the same purpose but in different stacks (justified). Playwright E2E covers browser automation. Robot Framework adds another layer of acceptance tests that overlaps with Playwright in purpose (both test the running application).
**Trade-off:** Redundant test coverage. Robot Framework tests add maintenance burden without significant additional value over Playwright. Additionally, both Robot Framework tests and the bash API test script send `currentScore` in the POST body, which conflicts with the `forbidNonWhitelisted: true` ValidationPipe setting -- these tests will return HTTP 400 instead of 200/201.

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

| Dimension | Score (1-5) | Rationale | Delta from initial |
|-----------|-------------|-----------|--------------------|
| **Component Separation** | 4.5 | Clean module boundaries, clear hook-component separation, IScoreService interface. Minor deduction for inconsistent injection patterns (controller/gateway vs service) | +0.5 |
| **Data Flow** | 4 | Well-defined request-response flow, RxJS pub-sub for real-time, server-authoritative logic. Clean decoupling between persistence and WebSocket layers | 0 |
| **Deployment Topology** | 4 | Docker multi-stage builds, documented deployment guide. Deduction: nginx in frontend container couples concerns, no Docker health checks | 0 |
| **Scalability** | 2.5 | Session cleanup is now scheduled (FIXED). But in-memory sessions still break with scale >1. No session affinity, no shared state, no caching, sync file I/O | +0.5 |
| **Fault Tolerance** | 3.5 | Container restart, graceful degradation on file corruption, graceful shutdown via SIGTERM/SIGINT (ADDED). Still missing: Docker health checks, circuit breaker, retry logic | +0.5 |
| **Monitoring** | 2 | Basic health endpoint only. No structured logging, no metrics, no tracing | 0 |
| **Configuration Management** | 3 | Environment-driven but scattered across files. Some values hardcoded. Compile-time VITE_* env vars bake per-environment values | 0 |
| **Test Coverage** | 4 | Comprehensive three-level test strategy. Hook-level tests missing. Robot Framework and API test script send `currentScore` which conflicts with `forbidNonWhitelisted: true` validation | -0.5 (new finding) |
| **Security** | 4.5 | Server-authoritative game logic, rate limiting, httpOnly cookie (sameSite=strict, secure), Helmet middleware, CSP header, strict input validation (whitelist + forbidNonWhitelisted + transform) | +0.5 |
| **Documentation** | 5 | README, DEPLOYMENT.md (Thai), PRODUCT.md, ARCHITECTURE.md (this doc) | 0 |
| **Interview-Appropriateness** | 4.5 | Demonstrates mature patterns without being incomprehensible. Refactoring addressed the key concerns. The intentional gaps still serve as good interview discussion points | +0.5 |

### Overall Assessment: 3.8 / 5 (up from 3.6)

### What the Refactoring Achieved

The refactoring closed four of the initial audit's "low effort / high impact" recommendations:

1. **Session cleanup scheduled** -- `onModuleInit` now runs `setInterval(() => this.cleanupSessions(), 5min)`. Dead code eliminated.
2. **Graceful shutdown** -- SIGTERM and SIGINT handlers call `app.close()` before exit.
3. **Helmet + CSP** -- Helmet middleware on the NestJS backend, Content-Security-Policy in nginx, and the full set of security headers.
4. **Cookie hardening** -- `httpOnly: true`, `sameSite: 'strict'`, `secure: process.env.NODE_ENV === 'production'`.
5. **IScoreService interface** -- `GameService` injects via `SCORE_SERVICE_TOKEN` rather than concrete class.
6. **Stricter validation** -- `forbidNonWhitelisted: true` added to the ValidationPipe, rejecting unexpected fields.

### What Remains Unaddressed

1. **Inconsistent DI** -- `GameGateway` and `GameController` still inject concrete `ScoreService` instead of `IScoreService`.
2. **No Docker health checks** -- `docker-compose.yml` has no `healthcheck` blocks.
3. **Scalability bottleneck** -- In-memory sessions with no shared store; JSON file with sync I/O and no concurrent-write protection.
4. **Monitoring gap** -- No structured logging, metrics, or tracing.
5. **nginx coupled to frontend container** -- Changing nginx config requires rebuilding the frontend image.
6. **Test payloads out of sync** -- `api-test.sh` and Robot Framework tests send `currentScore` in the POST body, which is now rejected by `forbidNonWhitelisted: true`.

### Verdict for Interview Challenge

This architecture is **well-calibrated for a senior full-stack interview challenge**. It demonstrates:

1. **Awareness of production patterns** (Docker, nginx, rate limiting, WebSocket, multi-stage builds, graceful shutdown, security hardening) without actually building production infrastructure that would distract from the game itself.

2. **Responsiveness to code review** -- the refactoring addressed the initial audit findings, showing that the architecture evolves under review. This is a strong signal for an interview context.

3. **Clean separation of concerns** that a reviewer can quickly evaluate: frontend/backend split, module structure, hook/component split, interface-based DI.

4. **"Tells the story"** of how the game works through its architecture. The data flow is clear, the anti-cheat design is explicit, the real-time feature uses a proper pub-sub pattern.

5. **Intentional gaps** (scalability, monitoring, health checks) that provide natural discussion points during an interview review. An interviewer can ask: "How would you make this handle 10,000 concurrent players?" and the candidate can discuss Redis sessions, database choices, load balancing strategies.

---

## 11. Recommendations

### Low Effort / High Impact

1. **Fix inconsistent DI patterns:** Make `GameGateway` and `GameController` inject `IScoreService` via `SCORE_SERVICE_TOKEN` instead of the concrete `ScoreService` class. This completes the abstraction boundary.

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

3. **Fix test payloads:** Remove `currentScore` from the POST body in `scripts/api-test.sh` and Robot Framework API keywords. After the `forbidNonWhitelisted: true` change, this field triggers a 400 error.

4. **Remove redundant fields from DTO:** The `currentScore` reference in README.md API documentation should be removed (it says `{ action, currentScore }` but the DTO only accepts `action`).

### Medium Effort

5. **Separate nginx into its own service:** Create an `nginx` service in docker-compose.yml, separate from the frontend. This decouples the gateway from the SPA and allows independent scaling/configuration.

6. **Add structured logging:** Replace `console.log` with a structured logger (NestJS Logger, pino, winston) for better debugging and production operations.

7. **Add hook-level tests:** `useGame` is the most complex piece of frontend logic (state machine with async play, timers, error handling, history). It has no unit tests. Add Vitest tests with mocked API responses.

### For Production Readiness

8. **Replace JSON file with a database (SQLite for simplicity, Postgres for scale):** Solves persistence, concurrency, and data integrity.

9. **Add a shared session store (Redis):** Enables proper horizontal scaling while maintaining session continuity across backend instances.

10. **Implement proper health check logic** that verifies full subsystem availability (filesystem, session store, WebSocket).

11. **Add nginx ip_hash for session affinity** if scaling beyond 1 backend without changing session storage.

---

## Appendix: Files Referenced

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Container orchestration |
| `backend/Dockerfile` | Multi-stage NestJS build |
| `frontend/Dockerfile` | Multi-stage React + nginx build |
| `frontend/nginx.conf` | API gateway configuration |
| `backend/src/main.ts` | Application bootstrap (Helmet, cookie-parser, CORS, ValidationPipe, SIGTERM handler) |
| `backend/src/app.module.ts` | Module composition |
| `backend/src/game/game.controller.ts` | REST controller (cookie-based session management) |
| `backend/src/game/game.service.ts` | Game business logic (injects IScoreService via token) |
| `backend/src/game/play-request.dto.ts` | Request validation (class-validator) |
| `backend/src/score/score.service.ts` | Session + persistence + RxJS events (scheduled cleanup) |
| `backend/src/score/score.interface.ts` | Service contract (IScoreService) |
| `backend/src/score/score.module.ts` | Global module + DI token |
| `backend/src/websocket/game.gateway.ts` | Socket.IO bridge (subscribes to highScoreChanged$) |
| `frontend/src/App.tsx` | Root component |
| `frontend/src/hooks/useGame.ts` | Game state machine |
| `frontend/src/hooks/useHighScoreSocket.ts` | WebSocket client |
| `frontend/src/lib/api.ts` | HTTP client |
| `frontend/src/types/game.ts` | Shared types + constants |
| `frontend/src/styles/tokens.scss` | Design tokens |
| `frontend/nginx.conf` | Gateway + load balancer config (rate limits, security headers, CSP) |
| `DEPLOYMENT.md` | Thai-language deployment guide |
| `PRODUCT.md` | Product design document |
| `README.md` | Main documentation |
