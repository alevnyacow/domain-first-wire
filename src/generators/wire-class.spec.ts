import { expect, test } from '@rstest/core';
import { branchedWire } from './branched-wire';
import { wireClass } from './wire-class';
import { wireValue } from './wire-value';

class Empty {}

class Pair {
    constructor(
        public readonly first: number,
        public readonly second: string
    ) {}
}

class Counter {
    constructor(public readonly value: { id: number }) {}
}

test('Wire class without dependencies', () => {
    const wireEmpty = wireClass(Empty, []);
    expect(wireEmpty()).toBeInstanceOf(Empty);
});

test('Wire class with dependencies in constructor order', () => {
    const wirePair = wireClass(Pair, [wireValue(1), () => 'a']);
    const pair = wirePair();
    expect(pair).toBeInstanceOf(Pair);
    expect(pair.first).toBe(1);
    expect(pair.second).toBe('a');
});

test('Returns new instance on every call', () => {
    const wireEmpty = wireClass(Empty, []);
    expect(wireEmpty()).not.toBe(wireEmpty());
});

test('Does not resolve dependencies until wire is called', () => {
    let calls = 0;
    const wireCounter = wireClass(Counter, [() => ({ id: ++calls })]);
    expect(calls).toBe(0);
    wireCounter();
    expect(calls).toBe(1);
});

test('Resolves fresh dependencies on every call', () => {
    let calls = 0;
    const wireCounter = wireClass(Counter, [() => ({ id: ++calls })]);
    const counter1 = wireCounter();
    const counter2 = wireCounter();
    expect(counter1.value).not.toBe(counter2.value);
    expect(counter2.value.id).toBe(2);
});

test('Wires class from another wired class', () => {
    class Service {
        constructor(public readonly pair: Pair) {}
    }
    const wireService = wireClass(Service, [
        wireClass(Pair, [wireValue(1), wireValue('a')])
    ]);
    expect(wireService().pair).toBeInstanceOf(Pair);
});

test('Rejects wire that may return a promise at compile time', () => {
    const byBranch = branchedWire<'sync' | 'async'>(() => 'sync');
    const wireMaybeAsync = byBranch({
        sync: () => ({ id: 1 }),
        async: async () => ({ id: 2 })
    });
    // @ts-expect-error wireClass accepts only sync wires
    expect(wireClass(Counter, [wireMaybeAsync])().value.id).toBe(1);
});
