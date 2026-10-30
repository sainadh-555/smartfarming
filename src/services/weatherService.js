/**
 * Open-Meteo Live Weather Integration Service
 * Free, keyless API for accurate hyper-local agrometeorological data.
 * Completely independent of ESP32 physical sensor telemetry.
 */

export const WMO_WEATHER_CODES = {
  0: { label: 'Clear Sky', icon: 'Sun' },
  1: { label: 'Mainly Clear', icon: 'Sun' },
  2: { label: 'Partly Cloudy', icon: 'CloudSun' },
  3: { label: 'Overcast', icon: 'Cloud' },
  45: { label: 'Foggy', icon: 'CloudFog' },
  48: { label: 'Depositing Rime Fog', icon: 'CloudFog' },
  51: { label: 'Light Drizzle', icon: 'CloudDrizzle' },
  53: { label: 'Moderate Drizzle', icon: 'CloudDrizzle' },
  55: { label: 'Dense Drizzle', icon: 'CloudDrizzle' },
  56: { label: 'Light Freezing Drizzle', icon: 'CloudSnow' },
  57: { label: 'Dense Freezing Drizzle', icon: 'CloudSnow' },
  61: { label: 'Slight Rain', icon: 'CloudRain' },
  63: { label: 'Moderate Rain', icon: 'CloudRain' },
  65: { label: 'Heavy Rain', icon: 'CloudRain' },
  66: { label: 'Light Freezing Rain', icon: 'CloudSnow' },
  67: { label: 'Heavy Freezing Rain', icon: 'CloudSnow' },
  71: { label: 'Slight Snow Fall', icon: 'Snowflake' },
  73: { label: 'Moderate Snow Fall', icon: 'Snowflake' },
  75: { label: 'Heavy Snow Fall', icon: 'Snowflake' },
  77: { label: 'Snow Grains', icon: 'Snowflake' },
  80: { label: 'Slight Rain Showers', icon: 'CloudRain' },
  81: { label: 'Moderate Rain Showers', icon: 'CloudRain' },
  82: { label: 'Violent Rain Showers', icon: 'CloudLightning' },
  85: { label: 'Slight Snow Showers', icon: 'Snowflake' },
  86: { label: 'Heavy Snow Showers', icon: 'Snowflake' },
  95: { label: 'Thunderstorm', icon: 'CloudLightning' },
  96: { label: 'Thunderstorm with Slight Hail', icon: 'CloudLightning' },
  99: { label: 'Thunderstorm with Heavy Hail', icon: 'CloudLightning' }
};

export function interpretWeatherCode(code) {
  if (code === undefined || code === null) {
    return { label: 'N/A', icon: 'Cloud' };
  }
  return WMO_WEATHER_CODES[code] || { label: 'Variable Weather', icon: 'CloudSun' };
}

export const DEFAULT_FARM_LOCATION = {
  name: 'Green Valley Precision Farm',
  latitude: 17.3850,
  longitude: 78.4867,
  displayLocation: "17°23'N, 78°29'E • Hyderabad, IN"
};

export async function fetchLiveWeather(latitude = DEFAULT_FARM_LOCATION.latitude, longitude = DEFAULT_FARM_LOCATION.longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      console.warn(`[Weather] Open-Meteo returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const current = data?.current;

    if (!current) {
      return null;
    }

    const condition = interpretWeatherCode(current.weather_code);

    return {
      available: true,
      outdoorTemperature: typeof current.temperature_2m === 'number' ? current.temperature_2m : null,
      outdoorHumidity: typeof current.relative_humidity_2m === 'number' ? current.relative_humidity_2m : null,
      weatherCode: current.weather_code,
      weatherCondition: condition.label,
      weatherIcon: condition.icon,
      windSpeed: typeof current.wind_speed_10m === 'number' ? current.wind_speed_10m : null,
      rainfall: typeof current.precipitation === 'number' ? current.precipitation : null,
      rawTime: current.time,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone
    };
  } catch (error) {
    console.warn('[Weather] Failed to fetch live weather from Open-Meteo:', error.message);
    return null;
  }
}
