// In-memory database implementation (swap with SQLite/PostgreSQL for production)
import type { UrlMapping, UrlMappingDatabaseDefinition } from '../DynamicStorageApi/definitions';

export class InMemoryDatabase implements UrlMappingDatabaseDefinition {
  private store: Map<string, UrlMapping> = new Map();

  async get(identifier: `storage-file://${string}`): Promise<UrlMapping | null> {
    return this.store.get(identifier) || null;
  }

  async set(mapping: UrlMapping): Promise<void> {
    this.store.set(mapping.identifier, mapping);
  }

  async delete(identifier: `storage-file://${string}`): Promise<void> {
    this.store.delete(identifier);
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let deletedCount = 0;

    for (const [identifier, mapping] of this.store.entries()) {
      // Only cleanup non-permanent URLs that have expired
      if (!mapping.isPermanent && mapping.expiresAt && mapping.expiresAt <= now) {
        this.store.delete(identifier);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async getAll(): Promise<UrlMapping[]> {
    return Array.from(this.store.values());
  }
}
