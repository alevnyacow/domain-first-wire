import type { Wire } from '../types';

export const memoWire = <T>(wire: Wire<T>) => {
    let cached = false;
    let value: T;

    return () => {
        if (!cached) {
            value = wire();
            cached = true;
        }

        return value;
    };
};
