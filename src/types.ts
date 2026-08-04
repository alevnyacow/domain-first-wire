export type Wire<T> = () => T;

export type WiredTuple<T extends readonly any[]> = T extends readonly []
    ? []
    : T extends readonly [infer Head, ...infer Tail]
      ? [Wire<Head>, ...WiredTuple<Tail>]
      : never;

export type WireConstructorParameters<
    Class extends new (
        ...args: any[]
    ) => any
> = WiredTuple<ConstructorParameters<Class>>;

export type UnwrapWire<T> = T extends Wire<infer R> ? R : never;
