import type { AsyncWire, AsyncWireFunctionParameters, Wire } from '../types';

export const wireFunctionAsync =
    <Fn extends (...args: any[]) => any>(
        fn: Fn,
        dependencies: AsyncWireFunctionParameters<Fn>
    ): AsyncWire<Awaited<ReturnType<Fn>>> =>
    async () =>
        fn(
            ...(await Promise.all(
                (dependencies as (Wire<any> | AsyncWire<any>)[]).map((x) => x())
            ))
        );
