# DeesseJS Functional Programming Principles

## Executive Summary

DeesseJS follows a **functional-first architecture** rooted in category theory principles. The framework eschews object-oriented patterns (classes, inheritance, mutable state) in favor of pure functions, controlled side effects, and railway-oriented error handling. This document outlines the core principles that guide DeesseJS design decisions.

---

## 1. Core Philosophy: Functional First

### 1.1 Why Functional Programming?

Functional programming provides:

| Benefit | Impact on DeesseJS |
|---------|-------------------|
| **Composability** | Small functions combine into complex workflows |
| **Predictability** | Same input → same output, no hidden state |
| **Testability** | Pure functions are trivially testable |
| **Concurrency** | No shared mutable state = easier parallelization |
| **Reasoning** | Code behavior is locally understandable |

### 1.2 No Classes

DeesseJS does not use classes. Instead, it uses:

**Plain Objects + Functions:**
```typescript
// BAD - Class-based (not used in DeesseJS)
class DeesseServer {
  constructor(config) { this.config = config; }
  async init() { /* ... */ }
}

// GOOD - Function-based
export function createDeesse(config: DeesseConfig): Deesse {
  return {
    auth: createAuth(config),
    pages: createPages(config),
  };
}
```

**Factory Functions:**
```typescript
export function createAuth(config: AuthConfig): Auth {
  return {
    signIn: (credentials) => signIn(config, credentials),
    signOut: (session) => signOut(config, session),
    getSession: (token) => getSession(config, token),
  };
}
```

**Record Types over Classes:**
```typescript
// Plain record type
export type Deesse = Readonly<{
  auth: Auth;
  pages: Pages;
  config: DeesseConfig;
}>;

// Not a class with methods
// Just data + functions that operate on data
```

### 1.3 No Inheritance

Inheritance creates tight coupling and unpredictable behavior. DeesseJS uses:

**Composition:**
```typescript
// Instead of inheritance
type Deesse = {
  auth: Auth;
  pages: Pages;
  plugins: Plugin[];
};

// Plugins compose, they don't inherit
const withAdmin = (deesse: Deesse): Deesse => ({
  ...deesse,
  admin: createAdmin(deesse),
});
```

**Functional Composition:**
```typescript
// Compose behaviors
export const withAuth = (app: App) => pipe(app, addAuth, addSession);
export const withPages = (app: App) => pipe(app, addPages, addRouting);
export const withPlugins = (app: App, plugins: Plugin[]) =>
  plugins.reduce((acc, plugin) => plugin(acc), app);
```

---

## 2. Category Theory Foundations

### 2.1 Functors and Applicatives

DeesseJS treats data transformations as functors:

```typescript
// Functor: mappable container
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

// map preserves structure
const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> =>
  result.ok ? { ok: true, value: fn(result.value) } : result;
```

**Maybe Functor (for optional values):**
```typescript
// No null, no undefined - use Maybe
type Maybe<T> = { kind: 'just'; value: T } | { kind: 'nothing' };

const mapMaybe = <T, U>(maybe: Maybe<T>, fn: (T) => U): Maybe<U> =>
  maybe.kind === 'just' ? { kind: 'just', value: fn(maybe.value) } : maybe;
```

### 2.2 Monads: Chaining Operations

DeesseJS uses monadic patterns for chained operations with error handling:

```typescript
// Result Monad - chain operations that can fail
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// andThen chains operations, short-circuiting on error
const andThen = <T, U, E>(
  result: Result<T, E>,
  next: (data: T) => Result<U, E>
): Result<U, E> =>
  result.success ? next(result.data) : result;

// Usage
const userResult = await findUser(id);
const sessionResult = andThen(userResult, user =>
  createSession(user)
);
const redirectResult = andThen(sessionResult, session =>
  redirectTo(session.redirectUrl)
);
```

### 2.3 Natural Transformations

Convert between types without information loss:

```typescript
// Maybe to Result - provide default on nothing
const fromMaybe = <T>(maybe: Maybe<T>, fallback: T): T =>
  maybe.kind === 'just' ? maybe.value : fallback;

// Result to Maybe - discard error information
const toMaybe = <T, E>(result: Result<T, E>): Maybe<T> =>
  result.success ? { kind: 'just', value: result.data } : { kind: 'nothing' };
```

---

## 3. No Globals

