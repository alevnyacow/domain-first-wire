export type Wire<T> = () => T;

export type AsyncWire<T> = Wire<Promise<T>>;

export type WiredTuple<T extends readonly any[]> = T extends readonly []
    ? []
    : T extends readonly [infer Head, ...infer Tail]
      ? [Wire<Head>, ...WiredTuple<Tail>]
      : never;

export type AsyncWiredTuple<T extends readonly any[]> = T extends readonly []
    ? []
    : T extends readonly [infer Head, ...infer Tail]
      ? [Wire<Head> | AsyncWire<Head>, ...AsyncWiredTuple<Tail>]
      : never;

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
