import type { Wire, WireConstructorParameters } from '../types';

export const wireClass = <C extends new (...args: any[]) => any>(
    Class: C,
    dependencies: WireConstructorParameters<C>
): Wire<InstanceType<C>> => {
    return () =>
        new Class(
            ...(dependencies as Wire<any>[]).map((x) => x())
        ) as InstanceType<C>;
};
