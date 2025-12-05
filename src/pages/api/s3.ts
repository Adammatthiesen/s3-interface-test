// src/pages/api/s3.ts
import type { APIRoute } from 'astro';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

export const POST: APIRoute = async ({ request }) => {
  try {
    const { action, key, contentType, prefix } = await request.json();

    switch (action) {
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