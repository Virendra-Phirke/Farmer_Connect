import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getUserProfile, getProfileId } from "@/lib/supabase-auth";
import { getWeatherAlerts } from "@/lib/api/weather-alerts";
import {
    fetchCoordinates,
    fetch7DayForecast,
    WeatherForecast,
    CurrentWeather,
    getWeatherDescription,
} from "@/lib/api/open-meteo";
import { useIndianLocations } from "@/hooks/useIndianLocations";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Loader2,
    CloudSun,
    Sun,
    Cloud,
    CloudFog,
    CloudDrizzle,
    CloudRain,
    CloudSnow,
    CloudLightning,
    MapPin,
    Droplets,
    CalendarDays,
    Thermometer,
    Wind,
    Eye,
    ChevronRight,
    Gauge,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Weather icon map ─────────────────────────────────────────────────── */
const getWeatherIcon = (iconBase: string, size = "md") => {
    const sz = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-5 w-5" : "h-8 w-8";
    const map: Record<string, JSX.Element> = {
        "sun":             <Sun           className={cn(sz, "text-amber-400")} />,
        "cloud-sun":       <CloudSun      className={cn(sz, "text-amber-400")} />,
        "cloud":           <Cloud         className={cn(sz, "text-slate-400")} />,
        "cloud-fog":       <CloudFog      className={cn(sz, "text-slate-400")} />,
        "cloud-drizzle":   <CloudDrizzle  className={cn(sz, "text-sky-400")} />,
        "cloud-rain":      <CloudRain     className={cn(sz, "text-sky-500")} />,
        "cloud-hail":      <CloudRain     className={cn(sz, "text-sky-300")} />,
        "cloud-snow":      <CloudSnow     className={cn(sz, "text-indigo-200")} />,
        "cloud-lightning": <CloudLightning className={cn(sz, "text-yellow-500")} />,
    };
    return map[iconBase] ?? <Cloud className={cn(sz, "text-slate-400")} />;
};

/* ─── Gradient overlays per weather condition ──────────────────────────── */
const getConditionGradient = (iconBase: string) => {
    const map: Record<string, string> = {
        "sun":             "from-amber-500/20 via-orange-400/10 to-transparent",
        "cloud-sun":       "from-amber-400/15 via-sky-300/10 to-transparent",
        "cloud":           "from-slate-400/20 via-slate-300/10 to-transparent",
        "cloud-fog":       "from-slate-300/20 via-slate-200/10 to-transparent",
        "cloud-drizzle":   "from-sky-500/20 via-sky-400/10 to-transparent",
        "cloud-rain":      "from-sky-600/25 via-sky-500/10 to-transparent",
        "cloud-snow":      "from-indigo-300/20 via-blue-200/10 to-transparent",
        "cloud-lightning": "from-yellow-500/20 via-orange-400/10 to-transparent",
    };
    return map[iconBase] ?? "from-slate-400/15 to-transparent";
};

