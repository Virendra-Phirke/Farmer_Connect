export interface WeatherForecast {
    date: string;
    maxTemp: number;
    minTemp: number;
    weatherCode: number;
    precipitation: number;
    precipitationProbability: number;
    windSpeed: number;
    dewPoint?: number;
    pressure?: number;
}

export interface CurrentWeather {
    temp: number;
    feelsLike: number;
    humidity: number;
    precipitationStr: string;
    windSpeed: number;
    weatherCode: number;
    isDay: boolean;
    dewPoint?: number;
    pressure?: number;
    visibility?: number;
}

interface GeocodeOptions {
    countryCode?: string;
}

/**
 * Uses the free Open-Meteo Geocoding API to resolve a location string to coordinates.
 */
export async function fetchCoordinates(
    location: string,
    options: GeocodeOptions = {}
): Promise<{ lat: number; lng: number; name: string } | null> {
    try {
        const params = new URLSearchParams({
            name: location,
            count: "5",
            language: "en",
            format: "json",
        });

        if (options.countryCode) {
            params.set("countryCode", options.countryCode);
        }

        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
        if (!res.ok) throw new Error("Geocoding failed");
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const best = data.results[0];
            const displayName = [best.name, best.admin1, best.country].filter(Boolean).join(", ");
            return {
                lat: best.latitude,
                lng: best.longitude,
                name: displayName || best.name,
            };
        }

        // Fallback geocoder (better coverage for village-level places)
        const fallbackParams = new URLSearchParams({
            q: location,
            format: "jsonv2",
            limit: "1",
            addressdetails: "1",
        });

        if (options.countryCode) {
            fallbackParams.set("countrycodes", options.countryCode.toLowerCase());
        }

        const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?${fallbackParams.toString()}`);
        if (!fallbackRes.ok) return null;

        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            const best = fallbackData[0];
            const lat = Number(best.lat);
            const lng = Number(best.lon);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                const displayName = String(best.display_name || best.name || location);
                return {
                    lat,
                    lng,
                    name: displayName,
                };
            }
        }

        return null;
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

/**
 * Fetches 7-day daily forecast and current weather using the Open-Meteo Forecast API.
 */
export async function fetch7DayForecast(lat: number, lng: number): Promise<{ daily: WeatherForecast[]; current: CurrentWeather } | null> {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,dew_point_2m,pressure_msl,visibility&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,dew_point_2m_min,pressure_msl_min&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Forecast fetch failed");
        const data = await res.json();

        let current: CurrentWeather | null = null;
        if (data.current) {
            current = {
                temp: data.current.temperature_2m,
                feelsLike: data.current.apparent_temperature,
                humidity: data.current.relative_humidity_2m,
                precipitationStr: `${data.current.precipitation} mm`,
                windSpeed: data.current.wind_speed_10m,
                weatherCode: data.current.weather_code,
                isDay: data.current.is_day === 1,
                dewPoint: data.current.dew_point_2m,
                pressure: data.current.pressure_msl,
                visibility: data.current.visibility ? data.current.visibility / 1000 : undefined
            };
        }

        if (data.daily && current) {
            const forecasts: WeatherForecast[] = [];
            for (let i = 0; i < data.daily.time.length; i++) {
                forecasts.push({
                    date: data.daily.time[i],
                    maxTemp: data.daily.temperature_2m_max[i],
                    minTemp: data.daily.temperature_2m_min[i],
                    weatherCode: data.daily.weather_code[i],
                    precipitation: data.daily.precipitation_sum[i],
                    precipitationProbability: data.daily.precipitation_probability_max?.[i] || 0,
                    windSpeed: data.daily.wind_speed_10m_max?.[i] || 0,
                    dewPoint: data.daily.dew_point_2m_min?.[i],
                    pressure: data.daily.pressure_msl_min?.[i],
                });
            }
            return { daily: forecasts, current };
        }
        return null;
    } catch (error) {
        console.error("Weather forecast error:", error);
        return null;
    }
}

/**
 * Maps WMO Weather interpretation codes to readable text and generalized icon types.
 * WMO Codes: https://open-meteo.com/en/docs
 */
export function getWeatherDescription(code: number): { text: string; iconBase: string } {
    if (code === 0) return { text: "Clear sky", iconBase: "sun" };
    if (code === 1 || code === 2) return { text: "Partly cloudy", iconBase: "cloud-sun" };
    if (code === 3) return { text: "Overcast", iconBase: "cloud" };
    if (code === 45 || code === 48) return { text: "Fog", iconBase: "cloud-fog" };
    if (code >= 51 && code <= 57) return { text: "Drizzle", iconBase: "cloud-drizzle" };
    if (code >= 61 && code <= 65) return { text: "Rain", iconBase: "cloud-rain" };
    if (code === 66 || code === 67) return { text: "Freezing Rain", iconBase: "cloud-hail" };
    if (code >= 71 && code <= 77) return { text: "Snow", iconBase: "cloud-snow" };
    if (code >= 80 && code <= 82) return { text: "Rain Showers", iconBase: "cloud-rain" };
    if (code === 85 || code === 86) return { text: "Snow Showers", iconBase: "cloud-snow" };
    if (code >= 95 && code <= 99) return { text: "Thunderstorm", iconBase: "cloud-lightning" };
    return { text: "Unknown", iconBase: "cloud" };
}
