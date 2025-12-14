export type ParsedContext = {
    getJson: () => Promise<any>;
    getArrayBuffer: () => Promise<ArrayBuffer>;
    getHeader: (name: string) => string | null;
};

export interface UrlMetadata {
    url: string;
    isPermanent: boolean;
    expiresAt?: number; // Unix timestamp in ms
}

export interface UrlMapping extends UrlMetadata {
    identifier: string;
    createdAt: number;
    updatedAt: number;
}

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
    urlMappingService: UrlMappingServiceDefinition;
    resolveUrl: (identifier: string) => Promise<UrlMetadata>;
    getPOST(): StorageAPIEndpointFn<C, R>;
    getPUT(): StorageAPIEndpointFn<C, R>;
}

export interface UrlMappingDatabaseDefinition {
    get(identifier: string): Promise<UrlMapping | null>;
    set(mapping: UrlMapping): Promise<void>;
    delete(identifier: string): Promise<void>;
    cleanup(): Promise<number>; // Returns count of deleted entries
    getAll(): Promise<UrlMapping[]>;
}

export interface UrlMappingServiceDefinition {
    database: UrlMappingDatabaseDefinition;
    resolve(
        identifier: string,
        refreshCallback: (key: string) => Promise<UrlMetadata>
    ): Promise<UrlMetadata>;
    register(
        identifier: string,
        metadata: UrlMetadata,
    ): Promise<void>;
    delete(identifier: string): Promise<void>;
    cleanup(): Promise<number>;
    getAll(): Promise<UrlMetadata[]>;
    createIdentifier(key: string): string;
}