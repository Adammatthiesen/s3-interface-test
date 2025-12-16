import { AstroContextDriver } from './DynamicStorageApi/core/astro-context';
import { InMemoryDatabase } from './inMemoryDb/database';
import { UrlMappingService } from './DynamicStorageApi/core/url-mapping';
import { S3ApiService } from './s3/s3-service';
import { APICore } from './DynamicStorageApi/core/api-core';

// Instantiate the Astro context driver
const astroContextDriver = new AstroContextDriver();

// Instantiate the in-memory database
const database = new InMemoryDatabase();

// Instantiate the URL mapping service
const urlMappingService = new UrlMappingService(database);

// Create the S3 API service with the Astro context driver
const s3ApiService = new S3ApiService(astroContextDriver, urlMappingService);

// Create the API core instance
export const apiCore = new APICore({
    driver: astroContextDriver,
    urlMappingService: urlMappingService,
    storageDriver: s3ApiService,
})