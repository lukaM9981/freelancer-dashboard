const zones = Intl.supportedValuesOf("timeZone").slice().sort((a, b) => a.localeCompare(b));

export function listTimeZones(): readonly string[] {
  return zones;
}

export function isTimeZoneName(value: string): boolean {
  return zones.includes(value);
}
