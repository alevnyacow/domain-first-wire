import type { UnwrapWire, Wire } from '../types';

export const branchedWire =
    <Branch extends string>(selector: () => Branch) =>
    <T extends Record<Branch, Wire<any>>>(
        choices: T
    ): Wire<UnwrapWire<T[keyof T]>> => {
        return () => choices[selector()]();
    };
