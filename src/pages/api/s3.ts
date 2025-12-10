// src/pages/api/s3.ts
import type { APIRoute } from 'astro';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { urlMappingService } from '../../lib/url-mapping/service';
import type { UrlMetadata } from '../../lib/url-mapping/types';

// Flexible configuration for any S3-compatible provider
const s3Client = new S3Client({
  region: import.meta.env.S3_REGION || 'auto',
  endpoint: import.meta.env.S3_ENDPOINT, // e.g., https://s3.us-west-004.backblazeb2.com
  credentials: {
    accessKeyId: import.meta.env.S3_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: import.meta.env.S3_FORCE_PATH_STYLE === 'true', // Required for MinIO, optional for others
});

const BUCKET_NAME = import.meta.env.S3_BUCKET_NAME;
const PUBLIC_ENDPOINT = import.meta.env.S3_PUBLIC_ENDPOINT;

// Helper function to generate URL metadata for a given S3 key
async function generateUrlMetadata(key: string): Promise<UrlMetadata> {
  // If public endpoint is configured, return permanent public URL
  if (PUBLIC_ENDPOINT) {
    const publicUrl = PUBLIC_ENDPOINT.endsWith('/') 
      ? `${PUBLIC_ENDPOINT}${key}` 
      : `${PUBLIC_ENDPOINT}/${key}`;
    return { url: publicUrl, isPermanent: true };
  }
  
  // Fallback to presigned URL (7 days max)
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  const SevenDaysInSeconds = 7 * 24 * 60 * 60;
  const inSevenDays = new Date();

  const url = await getSignedUrl(s3Client, command, { expiresIn: SevenDaysInSeconds });
  inSevenDays.setSeconds(inSevenDays.getSeconds() + SevenDaysInSeconds);

  return { url, isPermanent: false, expiresAt: inSevenDays.getTime() };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { action, key, contentType, prefix, identifier } = await request.json();

    switch (action) {
      case 'resolveUrl': {
        // Resolve URL from identifier (e.g., "s3-file://path/to/file.jpg")
        const metadata = await urlMappingService.resolve(
          identifier,
          generateUrlMetadata
        );
        return new Response(JSON.stringify(metadata), { status: 200 });
      }

      case 'publicUrl': {
        const metadata = await generateUrlMetadata(key);
        
        // Optionally register the mapping
        const mappingIdentifier = urlMappingService.createIdentifier(key);
        await urlMappingService.register(mappingIdentifier, key, metadata);
        
        return new Response(JSON.stringify({ 
          ...metadata, 
          identifier: mappingIdentifier 
        }), { status: 200 });
      }

      case 'upload': {
        // Generate presigned URL for upload
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          ContentType: contentType,
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return new Response(JSON.stringify({ url, key }), { status: 200 });
      }

      case 'list': {
        const command = new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: prefix || key || '',
        });
        const response = await s3Client.send(command);
        const files = response.Contents?.map(item => ({
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
        })) || [];
        return new Response(JSON.stringify({ files }), { status: 200 });
      }

      case 'delete': {
        const command = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        });
        await s3Client.send(command);
        
        // Also delete from URL mapping
        const mappingIdentifier = urlMappingService.createIdentifier(key);
        await urlMappingService.delete(mappingIdentifier);
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      case 'download': {
        // Generate presigned URL for download
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return new Response(JSON.stringify({ url }), { status: 200 });
      }

      case 'cleanup': {
        // Clean up expired mappings
        const deletedCount = await urlMappingService.cleanup();
        return new Response(JSON.stringify({ deletedCount }), { status: 200 });
      }

      case 'mappings': {
        // Get all mappings (for debugging)
        const mappings = await urlMappingService.getAll();
        return new Response(JSON.stringify({ mappings }), { status: 200 });
      }

      case 'test': {
        // Test connection to verify configuration
        try {
          const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            MaxKeys: 1,
          });
          await s3Client.send(command);
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Successfully connected to S3-compatible storage',
            provider: import.meta.env.S3_PROVIDER || 'Unknown'
          }), { status: 200 });
        } catch (error) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Connection failed'
          }), { status: 500 });
        }
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }
  } catch (error) {
    console.error('S3 API Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500 }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const key = request.headers.get('x-s3-key');
    
    if (!key) {
      return new Response(
        JSON.stringify({ error: 'Missing x-s3-key header' }),
        { status: 400 }
      );
    }

    // Get file data from request body
    const fileData = await request.arrayBuffer();

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(fileData),
      ContentType: contentType,
    });

    await s3Client.send(command);

    console.log(`Successfully uploaded file to S3: ${key}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        key,
        message: 'File uploaded successfully' 
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('S3 PUT Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500 }
    );
  }
};