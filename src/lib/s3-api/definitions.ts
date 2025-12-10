export type ParsedContext = {
    getJson: () => Promise<any>;
    getArrayBuffer: () => Promise<ArrayBuffer>;
    getHeader: (name: string) => string | null;
};

export interface ContextDriverDefinition<C extends unknown, R extends unknown> {
    // parsers
    parseContext: (context: C) => ParsedContext;

    buildResponse: <D>(data: D, status: number) => R;

    buildPostEndpoint(contextHandler: (context: ParsedContext) => Promise<{ data: unknown, status: number }>): (context: C) => Promise<R>;

    buildPutEndpoint(contextHandler: (context: ParsedContext) => Promise<{ data: unknown, status: number }>): (context: C) => Promise<R>;
}

export interface StorageApiBuilderDefinition<C extends unknown, R extends unknown> {
    driver: ContextDriverDefinition<C, R>;
    getPOST(): (context: C) => Promise<R>;
    getPUT(): (context: C) => Promise<R>;
}