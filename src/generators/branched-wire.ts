import { wireErrors } from '../errors';
import type { UnwrapWire, Wire } from '../types';

const NonExistingBranchError = wireErrors.error<{ branch: string }>(
    'NON_EXISTING_BRANCH'
);

export const branchedWire =
    <Branch extends string>(selector: () => Branch) =>
    <T extends Record<Branch, Wire<any>>>(
        choices: T
    ): Wire<UnwrapWire<T[keyof T]>> => {
        return () => {
            const branch = selector();
            if (!(branch in choices)) {
                throw new NonExistingBranchError({ branch });
            }
            return choices[branch]();
        };
    };
