import { expect, test } from '@rstest/core';
import { wireValue } from './wire-value';

test('Wire 50', () => {
    const wire50 = wireValue(50 as const);
    const value = wire50();
    expect(value).toBe(50);
});

test('Wire { hello: "world" }', () => {
    const wireHelloWorld = wireValue({ hello: 'world' } as const);
    const value = wireHelloWorld();
    expect(value).toEqual({ hello: 'world' });
});