### 3.1 Why No Global State?

Global state creates:
- Hidden dependencies
- Race conditions
- Impossible to test in isolation
- Unpredictable behavior across the application

### 3.2 Dependency Injection

DeesseJS passes dependencies explicitly:

```typescript
// BAD - Global state
let globalConfig: DeesseConfig;
export function setConfig(config: DeesseConfig) { globalConfig = config; }
export function getUser() { return db.find(globalConfig); }

// GOOD - Dependency injection
export function getUser(config: DeesseConfig, db: Database): User {
  return db.find(config);
}

// Caller controls lifetime and instance
const user = getUser(config, db);
```

### 3.3 Context Passing

For request-scoped values, DeesseJS uses explicit context:

```typescript
// Context object - explicit, not global
type Context = {
  config: DeesseConfig;
  db: Database;
  session: Session | null;
  request: Request;
};

// Pass through call chain
async function handleRequest(
  ctx: Context,
  event: RequestEvent
): Promise<Response> {
  return pipe(
    validateSession(ctx, event),
    andThen(authenticate),
    andThen(loadData),
    andThen(render)
  );
}
```

### 3.4 Constants: Own File

Constants must have their own dedicated file, grouped by domain.

```
src/
├── session/
│   ├── types.ts
│   ├── constants.ts
│   └── index.ts
├── auth/
│   ├── types.ts
│   ├── constants.ts
│   └── index.ts
└── config/
    ├── types.ts
    ├── constants.ts
    └── index.ts
```

**Constants file example:**
```typescript
// session/constants.ts
export const DEFAULT_SESSION_TTL = 60 * 60 * 24; // 24 hours
export const SESSION_TOKEN_LENGTH = 32;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
```

**Rationale:**
- Domain first, then category (session/constants.ts not constants/session.ts)
- Easy to find (all session-related in one place)
- Easy to maintain (single responsibility)
- Easy to import (`import { DEFAULT_SESSION_TTL } from '@/session/constants'`)

---

## 4. Types: Own File

Types must also be in their own dedicated file, grouped by domain.

```
src/
├── session/
│   ├── types.ts       # SessionData, SessionToken, SessionError...
│   ├── constants.ts
│   └── index.ts
├── auth/
│   ├── types.ts       # User, Credentials, AuthError...
│   ├── constants.ts
│   └── index.ts
└── config/
    ├── types.ts       # DeesseConfig, PluginConfig...
    ├── constants.ts
    └── index.ts
```

**Types file example:**
```typescript
// auth/types.ts
export type UserId = string & { readonly brand: unique symbol };

export type User = Readonly<{
  id: UserId;
  email: Email;
  name: string;
  createdAt: Date;
}>;

export type Credentials = Readonly<{
  email: string;
  password: string;
}>;

export type AuthError =
  | { type: 'invalid_credentials' }
  | { type: 'user_not_found' }
  | { type: 'account_locked'; until: Date };
```

**Rationale:** Same as constants - domain first organization.

---

## 5. Controlled Side Effects

### 4.1 The Problem with Uncontrolled Effects

Side effects without boundaries cause:
- Race conditions
- Test failures
- Unpredictable behavior
- Security vulnerabilities

### 4.2 Effects as Data

DeesseJS represents effects as data, not as runtime behavior:

```typescript
// BAD - Side effect embedded
async function createUser(data: UserData) {
  const user = await db.users.create(data); // Direct DB call
  await sendEmail(user.email); // Embedded email
  return user;
}

// GOOD - Effects as return value
type UserCreationResult = {
  user: User;
  effects: Effect[]; // Describe effects, don't execute
};

function createUser(data: UserData): UserCreationResult {
  return {
    user: { id: generateId(), ...data },
    effects: [
      { type: 'db:create', resource: 'users', data },
      { type: 'email:send', to: data.email, template: 'welcome' },
    ],
  };
}

// Interpreter runs effects separately
async function interpretEffects(effects: Effect[], ctx: Context) {
  for (const effect of effects) {
    switch (effect.type) {
      case 'db:create': await ctx.db.create(effect.resource, effect.data); break;
      case 'email:send': await ctx.email.send(effect.to, effect.template); break;
    }
  }
}
```

### 4.3 IO Type

DeesseJS uses an `IO` type to mark effectful operations:

