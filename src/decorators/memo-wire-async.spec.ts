import { expect, test } from '@rstest/core';
import { memoWireAsync } from './memo-wire-async';

test('Memoizes resolved value', async () => {
    let calls = 0;
    const memoizedWire = memoWireAsync(async () => ++calls);
    expect(await memoizedWire()).toBe(1);
    expect(await memoizedWire()).toBe(1);
    expect(calls).toBe(1);
});

test('Shares pending promise between concurrent calls', async () => {
    let calls = 0;
    const memoizedWire = memoWireAsync(async () => ({ id: ++calls }));
    const [value1, value2] = await Promise.all([
        memoizedWire(),
        memoizedWire()
    ]);
    expect(value1).toBe(value2);
    expect(calls).toBe(1);
});

test('Does not memoize rejection by default', async () => {
    let calls = 0;
    const memoizedWire = memoWireAsync(async () => {
        calls++;
        if (calls === 1) {
            throw new Error('first call failed');
        }
        return calls;
    });
    await expect(memoizedWire()).rejects.toThrow('first call failed');
    expect(await memoizedWire()).toBe(2);
    expect(await memoizedWire()).toBe(2);
});

test('Rejects all concurrent callers and retries on next call', async () => {
    let calls = 0;
    const memoizedWire = memoWireAsync(async () => {
        calls++;
        if (calls === 1) {
            throw new Error('failed');
        }
        return calls;
    });
    const results = await Promise.allSettled([memoizedWire(), memoizedWire()]);
    expect(results.map((result) => result.status)).toEqual([
        'rejected',
        'rejected'
    ]);
    expect(calls).toBe(1);
    expect(await memoizedWire()).toBe(2);
});

test('Treats synchronous throw as failure', async () => {
    let calls = 0;
    const memoizedWire = memoWireAsync((): Promise<number> => {
        calls++;
        if (calls === 1) {
            throw new Error('sync failure');
        }
        return Promise.resolve(calls);
    });
    await expect(memoizedWire()).rejects.toThrow('sync failure');
    expect(await memoizedWire()).toBe(2);
});

test('Passes settled outcome to condition', async () => {
    const error = new Error('failed');
    const outcomes: unknown[] = [];
    const condition = (outcome: unknown) => {
        outcomes.push(outcome);
        return false;
    };
    await memoWireAsync(async () => 1, condition)();
    await expect(
        memoWireAsync(async () => {
            throw error;
        }, condition)()
    ).rejects.toThrow(error);
    expect(outcomes).toEqual([
        { success: true, value: 1 },
        { success: false, error }
    ]);
});

test('Memoizes only values that satisfy condition', async () => {
    let calls = 0;
    const memoizedWire = memoWireAsync(
        async () => ++calls,
        (outcome) => outcome.success && outcome.value >= 2
    );
    expect(await memoizedWire()).toBe(1);
    expect(await memoizedWire()).toBe(2);
    expect(await memoizedWire()).toBe(2);
    expect(calls).toBe(2);
});

test('Memoizes rejection when condition allows it', async () => {
    let calls = 0;
    const memoizedWire = memoWireAsync(
        async () => {
            calls++;
            throw new Error('failed');
        },
        () => true
    );
    await expect(memoizedWire()).rejects.toThrow('failed');
    await expect(memoizedWire()).rejects.toThrow('failed');
    expect(calls).toBe(1);
});

test('Does not memoize when condition throws', async () => {
    let calls = 0;
    let shouldThrow = true;
    const memoizedWire = memoWireAsync(
        async () => ++calls,
        () => {
            if (shouldThrow) {
                throw new Error('condition failed');
            }
            return true;
        }
    );
    await expect(memoizedWire()).rejects.toThrow('condition failed');
    shouldThrow = false;
    expect(await memoizedWire()).toBe(2);
    expect(await memoizedWire()).toBe(2);
});
