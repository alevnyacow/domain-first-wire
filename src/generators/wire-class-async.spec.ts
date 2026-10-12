import { expect, test } from '@rstest/core';
import { memoWire } from '../decorators/memo-wire';
import type { AsyncWire, Wire } from '../types';
import { branchedWire } from './branched-wire';
import { wireClassAsync } from './wire-class-async';

class Pair {
    constructor(
        public readonly first: number,
        public readonly second: string
    ) {}
}

class Counter {
    constructor(public readonly value: { id: number }) {}
}

class Broken {
    constructor(_value: number) {
        throw new Error('constructor failed');
    }
}

test('Wire class with sync dependencies', async () => {
    const wirePair = wireClassAsync(Pair, [() => 1, () => 'a']);
    const pair = await wirePair();
    expect(pair).toBeInstanceOf(Pair);
    expect(pair.first).toBe(1);
    expect(pair.second).toBe('a');
});

test('Wire class with async dependencies', async () => {
    const wirePair = wireClassAsync(Pair, [async () => 1, async () => 'a']);
    const pair = await wirePair();
    expect(pair.first).toBe(1);
    expect(pair.second).toBe('a');
});

test('Wire class with mixed dependencies', async () => {
    const wireFirst: AsyncWire<number> = async () => 1;
    const wireSecond: Wire<string> = () => 'a';
    const pair = await wireClassAsync(Pair, [wireFirst, wireSecond])();
    expect(pair.first).toBe(1);
    expect(pair.second).toBe('a');
});

test('Returns new instance on every call', async () => {
    const wirePair = wireClassAsync(Pair, [async () => 1, () => 'a']);
    const pair1 = await wirePair();
    const pair2 = await wirePair();
    expect(pair1).not.toBe(pair2);
});

test('Does not resolve dependencies until wire is called', async () => {
    let calls = 0;
    const wireCounter = wireClassAsync(Counter, [
        async () => ({ id: ++calls })
    ]);
    expect(calls).toBe(0);
    await wireCounter();
    expect(calls).toBe(1);
});

test('Resolves fresh dependencies on every call', async () => {
    let calls = 0;
    const wireCounter = wireClassAsync(Counter, [
        async () => ({ id: ++calls })
    ]);
    const counter1 = await wireCounter();
    const counter2 = await wireCounter();
    expect(counter1.value).not.toBe(counter2.value);
    expect(counter2.value.id).toBe(2);
});

test('Shares memoized async dependency between instances', async () => {
    let calls = 0;
    const wireValue = memoWire(async () => ({ id: ++calls }));
    const wireCounter = wireClassAsync(Counter, [wireValue]);
    const [counter1, counter2] = await Promise.all([
        wireCounter(),
        wireCounter()
    ]);
    expect(counter1).not.toBe(counter2);
    expect(counter1.value).toBe(counter2.value);
    expect(calls).toBe(1);
});

test('Rejects when dependency rejects', async () => {
    const wirePair = wireClassAsync(Pair, [
        async () => {
            throw new Error('dependency failed');
        },
        () => 'a'
    ]);
    await expect(wirePair()).rejects.toThrow('dependency failed');
});

test('Rejects when constructor throws', async () => {
    const wireBroken = wireClassAsync(Broken, [async () => 1]);
    await expect(wireBroken()).rejects.toThrow('constructor failed');
});

test('Accepts branched wire with sync and async branches', async () => {
    const byBranch = branchedWire<'sync' | 'async'>(() => 'sync');
    const wireValue = byBranch({
        sync: () => ({ id: 1 }),
        async: async () => ({ id: 2 })
    });
    const counter = await wireClassAsync(Counter, [wireValue])();
    expect(counter.value.id).toBe(1);
});
