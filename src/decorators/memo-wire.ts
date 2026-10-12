import type { Wire } from '../types';

export type MemoWireOutcome<T> =
    | { success: true; value: T }
    | { success: false; error: unknown };

export type MemoWireCondition<T> = (outcome: MemoWireOutcome<T>) => boolean;

export const memoizeSuccess = <T>(outcome: MemoWireOutcome<T>) =>
    outcome.success;

export const unwrapMemoWireOutcome = <T>(outcome: MemoWireOutcome<T>): T => {
    if (!outcome.success) {
        throw outcome.error;
    }
    return outcome.value;
};

export const memoWire = <T>(
    wire: Wire<T>,
    condition: MemoWireCondition<T> = memoizeSuccess
): Wire<T> => {
    let cached: MemoWireOutcome<T> | undefined;

    return () => {
        if (!cached) {
            let outcome: MemoWireOutcome<T>;
            try {
                outcome = { success: true, value: wire() };
            } catch (error) {
                outcome = { success: false, error };
            }
            if (!condition(outcome)) {
                return unwrapMemoWireOutcome(outcome);
            }
            cached = outcome;
        }

        return unwrapMemoWireOutcome(cached);
    };
};
