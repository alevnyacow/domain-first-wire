<p align="center">
    <picture>
        <img src='https://raw.githubusercontent.com/alevnyacow/domain-first-wire/refs/heads/main/logo.svg?sanitize=true'>
    </picture>
</p>

<p align="center">
    Type-safe dependency wiring for TypeScript without containers, decorators, or runtime reflection.
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
import { wireClass, wireValue, branchedWire } from "@domain-first/wire";

type User = { id: string; name: string };

interface UserRepository {
    findById: (id: string) => Promise<User | null>;
    save: (user: User) => Promise<void>;
}

class InMemoryUserRepository implements UserRepository {
    constructor() {}
    // in-memory implementation
}

class PrismaUserRepository implements UserRepository {
    constructor(prismaClient: Prisma) {}
    // prisma implementation
}

const wireInMemoryUserRepository = wireClass(InMemoryUserRepository, []);

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
    test: wireInMemoryUserRepository,
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
