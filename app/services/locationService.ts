import cacheService from './cacheService';
import { Location } from '../components/mapHelpers';

interface LocationServiceOptions {
  useCache?: boolean;
  cacheTTL?: number;
}

class LocationService {
  private static instance: LocationService;
  private readonly CACHE_KEYS = {
    LOCATIONS: 'locations',
    LOCATION_BY_ID: (id: number) => `location_${id}`,
    TRAVEL_TIMES: 'travel_times'
  };

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async fetchLocations(options: LocationServiceOptions = {}): Promise<Location[]> {
    const { useCache = true, cacheTTL = 5 * 60 * 1000 } = options;
    const cacheKey = this.CACHE_KEYS.LOCATIONS;

    if (useCache) {
      const cached = cacheService.get<Location[]>(cacheKey);
      if (cached) {
        console.log('Using cached locations data');
        return cached;
      }
    }

    try {
      console.log('Fetching fresh locations data from API');
      const response = await fetch('/api/locations');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Failed to fetch locations');
      }

      const locations: Location[] = result.data;

      if (useCache) {
        cacheService.set(cacheKey, locations, { ttl: cacheTTL });
      }

      return locations;
    } catch (error) {
      console.error('Error fetching locations:', error);
      
      if (useCache) {
        const staleCache = cacheService.get<Location[]>(cacheKey);
        if (staleCache) {
          console.log('Using stale cache data due to network error');
          return staleCache;
        }
      }
      
      throw error;
    }
  }

  async createLocation(locationData: Omit<Location, 'id' | 'created_at' | 'updated_at'>): Promise<Location> {
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create location');
      }

      this.invalidateLocationsCache();
      
      return result.data;
    } catch (error) {
      console.error('Error creating location:', error);
      throw error;
    }
  }

  async updateLocation(id: number, locationData: Partial<Location>): Promise<Location> {
    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update location');
      }

      this.invalidateLocationCache(id);
      this.invalidateLocationsCache();
      
      return result.data;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  async deleteLocation(id: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete location');
      }

      this.invalidateLocationCache(id);
      this.invalidateLocationsCache();
      
      return true;
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }

  cacheTravelTimesData(locations: Location[]): void {
    const locationsWithTravelTimes = locations.filter(loc => 
      loc.travelTimeFromPrevious || loc.distanceFromPrevious
    );
    
    if (locationsWithTravelTimes.length > 0) {
      cacheService.set(this.CACHE_KEYS.TRAVEL_TIMES, locationsWithTravelTimes, { 
        ttl: 30 * 60 * 1000 // 30 minutes for travel times
      });
    }
  }

  getCachedTravelTimes(): Location[] | null {
    return cacheService.get<Location[]>(this.CACHE_KEYS.TRAVEL_TIMES);
  }

  invalidateLocationsCache(): void {
    cacheService.remove(this.CACHE_KEYS.LOCATIONS);
    cacheService.remove(this.CACHE_KEYS.TRAVEL_TIMES);
    console.log('Locations cache invalidated');
  }

  invalidateLocationCache(id: number): void {
    cacheService.remove(this.CACHE_KEYS.LOCATION_BY_ID(id));
    console.log(`Location cache invalidated for ID: ${id}`);
  }

  clearAllCache(): void {
    cacheService.clear();
    console.log('All cache cleared');
  }

  getCacheStatus(): { [key: string]: any } {
    const locations = cacheService.getCacheInfo(this.CACHE_KEYS.LOCATIONS);
    const travelTimes = cacheService.getCacheInfo(this.CACHE_KEYS.TRAVEL_TIMES);
    
    return {
      locations: locations ? {
        cached: true,
        age: Math.floor(locations.age / 1000) + 's',
        expiresIn: Math.floor((locations.expiresAt - Date.now()) / 1000) + 's'
      } : { cached: false },
      travelTimes: travelTimes ? {
        cached: true,
        age: Math.floor(travelTimes.age / 1000) + 's',
        expiresIn: Math.floor((travelTimes.expiresAt - Date.now()) / 1000) + 's'
      } : { cached: false }
    };
  }

  preloadData(): Promise<void> {
    return this.fetchLocations({ useCache: true }).then(() => {
      console.log('Data preloaded and cached');
    }).catch(error => {
      console.error('Failed to preload data:', error);
    });
  }
}

export default LocationService.getInstance();