# Domain First Wire

<p>
    <img src="https://img.shields.io/npm/v/%40domain-first%2Fwire" alt="version">
    <img src='https://img.shields.io/badge/test%20coverage-100%25-brightgreen'>
    <img src="https://img.shields.io/badge/TypeScript-ready-3178C6?logo=typescript&logoColor=white?style=for-the-badge" alt="TypeScript ready">
    <img src="https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release" alt="semver">
    <img src="https://img.shields.io/npm/l/%40domain-first%2Fwire" alt="license">
</p>

Dependency injection without the container.

## What is it?

Wiring dependencies usually means a choice: a DI container that turns into a black box and grows into an application of its own, or a long chain of `new` calls by hand.

Domain First Wire is the third way: **composition as a plain, type-checked function**. A wire is just `() => T`, and the compiler checks every connection: a missing, misplaced or mistyped dependency won't compile. No container, no decorators: your classes know nothing about Wire.

```
npm i @domain-first/wire
```

## API

The full technical specification lives in [API.md](./API.md).

## Guide

### How to wire a class

Pass the class and one wire per constructor parameter. The wire builds a new instance on every call.

```ts
import { wireClass } from "@domain-first/wire";

class UserService {
    constructor(db: Database, logger: Logger) {}
}

const wireUserService = wireClass(UserService, [wireDb, wireLogger]);

const userService = wireUserService(); // UserService

wireClass(UserService, [wireLogger, wireDb]); // ❌ wrong order
wireClass(UserService, [wireDb]); // ❌ missing dependency
wireClass(UserService, [wireDb, wireCache]); // ❌ wrong type
```

### How to wire a function

Factories, closures and third-party constructors like `createClient(...)` are wired with `wireFunction`.

```ts
import { wireFunction } from "@domain-first/wire";

const createLogger = (config: Config): Logger => pino({ level: config.logLevel });

const wireLogger = wireFunction(createLogger, [wireConfig]);
```

A curried function gets its dependencies bound and leaves the rest to the caller.

```ts
const changeUserName = (users: UserRepository) => async (id: string, name: string) => {
    // ...
};

const wireChangeUserName = wireFunction(changeUserName, [wireUserRepository]);

await wireChangeUserName()("1", "Jane");
```

### How to wire an existing value

Wrap configs, clients and other ready values with `wireValue`. Any `() => T` works as a wire too.

```ts
import { wireValue } from "@domain-first/wire";

const wirePrisma = wireValue(prismaClient);
const wireConfig = () => loadConfig();
```

### How to make a singleton

`memoWire` builds the value on the first call and reuses it afterwards. If the wire throws, nothing is memoized and the next call tries again.

```ts
import { memoWire } from "@domain-first/wire";

const wireRepository = memoWire(wireClass(InMemoryUserRepository, [wireInMemoryDb]));

wireRepository() === wireRepository(); // true
```

Pass a condition to decide which outcomes are memoized.

```ts
// memoize only a non-empty config
const wireConfig = memoWire(loadConfig, (outcome) => outcome.success && outcome.value !== null);

// memoize failures too: a broken wire throws the same error forever
const wireStrict = memoWire(wireSomething, () => true);
```

### How to switch implementations

`branchedWire` picks a wire at runtime: per environment, feature flag or tenant. Forget a branch and you get a compile error.

```ts
import { branchedWire } from "@domain-first/wire";

const byEnv = branchedWire<"test" | "dev" | "prod">(() => getEnv());

const wireUserRepository = byEnv({
    test: wireInMemoryRepo,
    dev: wirePrismaRepo,
    // ❌ Property 'prod' is missing
});
```

Only the selected wire is called. An unknown branch at runtime throws `NonExistingBranchError`.

### How to wire async dependencies

`wireClassAsync` and `wireFunctionAsync` accept any mix of sync and async wires, resolve them in parallel and return an async wire.

```ts
import { wireClassAsync, wireFunctionAsync } from "@domain-first/wire";

const connect = (config: Config) => Database.connect(config.dbUrl);

const wireDb = wireFunctionAsync(connect, [wireConfig]); // AsyncWire<Database>

const wireUserService = wireClassAsync(UserService, [
    wireDb, // async
    wireLogger, // sync
]);

const userService = await wireUserService();
```

### How to make an async singleton

`memoWireAsync` shares the pending promise, so 50 concurrent requests on startup open one connection, not 50. If it rejects, everyone waiting gets the error, and the next call tries again.

```ts
import { memoWireAsync } from "@domain-first/wire";

const wireDb = memoWireAsync(() => Database.connect(url));

// the condition receives the settled outcome, not the promise
const wireReadyDb = memoWireAsync(
    () => Database.connect(url),
    (outcome) => outcome.success && outcome.value.isReady(),
);
```

Plain `memoWire` memoizes the promise as is, so a rejected promise would stay cached forever.

### How to select a branch asynchronously

When the branch comes from a remote service, use `branchedWireAsync`. Branches may be sync or async.

```ts
import { branchedWireAsync } from "@domain-first/wire";

const byFlag = branchedWireAsync<"new" | "legacy">(async () =>
    (await flags.isEnabled("new-search")) ? "new" : "legacy",
);

const wireSearch = byFlag({
    new: wireNewSearch,
    legacy: wireLegacySearch,
}); // AsyncWire<NewSearch | LegacySearch>
```

### How to compose an app

Wires compose into other wires. Build the graph once, call the top-level wire at the entry point.

```ts
const wirePrismaRepo = wireClass(PrismaUserRepository, [wireValue(prismaClient)]);

const wireUserRepository = byEnv({
    test: memoWire(wireClass(InMemoryUserRepository, [wireInMemoryDb])),
    dev: wirePrismaRepo,
    prod: wirePrismaRepo,
});

const wireChangeUserName = wireClass(ChangeUserNameUseCase, [wireUserRepository]);
const wireUserController = wireClass(UserController, [wireChangeUserName]);

const userController = wireUserController();
```

If `UserController` gets a new constructor parameter tomorrow, the compiler points to the exact line you need to update.

## License

MIT
