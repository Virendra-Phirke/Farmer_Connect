import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getUserProfile } from "@/lib/supabase-auth";
import { getWeatherAlerts } from "@/lib/api/weather-alerts";
import { fetchCoordinates, fetch7DayForecast, WeatherForecast, CurrentWeather, getWeatherDescription } from "@/lib/api/open-meteo";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, CloudSun, AlertTriangle, Info, Sun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, MapPin, Droplets, CalendarDays, Thermometer, Wind, Activity } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

const severityStyles: Record<string, string> = {
    info: "border-blue-200 bg-blue-50",
    warning: "border-yellow-200 bg-yellow-50",
    critical: "border-red-200 bg-red-50",
};

const getWeatherIcon = (iconBase: string) => {
    switch (iconBase) {
        case "sun": return <Sun className="h-8 w-8 text-yellow-500" />;
        case "cloud-sun": return <CloudSun className="h-8 w-8 text-yellow-500" />;
        case "cloud": return <Cloud className="h-8 w-8 text-gray-500" />;
        case "cloud-fog": return <CloudFog className="h-8 w-8 text-gray-400" />;
        case "cloud-drizzle": return <CloudDrizzle className="h-8 w-8 text-blue-400" />;
        case "cloud-rain": return <CloudRain className="h-8 w-8 text-blue-500" />;
        case "cloud-hail": return <CloudRain className="h-8 w-8 text-blue-300" />;
        case "cloud-snow": return <CloudSnow className="h-8 w-8 text-blue-200" />;
        case "cloud-lightning": return <CloudLightning className="h-8 w-8 text-yellow-600" />;
        default: return <Cloud className="h-8 w-8 text-gray-400" />;
    }
};

