import { useQuery } from "@tanstack/react-query";
import {
    fetchCurrentWeather,
    fetchWeatherForecast,
    generateFarmingAlerts,
    geocodeLocation,
    CurrentWeather,
    WeatherForecastItem,
    FarmingAlert,
} from "@/lib/api";

/**
 * Fetch current weather for given coordinates
 */
export function useCurrentWeather(lat: number | null, lon: number | null) {
    return useQuery({
        queryKey: ["current-weather", lat, lon],
        queryFn: () => fetchCurrentWeather(lat!, lon!),
        enabled: lat !== null && lon !== null,
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
    });
}

/**
 * Fetch 5-day weather forecast for given coordinates
 */
export function useWeatherForecast(lat: number | null, lon: number | null) {
    return useQuery({
        queryKey: ["weather-forecast", lat, lon],
        queryFn: () => fetchWeatherForecast(lat!, lon!),
        enabled: lat !== null && lon !== null,
        staleTime: 30 * 60 * 1000, // 30 minutes
        retry: 2,
    });
}

/**
 * Fetch weather forecast AND generate farming alerts
 */
export function useFarmingAlerts(lat: number | null, lon: number | null) {
    return useQuery<FarmingAlert[]>({
        queryKey: ["farming-alerts", lat, lon],
        queryFn: async () => {
            const forecast = await fetchWeatherForecast(lat!, lon!);
            return generateFarmingAlerts(forecast);
        },
        enabled: lat !== null && lon !== null,
        staleTime: 30 * 60 * 1000, // 30 minutes
        retry: 2,
    });
}

/**
 * Geocode a location name to coordinates
 */
export function useGeocodeLocation(locationName: string | null) {
    return useQuery({
        queryKey: ["geocode", locationName],
        queryFn: () => geocodeLocation(locationName!),
        enabled: !!locationName,
        staleTime: 24 * 60 * 60 * 1000, // 24 hours — locations don't change
    });
}

/**
 * Fetch current weather by location name (geocodes first, then fetches weather)
 */
export function useWeatherByLocation(locationName: string | null) {
    const { data: geo } = useGeocodeLocation(locationName);

    const weather = useCurrentWeather(geo?.lat ?? null, geo?.lon ?? null);
    const alerts = useFarmingAlerts(geo?.lat ?? null, geo?.lon ?? null);

    return {
        weather: weather.data,
        alerts: alerts.data,
        isLoading: weather.isLoading || alerts.isLoading,
        error: weather.error || alerts.error,
        coordinates: geo,
    };
}

export type { CurrentWeather, WeatherForecastItem, FarmingAlert };
