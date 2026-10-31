/**
 * Open-Meteo Live Weather Integration Service
 * Free, keyless API for accurate hyper-local agrometeorological data.
 * Completely independent of ESP32 physical sensor telemetry.
 */

export const WMO_WEATHER_CODES = {
  0: { label: 'Clear Sky', labelTe: 'నిర్మలమైన ఆకాశం', icon: 'Sun' },
  1: { label: 'Mainly Clear', labelTe: 'దాదాపు నిర్మలం', icon: 'Sun' },
  2: { label: 'Partly Cloudy', labelTe: 'పాక్షికంగా మేఘావృతం', icon: 'CloudSun' },
  3: { label: 'Overcast', labelTe: 'పూర్తిగా మేఘావృతం', icon: 'Cloud' },
  45: { label: 'Foggy', labelTe: 'పొగమంచు', icon: 'CloudFog' },
  48: { label: 'Depositing Rime Fog', labelTe: 'దట్టమైన పొగమంచు', icon: 'CloudFog' },
  51: { label: 'Light Drizzle', labelTe: 'తేలికపాటి చినుకులు', icon: 'CloudDrizzle' },
  53: { label: 'Moderate Drizzle', labelTe: 'ఒక మోస్తరు చినుకులు', icon: 'CloudDrizzle' },
  55: { label: 'Dense Drizzle', labelTe: 'చిరుజల్లులు', icon: 'CloudDrizzle' },
  56: { label: 'Light Freezing Drizzle', labelTe: 'చలి చినుకులు', icon: 'CloudSnow' },
  57: { label: 'Dense Freezing Drizzle', labelTe: 'దట్టమైన చలి చినుకులు', icon: 'CloudSnow' },
  61: { label: 'Slight Rain', labelTe: 'తేలికపాటి వర్షం', icon: 'CloudRain' },
  63: { label: 'Moderate Rain', labelTe: 'మోస్తరు వర్షం', icon: 'CloudRain' },
  65: { label: 'Heavy Rain', labelTe: 'భారీ వర్షం', icon: 'CloudRain' },
  66: { label: 'Light Freezing Rain', labelTe: 'చలి వర్షం', icon: 'CloudSnow' },
  67: { label: 'Heavy Freezing Rain', labelTe: 'తీవ్ర చలి వర్షం', icon: 'CloudSnow' },
  71: { label: 'Slight Snow Fall', labelTe: 'తేలికపాటి మంచు', icon: 'Snowflake' },
  73: { label: 'Moderate Snow Fall', labelTe: 'మంచు కురవడం', icon: 'Snowflake' },
  75: { label: 'Heavy Snow Fall', labelTe: 'భారీ మంచు', icon: 'Snowflake' },
  77: { label: 'Snow Grains', labelTe: 'మంచు రేణువులు', icon: 'Snowflake' },
  80: { label: 'Slight Rain Showers', labelTe: 'తేలికపాటి జల్లులు', icon: 'CloudRain' },
  81: { label: 'Moderate Rain Showers', labelTe: 'మోస్తరు జల్లులు', icon: 'CloudRain' },
  82: { label: 'Violent Rain Showers', labelTe: 'భారీ వర్షపు జల్లులు', icon: 'CloudLightning' },
  85: { label: 'Slight Snow Showers', labelTe: 'మంచు జల్లులు', icon: 'Snowflake' },
  86: { label: 'Heavy Snow Showers', labelTe: 'భారీ మంచు జల్లులు', icon: 'Snowflake' },
  95: { label: 'Thunderstorm', labelTe: 'ఉరుములతో కూడిన వర్షం', icon: 'CloudLightning' },
  96: { label: 'Thunderstorm with Slight Hail', labelTe: 'వడగండ్ల వర్షం', icon: 'CloudLightning' },
  99: { label: 'Thunderstorm with Heavy Hail', labelTe: 'భారీ వడగండ్ల వర్షం', icon: 'CloudLightning' }
};

export function interpretWeatherCode(code, language = 'en') {
  if (code === undefined || code === null) {
    return { label: 'N/A', labelTe: 'లభ్యం కాలేదు', icon: 'Cloud' };
  }
  const item = WMO_WEATHER_CODES[code] || { label: 'Variable Weather', labelTe: 'వాతావరణ మార్పు', icon: 'CloudSun' };
  return {
    ...item,
    displayLabel: language === 'te' ? item.labelTe : item.label
  };
}

export const DEFAULT_FARM_LOCATION = {
  name: 'Green Valley Precision Farm',
  latitude: 17.3850,
  longitude: 78.4867,
  displayLocation: "17°23'N, 78°29'E • Hyderabad, IN",
  city: 'Hyderabad',
  country: 'India',
  isLive: false
};

const STORAGE_LOCATION_KEY = 'smartfarm_live_location';

/**
 * Format decimal latitude and longitude into navigational coordinates (e.g., 17°23'N, 78°29'E)
 */
export function formatCoordinates(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return '0°00\'N, 0°00\'E';
  }
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  const latAbs = Math.abs(lat);
  const lonAbs = Math.abs(lon);
  const latDeg = Math.floor(latAbs);
  const latMin = Math.round((latAbs - latDeg) * 60);
  const lonDeg = Math.floor(lonAbs);
  const lonMin = Math.round((lonAbs - lonDeg) * 60);
  return `${latDeg}°${latMin.toString().padStart(2, '0')}'${latDir}, ${lonDeg}°${lonMin.toString().padStart(2, '0')}'${lonDir}`;
}

/**
 * Retrieve saved location from localStorage or fallback to DEFAULT_FARM_LOCATION
 */
export function getStoredLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_LOCATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.latitude === 'number' && typeof parsed?.longitude === 'number') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Location] Failed to read stored location:', err);
  }
  return DEFAULT_FARM_LOCATION;
}

