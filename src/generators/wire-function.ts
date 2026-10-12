import type { Wire, WireFunctionParameters } from '../types';

export const wireFunction = <Fn extends (...args: any[]) => any>(
    fn: Fn,
    dependencies: WireFunctionParameters<Fn>
): Wire<ReturnType<Fn>> => {
    return () =>
        fn(...(dependencies as Wire<any>[]).map((x) => x())) as ReturnType<Fn>;
};
