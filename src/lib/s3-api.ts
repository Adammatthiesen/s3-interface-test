import { AstroContextDriver } from './s3-api/infra/astro-context';
import { InMemoryDatabase } from './s3-api/infra/database';
import { S3ApiService } from './s3-api/infra/s3-service';
import { S3UrlMappingService } from './s3-api/infra/s3-url-mapping';

// Instantiate the Astro context driver
const astroContextDriver = new AstroContextDriver();

// Instantiate the in-memory database
const database = new InMemoryDatabase();

// Instantiate the URL mapping service
const urlMappingService = new S3UrlMappingService(database);

// Create the S3 API service with the Astro context driver
export const s3ApiService = new S3ApiService(astroContextDriver, urlMappingService);