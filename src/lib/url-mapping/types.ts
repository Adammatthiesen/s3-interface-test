// TypeScript types for URL mapping system
export interface UrlMetadata {
  url: string;
  isPermanent: boolean;
  expiresAt?: number; // Unix timestamp in ms
}

export interface UrlMapping extends UrlMetadata {
  identifier: string;
  s3Key: string;
  createdAt: number;
  updatedAt: number;
}

export interface UrlMappingDatabase {
  get(identifier: string): Promise<UrlMapping | null>;
  set(mapping: UrlMapping): Promise<void>;
  delete(identifier: string): Promise<void>;
  cleanup(): Promise<number>; // Returns count of deleted entries
  getAll(): Promise<UrlMapping[]>;
}
