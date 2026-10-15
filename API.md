# API Reference

Technical specification of the public API of `@domain-first/wire`.

- [Package](#package)
- [Exports overview](#exports-overview)
- [Generators](#generators)
    - [`wireClass`](#wireclass)
    - [`wireFunction`](#wirefunction)
    - [`wireValue`](#wirevalue)
    - [`wireClassAsync`](#wireclassasync)
    - [`wireFunctionAsync`](#wirefunctionasync)
    - [`branchedWire`](#branchedwire)
    - [`branchedWireAsync`](#branchedwireasync)
- [Decorators](#decorators)
    - [`memoWire`](#memowire)
    - [`memoWireAsync`](#memowireasync)
- [Errors](#errors)
    - [`NonExistingBranchError`](#nonexistingbrancherror)
- [Types](#types)
    - [`Wire<T>` and `AsyncWire<T>`](#wiret-and-asyncwiret)
    - [`WiredTuple<T>` and `AsyncWiredTuple<T>`](#wiredtuplet-and-asyncwiredtuplet)
    - [Parameter helpers](#parameter-helpers)
    - [`UnwrapWire<T>`](#unwrapwiret)
    - [`MemoWireOutcome<T>`](#memowireoutcomet)
    - [`MemoWireCondition<T>`](#memowireconditiont)
- [Runtime semantics](#runtime-semantics)
    - [Dependency resolution](#dependency-resolution)

Notation used below:

- A **wire** is a function with no parameters that builds a value: [`Wire<T>`](#wiret-and-asyncwiret) is `() => T`.
- An **async wire** is a wire that returns a promise: [`AsyncWire<T>`](#wiret-and-asyncwiret) is `() => Promise<T>`. Every async wire is also a `Wire<Promise<T>>`.
- **Calling a wire** means invoking it: `wire()`. Nothing is built before that.
- **Dependencies** are a tuple of wires, one per constructor or function parameter, in the same order.

## Package

| Property     | Value                                              |
| ------------ | -------------------------------------------------- |
| Name         | `@domain-first/wire`                               |
| Entry point  | `.` (single entry, no subpath exports)             |
| Formats      | ESM (`dist/index.js`), CommonJS (`dist/index.cjs`) |
| Types        | `dist/index.d.ts`                                  |
| Dependencies | `@domain-first/errors`                             |
| Syntax       | ES syntax supported by Node.js 22                  |

## Exports overview

| Export                           | Kind     | Section                                                   |
| -------------------------------- | -------- | --------------------------------------------------------- |
| `wireClass`                      | function | [`wireClass`](#wireclass)                                 |
| `wireFunction`                   | function | [`wireFunction`](#wirefunction)                           |
| `wireValue`                      | function | [`wireValue`](#wirevalue)                                 |
| `wireClassAsync`                 | function | [`wireClassAsync`](#wireclassasync)                       |
| `wireFunctionAsync`              | function | [`wireFunctionAsync`](#wirefunctionasync)                 |
| `branchedWire`                   | function | [`branchedWire`](#branchedwire)                           |
| `branchedWireAsync`              | function | [`branchedWireAsync`](#branchedwireasync)                 |
| `memoWire`                       | function | [`memoWire`](#memowire)                                   |
| `memoWireAsync`                  | function | [`memoWireAsync`](#memowireasync)                         |
| `NonExistingBranchError`         | class    | [`NonExistingBranchError`](#nonexistingbrancherror)       |
| `Wire`                           | type     | [`Wire<T>` and `AsyncWire<T>`](#wiret-and-asyncwiret)     |
| `AsyncWire`                      | type     | [`Wire<T>` and `AsyncWire<T>`](#wiret-and-asyncwiret)     |
| `WiredTuple`                     | type     | [`WiredTuple<T>` and `AsyncWiredTuple<T>`](#wiredtuplet-and-asyncwiredtuplet) |
| `AsyncWiredTuple`                | type     | [`WiredTuple<T>` and `AsyncWiredTuple<T>`](#wiredtuplet-and-asyncwiredtuplet) |
| `WireConstructorParameters`      | type     | [Parameter helpers](#parameter-helpers)                   |
| `AsyncWireConstructorParameters` | type     | [Parameter helpers](#parameter-helpers)                   |
| `WireFunctionParameters`         | type     | [Parameter helpers](#parameter-helpers)                   |
| `AsyncWireFunctionParameters`    | type     | [Parameter helpers](#parameter-helpers)                   |
| `UnwrapWire`                     | type     | [`UnwrapWire<T>`](#unwrapwiret)                           |
| `MemoWireOutcome`                | type     | [`MemoWireOutcome<T>`](#memowireoutcomet)                 |
| `MemoWireCondition`              | type     | [`MemoWireCondition<T>`](#memowireconditiont)             |

Nothing else is part of the public API.

## Generators

Generators create wires.

### `wireClass`

Creates a wire that instantiates a class with its constructor dependencies.

**Signature**

```ts
function wireClass<C extends new (...args: any[]) => any>(
    Class: C,
    dependencies: WireConstructorParameters<C>
): Wire<InstanceType<C>>;
```

**Parameters**

| Name           | Type                           | Description                                                       |
| -------------- | ------------------------------ | ----------------------------------------------------------------- |
| `Class`        | `C`                            | Any constructible class, including third-party ones.              |
| `dependencies` | `WireConstructorParameters<C>` | One wire per constructor parameter, in order. `[]` for no parameters. |

**Returns**

`Wire<InstanceType<C>>`.

**Behavior**

- Every call of the returned wire calls every dependency wire and then `new Class(...values)`. The result is a new instance each time; use [`memoWire`](#memowire) for a singleton.
- Dependencies are called synchronously, left to right. See [Dependency resolution](#dependency-resolution).
- The tuple is checked against `ConstructorParameters<C>`: a missing, extra, misplaced or mistyped wire is a compile error. Optional and rest parameters follow the constructor's tuple type.

**Throws**

Whatever a dependency wire or the constructor throws. The returned wire stops at the first error.

**Example**

```ts
class UserService {
    constructor(db: Database, logger: Logger) {}
}

const wireUserService = wireClass(UserService, [wireDb, wireLogger]);

wireClass(UserService, [wireLogger, wireDb]); // ❌ compile error
```

### `wireFunction`

Creates a wire that calls a function with its parameter dependencies.

**Signature**

```ts
function wireFunction<Fn extends (...args: any[]) => any>(
    fn: Fn,
    dependencies: WireFunctionParameters<Fn>
): Wire<ReturnType<Fn>>;
```

**Parameters**

| Name           | Type                         | Description                                                |
| -------------- | ---------------------------- | ---------------------------------------------------------- |
| `fn`           | `Fn`                         | Any function: a factory, a closure, a curried function.    |
| `dependencies` | `WireFunctionParameters<Fn>` | One wire per parameter, in order. `[]` for no parameters.  |

**Returns**

`Wire<ReturnType<Fn>>`.

**Behavior**

- Every call of the returned wire calls every dependency wire and then `fn(...values)`, returning its result as is.
- `fn` is called without a `this`. Bind methods before wiring them.
- If `fn` returns a promise, the wire returns that promise unchanged. Dependencies must still be sync wires; use [`wireFunctionAsync`](#wirefunctionasync) for async ones.

**Throws**

Whatever a dependency wire or `fn` throws.

**Example**

```ts
const createLogger = (config: Config): Logger => pino({ level: config.logLevel });

const wireLogger = wireFunction(createLogger, [wireConfig]); // Wire<Logger>
```

### `wireValue`

Wraps an existing value into a wire.

**Signature**

```ts
function wireValue<T>(value: T): Wire<T>;
```

**Returns**

`Wire<T>` that returns `value` on every call.

**Behavior**

- The value is stored by reference. Every call returns the same reference: it is not copied or frozen.
- Wrapping a promise gives an `AsyncWire` that returns the same promise every time.

**Throws**

Nothing.

**Example**

```ts
const wirePrisma = wireValue(prismaClient);
```

### `wireClassAsync`

Same as [`wireClass`](#wireclass), but dependencies may be async wires.

**Signature**

```ts
function wireClassAsync<C extends new (...args: any[]) => any>(
    Class: C,
    dependencies: AsyncWireConstructorParameters<C>
): AsyncWire<InstanceType<C>>;
```

**Parameters**

| Name           | Type                                | Description                                                       |
| -------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `Class`        | `C`                                 | Any constructible class.                                          |
| `dependencies` | `AsyncWireConstructorParameters<C>` | One wire per constructor parameter, in order. Each one may be sync (`Wire<P>`) or async (`AsyncWire<P>`). |

**Returns**

`AsyncWire<InstanceType<C>>`. Always async, even when every dependency is sync.

**Behavior**

- Every call of the returned wire calls every dependency wire, awaits all results in parallel with `Promise.all`, then calls `new Class(...values)`.
- The constructor runs only after every dependency has resolved.
- An `AsyncWire<P>` fits a parameter of type `P`; an `AsyncWire<Q>` for an unrelated `Q` is a compile error.

**Throws**

Never synchronously. The returned promise rejects with:

| Reason                                    | When                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| The thrown error                          | A dependency wire throws synchronously.                      |
| The first rejection reason                | One or more dependency promises reject (`Promise.all` rules). |
| The thrown error                          | The constructor throws.                                      |

**Example**

```ts
const wireUserService = wireClassAsync(UserService, [
    wireDb, // AsyncWire<Database>
    wireLogger, // Wire<Logger>
]);

const userService = await wireUserService();
```

### `wireFunctionAsync`

Same as [`wireFunction`](#wirefunction), but dependencies may be async wires.

**Signature**

```ts
function wireFunctionAsync<Fn extends (...args: any[]) => any>(
    fn: Fn,
    dependencies: AsyncWireFunctionParameters<Fn>
): AsyncWire<Awaited<ReturnType<Fn>>>;
```

**Parameters**

| Name           | Type                              | Description                                                      |
| -------------- | --------------------------------- | ---------------------------------------------------------------- |
| `fn`           | `Fn`                              | Any function, sync or async.                                     |
| `dependencies` | `AsyncWireFunctionParameters<Fn>` | One wire per parameter, in order. Each one may be sync or async. |

**Returns**

`AsyncWire<Awaited<ReturnType<Fn>>>`. If `fn` is async, its result is awaited: the wire never resolves to a nested promise.

**Behavior**

Same as [`wireClassAsync`](#wireclassasync), with `fn(...values)` in place of the constructor. `fn` is called without a `this`.

**Throws**

Never synchronously. The returned promise rejects as described for [`wireClassAsync`](#wireclassasync), and also when the promise returned by `fn` rejects.

**Example**

```ts
const connect = async (config: Config): Promise<Database> => Database.connect(config.dbUrl);

const wireDb = wireFunctionAsync(connect, [wireConfig]); // AsyncWire<Database>
```

### `branchedWire`

Creates a wire that picks one of several wires at runtime.

**Signature**

```ts
function branchedWire<Branch extends string>(
    selector: () => Branch
): <T extends Record<Branch, Wire<any>>>(choices: T) => Wire<UnwrapWire<T[keyof T]>>;
```

**Parameters**

| Name       | Type           | Description                                                          |
| ---------- | -------------- | -------------------------------------------------------------------- |
| `selector` | `() => Branch` | Returns the current branch: environment, feature flag, tenant, …     |
| `choices`  | `T`            | One wire per branch. Every member of `Branch` must be a key.         |

**Returns**

A function that takes `choices` and returns `Wire<UnwrapWire<T[keyof T]>>`: a wire of the union of all branch results. The first call is meant to be reused for several sets of choices.

**Behavior**

- Every call of the returned wire calls `selector`, then calls only the wire of the selected branch. Other branches are never called.
- A missing branch in `choices` is a compile error. Extra keys are allowed.
- The branch is looked up with the `in` operator, so it must be a key of `choices` or of its prototype chain.
- Branch wires may be async: the result is then a promise, typed as the union of branch results. Use [`branchedWireAsync`](#branchedwireasync) when the selector itself is async.

**Throws**

| Error                                                 | When                                          |
| ----------------------------------------------------- | --------------------------------------------- |
| [`NonExistingBranchError`](#nonexistingbrancherror)   | `selector` returns a key missing in `choices`. |
| Whatever it throws                                    | `selector` or the selected wire throws.       |

**Example**

```ts
type Env = "test" | "dev" | "prod";

const byEnv = branchedWire<Env>(() => getEnv());

const wireUserRepository = byEnv({
    test: wireInMemoryRepo,
    dev: wirePrismaRepo,
    prod: wirePrismaRepo,
}); // Wire<InMemoryUserRepository | PrismaUserRepository>
```

### `branchedWireAsync`

Same as [`branchedWire`](#branchedwire), but the branch is selected asynchronously.

**Signature**

```ts
function branchedWireAsync<Branch extends string>(
    selector: () => Promise<Branch>
): <T extends Record<Branch, Wire<any>>>(
    choices: T
) => AsyncWire<Awaited<UnwrapWire<T[keyof T]>>>;
```

**Parameters**

| Name       | Type                    | Description                                          |
| ---------- | ----------------------- | ---------------------------------------------------- |
| `selector` | `() => Promise<Branch>` | Resolves to the current branch.                      |
| `choices`  | `T`                     | One wire per branch. Each one may be sync or async.  |

**Returns**

A function that takes `choices` and returns `AsyncWire<Awaited<UnwrapWire<T[keyof T]>>>`. Always async; results of async branches are awaited.

**Behavior**

- Every call of the returned wire awaits `selector`, then calls only the wire of the selected branch.
- The rest is the same as [`branchedWire`](#branchedwire).

**Throws**

Never synchronously. The returned promise rejects with:

| Reason                                                | When                                               |
| ----------------------------------------------------- | -------------------------------------------------- |
| [`NonExistingBranchError`](#nonexistingbrancherror)   | `selector` resolves to a key missing in `choices`. |
| The error or rejection reason                         | `selector` or the selected wire throws or rejects. |

**Example**

```ts
const byFlag = branchedWireAsync<"new" | "legacy">(async () =>
    (await flags.isEnabled("new-search")) ? "new" : "legacy",
);

const wireSearch = byFlag({ new: wireNewSearch, legacy: wireLegacySearch });
// AsyncWire<NewSearch | LegacySearch>
```

## Decorators

Decorators take a wire and return a wire of the same type with extra behavior.

### `memoWire`

Turns a wire into a lazy singleton.

**Signature**

```ts
function memoWire<T>(wire: Wire<T>, condition?: MemoWireCondition<T>): Wire<T>;
```

**Parameters**

| Name        | Type                   | Description                                                                 |
| ----------- | ---------------------- | --------------------------------------------------------------------------- |
| `wire`      | `Wire<T>`              | The wire to memoize.                                                        |
| `condition` | `MemoWireCondition<T>` | Decides whether an outcome is memoized. Defaults to `(outcome) => outcome.success`. |

**Returns**

`Wire<T>`.

**Behavior**

- Nothing is called until the first call of the returned wire.
- Until an outcome is memoized, every call runs `wire`, wraps the result in a [`MemoWireOutcome`](#memowireoutcomet) and passes it to `condition`:

| `condition` returns | Outcome is a value                      | Outcome is an error                    |
| ------------------- | --------------------------------------- | -------------------------------------- |
| `true`              | Memoized and returned                   | Memoized and thrown                    |
| `false`             | Returned, the next call runs `wire` again | Thrown, the next call runs `wire` again |

- Once an outcome is memoized, `wire` and `condition` are never called again: every call returns the same value or throws the same error object.
- Each `memoWire` call has its own cache. Memoizing the same wire twice gives two independent singletons.
- With an async wire, the promise itself is memoized, rejected or not. Use [`memoWireAsync`](#memowireasync) for async wires.

**Throws**

| Error              | When                                                             |
| ------------------ | ---------------------------------------------------------------- |
| Whatever it throws | `wire` throws (memoized or not, depending on `condition`).        |
| Whatever it throws | `condition` throws. Nothing is memoized, the next call retries.  |

**Example**

```ts
const wireRepo = memoWire(wireClass(InMemoryUserRepository, [wireInMemoryDb]));

wireRepo() === wireRepo(); // true

// memoize failures too
const wireStrict = memoWire(wireSomething, () => true);
```

### `memoWireAsync`

Turns an async wire into a lazy singleton that shares the pending promise and retries after a failure.

**Signature**

```ts
function memoWireAsync<T>(wire: AsyncWire<T>, condition?: MemoWireCondition<T>): AsyncWire<T>;
```

**Parameters**

| Name        | Type                   | Description                                                                 |
| ----------- | ---------------------- | --------------------------------------------------------------------------- |
| `wire`      | `AsyncWire<T>`         | The async wire to memoize.                                                  |
| `condition` | `MemoWireCondition<T>` | Receives the **settled** outcome, not the promise. Defaults to `(outcome) => outcome.success`. |

**Returns**

`AsyncWire<T>`.

**Behavior**

- The first call runs `wire` and caches the resulting promise immediately. While it is pending, every call returns **the same promise**: `wire` runs once no matter how many concurrent callers there are.
- When the promise settles, `condition` receives the value or the rejection reason (a synchronous throw from `wire` counts as a rejection):

| `condition` returns | Outcome is a value                                   | Outcome is an error                                  |
| ------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `true`              | Memoized: every later call resolves to it            | Memoized: every later call rejects with it           |
| `false`             | Resolved for current waiters, the next call runs `wire` again | Rejected for current waiters, the next call runs `wire` again |

- The promise returned to callers is a wrapper, not the promise returned by `wire`.

**Throws**

Never synchronously. The returned promise rejects with:

| Reason                            | When                                                                 |
| --------------------------------- | -------------------------------------------------------------------- |
| The error or rejection reason     | `wire` throws or rejects.                                            |
| The thrown error                  | `condition` throws. Nothing is memoized, the next call retries.      |

**Example**

```ts
const wireDb = memoWireAsync(() => Database.connect(url));

await Promise.all([wireDb(), wireDb(), wireDb()]); // connects once
```

## Errors

### `NonExistingBranchError`

Thrown by [`branchedWire`](#branchedwire) and rejected by [`branchedWireAsync`](#branchedwireasync) when the selected branch has no wire.

An error class created with [`@domain-first/errors`](https://www.npmjs.com/package/@domain-first/errors). It extends `Error`.

| Member    | Value                                          |
| --------- | ---------------------------------------------- |
| `code`    | `"@DOMAIN-FIRST/WIRE.NON_EXISTING_BRANCH"`     |
| `details` | `{ branch: string }`: the value the selector returned |

Recognize it with `NonExistingBranchError.is(error)` or `instanceof`.

**Example**

```ts
try {
    wireSearch();
} catch (error) {
    if (NonExistingBranchError.is(error)) {
        error.details.branch;
    }
}
```

## Types

### `Wire<T>` and `AsyncWire<T>`

```ts
type Wire<T> = () => T;
type AsyncWire<T> = Wire<Promise<T>>;
```

Any function with no parameters is a wire. Wires don't need to be created by this package.

### `WiredTuple<T>` and `AsyncWiredTuple<T>`

```ts
type WiredTuple<T extends readonly any[]> = { [K in keyof T]: Wire<T[K]> };
type AsyncWiredTuple<T extends readonly any[]> = { [K in keyof T]: Wire<T[K] | Promise<T[K]>> };
```

Map a tuple of values to a tuple of wires. Optional and rest elements are preserved.

### Parameter helpers

```ts
type WireConstructorParameters<C extends new (...args: any[]) => any> =
    WiredTuple<ConstructorParameters<C>>;
type AsyncWireConstructorParameters<C extends new (...args: any[]) => any> =
    AsyncWiredTuple<ConstructorParameters<C>>;
type WireFunctionParameters<Fn extends (...args: any[]) => any> =
    WiredTuple<Parameters<Fn>>;
type AsyncWireFunctionParameters<Fn extends (...args: any[]) => any> =
    AsyncWiredTuple<Parameters<Fn>>;
```

The `dependencies` types of [`wireClass`](#wireclass), [`wireClassAsync`](#wireclassasync), [`wireFunction`](#wirefunction) and [`wireFunctionAsync`](#wirefunctionasync). Useful for writing your own generators.

### `UnwrapWire<T>`

```ts
type UnwrapWire<T> = T extends Wire<infer R> ? R : never;
```

The type a wire builds. Distributes over unions: `UnwrapWire<Wire<A> | Wire<B>>` is `A | B`.

### `MemoWireOutcome<T>`

```ts
type MemoWireOutcome<T> =
    | { success: true; value: T }
    | { success: false; error: unknown };
```

The outcome of a call, passed to [`MemoWireCondition`](#memowireconditiont). For async wires, the settled outcome.

### `MemoWireCondition<T>`

```ts
type MemoWireCondition<T> = (outcome: MemoWireOutcome<T>) => boolean;
```

The `condition` of [`memoWire`](#memowire) and [`memoWireAsync`](#memowireasync). `true` memoizes the outcome.

## Runtime semantics

| Topic           | Behavior                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Laziness        | Generators and decorators call nothing when they are created. Work happens when the resulting wire is called. |
| Instances       | Wires build a new value on every call. Only [`memoWire`](#memowire) and [`memoWireAsync`](#memowireasync) reuse one. |
| Composition     | A dependency is any wire, including memoized, branched and hand-written ones. Wiring a singleton into a non-memoized wire shares the singleton. |
| Sync and async  | Sync generators accept only sync wires. Async generators accept both and always return an async wire.        |
| Registry        | There is no container, registry or global state. Wires are plain closures.                                  |
| Type checking   | Every connection is checked at compile time. At runtime no arguments are validated.                         |

### Dependency resolution

| Generator                                                | Order of dependency calls  | Waiting                                          |
| -------------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| [`wireClass`](#wireclass), [`wireFunction`](#wirefunction) | Left to right, one by one  | None: the first throw stops the rest            |
| [`wireClassAsync`](#wireclassasync), [`wireFunctionAsync`](#wirefunctionasync) | Left to right, all called before any is awaited | `Promise.all`: resolved in parallel, the first rejection wins, other dependencies keep running. A synchronous throw stops the remaining calls |
