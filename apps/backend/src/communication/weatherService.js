import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
  override: false,
});

const weatherKeys = [
  "WEATHER_API_URL",
  "WEATHER_API_KEY",
  "WEATHER_LOCATION",
  "WEATHER_LATITUDE",
  "WEATHER_LONGITUDE",
];

function normalizeEnvValue(value) {
  return String(value ?? "").trim();
}

function getWeatherConfig(env = process.env) {
  return {
    apiUrl: normalizeEnvValue(env.WEATHER_API_URL || env.VITE_WEATHER_API_URL),
    apiKey: normalizeEnvValue(env.WEATHER_API_KEY || env.VITE_WEATHER_API_KEY),
    location: normalizeEnvValue(env.WEATHER_LOCATION || env.VITE_WEATHER_LOCATION || "Nyandarua"),
    latitude: normalizeEnvValue(env.WEATHER_LATITUDE || env.VITE_WEATHER_LATITUDE || "-0.3"),
    longitude: normalizeEnvValue(env.WEATHER_LONGITUDE || env.VITE_WEATHER_LONGITUDE || "36.55"),
  };
}

function buildWeatherUrl(env = process.env) {
  const { apiUrl, apiKey, latitude, longitude } = getWeatherConfig(env);

  if (!apiUrl || !apiKey) {
    return null;
  }

  const withValues = apiUrl
    .replace(/\$\{apiKey\}/g, apiKey)
    .replace(/\{apiKey\}/g, apiKey)
    .replace(/\$\{lat\}/g, latitude)
    .replace(/\{lat\}/g, latitude)
    .replace(/\$\{lon\}/g, longitude)
    .replace(/\{lon\}/g, longitude);

  try {
    const url = new URL(withValues);
    if (!url.searchParams.has("lat")) {
      url.searchParams.set("lat", latitude);
    }
    if (!url.searchParams.has("lon")) {
      url.searchParams.set("lon", longitude);
    }
    if (!url.searchParams.has("appid")) {
      url.searchParams.set("appid", apiKey);
    }
    if (!url.searchParams.has("units")) {
      url.searchParams.set("units", "metric");
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeSnapshot(data, config) {
  const forecastItem = data?.list?.[0];
  const current = forecastItem?.main ? forecastItem : data?.current || data;
  const temperature = current?.main?.temp ?? current?.temp;
  const humidity = current?.main?.humidity ?? current?.humidity;
  const pressure = current?.main?.pressure ?? current?.pressure;
  const windSpeed = current?.wind?.speed ?? current?.wind_speed;
  const cloudCover = current?.clouds?.all ?? current?.clouds;
  const visibility = current?.visibility ? current.visibility / 1000 : current?.visibility;
  const sunrise = data?.city?.sunrise ? new Date(data.city.sunrise * 1000).toISOString() : current?.sunrise;
  const sunset = data?.city?.sunset ? new Date(data.city.sunset * 1000).toISOString() : current?.sunset;
  const rainProbability = Math.round((forecastItem?.pop ?? data?.daily?.[0]?.pop ?? 0) * 100);
  const uvIndex = current?.uvi ?? data?.current?.uvi;

  return {
    temperature: typeof temperature === "number" ? Number(temperature.toFixed(1)) : undefined,
    humidity: typeof humidity === "number" ? humidity : undefined,
    windSpeed: typeof windSpeed === "number" ? Number(windSpeed.toFixed(1)) : undefined,
    pressure: typeof pressure === "number" ? pressure : undefined,
    rainProbability,
    cloudCover: typeof cloudCover === "number" ? cloudCover : undefined,
    visibility: typeof visibility === "number" ? Number(visibility.toFixed(1)) : undefined,
    uvIndex: typeof uvIndex === "number" ? Number(uvIndex.toFixed(1)) : undefined,
    sunrise: sunrise ? new Date(sunrise).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
    sunset: sunset ? new Date(sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
    location: config.location,
    status: "configured",
    lastUpdated: new Date().toISOString(),
    alertLevel: rainProbability >= 70 || (windSpeed ?? 0) >= 30 ? "high" : (windSpeed ?? 0) >= 20 ? "medium" : "low",
  };
}

function buildRecommendations(snapshot) {
  const recommendations = [];

  if ((snapshot.rainProbability || 0) >= 70) {
    recommendations.push({
      title: "Review spraying plans",
      description: "High rain probability can reduce spray effectiveness. Consider advising farmers to delay spraying where practical.",
      severity: "high",
    });
  }

  if ((snapshot.windSpeed || 0) >= 30) {
    recommendations.push({
      title: "Limit field spraying",
      description: "Strong wind can cause spray drift and machinery safety risks.",
      severity: "high",
    });
  }

  if ((snapshot.temperature || 0) <= 5) {
    recommendations.push({
      title: "Cold stress protection",
      description: "Low temperatures may affect crops and livestock. Share frost and dairy protection guidance.",
      severity: "critical",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Normal field operations",
      description: "No severe weather signal detected from the latest snapshot.",
      severity: "low",
    });
  }

  return recommendations;
}

export function getWeatherConfigStatus(env = process.env) {
  const { apiUrl, apiKey, latitude, longitude } = getWeatherConfig(env);
  const isConfigured = Boolean(apiUrl && apiKey && latitude && longitude);
  return isConfigured ? "configured" : "not_configured";
}

export class WeatherService {
  constructor(env = process.env) {
    this.env = env;
  }

  getStatus() {
    const status = getWeatherConfigStatus(this.env);
    const config = getWeatherConfig(this.env);
    return {
      status,
      location: config.location,
      message: status === "configured" ? "Weather API configured" : "Weather API Not Configured",
    };
  }

  async sync() {
    const status = this.getStatus();
    if (status.status !== "configured") {
      return {
        ...status,
        synced: false,
        recommendations: [
          "Configure weather credentials to enable daily sync, alerts, and weekly SMS automation.",
        ],
      };
    }

    const weatherUrl = buildWeatherUrl(this.env);
    if (!weatherUrl) {
      return {
        ...status,
        status: "error",
        synced: false,
        message: "Weather API URL or key could not be built.",
        recommendations: [
          "Check the configured weather URL and API key in the deployment environment.",
        ],
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(weatherUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Weather API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const snapshot = normalizeSnapshot(data, getWeatherConfig(this.env));

      return {
        ...status,
        synced: true,
        snapshot,
        lastUpdated: snapshot.lastUpdated,
        message: `Weather forecast synced for ${snapshot.location}.`,
        recommendations: buildRecommendations(snapshot),
      };
    } catch (error) {
      return {
        ...status,
        status: "error",
        synced: false,
        message: error.message || "Weather sync failed.",
        recommendations: [
          "The weather API request failed. Verify the API URL, API key, and network connectivity.",
        ],
      };
    }
  }
}
