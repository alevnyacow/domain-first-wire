import { expect, test } from '@rstest/core';
import { branchedWire, wireClass, wireValue } from './generators';

test('gesg', async () => {
    type User = { id: string; name: string };

    interface UserRepository {
        findById: (id: string) => Promise<User | null>;
        save: (user: User) => Promise<void>;
    }

    class InMemoryUserRepository implements UserRepository {
        findById = async (id: string) => ({ id, name: 'USER-FROM-IN-MEMORY' });

        save = async (user: User) => {
            console.log(`Saved ${JSON.stringify(user)} in memory`);
        };
    }

    class PrismaUserRepository implements UserRepository {
        constructor(private prismaClient: { test: number }) {}

        findById = async (id: string) => ({ id, name: 'USER-FROM-PRISMA' });

        save = async (user: User) => {
            console.log(
                `Saved ${JSON.stringify(user)} in prisma ${this.prismaClient.test}`
            );
        };
    }

    const wireInMemoryUserRepository = wireClass(InMemoryUserRepository, []);

    // A wire is just a parameterless function that provides a dependency,
    // so `const inMemoryUserRepository = wireInMemoryUserRepository()` will work
    const wirePrismaUserRepository = wireClass(PrismaUserRepository, [
        wireValue({ test: 40 })
    ]);

    // `branchedWire` provides diffirent wires for every branch
    const envBranchedWire = branchedWire<'test' | 'dev'>(() => {
        if (process.env.NODE_ENV === 'test') {
            return 'test';
        }
        return 'dev';
    });

    const wireUserRepository = envBranchedWire({
        test: wireInMemoryUserRepository,
        dev: wirePrismaUserRepository
    });

    class ChangeUserNameUseCase {
        constructor(private userRepository: UserRepository) {}

        handle = async (id: string, newName: string) => {
            const user = await this.userRepository.findById(id);
            if (!user) {
                throw 'User not found';
            }
            await this.userRepository.save({ ...user, name: newName });
        };
    }

    const wireChangeUserNameUseCase = wireClass(ChangeUserNameUseCase, [
        wireUserRepository
    ]);

    const changeUserNameUseCase = wireChangeUserNameUseCase();

    await changeUserNameUseCase.handle('1', 'new name');

    expect(true).toBe(true);
});
