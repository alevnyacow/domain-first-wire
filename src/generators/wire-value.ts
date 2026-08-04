import type { Wire } from '../types';

export const wireValue = <T>(value: T): Wire<T> => {
    return () => value;
};
