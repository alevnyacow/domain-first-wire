<p align="center">
    <picture>
        <img src='https://raw.githubusercontent.com/alevnyacow/domain-first-wire/refs/heads/main/logo.svg?sanitize=true'>
    </picture>
</p>

<p align="center">
    <b>Dependency injection without the container.</b><br>
    Explicit dependency composition for TypeScript, checked at compile time.
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/%40domain-first%2Fwire" alt="version">
  <img src='https://img.shields.io/badge/test%20coverage-100%25-brightgreen'>
  <img src="https://img.shields.io/badge/TypeScript-ready-3178C6?logo=typescript&logoColor=white?style=for-the-badge" alt="size">
  <img src="https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release" alt="semver">
  <img src="https://img.shields.io/npm/l/%40domain-first%2Fwire" alt="license">
</p>

```ts
const wireUserService = wireClass(UserService, [wireDb, wireLogger]);

// fully typed, fully wired
const userService = wireUserService();
```

Forget a dependency, pass them in the wrong order, or hand over the wrong type, and **your code won't compile**. No runtime surprises, no "cannot resolve dependency" errors in production.

```bash
npm install @domain-first/wire
```

## Why Wire?

- ✅ **Compile-time safety.** TypeScript checks every constructor against its dependency list.
- 🪶 **Tiny API.** A few functions you'll learn in five minutes.
- 🚫 **No magic.** No decorators, no `reflect-metadata`, no string tokens, no container.
- 🔍 **Transparent.** Go to definition on a wire and you land on the real code.
- 🧪 **Easy to test.** Switch implementations per environment with exhaustive, type-checked branches.
- 🧩 **Plain classes.** Your domain code stays clean and knows nothing about Wire.

## The whole idea in three lines

```ts
type Wire<T> = () => T;
type AsyncWire<T> = () => Promise<T>;
// a class, a function, a value: anything can be wired
```

A wire is just a function that builds something. Sync or async, it doesn't matter. Wires compose into other wires, and the TypeScript compiler checks every connection.

## The compiler has your back

```ts
class UserService {
    constructor(db: Database, logger: Logger) {}
}

// ✅
wireClass(UserService, [wireDb, wireLogger]);

// ❌ wrong order
wireClass(UserService, [wireLogger, wireDb]);

// ❌ missing dependency
wireClass(UserService, [wireDb]);

// ❌ wrong type
wireClass(UserService, [wireDb, wireCache]);
```

The same goes for environment branches. Forget to handle one and you get a compile error:

```ts
type Env = "test" | "dev" | "prod";

const byEnv = branchedWire<Env>(() => getEnv());

byEnv({
    test: wireInMemoryRepo,
    dev: wirePrismaRepo,
    // ❌ Property 'prod' is missing
});
```

## API

| Function                               | What it does                                                          |
| -------------------------------------- | --------------------------------------------------------------------- |
| `wireClass(Class, [...wires])`         | Wires a class from type-checked constructor dependencies.             |
| `wireFunction(fn, [...wires])`         | Wires a function call from type-checked parameter dependencies.       |
| `wireClassAsync(Class, [...wires])`    | Same as `wireClass`, but dependencies may be async wires.             |
| `wireFunctionAsync(fn, [...wires])`    | Same as `wireFunction`, but dependencies may be async wires.          |
| `wireValue(value)`                     | Wraps an existing value (config, client, etc.) into a wire.           |
| `memoWire(wire, condition?)`           | Turns any wire into a lazy singleton.                                 |
| `memoWireAsync(wire, condition?)`      | Async singleton: shares the pending promise, retries after a failure. |
| `branchedWire(selector)(choices)`      | Picks a wire at runtime based on a branch (env, feature flags).       |
| `branchedWireAsync(selector)(choices)` | Same as `branchedWire`, but the branch is selected asynchronously.    |

## Real-world example

Let's build a small app: a controller calls a use case, and the use case calls a repository. The repository is in-memory under test and Prisma in development.

### 1. Write plain classes

Your application code knows nothing about Wire: no decorators, no imports.

```ts
interface UserRepository {
    findById(id: string): Promise<User | null>;
    save(user: User): Promise<void>;
}

class InMemoryUserRepository implements UserRepository {
    constructor(private db: InMemoryDb) {}
    // ...
}

class PrismaUserRepository implements UserRepository {
    constructor(private prisma: PrismaClient) {}
    // ...
}

class ChangeUserNameUseCase {
    constructor(private users: UserRepository) {}

    async handle(id: string, newName: string) {
        const user = await this.users.findById(id);
        if (!user) throw new Error("User not found");
        await this.users.save({ ...user, name: newName });
    }
}

class UserController {
    constructor(private changeName: ChangeUserNameUseCase) {}
    // ...
}
```

### 2. Wire the infrastructure

```ts
import { wireClass, wireValue, memoWire } from "@domain-first/wire";

const wireInMemoryDb = wireClass(InMemoryDb, []);

// singleton
const wireInMemoryRepo = memoWire(
    wireClass(InMemoryUserRepository, [wireInMemoryDb]),
);

const wirePrismaRepo = wireClass(PrismaUserRepository, [
    wireValue(prismaClient),
]);
```

### 3. Pick an implementation per environment

