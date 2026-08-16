export interface CacheOptions {
  defaultTtl?: number;
  maxSize?: number;
  keyPrefix?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  cleanup(): Promise<number>;
  getStats(): CacheStats;
}
