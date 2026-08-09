<p align="center">
    <picture>
        <img src='https://raw.githubusercontent.com/alevnyacow/domain-first-wire/refs/heads/main/logo.svg?sanitize=true'>
    </picture>
</p>

<p align="center">
    Explicit dependency composition for TypeScript, verified at compile time.
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/%40domain-first%2Fwire" alt="version">
  <img src="https://img.shields.io/badge/TypeScript-ready-3178C6?logo=typescript&logoColor=white?style=for-the-badge" alt="size">
  <img src="https://img.shields.io/npm/l/%40domain-first%2Fwire" alt="license">
</p>

# Overview

`@domain-first/wire` lets you compose your application's dependency graph using plain TypeScript functions.

A wire is simply:

```ts
type Wire<T> = () => T;
```

That's it. No containers. No decorators. No runtime reflection. Just explicit, type-safe dependency composition verified by the TypeScript compiler.

# Quick start

```ts
import {
    wireClass,
    wireValue,
    branchedWire,
    memoWire,
} from "@domain-first/wire";

type User = { id: string; name: string };

interface UserRepository {
    findById: (id: string) => Promise<User | null>;
    save: (user: User) => Promise<void>;
}

class InMemoryDb {}

class InMemoryUserRepository implements UserRepository {
    constructor() {}
    // in-memory implementation
}

class PrismaUserRepository implements UserRepository {
    constructor(prismaClient: Prisma) {}
    // prisma implementation
}

const wireInMemoryDb = wireClass(InMemoryDb, []);

const wireInMemoryUserRepository = wireClass(InMemoryUserRepository, [
    wireInMemoryDb,
]);

const wirePrismaUserRepository = wireClass(PrismaUserRepository, [
    // assuming prismaClient is imported from somewhere
    wireValue(prismaClient),
]);

// `branchedWire` provides diffirent wires for every branch
const envBranchedWire = branchedWire<"test" | "dev">(() => {
    if (process.env.NODE_ENV === "test") {
        return "test";
    }
    return "dev";
});

const wireUserRepository = envBranchedWire({
    // singleton
    test: memoWire(wireInMemoryUserRepository),
    dev: wirePrismaUserRepository,
});

class ChangeUserNameUseCase {
    constructor(private userRepository: UserRepository) {}

    handle = async (id: string, newName: string) => {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw "User not found";
        }
        await this.userRepository.save({ ...user, name: newName });
    };
}

const wireChangeUserNameUseCase = wireClass(ChangeUserNameUseCase, [
    wireUserRepository,
]);

const changeUserNameUseCase = wireChangeUserNameUseCase();

await changeUserNameUseCase.handle("1", "new name");

class UserController {
    constructor(private changeName: ChangeUserNameUseCase) {}
    // implementation
}

const wireUserController = wireClass(UserController, [
    wireChangeUserNameUseCase,
]);

const userController = wireUserController();
```

# Test coverage

Full ✅

| Type       | Threshold | Current value |
| ---------- | --------- | ------------- |
| Statements | 100 %     | 100 %         |
| Branches   | 100 %     | 100 %         |
| Functions  | 100 %     | 100 %         |
| Lines      | 100 %     | 100 %         |
