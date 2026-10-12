import type { AsyncWire, AsyncWireConstructorParameters, Wire } from '../types';

export const wireClassAsync =
    <C extends new (...args: any[]) => any>(
        Class: C,
        dependencies: AsyncWireConstructorParameters<C>
    ): AsyncWire<InstanceType<C>> =>
    async () =>
        new Class(
            ...(await Promise.all(
                (dependencies as (Wire<any> | AsyncWire<any>)[]).map((x) => x())
            ))
        ) as InstanceType<C>;
