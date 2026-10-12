import type { AsyncWire, UnwrapWire, Wire } from '../types';
import { NonExistingBranchError } from './branched-wire';

export const branchedWireAsync =
    <Branch extends string>(selector: () => Promise<Branch>) =>
    <T extends Record<Branch, Wire<any>>>(
        choices: T
    ): AsyncWire<Awaited<UnwrapWire<T[keyof T]>>> =>
    async () => {
        const branch = await selector();
        if (!(branch in choices)) {
            throw new NonExistingBranchError({ branch });
        }
        return choices[branch]();
    };
