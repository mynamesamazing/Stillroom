export const DAY_DIAL_LOCATION_STORAGE_KEY = "stillroom-daydial-location-v1";
export const DEFAULT_CITY_ID = "london";

export interface DayDialCity {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

export interface DayDialLocation {
  name: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  source: "city" | "device";
}

export type DayDialLocationPreference =
  | { kind: "city"; cityId: string }
  | { kind: "device"; latitude: number; longitude: number; timeZone: string };

export const DAY_DIAL_CITIES: DayDialCity[] = [
  { id: "london", name: "London", region: "United Kingdom", latitude: 51.5072, longitude: -0.1276, timeZone: "Europe/London" },
  { id: "new-york", name: "New York", region: "United States", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" },
  { id: "los-angeles", name: "Los Angeles", region: "United States", latitude: 34.0522, longitude: -118.2437, timeZone: "America/Los_Angeles" },
  { id: "chicago", name: "Chicago", region: "United States", latitude: 41.8781, longitude: -87.6298, timeZone: "America/Chicago" },
  { id: "denver", name: "Denver", region: "United States", latitude: 39.7392, longitude: -104.9903, timeZone: "America/Denver" },
  { id: "anchorage", name: "Anchorage", region: "United States", latitude: 61.2181, longitude: -149.9003, timeZone: "America/Anchorage" },
  { id: "honolulu", name: "Honolulu", region: "United States", latitude: 21.3099, longitude: -157.8581, timeZone: "Pacific/Honolulu" },
  { id: "toronto", name: "Toronto", region: "Canada", latitude: 43.6532, longitude: -79.3832, timeZone: "America/Toronto" },
  { id: "vancouver", name: "Vancouver", region: "Canada", latitude: 49.2827, longitude: -123.1207, timeZone: "America/Vancouver" },
  { id: "mexico-city", name: "Mexico City", region: "Mexico", latitude: 19.4326, longitude: -99.1332, timeZone: "America/Mexico_City" },
  { id: "sao-paulo", name: "São Paulo", region: "Brazil", latitude: -23.5505, longitude: -46.6333, timeZone: "America/Sao_Paulo" },
  { id: "buenos-aires", name: "Buenos Aires", region: "Argentina", latitude: -34.6037, longitude: -58.3816, timeZone: "America/Argentina/Buenos_Aires" },
  { id: "reykjavik", name: "Reykjavík", region: "Iceland", latitude: 64.1466, longitude: -21.9426, timeZone: "Atlantic/Reykjavik" },
  { id: "paris", name: "Paris", region: "France", latitude: 48.8566, longitude: 2.3522, timeZone: "Europe/Paris" },
  { id: "berlin", name: "Berlin", region: "Germany", latitude: 52.52, longitude: 13.405, timeZone: "Europe/Berlin" },
  { id: "madrid", name: "Madrid", region: "Spain", latitude: 40.4168, longitude: -3.7038, timeZone: "Europe/Madrid" },
  { id: "rome", name: "Rome", region: "Italy", latitude: 41.9028, longitude: 12.4964, timeZone: "Europe/Rome" },
  { id: "nairobi", name: "Nairobi", region: "Kenya", latitude: -1.2921, longitude: 36.8219, timeZone: "Africa/Nairobi" },
  { id: "cape-town", name: "Cape Town", region: "South Africa", latitude: -33.9249, longitude: 18.4241, timeZone: "Africa/Johannesburg" },
  { id: "dubai", name: "Dubai", region: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708, timeZone: "Asia/Dubai" },
  { id: "mumbai", name: "Mumbai", region: "India", latitude: 19.076, longitude: 72.8777, timeZone: "Asia/Kolkata" },
  { id: "bangkok", name: "Bangkok", region: "Thailand", latitude: 13.7563, longitude: 100.5018, timeZone: "Asia/Bangkok" },
  { id: "singapore", name: "Singapore", region: "Singapore", latitude: 1.3521, longitude: 103.8198, timeZone: "Asia/Singapore" },
  { id: "tokyo", name: "Tokyo", region: "Japan", latitude: 35.6762, longitude: 139.6503, timeZone: "Asia/Tokyo" },
  { id: "seoul", name: "Seoul", region: "South Korea", latitude: 37.5665, longitude: 126.978, timeZone: "Asia/Seoul" },
  { id: "sydney", name: "Sydney", region: "Australia", latitude: -33.8688, longitude: 151.2093, timeZone: "Australia/Sydney" },
  { id: "auckland", name: "Auckland", region: "New Zealand", latitude: -36.8509, longitude: 174.7645, timeZone: "Pacific/Auckland" },
];

export function cityLocation(cityId: string): DayDialLocation | null {
  const city = DAY_DIAL_CITIES.find(value => value.id === cityId);
  return city ? { name: `${city.name}, ${city.region}`, latitude: city.latitude, longitude: city.longitude, timeZone: city.timeZone, source: "city" } : null;
}

function isValidCoordinates(value: Record<string, unknown>): value is Record<string, unknown> & { latitude: number; longitude: number } {
  return typeof value.latitude === "number" && Number.isFinite(value.latitude) && value.latitude >= -90 && value.latitude <= 90
    && typeof value.longitude === "number" && Number.isFinite(value.longitude) && value.longitude >= -180 && value.longitude <= 180;
}

export function parseLocationPreference(value: unknown): DayDialLocationPreference | null {
  if (typeof value !== "object" || value === null) return null;
  const preference = value as Record<string, unknown>;
  if (preference.kind === "city" && typeof preference.cityId === "string" && cityLocation(preference.cityId)) {
    return { kind: "city", cityId: preference.cityId };
  }
  if (preference.kind === "device" && isValidCoordinates(preference)
    && typeof preference.timeZone === "string" && isValidTimeZone(preference.timeZone)) {
    return { kind: "device", latitude: preference.latitude, longitude: preference.longitude, timeZone: preference.timeZone };
  }
  return null;
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function loadDayDialPreference(storage: Pick<Storage, "getItem">): DayDialLocationPreference | null {
  const raw = storage.getItem(DAY_DIAL_LOCATION_STORAGE_KEY);
  if (raw === null) return null;
  try {
    return parseLocationPreference(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDayDialPreference(storage: Pick<Storage, "setItem">, preference: DayDialLocationPreference) {
  const valid = parseLocationPreference(preference);
  if (!valid) throw new Error("Cannot save an invalid Day Dial location.");
  storage.setItem(DAY_DIAL_LOCATION_STORAGE_KEY, JSON.stringify(valid));
}
