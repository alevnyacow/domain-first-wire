<p align="center">
    <picture>
        <img src='https://raw.githubusercontent.com/alevnyacow/domain-first-wire/refs/heads/main/logo.svg?sanitize=true'>
    </picture>
</p>

<p align="center">
    Explicit dependency composition for TypeScript, checked at compile time.
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/%40domain-first%2Fwire" alt="version">
  <img src='https://img.shields.io/badge/test%20coverage-100%25-brightgreen'>
  <img src="https://img.shields.io/badge/TypeScript-ready-3178C6?logo=typescript&logoColor=white?style=for-the-badge" alt="size">
  <img src="https://img.shields.io/npm/l/%40domain-first%2Fwire" alt="license">
</p>

# Motivation

Developers usually have to choose between using a runtime DI container or wiring everything by hand. We tend to think of the first option as more convenient, while the second gives us better transparency, explicit dependencies, and less runtime overhead.

**Wire gives you a third option:** keep the simplicity, transparency, and type-safety of manual composition, while getting the convenience and feel of a DI container — without the container, runtime reflection, or magic.

# What is a Wire?

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
    constructor(private readonly db: InMemoryDb) {}
    // in-memory implementation
}

class PrismaUserRepository implements UserRepository {
    constructor(private readonly prismaClient: Prisma) {}
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

// `branchedWire` provides different wires for every branch
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

class UserController {
    constructor(private changeName: ChangeUserNameUseCase) {}
    // implementation
}

const wireUserController = wireClass(UserController, [
    wireChangeUserNameUseCase,
]);

const userController = wireUserController();
```