```typescript
// IO marks "this function has side effects"
type IO<T> = () => Promise<T>;

// Wrapped function
const readFile = (path: string): IO<string> => async () => {
  const fs = await import('fs/promises');
  return fs.readFile(path, 'utf-8');
};

// Pure function that returns effectful action
const loadConfig = (path: string): IO<DeesseConfig> => async () => {
  const content = await readFile(path)();
  return JSON.parse(content);
};

// Execute at the edge (main, server entry)
const config = await loadConfig('./config.json')();
const deesse = createDeesse(config);
```

### 4.4 Controlled Effects Pattern

```typescript
// Effect boundary at application edge
async function main() {
  // All effects happen here
  const config = await loadConfig()();
  const db = await connectDatabase()();
  const email = await createEmailClient()();

  const deesse = createDeesse(config, { db, email });

  // After this, handlers are mostly pure
  return startServer(deesse);
}

main().catch(console.error);
```

---

## 6. Railway-Oriented Programming (ROP)

### 5.1 Concept

Railway-oriented programming models computation as a railway with two tracks:
- **Success Track**: Happy path, value continues
- **Failure Track**: Error path, short-circuits to end

```
  Input
    │
    ▼
┌─────────────────┐
│   Validation    │──── ValidationError ──→ End (Error)
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│  Authentication │──── AuthError ──→ End (Error)
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│   Database      │──── DBError ──→ End (Error)
└────────┬────────┘
         │ OK
         ▼
      Output
```

### 5.2 Result Type Implementation

```typescript
// Result is the backbone of ROP
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Helper constructors
const ok = <T>(data: T): Result<T, never> => ({ success: true, data });
const err = <E>(error: E): Result<never, E> => ({ success: false, error });

// Map transforms success, passes through failure
const map = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> =>
  result.success ? ok(fn(result.data)) : result;

// MapError transforms failure, passes through success
const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> =>
  result.success ? result : err(fn(result.error));

// andThen chains operations (monadic bind)
const andThen = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> =>
  result.success ? fn(result.data) : result;
```

### 5.3 Usage in DeesseJS

**Validation:**
```typescript
type ValidationError = {
  field: string;
  message: string;
};

const validateEmail = (email: string): Result<string, ValidationError> => {
  if (!email.includes('@')) {
    return err({ field: 'email', message: 'Invalid email' });
  }
  return ok(email);
};

const validatePassword = (password: string): Result<string, ValidationError> => {
  if (password.length < 8) {
    return err({ field: 'password', message: 'Too short' });
  }
  return ok(password);
};
```

**Authentication:**
```typescript
type AuthError =
  | { type: 'invalid_credentials' }
  | { type: 'user_not_found' }
  | { type: 'account_locked' };

const signIn = (
  config: AuthConfig,
  credentials: Credentials
): Result<Session, AuthError> => {
  return pipe(
    findUserByEmail(config.db, credentials.email),
    andThen(user =>
      user
        ? verifyPassword(credentials.password, user.hash)
            ? ok(user)
            : err({ type: 'invalid_credentials' })
        : err({ type: 'user_not_found' })
    ),
    andThen(user => createSession(config.db, user)),
  );
};
```

**API Handler:**
```typescript
const handleSignIn = async (
  req: Request
): Promise<Result<Response, AuthError | ValidationError>> => {
  return pipe(
    parseRequest(req),
    andThen(parseBody),
    andThen(validateSignIn),
    andThen(signIn),
    andThen(createSuccessResponse),
    mapError(createErrorResponse),
  );
};
```

### 5.4 Combining Multiple Results

**map2 for parallel operations:**
```typescript
const map2 = <T, U, V, E>(
  result1: Result<T, E>,
  result2: Result<U, E>,
  fn: (t: T, u: U) => V
): Result<V, E> =>
  result1.success && result2.success
    ? ok(fn(result1.data, result2.data))
    : result1.success
      ? result2
      : result1;

// Usage: Validate two fields in parallel
const validateCredentials = (
  email: string,
  password: string
): Result<Credentials, ValidationError> =>
  map2(
    validateEmail(email),
    validatePassword(password),
    (email, password) => ({ email, password })
  );
```

