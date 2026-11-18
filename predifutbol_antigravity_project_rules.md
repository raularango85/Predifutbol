# Project Architecture & Coding Standards

You are an expert full-stack engineer assisting with the migration and development of a modern web application consisting of a **Go (Golang)** backend and a **React (TypeScript)** frontend. Follow all architectural boundaries, design patterns, and strict conventions outlined below.

---

## 1. General Workspace Rules

- **API-First Contract Alignment:** When creating or modifying features, always define or update the Go backend DTOs/structs first, then immediately generate or update the matching TypeScript interfaces in the frontend so JSON payloads remain strictly synchronized.
- **No Unsolicited Over-Engineering:** Keep solutions idiomatic, readable, and simple. Prefer standard libraries and established patterns over complex abstractions.
- **Incremental Verification:** Whenever implementing a new backend usecase or frontend custom hook, generate corresponding unit tests alongside the implementation.

---

## 2. Backend Standards (Go)

### Directory Structure
Strictly adhere to Clean / Layered Architecture under `backend/`:
```text
backend/
├── cmd/
│   └── server/
│       └── main.go          # Application entry point, dependency wiring, graceful shutdown
├── internal/
│   ├── domain/              # Core entities, domain errors, and repository/usecase interfaces
│   ├── delivery/
│   │   └── http/            # HTTP handlers, middleware, router setup, request/response DTOs
│   ├── usecase/             # Pure business logic and transaction orchestration
│   └── repository/          # Database persistence implementations (SQL)
├── pkg/                     # Reusable, domain-agnostic utilities
├── go.mod
└── go.sum
```

### Architectural & Coding Rules
1. **Strict Layer Isolation:**
   - `delivery/http`: Responsible ONLY for parsing HTTP requests, validating input payloads, calling usecases, and encoding JSON responses. **NEVER** write SQL queries or core business logic inside HTTP handlers.
   - `usecase`: Responsible for business rules and workflow orchestration. Must remain completely agnostic of HTTP concepts (`http.Request`, status codes, headers) and raw SQL drivers.
   - `repository`: Responsible ONLY for database queries and mapping database rows to `domain` structs.
2. **Dependency Injection:**
   - **NEVER** use global variables or `init()` functions for database connections, loggers, or services.
   - Pass all dependencies explicitly through constructor functions (e.g., `NewUserUsecase(repo domain.UserRepository)`).
3. **Context Propagation:**
   - Always pass `ctx context.Context` as the first parameter in all usecase and repository methods to support request cancellation and timeouts.
4. **Error Handling & Logging:**
   - Never ignore errors (`_ = ...` is forbidden unless explicitly justified).
   - Wrap errors with context using `fmt.Errorf("layer/action: %w", err)`.
   - Use Go's standard `log/slog` for structured JSON/key-value logging.
5. **Database Transactions:**
   - Multi-step write operations must be executed atomically within a database transaction managed at the `usecase` layer.

---

## 3. Frontend Standards (React + TypeScript)

### Directory Structure
Organize code using a **Feature-Based Architecture** under `frontend/src/`:
```text
frontend/src/
├── app/                     # App root, global providers, router configuration
├── components/              # Shared, domain-agnostic atomic UI components (Button, Input, Modal)
├── features/                # Self-contained domain modules
│   └── <feature-name>/
│       ├── components/      # Feature-specific UI components
│       ├── hooks/           # Custom hooks encapsulating state, side effects, and queries
│       ├── api.ts           # API client calls mapped to backend endpoints
│       └── types.ts         # TypeScript interfaces matching Go backend DTOs
├── hooks/                   # Global reusable utility hooks (e.g., useDebounce)
├── services/                # Base HTTP client configuration (interceptors, auth headers)
└── utils/                   # Pure formatting and helper functions
```

### Architectural & Coding Rules
1. **Custom Hooks for Logic & Data Fetching:**
   - **NEVER** perform raw `fetch` or `axios` calls directly inside React UI components.
   - Encapsulate all asynchronous data fetching, state management, and complex side effects inside dedicated custom hooks located in `features/<feature-name>/hooks/` (e.g., `useOrders.ts`, `useCreateOrder.ts`).
2. **Presentational vs. Container Separation:**
   - Keep UI components declarative and focused on rendering. Pass data and event handlers via props or consume them cleanly from feature hooks.
   - Avoid monolithic components; break down complex views into smaller, single-responsibility subcomponents.
3. **Strict TypeScript:**
   - **NEVER** use `any`. Explicitly define interfaces or types for all component props, API responses, and hook return values.
   - Keep DTO types in `features/<feature-name>/types.ts` aligned with Go JSON struct tags (`json:"field_name"`).
4. **State Management:**
   - Prefer local component state (`useState`, `useReducer`) and server-state hooks over global state stores unless state is genuinely shared across unrelated features (e.g., authenticated user session, theme).
5. **Clean Effects:**
   - Minimize `useEffect` usage. Do not use `useEffect` to transform data for rendering or to sync derived state—compute derived values directly during render or memoize with `useMemo` when computationally expensive.
   

### Implementation Plans & Change Logs
Stick to Markdown (.md) for the Source of Truth: Implementation plans, technical specifications, and rule definitions should remain in Markdown. Antigravity natively parses Markdown plans to power its built-in interactive tracking features (such as progress checklists, approval buttons, and step execution controls). Furthermore, Markdown maintains clean git diffs, consumes fewer context tokens, and survives long-term archiving.

Use HTML When You Need Visual Interactivity: Some developers use HTML artifacts when they want the agent to build a temporary, self-contained dashboard—such as a side-by-side architectural comparison matrix, an interactive system topology map, or a visual demo of a frontend flow that requires embedded JavaScript or custom CSS styling.   