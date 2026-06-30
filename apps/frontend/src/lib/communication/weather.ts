export type WeatherSnapshot = {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  pressure?: number;
  rainProbability?: number;
  cloudCover?: number;
  visibility?: number;
  uvIndex?: number;
  sunrise?: string;
  sunset?: string;
  status: 'configured' | 'not_configured' | 'error';
  lastUpdated?: string;
  alertLevel?: 'low' | 'medium' | 'high' | 'critical';
};

export type WeatherRecommendation = {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
};

export const weatherConfigKeys = [
  'WEATHER_API_URL',
  'WEATHER_API_KEY',
  'WEATHER_API_SECRET',
  'WEATHER_LOCATION',
  'WEATHER_LATITUDE',
  'WEATHER_LONGITUDE',
];

export function getWeatherConfigurationStatus(env: Record<string, string | undefined>) {
  return weatherConfigKeys.every((key) => Boolean(env[key])) ? 'configured' : 'not_configured';
}

export function buildWeatherRecommendations(snapshot: WeatherSnapshot): WeatherRecommendation[] {
  if (snapshot.status !== 'configured') {
    return [
      {
        title: 'Weather API Not Configured',
        description: 'Add weather credentials and location settings to enable live forecasts and automated farmer advisories.',
        severity: 'medium',
      },
    ];
  }

  const recommendations: WeatherRecommendation[] = [];

  if ((snapshot.rainProbability || 0) >= 70) {
    recommendations.push({
      title: 'Review spraying plans',
      description: 'High rain probability can reduce spray effectiveness. Consider advising farmers to delay spraying where practical.',
      severity: 'high',
    });
  }

  if ((snapshot.windSpeed || 0) >= 30) {
    recommendations.push({
      title: 'Limit field spraying',
      description: 'Strong wind can cause spray drift and machinery safety risks.',
      severity: 'high',
    });
  }

  if ((snapshot.temperature || 0) <= 5) {
    recommendations.push({
      title: 'Cold stress protection',
      description: 'Low temperatures may affect crops and livestock. Share frost and dairy protection guidance.',
      severity: 'critical',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Normal field operations',
      description: 'No severe weather signal detected from the latest snapshot.',
      severity: 'low',
    });
  }

  return recommendations;
}
