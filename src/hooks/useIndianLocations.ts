import { useState, useEffect, useMemo } from "react";

interface Village {
  [key: string]: string;
}

interface SubDistrict {
  subDistrict: string;
  villages: string[];
}

interface District {
  district: string;
  subDistricts: SubDistrict[];
}

interface State {
  state: string;
  districts: District[];
}

interface UseIndianLocationsReturn {
  states: string[];
  districts: string[];
  subDistricts: string[];
  villages: string[];
  isLoading: boolean;
  error: string | null;
}

// Cache for storing fetched data
let cachedData: State[] | null = null;

export const useIndianLocations = (
  selectedState: string,
  selectedDistrict: string,
  selectedSubDistrict: string
): UseIndianLocationsReturn => {
  const [data, setData] = useState<State[] | null>(cachedData);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/indian-locations.json");
        if (!response.ok) {
          throw new Error(`Failed to load location data: ${response.status}`);
        }
        const loadedData = await response.json();
        cachedData = loadedData;
        setData(loadedData);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load location data"
        );
        console.error("Error loading location data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Compute available locations based on selections
  const states = useMemo(() => {
    if (!data) return [];
    return data.map(s => s.state).sort();
  }, [data]);

  const districts = useMemo(() => {
    if (!data || !selectedState) return [];
    const stateData = data.find(s => s.state === selectedState);
    return stateData ? stateData.districts.map(d => d.district).sort() : [];
  }, [data, selectedState]);

  const subDistricts = useMemo(() => {
    if (!data || !selectedState || !selectedDistrict) return [];
    const stateData = data.find(s => s.state === selectedState);
    const districtData = stateData?.districts.find(
      d => d.district === selectedDistrict
    );
    return districtData
      ? districtData.subDistricts.map(sd => sd.subDistrict).sort()
      : [];
  }, [data, selectedState, selectedDistrict]);

  const villages = useMemo(() => {
    if (!data || !selectedState || !selectedDistrict || !selectedSubDistrict)
      return [];
    const stateData = data.find(s => s.state === selectedState);
    const districtData = stateData?.districts.find(
      d => d.district === selectedDistrict
    );
    const subDistrictData = districtData?.subDistricts.find(
      sd => sd.subDistrict === selectedSubDistrict
    );
    return subDistrictData ? subDistrictData.villages.sort() : [];
  }, [data, selectedState, selectedDistrict, selectedSubDistrict]);

  return {
    states,
    districts,
    subDistricts,
    villages,
    isLoading,
    error,
  };
};
