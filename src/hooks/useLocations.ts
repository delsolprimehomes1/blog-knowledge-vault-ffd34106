import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Location {
  label: string;
  value: string;
}

// Module-level cache to persist across component remounts
let cachedLocations: Location[] | null = null;
let isFetching = false;
let fetchPromise: Promise<Location[]> | null = null;

async function fetchLocationsFromApi(): Promise<Location[]> {
  const { data, error } = await supabase.functions.invoke('fetch-locations');
  
  if (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
  
  if (data?.success && Array.isArray(data.data)) {
    return data.data;
  }
  
  return [];
}

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>(cachedLocations || []);
  const [loading, setLoading] = useState(!cachedLocations);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already cached, use it immediately
    if (cachedLocations) {
      setLocations(cachedLocations);
      setLoading(false);
      return;
    }

    // If already fetching, wait for that promise
    if (isFetching && fetchPromise) {
      fetchPromise
        .then(data => {
          setLocations(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
      return;
    }

    // Start fetching
    isFetching = true;
    setLoading(true);

    fetchPromise = fetchLocationsFromApi();
    
    fetchPromise
      .then(data => {
        cachedLocations = data;
        setLocations(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch locations:', err);
        setError(err.message);
        setLoading(false);
      })
      .finally(() => {
        isFetching = false;
      });
  }, []);

  return { locations, loading, error };
}

// Function to manually refresh locations cache
export function refreshLocationsCache() {
  cachedLocations = null;
  fetchPromise = null;
  isFetching = false;
}
