import type { AuthorizationType, ContextDriverDefinition, StorageApiBuilderDefinition, StorageAPIEndpointFn, UrlMappingServiceDefinition, UrlMetadata } from "../DynamicStorageApi/definitions";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
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

export class S3ApiService<C extends unknown, R extends unknown> implements StorageApiBuilderDefinition<C, R> {
    driver;
    urlMappingService

    constructor(driver: ContextDriverDefinition<C, R>, urlMappingService: UrlMappingServiceDefinition) {
        this.driver = driver;
        this.urlMappingService = urlMappingService;
    }

    resolveUrl(identifier: string): Promise<UrlMetadata> {
        return this.urlMappingService.resolve(
            identifier,
            generateUrlMetadata,
        );
    }

    getPOST(type?: AuthorizationType): StorageAPIEndpointFn<C, R> {
        return this.driver.buildPostEndpoint(async ({ getJson, isAuthorized }) => {
            const { action, key, contentType, prefix, identifier, newKey } = await getJson();

            // Cases when authorization is required
            const authRequiredActions = ['upload', 'delete', 'rename', 'cleanup', 'mappings', 'test', 'list'];
            if (authRequiredActions.includes(action) && !isAuthorized(type)) {
                return { data: { error: 'Unauthorized' }, status: 401 };
            }

            switch (action) {
                case 'resolveUrl': {
                    const metadata = await this.urlMappingService.resolve(
                        identifier,
                        generateUrlMetadata,
                    );
                    return { data: metadata, status: 200 };
                }

                case 'publicUrl': {
                    const metadata = await generateUrlMetadata(key);

                    // Optionally register the mapping
                    const mappingIdentifier = this.urlMappingService.createIdentifier(key);
                    await this.urlMappingService.register(mappingIdentifier, metadata);

                    return {
                        data: {
                            ...metadata,
                            identifier: mappingIdentifier
                        }, status: 200
                    };
                }

                case 'upload': {
                    // Generate presigned URL for upload
                    const command = new PutObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: key,
                        ContentType: contentType,
                    });
                    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                    return { data: { url, key }, status: 200 };
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
                    return { data: { files }, status: 200 };
                }

                case 'delete': {
                    const command = new DeleteObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: key,
                    });
                    await s3Client.send(command);

                    // Also delete from URL mapping
                    const mappingIdentifier = this.urlMappingService.createIdentifier(key);
                    await this.urlMappingService.delete(mappingIdentifier);

                    return { data: { success: true }, status: 200 };
                }

                case 'rename': {
                    if (!newKey) {
                        return { data: { error: 'newKey is required for rename action' }, status: 400 };
                    }

                    // Copy the object to the new key
                    const copyCommand = new CopyObjectCommand({
                        Bucket: BUCKET_NAME,
                        CopySource: `${BUCKET_NAME}/${key}`,
                        Key: newKey,
                    });
                    await s3Client.send(copyCommand);

                    // Delete the old object
                    const deleteCommand = new DeleteObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: key,
                    });
                    await s3Client.send(deleteCommand);

                    // Update URL mappings
                    const oldMappingIdentifier = this.urlMappingService.createIdentifier(key);
                    await this.urlMappingService.delete(oldMappingIdentifier);

                    // Create new mapping for the renamed file
                    const newMappingIdentifier = this.urlMappingService.createIdentifier(newKey);
                    const urlMetadata = await generateUrlMetadata(newKey);
                    await this.urlMappingService.register(newMappingIdentifier, urlMetadata);

                    return { data: { success: true, newKey }, status: 200 };
                }

                case 'download': {
                    // Generate presigned URL for download
                    const command = new GetObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: key,
                    });
                    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                    return { data: { url }, status: 200 };
                }

                case 'cleanup': {
                    // Clean up expired mappings
                    const deletedCount = await this.urlMappingService.cleanup();
                    return { data: { deletedCount }, status: 200 };
                }

                case 'mappings': {
                    // Get all mappings (for debugging)
                    const mappings = await this.urlMappingService.getAll();
                    return { data: { mappings }, status: 200 };
                }

                case 'test': {
                    // Test connection to verify configuration
                    try {
                        const command = new ListObjectsV2Command({
                            Bucket: BUCKET_NAME,
                            MaxKeys: 1,
                        });
                        await s3Client.send(command);
                        return {
                            data: {
                                success: true,
                                message: 'Successfully connected to S3-compatible storage',
                                provider: import.meta.env.S3_PROVIDER || 'Unknown'
                            },
                            status: 200
                        };
                    } catch (error) {
                        return {
                            data: {
                                success: false,
                                error: error instanceof Error ? error.message : 'Connection failed'
                            },
                            status: 500
                        };
                    }
                }

                default:
                    return { data: { error: 'Invalid action' }, status: 400 };
            }
        })
    }

    getPUT(type?: AuthorizationType): StorageAPIEndpointFn<C, R> {
        return this.driver.buildPutEndpoint(async ({ getArrayBuffer, getHeader, isAuthorized }) => {

            if (!isAuthorized(type)) {
                return { data: { error: 'Unauthorized' }, status: 401 };
            }

            try {
                const contentType = getHeader('Content-Type') || 'application/octet-stream';
                const key = getHeader('x-storage-key');

                if (!key) {
                    return { data: { error: 'Missing x-storage-key header' }, status: 400 };
                }

                const fileData = await getArrayBuffer();

                // Upload to S3
                const command = new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: key,
                    Body: new Uint8Array(fileData),
                    ContentType: contentType,
                });

                await s3Client.send(command);

                console.log(`Successfully uploaded file to S3: ${key}`);

                return { data: { message: 'File uploaded successfully', key }, status: 200 };
            } catch (error) {
                console.error('S3 PUT Error:', error);
                return { data: { error: (error as Error).message }, status: 500 };
            }
        });
    }
}