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
