/**
 * Weather Service — integrates with OpenWeatherMap API
 * to provide current weather, forecasts, and farming-relevant alerts.
 *
 * Requires env var: VITE_OPENWEATHER_API_KEY
 */

const API_BASE = "https://api.openweathermap.org/data/2.5";

function getApiKey(): string {
    return import.meta.env.VITE_OPENWEATHER_API_KEY || "";
}

export type CurrentWeather = {
    temperature: number;      // Celsius
    feels_like: number;
    humidity: number;          // %
    wind_speed: number;        // m/s
    description: string;
    icon: string;
    rain_mm: number | null;    // mm in last 1h
    location_name: string;
};

export type WeatherForecastItem = {
    datetime: string;          // ISO timestamp
    temperature: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    description: string;
    icon: string;
    rain_probability: number;  // 0-1
    rain_mm: number | null;
};

export type FarmingAlert = {
    type: "rain" | "temperature" | "wind" | "frost" | "heatwave";
    severity: "info" | "warning" | "critical";
    message: string;
    value: number;
};

/**
 * Fetch current weather for given coordinates
 */
export async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("OpenWeatherMap API key not configured. Set VITE_OPENWEATHER_API_KEY in .env");
    }

    const response = await fetch(
        `${API_BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
    );

    if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
        temperature: Math.round(data.main.temp),
        feels_like: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        wind_speed: data.wind.speed,
        description: data.weather?.[0]?.description || "Unknown",
        icon: data.weather?.[0]?.icon || "01d",
        rain_mm: data.rain?.["1h"] || null,
        location_name: data.name || "Unknown",
    };
}

/**
 * Fetch 5-day/3-hour forecast for given coordinates
 */
export async function fetchWeatherForecast(
    lat: number,
    lon: number
): Promise<WeatherForecastItem[]> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("OpenWeatherMap API key not configured. Set VITE_OPENWEATHER_API_KEY in .env");
    }

    const response = await fetch(
        `${API_BASE}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
    );

    if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return (data.list || []).map((item: any) => ({
        datetime: item.dt_txt,
        temperature: Math.round(item.main.temp),
        feels_like: Math.round(item.main.feels_like),
        humidity: item.main.humidity,
        wind_speed: item.wind.speed,
        description: item.weather?.[0]?.description || "Unknown",
        icon: item.weather?.[0]?.icon || "01d",
        rain_probability: item.pop || 0,
        rain_mm: item.rain?.["3h"] || null,
    }));
}

/**
 * Analyze forecast data and generate farming-relevant alerts
 */
export function generateFarmingAlerts(
    forecast: WeatherForecastItem[]
): FarmingAlert[] {
    const alerts: FarmingAlert[] = [];
    const next24h = forecast.slice(0, 8); // 8 × 3-hour intervals = 24 hours

    // Check for heavy rain
    const heavyRain = next24h.filter((f) => (f.rain_mm || 0) > 10);
    if (heavyRain.length > 0) {
        const maxRain = Math.max(...heavyRain.map((f) => f.rain_mm || 0));
        alerts.push({
            type: "rain",
            severity: maxRain > 30 ? "critical" : "warning",
            message: `Heavy rainfall expected (up to ${maxRain.toFixed(1)}mm). Consider protecting crops and delaying irrigation.`,
            value: maxRain,
        });
    }

    // Check for high rain probability
    const highRainProb = next24h.filter((f) => f.rain_probability > 0.7);
    if (highRainProb.length >= 3 && heavyRain.length === 0) {
        alerts.push({
            type: "rain",
            severity: "info",
            message: "Sustained rain likely in the next 24 hours. Plan outdoor activities accordingly.",
            value: Math.max(...highRainProb.map((f) => f.rain_probability)) * 100,
        });
    }

    // Check for frost (below 2°C)
    const frostRisk = next24h.filter((f) => f.temperature <= 2);
    if (frostRisk.length > 0) {
        const minTemp = Math.min(...frostRisk.map((f) => f.temperature));
        alerts.push({
            type: "frost",
            severity: minTemp <= 0 ? "critical" : "warning",
            message: `Frost risk! Temperature expected to drop to ${minTemp}°C. Protect sensitive crops.`,
            value: minTemp,
        });
    }

    // Check for extreme heat (above 40°C)
    const heatRisk = next24h.filter((f) => f.temperature >= 40);
    if (heatRisk.length > 0) {
        const maxTemp = Math.max(...heatRisk.map((f) => f.temperature));
        alerts.push({
            type: "heatwave",
            severity: maxTemp >= 45 ? "critical" : "warning",
            message: `Extreme heat expected (up to ${maxTemp}°C). Ensure adequate irrigation and shade for crops.`,
            value: maxTemp,
        });
    }

    // Check for high wind
    const highWind = next24h.filter((f) => f.wind_speed > 15);
    if (highWind.length > 0) {
        const maxWind = Math.max(...highWind.map((f) => f.wind_speed));
        alerts.push({
            type: "wind",
            severity: maxWind > 25 ? "critical" : "warning",
            message: `Strong winds expected (up to ${maxWind.toFixed(1)} m/s). Secure equipment and protect tall crops.`,
            value: maxWind,
        });
    }

    // General high temperature warning
    const hotDays = next24h.filter((f) => f.temperature >= 35 && f.temperature < 40);
    if (hotDays.length >= 4 && heatRisk.length === 0) {
        alerts.push({
            type: "temperature",
            severity: "info",
            message: "High temperatures expected. Increase watering frequency for heat-sensitive crops.",
            value: Math.max(...hotDays.map((f) => f.temperature)),
        });
    }

    return alerts;
}

/**
 * Get the OpenWeatherMap icon URL
 */
export function getWeatherIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * Convert location name to coordinates using OpenWeatherMap Geocoding API
 */
export async function geocodeLocation(
    locationName: string
): Promise<{ lat: number; lon: number; name: string } | null> {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
            locationName
        )}&limit=1&appid=${apiKey}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.length === 0) return null;

    return {
        lat: data[0].lat,
        lon: data[0].lon,
        name: data[0].name,
    };
}