const WeatherAlertsPage = () => {
    const { user } = useUser();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [forecasts, setForecasts] = useState<WeatherForecast[]>([]);
    const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
    const [locationName, setLocationName] = useState<string>("");
    const [weatherLoading, setWeatherLoading] = useState(true);

    // Filter forecasts by search query
    const filteredForecasts = forecasts.filter((forecast: WeatherForecast) => {
        const desc = getWeatherDescription(forecast.weatherCode);
        return desc.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            forecast.date.includes(searchQuery);
    });

    useEffect(() => {
        async function load() {
            setLoading(true);
            setWeatherLoading(true);
            try {
                const data = await getWeatherAlerts({ active_only: true });
                setAlerts(data || []);

                if (user?.id) {
                    const profile = await getUserProfile(user.id);
                    if (profile) {
                        // Open-Meteo geocoding works best with single city/town names rather than long strings
                        const locationQueriesToTry = [
                            profile.village_city,
                            profile.taluka,
                            profile.district,
                            profile.location,
                            profile.state,
                            "Maharashtra" // Absolute fallback so weather array doesn't break
                        ].filter(Boolean);

                        let coords = null;
                        for (const loc of locationQueriesToTry) {
                            if (!loc) continue;
                            const result = await fetchCoordinates(loc);
                            if (result) {
                                coords = result;
                                break;
                            }
                        }

                        if (coords) {
                            setLocationName(coords.name);
                            const forecastData = await fetch7DayForecast(coords.lat, coords.lng);
                            if (forecastData) {
                                setForecasts(forecastData.daily);
                                setCurrentWeather(forecastData.current);
                            }
                        }
                    }
                }
            } catch {
                setAlerts([]);
            } finally {
                setLoading(false);
                setWeatherLoading(false);
            }
        }
        load();
    }, [user?.id]);

    return (
        <DashboardLayout subtitle="Stay updated with weather alerts for your farming region.">
            <div className="space-y-6">




                {/* Current Weather Panel */}
                {!weatherLoading && currentWeather && locationName && (
                    <div className="pt-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                            <Thermometer className="h-6 w-6" />
                            Current Weather in {locationName}
                        </h2>

                        <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-4 rounded-full">
                                    {getWeatherIcon(getWeatherDescription(currentWeather.weatherCode).iconBase)}
                                </div>
                                <div>
                                    <div className="text-4xl font-bold font-display">{Math.round(currentWeather.temp)}°C</div>
                                    <div className="text-muted-foreground font-medium">{getWeatherDescription(currentWeather.weatherCode).text}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 w-full md:w-auto gap-4 md:gap-8 flex-1 md:ml-12">
                                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                                    <Thermometer className="h-5 w-5 text-orange-500 mb-2" />
                                    <span className="text-xs text-muted-foreground mb-1">Feels Like</span>
                                    <span className="font-semibold text-lg">{Math.round(currentWeather.feelsLike)}°C</span>
                                </div>
                                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                                    <Droplets className="h-5 w-5 text-blue-500 mb-2" />
                                    <span className="text-xs text-muted-foreground mb-1">Humidity</span>
                                    <span className="font-semibold text-lg">{currentWeather.humidity}%</span>
                                </div>
                                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                                    <CloudRain className="h-5 w-5 text-indigo-500 mb-2" />
                                    <span className="text-xs text-muted-foreground mb-1">Precipitation</span>
                                    <span className="font-semibold text-lg">{currentWeather.precipitationStr}</span>
                                </div>
                                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                                    <Wind className="h-5 w-5 text-gray-500 mb-2" />
                                    <span className="text-xs text-muted-foreground mb-1">Wind Speed</span>
                                    <span className="font-semibold text-lg">{currentWeather.windSpeed} km/h</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 7-Day Forecast Section */}
                <div className="pt-8">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                        <CalendarDays className="h-6 w-6" />
                        7-Day Forecast
                        {locationName && (
                            <span className="text-sm font-medium text-muted-foreground flex items-center ml-2 bg-muted px-2 py-1 rounded-full">
                                <MapPin className="h-3.5 w-3.5 mr-1" />
                                {locationName}
                            </span>
                        )}
                    </h2>

                    <SearchBar 
                        placeholder="Search by weather type or date..." 
                        onSearch={setSearchQuery} 
                    />

                    {weatherLoading ? (
                        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : forecasts.length === 0 ? (
                        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                            We couldn't fetch the forecast for your area. Please ensure your Profile Location is up to date.
                        </div>
                    ) : !filteredForecasts.length ? (
                        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                            No forecasts match your search.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            {filteredForecasts.map((forecast, index) => {
                                const desc = getWeatherDescription(forecast.weatherCode);
                                const isToday = index === 0;
                                const dateObj = new Date(forecast.date);
                                const dayName = isToday ? "Today" : dateObj.toLocaleDateString("en-US", { weekday: "short" });
                                const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                                return (
                                    <div key={forecast.date} className={`bg-card rounded-xl border border-border p-4 flex flex-col items-center text-center hover:border-primary/50 transition-colors ${isToday ? 'ring-2 ring-primary/20' : ''}`}>
                                        <div className="font-semibold text-foreground mb-1">{dayName}</div>
                                        <div className="text-xs text-muted-foreground mb-3">{formattedDate}</div>

                                        <div className="bg-muted/50 p-3 rounded-full mb-3">
                                            {getWeatherIcon(desc.iconBase)}
                                        </div>

                                        <div className="text-sm font-medium mb-1 truncate w-full" title={desc.text}>
                                            {desc.text}
                                        </div>

                                        <div className="flex items-center gap-2 mt-auto pt-3 font-display">
                                            <span className="text-lg font-bold text-foreground">{Math.round(forecast.maxTemp)}°</span>
                                            <span className="text-sm text-muted-foreground">{Math.round(forecast.minTemp)}°</span>
                                        </div>

                                        {forecast.precipitation > 0 && (
                                            <div className="flex items-center gap-1 text-xs text-blue-500 mt-2 bg-blue-50 px-2 py-0.5 rounded-full">
                                                <Droplets className="h-3 w-3" />
                                                {forecast.precipitation}mm
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default WeatherAlertsPage;
