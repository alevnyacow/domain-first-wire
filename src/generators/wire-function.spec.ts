import { expect, test } from '@rstest/core';
import { wireFunction } from './wire-function';
import { wireValue } from './wire-value';

test('Wire function without dependencies', () => {
    const wireNow = wireFunction(() => 42, []);
    expect(wireNow()).toBe(42);
});

test('Wire function with dependencies in parameter order', () => {
    const join = (first: number, second: string) => `${first}-${second}`;
    const wireJoined = wireFunction(join, [wireValue(1), () => 'a']);
    expect(wireJoined()).toBe('1-a');
});

test('Calls function on every call', () => {
    const wireObject = wireFunction(() => ({}), []);
    expect(wireObject()).not.toBe(wireObject());
});

test('Does not resolve dependencies until wire is called', () => {
    let calls = 0;
    const wireId = wireFunction(
        (value: { id: number }) => value.id,
        [() => ({ id: ++calls })]
    );
    expect(calls).toBe(0);
    expect(wireId()).toBe(1);
    expect(wireId()).toBe(2);
});

test('Wires curried function with dependencies bound', () => {
    const greet = (prefix: string) => (name: string) => `${prefix}, ${name}`;
    const wireGreet = wireFunction(greet, [wireValue('Hello')]);
    expect(wireGreet()('world')).toBe('Hello, world');
});
