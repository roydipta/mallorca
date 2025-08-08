import { useState, useEffect, useCallback } from 'react';
import locationService from '../services/locationService';
import { Location } from '../components/mapHelpers';

interface UseLocationsOptions {
  enableCache?: boolean;
  cacheTTL?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseLocationsReturn {
  locations: Location[];
  isLoading: boolean;
  error: string;
  refetch: () => Promise<void>;
  createLocation: (locationData: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => Promise<Location>;
  updateLocation: (id: number, locationData: Partial<Location>) => Promise<Location>;
  deleteLocation: (id: number) => Promise<boolean>;
  clearCache: () => void;
  getCacheStatus: () => { [key: string]: any };
  isFromCache: boolean;
}

export function useLocations(options: UseLocationsOptions = {}): UseLocationsReturn {
  const {
    enableCache = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    autoRefresh = false,
    refreshInterval = 60 * 1000 // 1 minute
  } = options;

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Check if data is coming from cache
      const cacheStatus = locationService.getCacheStatus();
      const hasValidCache = cacheStatus.locations.cached;
      setIsFromCache(hasValidCache);

      const data = await locationService.fetchLocations({
        useCache: enableCache,
        cacheTTL
      });
      
      setLocations(data);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  }, [enableCache, cacheTTL]);

  const createLocation = useCallback(async (locationData: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError('');
      const newLocation = await locationService.createLocation(locationData);
      await fetchLocations(); // Refresh the list
      return newLocation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create location';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchLocations]);

  const updateLocation = useCallback(async (id: number, locationData: Partial<Location>) => {
    try {
      setError('');
      const updatedLocation = await locationService.updateLocation(id, locationData);
      await fetchLocations(); // Refresh the list
      return updatedLocation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update location';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchLocations]);

  const deleteLocation = useCallback(async (id: number) => {
    try {
      setError('');
      const success = await locationService.deleteLocation(id);
      if (success) {
        await fetchLocations(); // Refresh the list
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete location';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchLocations]);

  const clearCache = useCallback(() => {
    locationService.clearAllCache();
    setIsFromCache(false);
  }, []);

  const getCacheStatus = useCallback(() => {
    return locationService.getCacheStatus();
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Auto refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchLocations();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchLocations]);

  // Preload data on mount for faster subsequent loads
  useEffect(() => {
    if (enableCache) {
      locationService.preloadData();
    }
  }, [enableCache]);

  // Cleanup expired cache on unmount
  useEffect(() => {
    return () => {
      // Clean up expired cache entries when component unmounts
      setTimeout(() => {
        const cacheService = require('../services/cacheService').default;
        cacheService.cleanupExpired();
      }, 1000);
    };
  }, []);

  return {
    locations,
    isLoading,
    error,
    refetch: fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    clearCache,
    getCacheStatus,
    isFromCache
  };
}