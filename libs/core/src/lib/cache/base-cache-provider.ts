import type { CacheOptions, CacheProvider, CacheStats } from './interfaces';

export abstract class BaseCacheProvider implements CacheProvider {
  protected readonly options: Required<CacheOptions>;
  protected stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
  };

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTtl: options.defaultTtl ?? 60_000,
      maxSize: options.maxSize ?? 1000,
      keyPrefix: options.keyPrefix ?? '',
    };
  }

  protected getFullKey(key: string): string {
    return this.options.keyPrefix ? `${this.options.keyPrefix}:${key}` : key;
  }

  protected recordHit(): void {
    this.stats.hits += 1;
    this.updateHitRate();
  }

  protected recordMiss(): void {
    this.stats.misses += 1;
    this.updateHitRate();
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total === 0 ? 0 : this.stats.hits / total;
  }

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public abstract get<T>(key: string): Promise<T | undefined>;
  public abstract set<T>(key: string, value: T, ttl?: number): Promise<void>;
  public abstract has(key: string): Promise<boolean>;
  public abstract delete(key: string): Promise<boolean>;
  public abstract clear(): Promise<void>;
  public abstract cleanup(): Promise<number>;
}
