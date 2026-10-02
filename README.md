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
const wireUserService = wireClass(UserService, [
    wireDb,
    wireLogger,
]);

// fully typed, fully wired
const userService = wireUserService();
```

Forget a dependency, pass them in the wrong order, or hand over the wrong type, and **your code won't compile**. No runtime surprises, no "cannot resolve dependency" errors in production.

```bash
npm install @domain-first/wire
```

## Why Wire?

- ✅ **Compile-time safety.** TypeScript checks every constructor against its dependency list.
- 🪶 **Tiny API.** Four functions you'll learn in five minutes.
- 🚫 **No magic.** No decorators, no `reflect-metadata`, no string tokens, no container.
- 🔍 **Transparent.** Go to definition on a wire and you land on the real code.
- 🧪 **Easy to test.** Switch implementations per environment with exhaustive, type-checked branches.
- 🧩 **Plain classes.** Your domain code stays clean and knows nothing about Wire.

## The whole idea in one line

```ts
type Wire<T> = () => T;
```

A wire is just a function that builds something. Wires compose into other wires, and the TypeScript compiler checks every connection.

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

| Function                          | What it does                                                    |
| --------------------------------- | --------------------------------------------------------------- |
| `wireClass(Class, [...wires])`    | Wires a class from type-checked constructor dependencies.       |
| `wireValue(value)`                | Wraps an existing value (config, client, etc.) into a wire.     |
| `memoWire(wire)`                  | Turns any wire into a lazy singleton.                           |
| `branchedWire(selector)(choices)` | Picks a wire at runtime based on a branch (env, feature flags). |

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
    constructor(
        private changeName: ChangeUserNameUseCase,
    ) {}
    // ...
}
```

### 2. Wire the infrastructure

```ts
import {
    wireClass,
    wireValue,
    memoWire,
} from "@domain-first/wire";

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
const wireChangeUserName = wireClass(
    ChangeUserNameUseCase,
    [wireUserRepository],
);

const wireUserController = wireClass(
    UserController,
    [wireChangeUserName],
);

// 🎉 everything is built and connected
const userController = wireUserController();
```

Every step is type-checked. If `UserController` gets a new constructor parameter tomorrow, the compiler points to the exact line you need to update.

## Give it a try

```bash
npm install @domain-first/wire
```

It takes about five minutes to wire your first service. If Wire makes your codebase a little cleaner, a ⭐ on GitHub helps others find it.

## License

MIT
