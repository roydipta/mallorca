interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key?: string;
}

class CacheService {
  private static instance: CacheService;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private storagePrefix = 'mallorca_cache_';

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private generateKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }

  set<T>(key: string, data: T, options: CacheOptions = {}): boolean {
    if (!this.isLocalStorageAvailable()) {
      console.warn('localStorage not available, caching disabled');
      return false;
    }

    try {
      const ttl = options.ttl || this.defaultTTL;
      const now = Date.now();
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: now,
        expiresAt: now + ttl
      };

      const cacheKey = this.generateKey(key);
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  get<T>(key: string): T | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    try {
      const cacheKey = this.generateKey(key);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      const now = Date.now();

      if (now > cacheItem.expiresAt) {
        this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Cache get error:', error);
      this.remove(key);
      return null;
    }
  }

  remove(key: string): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(key);
      localStorage.removeItem(cacheKey);
      return true;
    } catch (error) {
      console.error('Cache remove error:', error);
      return false;
    }
  }

  clear(): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  isExpired(key: string): boolean {
    if (!this.isLocalStorageAvailable()) {
      return true;
    }

    try {
      const cacheKey = this.generateKey(key);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return true;
      }

      const cacheItem: CacheItem<any> = JSON.parse(cached);
      return Date.now() > cacheItem.expiresAt;
    } catch {
      return true;
    }
  }

  getCacheInfo(key: string): { timestamp: number; expiresAt: number; age: number } | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    try {
      const cacheKey = this.generateKey(key);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cacheItem: CacheItem<any> = JSON.parse(cached);
      return {
        timestamp: cacheItem.timestamp,
        expiresAt: cacheItem.expiresAt,
        age: Date.now() - cacheItem.timestamp
      };
    } catch {
      return null;
    }
  }

  cleanupExpired(): number {
    if (!this.isLocalStorageAvailable()) {
      return 0;
    }

    let cleaned = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(this.storagePrefix)) {
        const plainKey = key.replace(this.storagePrefix, '');
        if (this.isExpired(plainKey)) {
          this.remove(plainKey);
          cleaned++;
        }
      }
    });

    return cleaned;
  }
}

export default CacheService.getInstance();