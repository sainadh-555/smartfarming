/**
 * AgriNex™ — Browser-Based Live GPS Geolocation Service
 * ====================================================
 * High-accuracy, hardware-independent device positioning using the native
 * HTML5 Geolocation API (navigator.geolocation).
 *
 * Supports:
 * - High-accuracy continuous tracking via watchPosition()
 * - Throttled reverse-geocoding (BigDataCloud & OpenStreetMap Nominatim)
 * - Safe distance caching (Haversine formula) to prevent excessive network requests
 * - Comprehensive status transitions & error handling
 * - Zero reliance on external hardware or hardcoded coordinates
 */

export const GPS_STATUS = {
  OFF: 'GPS OFF',
  REQUESTING: 'REQUESTING PERMISSION',
  ACTIVE: 'GPS ACTIVE',
  UNAVAILABLE: 'LOCATION UNAVAILABLE',
  DENIED: 'PERMISSION DENIED',
  UNSUPPORTED: 'GPS UNSUPPORTED'
};

// In-memory cache for reverse-geocoding to prevent excessive API spamming
let lastGeocodeCache = {
  lat: null,
  lon: null,
  timestamp: 0,
  data: null
};

/**
 * Calculate Great-Circle distance between two points on Earth using Haversine formula
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in meters
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return Infinity;
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const phi1 = lat1 * rad;
  const phi2 = lat2 * rad;
  const deltaPhi = (lat2 - lat1) * rad;
  const deltaLambda = (lon2 - lon1) * rad;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format decimal coordinates with cardinal direction
 * Example: (16.3067, 80.4365) -> { latStr: "16.3067° N", lonStr: "80.4365° E", dmsStr: "16°18'N, 80°26'E" }
 */
export function formatGpsCoordinates(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return {
      latStr: 'N/A',
      lonStr: 'N/A',
      displayStr: 'N/A',
      dmsStr: 'N/A'
    };
  }

  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  const latAbs = Math.abs(lat).toFixed(4);
  const lonAbs = Math.abs(lon).toFixed(4);

  // Degrees and minutes (DMS)
  const latDeg = Math.floor(Math.abs(lat));
  const latMin = Math.round((Math.abs(lat) - latDeg) * 60);
  const lonDeg = Math.floor(Math.abs(lon));
  const lonMin = Math.round((Math.abs(lon) - lonDeg) * 60);

  const dmsStr = `${latDeg}°${latMin.toString().padStart(2, '0')}'${latDir}, ${lonDeg}°${lonMin.toString().padStart(2, '0')}'${lonDir}`;

  return {
    latStr: `${latAbs}° ${latDir}`,
    lonStr: `${lonAbs}° ${lonDir}`,
    displayStr: `${latAbs}° ${latDir}, ${lonAbs}° ${lonDir}`,
    dmsStr
  };
}

/**
 * Format location accuracy in meters
 */
export function formatGpsAccuracy(meters) {
  if (typeof meters !== 'number' || isNaN(meters) || meters <= 0) {
    return 'N/A';
  }
  return `${Math.round(meters)} meters`;
}

/**
 * Reverse geocode coordinates with distance & time caching
 * Primary: BigDataCloud keyless client API
 * Secondary: OpenStreetMap Nominatim
 */
export async function reverseGeocodeWithCache(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return null;
  }

  const now = Date.now();
  // Reuse cache if moved less than 200 meters and queried within last 60 seconds
  if (lastGeocodeCache.lat !== null && lastGeocodeCache.data) {
    const dist = calculateDistanceMeters(lat, lon, lastGeocodeCache.lat, lastGeocodeCache.lon);
    if (dist < 200 && (now - lastGeocodeCache.timestamp) < 60000) {
      return lastGeocodeCache.data;
    }
  }

  // 1. Primary: BigDataCloud Reverse Geocoding Client
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || '';
      const state = data.principalSubdivision || '';
      const country = data.countryName || data.countryCode || '';
      
      let fullFormatted = city;
      if (state && state !== city) fullFormatted += `, ${state}`;
      if (country) fullFormatted += `, ${country}`;

      const result = {
        city: city || 'Local Area',
        state,
        country,
        fullFormatted: fullFormatted.trim().replace(/^,\s*/, '') || 'Live Coordinates'
      };

      lastGeocodeCache = { lat, lon, timestamp: now, data: result };
      return result;
    }
  } catch (err) {
    console.warn('[GPS] BigDataCloud lookup failed, attempting OSM fallback:', err.message);
  }

  // 2. Secondary Fallback: OpenStreetMap Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
    const res = await fetch(osmUrl, {
      headers: { 'User-Agent': 'AgriNex-Precision-Farm/2.0' },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
      const state = addr.state || '';
      const country = addr.country || '';

      let fullFormatted = city;
      if (state && state !== city) fullFormatted += `, ${state}`;
      if (country) fullFormatted += `, ${country}`;

      const result = {
        city: city || 'Local Area',
        state,
        country,
        fullFormatted: fullFormatted.trim().replace(/^,\s*/, '') || data.display_name || 'Live Coordinates'
      };

      lastGeocodeCache = { lat, lon, timestamp: now, data: result };
      return result;
    }
  } catch (err) {
    console.warn('[GPS] OSM Nominatim reverse geocode error:', err.message);
  }

  // Fallback to plain coordinates without breaking
  const coords = formatGpsCoordinates(lat, lon);
  return {
    city: 'Current Coordinates',
    state: '',
    country: '',
    fullFormatted: coords.displayStr
  };
}

/**
 * Checks whether device is likely desktop/laptop (using network Wi-Fi positioning)
 * or mobile phone (hardware satellite GPS chip)
 */
export function isLikelyMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
