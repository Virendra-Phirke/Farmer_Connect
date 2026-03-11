export interface WeatherForecast {
    date: string;
    maxTemp: number;
    minTemp: number;
    weatherCode: number;
    precipitation: number;
}

export interface CurrentWeather {
    temp: number;
    feelsLike: number;
    humidity: number;
    precipitationStr: string;
    windSpeed: number;
    weatherCode: number;
    isDay: boolean;
}

/**
 * Uses the free Open-Meteo Geocoding API to resolve a location string to coordinates.
 */
export async function fetchCoordinates(location: string): Promise<{ lat: number; lng: number; name: string } | null> {
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
        if (!res.ok) throw new Error("Geocoding failed");
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            return {
                lat: data.results[0].latitude,
                lng: data.results[0].longitude,
                name: data.results[0].name
            };
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
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&timezone=auto`;
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
                isDay: data.current.is_day === 1
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
