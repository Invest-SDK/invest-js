import {
  TTLCache,
  type DisposeReason,
  type GetOptions,
  type SetOptions,
  type TTLCacheOptions as IsaacsTTLCacheOptions,
} from '@isaacs/ttlcache';
import { BaseCacheProvider } from './base-cache-provider';
import type { CacheOptions, CacheStats } from './interfaces';

export type LocalTTLCacheOptions = Partial<
  Omit<IsaacsTTLCacheOptions<string, unknown>, 'max' | 'ttl'>
> &
  CacheOptions;

export class LocalTTLCacheProvider extends BaseCacheProvider {
  private readonly cache: TTLCache<string, unknown>;

  constructor(options: LocalTTLCacheOptions = {}) {
    super(options);

    const dispose = options.dispose ?? (() => undefined);
    this.cache = new TTLCache({
      max: this.options.maxSize,
      ttl: this.options.defaultTtl,
      updateAgeOnGet: options.updateAgeOnGet ?? false,
      checkAgeOnGet: options.checkAgeOnGet ?? true,
      updateAgeOnHas: options.updateAgeOnHas ?? false,
      checkAgeOnHas: options.checkAgeOnHas ?? true,
      noUpdateTTL: options.noUpdateTTL ?? false,
      noDisposeOnSet: options.noDisposeOnSet ?? false,
      dispose: (value: unknown, key: string, reason: DisposeReason) => dispose(value, key, reason),
    });
  }

  public async get<T>(key: string, options?: GetOptions<string, unknown>): Promise<T | undefined> {
    const value = this.cache.get(this.getFullKey(key), options);
    if (value === undefined) {
      this.recordMiss();
      return undefined;
    }

    this.recordHit();
    return value as T;
  }

  public async set<T>(
    key: string,
    value: T,
    ttl?: number,
    options?: Omit<SetOptions<string, unknown>, 'ttl'>
  ): Promise<void> {
    this.cache.set(this.getFullKey(key), value, { ...options, ttl });
    this.stats.size = this.cache.size;
  }

  public async has(key: string): Promise<boolean> {
    return this.cache.has(this.getFullKey(key));
  }

  public async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(this.getFullKey(key));
    this.stats.size = this.cache.size;
    return deleted;
  }

  public async clear(): Promise<void> {
    this.cache.clear();
    this.stats.size = 0;
  }

  public override getStats(): CacheStats {
    this.stats.size = this.cache.size;
    return super.getStats();
  }

  public async cleanup(): Promise<number> {
    const sizeBefore = this.cache.size;
    this.cache.purgeStale();
    this.stats.size = this.cache.size;
    return sizeBefore - this.cache.size;
  }
}
