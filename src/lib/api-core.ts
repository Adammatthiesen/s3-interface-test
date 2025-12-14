import { AstroContextDriver } from './DynamicStorageApi/core/astro-context';
import { InMemoryDatabase } from './in-memory-db/database';
import { UrlMappingService } from './DynamicStorageApi/core/url-mapping';
import { S3ApiService } from './s3/s3-service';

// Instantiate the Astro context driver
const astroContextDriver = new AstroContextDriver();

// Instantiate the in-memory database
const database = new InMemoryDatabase();

// Instantiate the URL mapping service
const urlMappingService = new UrlMappingService(database);

// Create the S3 API service with the Astro context driver
export const s3ApiService = new S3ApiService(astroContextDriver, urlMappingService);