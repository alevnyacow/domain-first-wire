import { expect, test } from '@rstest/core';
import type { Wire } from '../types';
import { memoWire } from './memo-wire';

test('Memoized wiring of random number', () => {
    const wireRandomNumber: Wire<number> = () => Math.random();
    const memoizedWire = memoWire(wireRandomNumber);
    const value1 = wireRandomNumber();
    const value2 = wireRandomNumber();
    const memoizedValue1 = memoizedWire();
    const memoizedValue2 = memoizedWire();
    expect(value1).not.toBe(value2);
    expect(memoizedValue1).toBe(memoizedValue2);
});

test('Does not memoize thrown error by default', () => {
    let calls = 0;
    const memoizedWire = memoWire(() => {
        calls++;
        if (calls === 1) {
            throw new Error('first call failed');
        }
        return calls;
    });
    expect(memoizedWire).toThrow('first call failed');
    expect(memoizedWire()).toBe(2);
    expect(memoizedWire()).toBe(2);
});

test('Passes result to condition', () => {
    const error = new Error('failed');
    const results: unknown[] = [];
    const condition = (result: unknown) => {
        results.push(result);
        return false;
    };
    memoWire(() => 1, condition)();
    expect(() =>
        memoWire(() => {
            throw error;
        }, condition)()
    ).toThrow(error);
    expect(results).toEqual([
        { success: true, value: 1 },
        { success: false, error }
    ]);
});

test('Memoizes only values that satisfy condition', () => {
    let calls = 0;
    const memoizedWire = memoWire(
        () => ++calls,
        (result) => result.success && result.value >= 2
    );
    expect(memoizedWire()).toBe(1);
    expect(memoizedWire()).toBe(2);
    expect(memoizedWire()).toBe(2);
    expect(calls).toBe(2);
});

test('Memoizes thrown error when condition allows it', () => {
    let calls = 0;
    const memoizedWire = memoWire(
        () => {
            calls++;
            throw new Error('failed');
        },
        () => true
    );
    expect(memoizedWire).toThrow('failed');
    expect(memoizedWire).toThrow('failed');
    expect(calls).toBe(1);
});

test('Never memoizes when condition is always false', () => {
    let calls = 0;
    const memoizedWire = memoWire(
        () => ++calls,
        () => false
    );
    expect(memoizedWire()).toBe(1);
    expect(memoizedWire()).toBe(2);
});