**traverse for collections:**
```typescript
const traverse = <T, U, E>(
  items: T[],
  fn: (item: T) => Result<U, E>
): Result<U[], E> => {
  const results: U[] = [];
  for (const item of items) {
    const result = fn(item);
    if (!result.success) return result;
    results.push(result.data);
  }
  return ok(results);
};

// Usage: Validate all items
const validateAll = (items: Item[]): Result<ValidItem[], ValidationError> =>
  traverse(items, validateItem);
```

### 5.5 Error Aggregation

```typescript
// Collect all errors, don't short-circuit on first
type ResultAll<T, E> = {
  success: true; data: T
} | { success: false; errors: E[] };

const map2All = <T, U, V, E>(
  result1: Result<T, E>,
  result2: Result<U, E>,
): ResultAll<[T, U], E> =>
  result1.success && result2.success
    ? { success: true, data: [result1.data, result2.data] }
    : {
        success: false,
        errors: [
          ...(result1.success ? [] : [result1.error]),
          ...(result2.success ? [] : [result2.error]),
        ],
      };
```

---

## 7. Async Operations: AsyncResult

### 6.1 AsyncResult Type

For async operations, DeesseJS uses `AsyncResult`:

```typescript
type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Helper
const asyncOk = <T>(data: T): AsyncResult<T, never> =>
  Promise.resolve(ok(data));

const asyncErr = <E>(error: E): AsyncResult<never, E> =>
  Promise.resolve(err(error));
```

### 6.2 Async ROP

```typescript
// Async andThen
const andThenAsync = async <T, U, E>(
  result: AsyncResult<T, E>,
  fn: (data: T) => AsyncResult<U, E>
): AsyncResult<U, E> => {
  const resolved = await result;
  return resolved.success ? fn(resolved.data) : resolved;
};

// Async map
const mapAsync = async <T, U, E>(
  result: AsyncResult<T, E>,
  fn: (data: T) => U
): AsyncResult<U, E> => {
  const resolved = await result;
  return resolved.success ? ok(fn(resolved.data)) : resolved;
};
```

### 6.3 Full Example

```typescript
const handleCreateUser = async (
  req: Request
): AsyncResult<User, ValidationError | AuthError | DBError> => {
  return pipe(
    async () => parseRequest(req),
    andThenAsync(({ email, password, name }) =>
      map2(
        validateEmail(email),
        validatePassword(password),
        (email, password) => ({ email, password, name })
      )
    ),
    andThenAsync(({ email, password, name }) =>
      async () => checkEmailNotExists(email)
    ),
    andThenAsync(({ email, password, name }) =>
      async () => createUser({ email, password, name })
    ),
    andThenAsync(user =>
      asyncOk(createCreatedResponse(user))
    ),
    mapError(createValidationErrorResponse)
  );
};
```

---

## 8. Pattern: Pipe and Flow

### 7.1 Pipe Operator

`pipe` passes a value through a series of functions:

```typescript
const pipe = <T>(value: T): { andThen: <U>(fn: (T) => U) => { andThen: <V>(fn2: (U) => V) => V } } => ({
  andThen: <U>(fn: (T) => U) => pipe(fn(value)),
});

// Usage (simplified - actual implementation may vary)
const result = pipe(initialValue)
  .andThen(transform1)
  .andThen(transform2)
  .andThen(transform3);
```

### 7.2 Function Composition

```typescript
// Compose: right-to-left
const compose = <T, U, V>(
  fn2: (U) => V,
  fn1: (T) => U
) => (value: T) => fn2(fn1(value));

// Usage
const processAndValidate = compose(
  validate,
  process
);
```

### 7.3 Step Pattern

DeesseJS often uses named steps for clarity:

```typescript
const createUser = (config: Config) => ({
  validate: (data: unknown) => validateUserData(data),
  checkExists: (data: ValidData) => checkEmailUnique(config.db, data.email),
  create: (data: ValidData & { unique: true }) => createUserRecord(config.db, data),
  sendWelcome: (user: User) => sendEmail(config.email, user.email, 'welcome'),
});

const handleCreateUser = async (data: unknown) => {
  const steps = createUser(config);
  return pipe(data)
    .andThen(steps.validate)
    .andThen(steps.checkExists)
    .andThen(steps.create)
    .andThen(steps.sendWelcome);
};
```

---

## 9. TypeScript Patterns

### 8.1 Branded Types

Prevent mixing similar types:

