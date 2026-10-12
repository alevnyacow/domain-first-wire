export type Wire<T> = () => T;

export type AsyncWire<T> = Wire<Promise<T>>;

export type WiredTuple<T extends readonly any[]> = {
    [K in keyof T]: Wire<T[K]>;
};

export type AsyncWiredTuple<T extends readonly any[]> = {
    [K in keyof T]: Wire<T[K] | Promise<T[K]>>;
};

export type WireConstructorParameters<
    Class extends new (
        ...args: any[]
    ) => any
> = WiredTuple<ConstructorParameters<Class>>;

export type AsyncWireConstructorParameters<
    Class extends new (
        ...args: any[]
    ) => any
> = AsyncWiredTuple<ConstructorParameters<Class>>;

export type WireFunctionParameters<Fn extends (...args: any[]) => any> =
    WiredTuple<Parameters<Fn>>;

export type AsyncWireFunctionParameters<Fn extends (...args: any[]) => any> =
    AsyncWiredTuple<Parameters<Fn>>;

export type UnwrapWire<T> = T extends Wire<infer R> ? R : never;
