import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PropertySubType {
  label: string;
  value: string;
}

export interface PropertyType {
  label: string;
  value: string;
  subtypes: PropertySubType[];
}

// Module-level cache to persist across component remounts
let cachedPropertyTypes: PropertyType[] | null = null;
let isFetching = false;
let fetchPromise: Promise<PropertyType[]> | null = null;

async function fetchPropertyTypesFromApi(): Promise<PropertyType[]> {
  const { data, error } = await supabase.functions.invoke('fetch-property-types');
  
  if (error) {
    console.error('Error fetching property types:', error);
    throw error;
  }
  
  if (data?.success && Array.isArray(data.data)) {
    return data.data;
  }
  
  return [];
}

export function usePropertyTypes() {
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>(cachedPropertyTypes || []);
  const [loading, setLoading] = useState(!cachedPropertyTypes);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already cached, use it immediately
    if (cachedPropertyTypes) {
      setPropertyTypes(cachedPropertyTypes);
      setLoading(false);
      return;
    }

    // If already fetching, wait for that promise
    if (isFetching && fetchPromise) {
      fetchPromise
        .then(data => {
          setPropertyTypes(data);
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

    fetchPromise = fetchPropertyTypesFromApi();
    
    fetchPromise
      .then(data => {
        cachedPropertyTypes = data;
        setPropertyTypes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch property types:', err);
        setError(err.message);
        setLoading(false);
      })
      .finally(() => {
        isFetching = false;
      });
  }, []);

  // Flatten property types for simple dropdown usage
  const flattenedTypes = propertyTypes.flatMap(type => [
    { label: type.label, value: type.value, isMain: true },
    ...type.subtypes.map(sub => ({ label: `  ${sub.label}`, value: sub.value, isMain: false }))
  ]);

  return { propertyTypes, flattenedTypes, loading, error };
}

// Function to manually refresh property types cache
export function refreshPropertyTypesCache() {
  cachedPropertyTypes = null;
  fetchPromise = null;
  isFetching = false;
}
