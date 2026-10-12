import { expect, test } from '@rstest/core';
import { memoWire } from './decorators';
import { branchedWire, wireClass, wireValue } from './generators';

test('Use case changes user name through environment-selected repository', async () => {
    type User = { id: string; name: string };

    interface UserRepository {
        findById: (id: string) => Promise<User | null>;
        save: (user: User) => Promise<void>;
    }

    class InMemoryUserRepository implements UserRepository {
        public readonly users: Map<string, User> = new Map();

        findById = async (id: string) => this.users.get(id) ?? null;

        save = async (user: User) => {
            this.users.set(user.id, user);
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

    const wireInMemoryUserRepository = memoWire(
        wireClass(InMemoryUserRepository, [])
    );
    const wirePrismaUserRepository = wireClass(PrismaUserRepository, [
        wireValue({ test: 40 })
    ]);

    const envBranchedWire = branchedWire<'test' | 'dev'>(() =>
        process.env.NODE_ENV === 'test' ? 'test' : 'dev'
    );
    const wireUserRepository = envBranchedWire({
        test: wireInMemoryUserRepository,
        dev: wirePrismaUserRepository
    });

    const wireChangeUserNameUseCase = wireClass(ChangeUserNameUseCase, [
        wireUserRepository
    ]);

    const repository = wireInMemoryUserRepository();
    await repository.save({ id: '1', name: 'name' });
    await wireChangeUserNameUseCase().handle('1', 'new name');

    expect(repository.users.get('1')).toEqual({ id: '1', name: 'new name' });
});
