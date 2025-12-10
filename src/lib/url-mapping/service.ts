// URL Mapping Service - handles resolution and auto-refresh of URLs
import type { UrlMetadata, UrlMapping } from './types';
import { db } from './database';

export class UrlMappingService {
  /**
   * Resolve a URL from an identifier (e.g., "s3-file://path/to/file.jpg")
   * Automatically refreshes expired URLs
   */
  async resolve(
    identifier: string,
    refreshCallback: (s3Key: string) => Promise<UrlMetadata>
  ): Promise<UrlMetadata> {
    const mapping = await db.get(identifier);
    const now = Date.now();

    // Case 1: Permanent URL - return immediately
    if (mapping?.isPermanent) {
      return {
        url: mapping.url,
        isPermanent: true,
      };
    }

    // Case 2: Expired or missing - refresh from S3
    if (!mapping || (mapping.expiresAt && mapping.expiresAt <= now)) {
      const s3Key = this.extractKeyFromIdentifier(identifier);
      const metadata = await refreshCallback(s3Key);

      await this.register(identifier, s3Key, metadata);

      return metadata;
    }

    // Case 3: Valid cached URL
    return {
      url: mapping.url,
      isPermanent: false,
      expiresAt: mapping.expiresAt,
    };
  }

  /**
   * Register a new URL mapping
   */
  async register(
    identifier: string,
    s3Key: string,
    metadata: UrlMetadata
  ): Promise<void> {
    const now = Date.now();
    const mapping: UrlMapping = {
      identifier,
      s3Key,
      url: metadata.url,
      isPermanent: metadata.isPermanent,
      expiresAt: metadata.expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await db.set(mapping);
  }

  /**
   * Delete a URL mapping
   */
  async delete(identifier: string): Promise<void> {
    await db.delete(identifier);
  }

  /**
   * Clean up expired entries (optional maintenance)
   */
  async cleanup(): Promise<number> {
    return await db.cleanup();
  }

  /**
   * Get all mappings (for debugging/admin)
   */
  async getAll(): Promise<UrlMapping[]> {
    return await db.getAll();
  }

  /**
   * Extract S3 key from identifier
   * e.g., "s3-file://path/to/file.jpg" -> "path/to/file.jpg"
   */
  private extractKeyFromIdentifier(identifier: string): string {
    if (identifier.startsWith('s3-file://')) {
      return identifier.substring('s3-file://'.length);
    }
    // Fallback: treat as direct key
    return identifier;
  }

  /**
   * Create identifier from S3 key
   * e.g., "path/to/file.jpg" -> "s3-file://path/to/file.jpg"
   */
  createIdentifier(s3Key: string): string {
    return `s3-file://${s3Key}`;
  }
}

// Singleton instance
export const urlMappingService = new UrlMappingService();
