import type { AsyncWire } from '../types';
import {
    type MemoWireCondition,
    type MemoWireOutcome,
    memoizeSuccess,
    unwrapMemoWireOutcome
} from './memo-wire';

const settle = async <T>(wire: AsyncWire<T>): Promise<MemoWireOutcome<T>> => {
    try {
        return { success: true, value: await wire() };
    } catch (error) {
        return { success: false, error };
    }
};

export const memoWireAsync = <T>(
    wire: AsyncWire<T>,
    condition: MemoWireCondition<T> = memoizeSuccess
): AsyncWire<T> => {
    let cached: Promise<T> | undefined;

    return () => {
        if (!cached) {
            cached = settle(wire).then((outcome) => {
                let memoize = false;
                try {
                    memoize = condition(outcome);
                } finally {
                    if (!memoize) {
                        cached = undefined;
                    }
                }
                return unwrapMemoWireOutcome(outcome);
            });
        }

        return cached;
    };
};