```typescript
// Branded type for User ID
type UserId = string & { readonly brand: unique symbol };
const UserId = (id: string): UserId => id as UserId;

// Now these are incompatible
type SessionToken = string & { readonly brand: unique symbol };

// Won't compile - types are distinct
const userId: UserId = sessionToken; // Error!
```

### 8.2 Phantom Types

Encode constraints in types:

```typescript
// State machine with phantom types
type Unvalidated = { readonly _state: 'unvalidated' };
type Validated = { readonly _state: 'validated' };
type Active = { readonly _state: 'active' };

type UserState<S> = {
  id: UserId;
  email: string;
  state: S;
};

// Can only call activate if validated
const activate = (user: UserState<Validated>): UserState<Active> => ({
  ...user,
  state: 'active',
});

// Won't compile - unvalidated cannot activate
const invalid: UserState<Unvalidated> = { id, email, state: 'unvalidated' };
activate(invalid); // Error!
```

### 8.3 Discriminated Unions

Model states without null/undefined:

```typescript
// Instead of nullable types
type User = UserFound | { type: 'not_found' } | { type: 'error'; message: string };

// Exhaustive handling
const handleUser = (user: User) => {
  switch (user.type) {
    case 'found': return user.email;
    case 'not_found': return 'User not found';
    case 'error': return user.message;
  }
};
```

---

## 10. Testing Principles

### 9.1 Pure Functions = Easy Tests

```typescript
// Easy to test - pure function
const calculateTotal = (items: CartItem[]): number =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

// Tests are trivial
test('calculateTotal sums prices', () => {
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 1 },
  ];
  expect(calculateTotal(items)).toBe(25);
});
```

### 9.2 Testing ROP Functions

```typescript
// Test each branch explicitly
test('validateEmail returns error for invalid email', () => {
  const result = validateEmail('not-an-email');
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.field).toBe('email');
  }
});

test('validateEmail returns email for valid input', () => {
  const result = validateEmail('user@example.com');
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBe('user@example.com');
  }
});
```

### 9.3 Mocking Controlled Effects

```typescript
// Inject mock dependencies
const createTestDeesse = (overrides: Partial<Dependencies>) =>
  createDeesse(config, {
    db: mockDatabase(),
    email: mockEmail(),
    ...overrides,
  });

test('sends welcome email on user creation', async () => {
  const mockEmail = createMockEmail();
  const deesse = createTestDeesse({ email: mockEmail });

  await createUser(deesse, { email: 'test@example.com', password: 'password' });

  expect(mockEmail.sent).toHaveLength(1);
  expect(mockEmail.sent[0].template).toBe('welcome');
});
```

---

## 11. Summary: Principles in Practice

### The DeesseJS Way

| Principle | Implementation |
|-----------|----------------|
| **Functional First** | Factory functions, not classes. Data + functions, not objects with methods |
| **No Classes** | Plain objects, records, factory functions |
| **No Globals** | Dependency injection, explicit context passing |
| **Controlled Effects** | IO type, effect interpreters, explicit boundaries |
| **Railway-Oriented** | Result type with success/error tracks, short-circuit on failure |
| **Category Theory** | Functors (map), Monads (andThen), natural transformations |

### What This Means for Code

```typescript
// Every function is testable
// Every effect is explicit
// Every error is handled
// State is passed, not shared
// Composition over inheritance

// Example: DeesseJS handler
const handle = async (req: Request): AsyncResult<Response, AppError> =>
  pipe(req)
    .andThen(parseAndValidate)
    .andThen(executeBusinessLogic)
    .andThen(renderResponse)
    .mapError(handleError)
    .data;
```

### Comparison with Payload CMS

| Aspect | Payload CMS | DeesseJS |
|--------|-------------|----------|
| Initialization | Class-based `getPayload` | Function-based `createDeesse` |
| State | Global singleton | Injected dependencies |
| Errors | Exceptions thrown | Result type returned |
| Side effects | Embedded | Explicit via IO type |
| Testing | Requires mocking globals | Pure functions, easy to test |

---

## References

- [Railway-Oriented Programming](https://fsharpforfunandprofit.com/rop/)
- [Functional Programming Patterns](https://www.manning.com/books/functional-programming-patterns)
- [Category Theory for Programmers](https://github.com/hmemcpy/milewski-ctfp-pdf)
- [Why Functional Programming Matters](https://www.cs.kent.ac.uk/people/staff/dat/miranda/whyfp90.pdf)