/* ─── Component ─────────────────────────────────────────────────────────── */
const WeatherAlertsPage = () => {
    const { user } = useUser();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [forecasts, setForecasts] = useState<WeatherForecast[]>([]);
    const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
    const [locationName, setLocationName] = useState<string>("");
    const [weatherLoading, setWeatherLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [selectedTaluka, setSelectedTaluka] = useState<string>("");
    const [selectedVillage, setSelectedVillage] = useState<string>("");
    const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

    const { subDistricts: talukas, villages, isLoading: locationsLoading } = useIndianLocations(
        profile?.state || "",
        profile?.district || "",
        selectedTaluka
    );

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const data = await getWeatherAlerts({ active_only: true });
                setAlerts(data || []);
                if (user?.id) {
                    const pId = await getProfileId(user.id);
                    if (pId) {
                        const profileData = await getUserProfile(user.id);
                        setProfile(profileData);
                        setSelectedTaluka(profileData?.taluka || "");
                        setSelectedVillage(profileData?.village_city || "");
                    }
                }
            } catch { setAlerts([]); }
            finally { setLoading(false); }
        }
        load();
    }, [user?.id]);

    useEffect(() => {
        async function fetchWeather() {
            setWeatherLoading(true);
            try {
                if (!profile) return;
                const queries = [
                    [selectedVillage, selectedTaluka, profile.district, profile.state, "India"],
                    [selectedVillage, profile.state, "India"],
                    [selectedTaluka, profile.district, profile.state, "India"],
                    [profile.district, profile.state, "India"],
                    profile.state ? [profile.state, "India"] : [],
                ].map(p => p.filter(Boolean).join(", ")).filter(Boolean);

                let coords: { lat: number; lng: number; name: string } | null = null;
                for (const loc of queries) {
                    const result = await fetchCoordinates(loc, { countryCode: "IN" });
                    if (result) { coords = result; break; }
                }

                if (coords) {
                    setLocationName(coords.name);
                    const forecastData = await fetch7DayForecast(coords.lat, coords.lng);
                    if (forecastData) {
                        setForecasts(forecastData.daily);
                        setCurrentWeather(forecastData.current);
                        setSelectedDayIndex(0);
                    } else { setForecasts([]); setCurrentWeather(null); }
                } else { setLocationName(""); setForecasts([]); setCurrentWeather(null); }
            } catch { setForecasts([]); setCurrentWeather(null); }
            finally { setWeatherLoading(false); }
        }
        fetchWeather();
    }, [profile, selectedTaluka, selectedVillage]);

    /* Derive what to show in the detail panel */
    const selectedForecast = forecasts[selectedDayIndex] ?? null;
    const isToday = selectedDayIndex === 0;
    const detailWeatherCode = isToday && currentWeather
        ? currentWeather.weatherCode
        : selectedForecast?.weatherCode ?? 0;
    const detailDesc = getWeatherDescription(detailWeatherCode);

    return (
        <DashboardLayout subtitle="Stay updated with weather alerts for your farming region.">
            <div className="space-y-8">

                {/* ── Location Filter ───────────────────────────────────── */}
                {profile && !locationsLoading && (
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                        <h3 className="font-semibold text-base flex items-center gap-2 mb-4 text-foreground">
                            <MapPin className="h-4 w-4 text-primary" />
                            Location
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">District</label>
                                <div className="px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-foreground font-medium">
                                    {profile.district || "—"}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Taluka</label>
                                <Select value={selectedTaluka} onValueChange={setSelectedTaluka}>
                                    <SelectTrigger className="rounded-xl h-10">
                                        <SelectValue placeholder="Select taluka" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {talukas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Village / City</label>
                                <Select value={selectedVillage} onValueChange={setSelectedVillage}>
                                    <SelectTrigger className="rounded-xl h-10">
                                        <SelectValue placeholder="Select village" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {villages.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Weather Panel ─────────────────────────────────────── */}
                {weatherLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : forecasts.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground text-sm">
                        Couldn't fetch forecast. Please update Village/City, Taluka, District, and State in your Profile.
                    </div>
                ) : (
                    <div className="space-y-4">

                        {/* ── Detail Card ─────────────────────────────────── */}
                        <div
                            className={cn(
                                "relative overflow-hidden rounded-2xl border border-border bg-card shadow-md",
                                "transition-all duration-500"
                            )}
                        >
                            {/* Ambient gradient based on condition */}
                            <div
                                className={cn(
                                    "absolute inset-0 bg-gradient-to-br pointer-events-none",
                                    getConditionGradient(detailDesc.iconBase)
                                )}
                            />

                            <div className="relative z-10 p-6 md:p-8">
                                {/* Header row */}
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                                    <div>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {locationName || "—"}
                                        </div>
                                        <p className="text-2xl font-bold text-foreground">
                                            {isToday
                                                ? "Today"
                                                : new Date(selectedForecast!.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                                            }
                                        </p>
                                        {!isToday && (
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                {new Date(selectedForecast!.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-background/60 dark:bg-background/30 backdrop-blur-sm p-4 rounded-2xl border border-border/50">
                                            {getWeatherIcon(detailDesc.iconBase, "lg")}
                                        </div>
                                    </div>
                                </div>

                                {/* Temp + description */}
                                <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-8">
                                    <span className="text-7xl font-black tracking-tighter text-foreground leading-none">
                                        {isToday && currentWeather
                                            ? Math.round(currentWeather.temp)
                                            : Math.round(selectedForecast!.maxTemp)}°
                                    </span>
                                    <div className="pb-2">
                                        <p className="text-lg font-semibold text-foreground">{detailDesc.text}</p>
                                        {!isToday && selectedForecast && (
                                            <p className="text-sm text-muted-foreground">
                                                High {Math.round(selectedForecast.maxTemp)}° · Low {Math.round(selectedForecast.minTemp)}°
                                            </p>
                                        )}
                                        {isToday && currentWeather && (
                                            <p className="text-sm text-muted-foreground">
                                                Feels like {Math.round(currentWeather.feelsLike)}°
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Stats grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {[
                                        {
                                            icon: <Droplets className="h-4 w-4 text-sky-500" />,
                                            label: isToday ? "Humidity" : "Precip. Prob.",
                                            value: isToday && currentWeather
                                                ? `${currentWeather.humidity}%`
                                                : `${selectedForecast?.precipitationProbability ?? 0}%`,
                                        },
                                        {
                                            icon: <CloudRain className="h-4 w-4 text-indigo-500" />,
                                            label: "Precipitation",
                                            value: selectedForecast
                                                ? `${selectedForecast.precipitation.toFixed(1)} mm`
                                                : (isToday && currentWeather)
                                                    ? currentWeather.precipitationStr
                                                    : "—",
                                        },
                                        {
                                            icon: <Wind className="h-4 w-4 text-slate-500" />,
                                            label: "Wind Speed",
                                            value: selectedForecast
                                                ? `${selectedForecast.windSpeed.toFixed(1)} km/h`
                                                : (isToday && currentWeather)
                                                    ? `${currentWeather.windSpeed.toFixed(1)} km/h`
                                                    : "—",
                                        },
                                        {
                                            icon: <Thermometer className="h-4 w-4 text-orange-500" />,
                                            label: isToday ? "Feels Like" : "Min Temp",
                                            value: isToday && currentWeather
                                                ? `${Math.round(currentWeather.feelsLike)}°C`
                                                : selectedForecast
                                                    ? `${Math.round(selectedForecast.minTemp)}°C`
                                                    : "—",
                                        },
                                        {
                                            icon: <Gauge className="h-4 w-4 text-emerald-500" />,
                                            label: "Pressure",
                                            value: isToday && currentWeather?.pressure
                                                ? `${Math.round(currentWeather.pressure)} mb`
                                                : selectedForecast?.pressure
                                                    ? `${Math.round(selectedForecast.pressure)} mb`
                                                    : "—",
                                        },
                                        {
                                            icon: <Eye className="h-4 w-4 text-violet-500" />,
                                            label: isToday ? "Visibility" : "Dew Point",
                                            value: isToday && currentWeather?.visibility
                                                ? `${(currentWeather.visibility).toFixed(1)} km`
                                                : selectedForecast?.dewPoint
                                                    ? `${Math.round(selectedForecast.dewPoint)}°C`
                                                    : "—",
                                        },
                                    ].map(stat => (
                                        <div
                                            key={stat.label}
                                            className="flex flex-col gap-2 bg-background/50 dark:bg-background/20 backdrop-blur-sm rounded-xl p-4 border border-border/40"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {stat.icon}
                                                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                                            </div>
                                            <span className="text-xl font-bold text-foreground">{stat.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── 7-Day Strip ──────────────────────────────────── */}
                        <div className="grid grid-cols-7 gap-2">
                            {forecasts.map((forecast, index) => {
                                const desc = getWeatherDescription(forecast.weatherCode);
                                const dateObj = new Date(forecast.date);
                                const dayName = index === 0
                                    ? "Today"
                                    : dateObj.toLocaleDateString("en-US", { weekday: "short" });
                                const isSelected = selectedDayIndex === index;

                                return (
                                    <button
                                        key={forecast.date}
                                        onClick={() => setSelectedDayIndex(index)}
                                        className={cn(
                                            "relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center",
                                            "transition-all duration-200 cursor-pointer select-none",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                            isSelected
                                                ? "bg-teal-900 dark:bg-teal-900 text-white dark:text-slate border-slate-600 dark:border-slate-500 shadow-lg scale-[1.04]"
                                                : "bg-card border-border hover:bg-muted/60 hover:border-primary/30 hover:scale-[1.02]"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-xs font-bold uppercase tracking-wider",
                                            isSelected ? "text-primary-foreground" : "text-muted-foreground"
                                        )}>
                                            {dayName}
                                        </span>

                                        <div className={cn(
                                            "rounded-lg p-1.5 transition-colors",
                                            isSelected ? "bg-white/20" : "bg-muted/50"
                                        )}>
                                            {getWeatherIcon(desc.iconBase, "sm")}
                                        </div>

                                        <span className={cn(
                                            "text-base font-black leading-none",
                                            isSelected ? "text-primary-foreground" : "text-foreground"
                                        )}>
                                            {Math.round(forecast.maxTemp)}°
                                        </span>

                                        <span className={cn(
                                            "text-xs",
                                            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                                        )}>
                                            {Math.round(forecast.minTemp)}°
                                        </span>

                                        {forecast.precipitation > 0 && (
                                            <div className={cn(
                                                "flex items-center gap-0.5 text-[10px] font-semibold",
                                                isSelected ? "text-sky-200" : "text-sky-500"
                                            )}>
                                                <Droplets className="h-2.5 w-2.5" />
                                                {forecast.precipitation}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default WeatherAlertsPage;