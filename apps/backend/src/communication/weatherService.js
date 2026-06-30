const weatherKeys = [
  "WEATHER_API_URL",
  "WEATHER_API_KEY",
  "WEATHER_LOCATION",
  "WEATHER_LATITUDE",
  "WEATHER_LONGITUDE",
];

export function getWeatherConfigStatus(env = process.env) {
  return weatherKeys.every((key) => Boolean(env[key])) ? "configured" : "not_configured";
}

export class WeatherService {
  constructor(env = process.env) {
    this.env = env;
  }

  getStatus() {
    const status = getWeatherConfigStatus(this.env);
    return {
      status,
      location: this.env.WEATHER_LOCATION || "Nyandarua",
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

    return {
      ...status,
      synced: false,
      message: "Weather provider adapter placeholder. Add provider mapping before enabling live sync.",
    };
  }
}
