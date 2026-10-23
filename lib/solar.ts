export type SolarDay =
  | { kind: "polar-day" }
  | { kind: "polar-night" }
  | { kind: "normal"; sunrise: number; sunset: number; dayLength: number };

export interface SolarLocation {
  latitude: number;
  longitude: number;
  timeZone: string;
}

const degrees = Math.PI / 180;

function timezoneOffsetMinutes(dateKey: string, timeZone: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day, 12));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(part => [part.type, Number(part.value)]));
  const zonedAsUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
  return (zonedAsUtc - instant.getTime()) / 60_000;
}

function wrapMinutes(minutes: number) {
  return ((minutes % 1440) + 1440) % 1440;
}

export function calculateSolarDay(dateKey: string, location: SolarLocation): SolarDay {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Invalid solar date: ${dateKey}`);
  }
  if (!Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90
    || !Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) {
    throw new Error("Solar coordinates are out of range.");
  }

  const dayOfYear = Math.floor((date.getTime() - Date.UTC(year, 0, 0)) / 86_400_000);
  const daysInYear = new Date(Date.UTC(year + 1, 0, 0)).getUTCDate() === 29 ? 366 : 365;
  const gamma = 2 * Math.PI / daysInYear * (dayOfYear - 1);
  const equationOfTime = 229.18 * (
    0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
  );
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const latitude = location.latitude * degrees;
  const zenith = 90.833 * degrees;
  const cosHourAngle = (Math.cos(zenith) - Math.sin(latitude) * Math.sin(declination))
    / (Math.cos(latitude) * Math.cos(declination));

  if (cosHourAngle > 1) return { kind: "polar-night" };
  if (cosHourAngle < -1) return { kind: "polar-day" };

  const hourAngle = Math.acos(cosHourAngle) / degrees;
  const solarNoon = 720 - 4 * location.longitude - equationOfTime + timezoneOffsetMinutes(dateKey, location.timeZone);
  const sunrise = wrapMinutes(solarNoon - 4 * hourAngle);
  const sunset = wrapMinutes(solarNoon + 4 * hourAngle);
  return { kind: "normal", sunrise, sunset, dayLength: 8 * hourAngle };
}

export function formatSolarTime(minutes: number) {
  const rounded = Math.round(wrapMinutes(minutes));
  const hour = Math.floor(rounded / 60);
  const minute = rounded % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}