```ts
import { branchedWire } from "@domain-first/wire";

const byEnv = branchedWire<"test" | "dev">(() =>
    process.env.NODE_ENV === "test" ? "test" : "dev",
);

const wireUserRepository = byEnv({
    test: wireInMemoryRepo,
    dev: wirePrismaRepo,
});
```

### 4. Compose the app

```ts
const wireChangeUserName = wireClass(ChangeUserNameUseCase, [
    wireUserRepository,
]);

const wireUserController = wireClass(UserController, [
    wireChangeUserName,
]);

// 🎉 everything is built and connected
const userController = wireUserController();
```

Every step is type-checked. If `UserController` gets a new constructor parameter tomorrow, the compiler points to the exact line you need to update.

## Memoization

`memoWire` turns a wire into a lazy singleton: it's built on the first call and reused afterwards. By default only successful results are memoized, so if the wire throws, the next call tries again.

Pass a `condition` to decide what gets memoized. It receives the outcome of the call:

```ts
type MemoWireOutcome<T> =
    | { success: true; value: T }
    | { success: false; error: unknown };
```

```ts
// memoize only a non-empty config
const wireConfig = memoWire(loadConfig, (outcome) =>
    outcome.success && outcome.value !== null,
);

// memoize failures too: a broken wire throws the same error forever
const wireStrict = memoWire(wireSomething, () => true);
```

## Not just classes

Factories, closures and third-party constructors like `createClient(...)` can be wired too. `wireFunction` calls a function with its dependencies, just like `wireClass` calls a constructor:

```ts
import { wireFunction } from "@domain-first/wire";

const createLogger = (config: Config): Logger =>
    pino({ level: config.logLevel });

const wireLogger = wireFunction(createLogger, [wireConfig]);
```

Prefer functions over classes? A curried function gets its dependencies bound and the rest left for the caller:

```ts
const changeUserName =
    (users: UserRepository) =>
    async (id: string, newName: string) => {
        const user = await users.findById(id);
        if (!user) throw new Error("User not found");
        await users.save({ ...user, name: newName });
    };

const wireChangeUserName = wireFunction(changeUserName, [
    wireUserRepository,
]);

await wireChangeUserName()("1", "new name");
```

## Async wires

Some dependencies can only be built asynchronously: a database connection, a config fetched from a secret store. For those there are async wires, wires that return a promise.

`wireClassAsync` accepts any mix of sync and async wires and returns an async wire itself:

```ts
import {
    wireClassAsync,
    memoWireAsync,
    type AsyncWire,
} from "@domain-first/wire";

class UserService {
    constructor(db: Database, logger: Logger) {}
}

// singleton: connects once, reconnects on the next call if connecting fails
const wireDb: AsyncWire<Database> = memoWireAsync(() =>
    Database.connect(url),
);

const wireUserService = wireClassAsync(UserService, [
    wireDb, // async
    wireLogger, // sync
]);

const userService = await wireUserService();
```

It follows the same rules as `wireClass`:

- **Type-checked.** Every wire is checked against the matching constructor parameter. An `AsyncWire<Database>` fits a `Database` parameter, an `AsyncWire<Logger>` does not.
- **Lazy.** Nothing is built until you call the wire, and every call builds a new instance.
- **Concurrent.** Async dependencies are resolved in parallel.
- **Errors propagate.** If a dependency rejects or the constructor (or function) throws, the returned promise rejects.

`wireFunctionAsync` does the same for functions. If the function itself is async, its result is awaited too:

```ts
import { wireFunctionAsync } from "@domain-first/wire";

const connect = async (config: Config): Promise<Database> =>
    Database.connect(config.dbUrl);

const wireDb = wireFunctionAsync(connect, [wireConfig]); // AsyncWire<Database>
```

### Async singletons

`memoWireAsync` is `memoWire` for async wires:

- **One initialization.** While the promise is pending, every caller gets the same promise, so 50 concurrent requests on startup open one connection, not 50.
- **Retry after failure.** If the promise rejects, everyone waiting gets the error, and the next call runs the wire again. A database that was down on startup doesn't break the service until restart.
- **Same `condition`.** It receives the settled outcome (the resolved value or the rejection reason), not the promise itself.

```ts
const wireDb = memoWireAsync(
    () => Database.connect(url),
    (outcome) => outcome.success && outcome.value.isReady(),
);
```

> Plain `memoWire` also works with async wires, but it memoizes the promise as is, so a rejected promise stays cached forever. Use `memoWireAsync` for async wires.

### Async branch selection

Sometimes the branch itself is only known asynchronously, e.g. a feature flag from a remote service. `branchedWireAsync` takes an async selector and always returns an async wire. Branches may be sync or async:

```ts
import { branchedWireAsync } from "@domain-first/wire";

const byFlag = branchedWireAsync<"new" | "legacy">(async () =>
    (await flags.isEnabled("new-search")) ? "new" : "legacy",
);

const wireSearch = byFlag({
    new: wireNewSearch,       // sync or async
    legacy: wireLegacySearch,
}); // AsyncWire<NewSearch | LegacySearch>

const search = await wireSearch();
```

The selector runs on every call, and an unknown branch rejects with `NonExistingBranchError`.

## Give it a try

```bash
npm install @domain-first/wire
```

It takes about five minutes to wire your first service. If Wire makes your codebase a little cleaner, a ⭐ on GitHub helps others find it.

## License

MIT
