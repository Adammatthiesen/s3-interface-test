import type { AuthorizationType, ContextDriverDefinition, StorageApiBuilderDefinition, StorageAPIEndpointFn, UrlMappingServiceDefinition, UrlMetadata } from "../definitions";

export class NoOpStorageService<C extends unknown, R extends unknown> implements StorageApiBuilderDefinition<C, R> {
    driver: ContextDriverDefinition<C, R>;
    urlMappingService: UrlMappingServiceDefinition;

    constructor(driver: ContextDriverDefinition<C, R>, urlMappingService: UrlMappingServiceDefinition) {
        this.driver = driver;
        this.urlMappingService = urlMappingService;
    }

    resolveUrl(identifier: string) {
        return Promise.resolve<UrlMetadata | null>(null);
    }

    getPOST(type?: AuthorizationType): StorageAPIEndpointFn<C, R> {
        return this.driver.handleEndpoint(async () => {
            return { data: { error: 'noStorageConfigured' }, status: 501 };
        })
    }

    getPUT(type?: AuthorizationType): StorageAPIEndpointFn<C, R> {
        return this.driver.handleEndpoint(async () => {
            return { data: { error: 'noStorageConfigured' }, status: 501 };
        })
    }
}