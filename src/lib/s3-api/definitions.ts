export type ParsedContext = {
    getJson: () => Promise<any>;
    getArrayBuffer: () => Promise<ArrayBuffer>;
    getHeader: (name: string) => string | null;
};

export type ContextHandler = (context: ParsedContext) => Promise<{ data: unknown, status: number }>;

export type ContextHandlerFn<C extends unknown, R extends unknown> = (context: C) => Promise<R>;

export interface ContextDriverDefinition<C extends unknown, R extends unknown> {
    // parsers
    parseContext: (context: C) => ParsedContext;

    buildResponse: <D>(data: D, status: number) => R;

    buildPostEndpoint(contextHandler: ContextHandler): ContextHandlerFn<C, R>;

    buildPutEndpoint(contextHandler: ContextHandler): ContextHandlerFn<C, R>;
}

export type StorageAPIEndpointFn<C extends unknown, R extends unknown> = (context: C) => Promise<R>;

export interface StorageApiBuilderDefinition<C extends unknown, R extends unknown> {
    driver: ContextDriverDefinition<C, R>;
    getPOST(): StorageAPIEndpointFn<C, R>;
    getPUT(): StorageAPIEndpointFn<C, R>;
}