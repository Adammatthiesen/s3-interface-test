import type { APIContext } from 'astro';
import { AstroContextDriver } from './s3-api/infra/astro-context';
import { S3ApiService } from './s3-api/infra/s3-service';

// Instantiate the Astro context driver
const astroContextDriver = new AstroContextDriver();

// Create the S3 API service with the Astro context driver
export const s3ApiService = new S3ApiService<APIContext, Response>(astroContextDriver);