/**
 * Save user location to localStorage
 */
export function saveStoredLocation(loc) {
  try {
    localStorage.setItem(STORAGE_LOCATION_KEY, JSON.stringify(loc));
  } catch (err) {
    console.warn('[Location] Failed to save location:', err);
  }
}

/**
 * Remove user location from localStorage and revert to default
 */
export function clearStoredLocation() {
  try {
    localStorage.removeItem(STORAGE_LOCATION_KEY);
  } catch (err) {
    console.warn('[Location] Failed to clear stored location:', err);
  }
}

/**
 * Reverse geocode coordinates using BigDataCloud's free keyless API
 */
export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const placeName = data.city || data.locality || data.principalSubdivision || '';
      const countryCode = data.countryCode || '';
      const countryName = data.countryName || '';
      return {
        placeName,
        countryCode,
        countryName,
        fullFormatted: placeName ? (countryCode ? `${placeName}, ${countryCode}` : placeName) : countryName
      };
    }
  } catch (err) {
    console.warn('[Location] Reverse geocode lookup error:', err.message);
  }
  return null;
}

/**
 * Request user's live position via HTML5 Geolocation API with IP-based fallback
 */
export async function getLiveBrowserLocation() {
  // Tier 1: High-accuracy GPS from browser Geolocation API
  if (typeof window !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 7000,
            maximumAge: 30000
          }
        );
      });

      const lat = Number(pos.coords.latitude.toFixed(4));
      const lon = Number(pos.coords.longitude.toFixed(4));
      const coordsStr = formatCoordinates(lat, lon);
      
      let localityStr = 'Live Coordinates';
      let placeName = '';
      let countryName = '';

      try {
        const geo = await reverseGeocode(lat, lon);
        if (geo) {
          placeName = geo.placeName;
          countryName = geo.countryName;
          if (geo.fullFormatted) {
            localityStr = geo.fullFormatted;
          }
        }
      } catch {
        // Reverse geocoding is auxiliary
      }

      const displayLocation = `${coordsStr} • ${localityStr}`;
      const farmName = placeName ? `${placeName} Precision Farm` : 'Live Precision Farm';

      const locObj = {
        name: farmName,
        latitude: lat,
        longitude: lon,
        displayLocation,
        city: placeName || 'Current Location',
        country: countryName || '',
        accuracy: Math.round(pos.coords.accuracy || 0),
        isLive: true,
        source: 'gps',
        detectedAt: new Date().toISOString()
      };

      saveStoredLocation(locObj);
      return locObj;
    } catch (gpsError) {
      console.warn('[Location] GPS prompt dismissed, timed out, or denied. Attempting IP geolocation fallback...', gpsError.message);
    }
  }

  // Tier 2: Seamless IP-based Geolocation fallback (works across desktops, laptops, blocked popups)
  try {
    const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client', {
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const lat = Number(data.latitude.toFixed(4));
        const lon = Number(data.longitude.toFixed(4));
        const coordsStr = formatCoordinates(lat, lon);
        const placeName = data.city || data.locality || data.principalSubdivision || '';
        const countryCode = data.countryCode || '';
        const countryName = data.countryName || '';
        const localityStr = placeName ? (countryCode ? `${placeName}, ${countryCode}` : placeName) : countryName;
        const displayLocation = `${coordsStr} • ${localityStr || 'Network Position'}`;
        const farmName = placeName ? `${placeName} Precision Farm` : 'Live Precision Farm';

        const locObj = {
          name: farmName,
          latitude: lat,
          longitude: lon,
          displayLocation,
          city: placeName || 'Current Location',
          country: countryName || '',
          accuracy: 1000,
          isLive: true,
          source: 'ip',
          detectedAt: new Date().toISOString()
        };

        saveStoredLocation(locObj);
        return locObj;
      }
    }
  } catch (ipError) {
    console.warn('[Location] IP Geolocation fallback failed:', ipError.message);
  }

  throw new Error('Unable to determine location. Please allow browser location access or verify your internet connection.');
}

export async function fetchLiveWeather(latitude = DEFAULT_FARM_LOCATION.latitude, longitude = DEFAULT_FARM_LOCATION.longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

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

    // Parse 5-day agrometeorological forecast
    let dailyForecast = [];
    const daily = data?.daily;
    if (daily && Array.isArray(daily.time)) {
      dailyForecast = daily.time.map((t, idx) => {
        const code = daily.weather_code?.[idx];
        const item = interpretWeatherCode(code);
        return {
          date: t,
          dayName: new Date(t).toLocaleDateString('en-US', { weekday: 'short' }),
          maxTemp: typeof daily.temperature_2m_max?.[idx] === 'number' ? daily.temperature_2m_max[idx] : null,
          minTemp: typeof daily.temperature_2m_min?.[idx] === 'number' ? daily.temperature_2m_min[idx] : null,
          rainMm: typeof daily.precipitation_sum?.[idx] === 'number' ? daily.precipitation_sum[idx] : 0,
          weatherCode: code,
          conditionEn: item.label,
          conditionTe: item.labelTe,
          icon: item.icon
        };
      }).slice(0, 5);
    }

    return {
      available: true,
      outdoorTemperature: typeof current.temperature_2m === 'number' ? current.temperature_2m : null,
      outdoorHumidity: typeof current.relative_humidity_2m === 'number' ? current.relative_humidity_2m : null,
      weatherCode: current.weather_code,
      weatherCondition: condition.label,
      weatherConditionTe: condition.labelTe,
      weatherIcon: condition.icon,
      windSpeed: typeof current.wind_speed_10m === 'number' ? current.wind_speed_10m : null,
      rainfall: typeof current.precipitation === 'number' ? current.precipitation : null,
      dailyForecast,
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
