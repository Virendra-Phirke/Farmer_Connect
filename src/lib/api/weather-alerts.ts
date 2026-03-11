import { supabase } from "@/integrations/supabase/client";

export type WeatherAlert = {
  id: string;
  region: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  valid_until: string | null;
  created_at: string;
};

export type WeatherAlertInsert = Omit<WeatherAlert, "id" | "created_at">;

export async function getWeatherAlerts(filters?: {
  region?: string;
  severity?: string;
  active_only?: boolean;
}) {
  let query = supabase
    .from("weather_alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.region) {
    query = query.eq("region", filters.region);
  }

  if (filters?.severity) {
    query = query.eq("severity", filters.severity);
  }

  if (filters?.active_only) {
    const now = new Date().toISOString();
    query = query.or(`valid_until.is.null,valid_until.gte.${now}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching weather alerts:", error);
    throw error;
  }

  return data;
}

export async function getWeatherAlertById(id: string) {
  const { data, error } = await supabase
    .from("weather_alerts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching weather alert:", error);
    throw error;
  }

  return data;
}

export async function createWeatherAlert(alert: WeatherAlertInsert) {
  const { data, error } = await supabase
    .from("weather_alerts")
    .insert(alert)
    .select()
    .single();

  if (error) {
    console.error("Error creating weather alert:", error);
    throw error;
  }

  return data;
}

export async function updateWeatherAlert(id: string, updates: Partial<WeatherAlertInsert>) {
  const { data, error } = await supabase
    .from("weather_alerts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating weather alert:", error);
    throw error;
  }

  return data;
}

export async function deleteWeatherAlert(id: string) {
  const { error } = await supabase
    .from("weather_alerts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting weather alert:", error);
    throw error;
  }
}
