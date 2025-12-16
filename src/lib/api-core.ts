import { AstroContextDriver } from './DynamicStorageApi/core/astro-context';
import { InMemoryDatabase } from './inMemoryDb/database';
import { UrlMappingService } from './DynamicStorageApi/core/url-mapping';
import { S3ApiService } from './s3/s3-service';
import { APICore } from './DynamicStorageApi/core/api-core';
import { NoOpStorageService } from './DynamicStorageApi/core/no-op-storage';

// Instantiate the Astro context driver
const astroContextDriver = new AstroContextDriver();

// Instantiate the in-memory database
const database = new InMemoryDatabase();

// Instantiate the URL mapping service
const urlMappingService = new UrlMappingService(database);

// Create the S3 API service with the Astro context driver
const s3ApiService = new S3ApiService(astroContextDriver, urlMappingService);

const noOpApiService = new NoOpStorageService(astroContextDriver, urlMappingService);

/**
 * Mock version of service map for available storage services (there should only ever be 2 services in the map, and that is 'no-op' and the one configured)
 * 
 * Defaults to 'no-op' service if no other providers are available
 * 
 * add new storageService type to StudioCMS Plugins
 * ```ts
 * 
 * const storageService = {
 *  name: 'my-storage-service',
 *  ...otherServiceConfigurations
 * }
 * 
 * export default defineStudioCMSConfig({
 *  storageService: storageService,
 * })
 * 
 * ```
 * 
 * then pull automatically from config and use that as the key or default to 'no-op'
 */
const serviceMap = {
    'no-op': noOpApiService,
    's3': s3ApiService,
};

// Create the API core instance
export const apiCore = new APICore({
    driver: astroContextDriver,
    urlMappingService: urlMappingService,
    storageDriver: serviceMap['s3'],
})