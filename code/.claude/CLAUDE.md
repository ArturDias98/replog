
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## Project Documentation

The project documentation (backend API spec, sync strategy, etc.) lives in a separate repository: [replog-docs](https://github.com/ArturDias98/replog-docs).
When you need project requirements, API contracts, or sync behavior details, fetch the relevant files from that repository using `gh` or `WebFetch`.

## Project Structure

This is a monorepo following clean architecture (hexagonal) with three library projects and the web app:

```text
projects/
  shared/          → @replog/shared        — Domain entities and DTOs (pure TypeScript)
  application/     → @replog/application    — Use cases and abstract ports
  infrastructure/  → @replog/infrastructure — Concrete port implementations
src/app/           → Web application (components, routing, UI)
```

### Layer Rules

- **@replog/shared** — Pure TypeScript. No Angular dependencies. Only types, interfaces, and plain data structures.
- **@replog/application** — Angular `Injectable` services only (use cases and abstract port classes). No signals, `computed`, `input`/`output`, or any UI-layer APIs. Async operations use Promises.
- **@replog/infrastructure** — Concrete implementations of ports. No signals, `computed`, `input`/`output`, or any UI-layer APIs. Async operations use Promises; convert HttpClient Observables with `firstValueFrom`.
- **src/app/** — The only layer allowed to use Angular UI primitives (signals, `computed`, `input`/`output`, components, templates, `OnPush`, etc.).

### Dependency Rules

```text
@replog/shared         → no internal imports
@replog/application    → may import @replog/shared
@replog/infrastructure → may import @replog/shared and @replog/application
src/app/               → may import all three; @replog/infrastructure only in app.config.ts for DI wiring
```

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

## Services

- Design services around a single responsibility
- Use the `inject()` function instead of constructor injection
- Abstract ports use abstract classes (not interfaces) for Angular DI compatibility
- Use cases: `@Injectable({ providedIn: 'root' })`
- Infrastructure implementations: `@Injectable()` (provided manually in `app.config.ts`)

## Web App UI Rules (`src/app/` only)

The following rules apply exclusively to the web application layer (`src/app/`), not to library projects.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

### State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

### Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).
