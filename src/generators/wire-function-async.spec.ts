import { expect, test } from '@rstest/core';
import { memoWire } from '../decorators/memo-wire';
import type { AsyncWire, Wire } from '../types';
import { branchedWire } from './branched-wire';
import { wireFunctionAsync } from './wire-function-async';

const join = (first: number, second: string) => `${first}-${second}`;

test('Wire function with sync dependencies', async () => {
    const wireJoined = wireFunctionAsync(join, [() => 1, () => 'a']);
    expect(await wireJoined()).toBe('1-a');
});

test('Wire function with async dependencies', async () => {
    const wireJoined = wireFunctionAsync(join, [
        async () => 1,
        async () => 'a'
    ]);
    expect(await wireJoined()).toBe('1-a');
});

test('Wire function with mixed dependencies', async () => {
    const wireFirst: AsyncWire<number> = async () => 1;
    const wireSecond: Wire<string> = () => 'a';
    expect(await wireFunctionAsync(join, [wireFirst, wireSecond])()).toBe(
        '1-a'
    );
});

test('Awaits async function result', async () => {
    const connect = async (url: string) => ({ url });
    const wireConnection = wireFunctionAsync(connect, [async () => 'db://']);
    expect(await wireConnection()).toEqual({ url: 'db://' });
});

test('Does not resolve dependencies until wire is called', async () => {
    let calls = 0;
    const wireId = wireFunctionAsync(
        (value: { id: number }) => value.id,
        [async () => ({ id: ++calls })]
    );
    expect(calls).toBe(0);
    expect(await wireId()).toBe(1);
    expect(await wireId()).toBe(2);
});

test('Shares memoized async dependency between calls', async () => {
    let calls = 0;
    const wireValue = memoWire(async () => ({ id: ++calls }));
    const wireUnwrapped = wireFunctionAsync(
        (value: { id: number }) => value,
        [wireValue]
    );
    const [value1, value2] = await Promise.all([
        wireUnwrapped(),
        wireUnwrapped()
    ]);
    expect(value1).toBe(value2);
    expect(calls).toBe(1);
});

test('Rejects when dependency rejects', async () => {
    const wireJoined = wireFunctionAsync(join, [
        async () => {
            throw new Error('dependency failed');
        },
        () => 'a'
    ]);
    await expect(wireJoined()).rejects.toThrow('dependency failed');
});

test('Rejects when function throws', async () => {
    const wireBroken = wireFunctionAsync(
        (_value: number) => {
            throw new Error('function failed');
        },
        [async () => 1]
    );
    await expect(wireBroken()).rejects.toThrow('function failed');
});

test('Rejects when async function rejects', async () => {
    const wireBroken = wireFunctionAsync(
        async (_value: number) => {
            throw new Error('function rejected');
        },
        [async () => 1]
    );
    await expect(wireBroken()).rejects.toThrow('function rejected');
});

test('Accepts branched wire with sync and async branches', async () => {
    const byBranch = branchedWire<'sync' | 'async'>(() => 'async');
    const wireFirst = byBranch({
        sync: () => 1,
        async: async () => 2
    });
    expect(await wireFunctionAsync(join, [wireFirst, () => 'a'])()).toBe('2-a');
});

test('Wire function with optional and rest parameters', async () => {
    const format = (name: string, prefix?: string, ...suffixes: string[]) =>
        [prefix, name, ...suffixes].filter(Boolean).join(' ');
    expect(await wireFunctionAsync(format, [async () => 'world'])()).toBe(
        'world'
    );
    expect(
        await wireFunctionAsync(format, [
            async () => 'world',
            () => 'Hello',
            async () => '!'
        ])()
    ).toBe('Hello world !');
});
