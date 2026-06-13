// Geographic data API client using countriesnow.space
const BASE_URL = "https://countriesnow.space/api/v0.1/countries";

// In-memory cache to avoid repeated API calls
const cache: Record<string, string[]> = {};

async function fetchWithCache(key: string, url: string, options?: RequestInit): Promise<string[]> {
  if (cache[key]) return cache[key];

  try {
    const res = await fetch(url, options);
    if (!res.ok) return [];
    
    const json = await res.json();
    if (!json || json.error) return [];

    const data = json.data;
    if (!data) return [];

    let result: string[] = [];

    if (key === "countries" && Array.isArray(data)) {
      result = data.map((c: any) => c?.country).filter(Boolean).sort();
    } else if (key.startsWith("states:") && data.states && Array.isArray(data.states)) {
      result = data.states.map((s: any) => s?.name).filter(Boolean).sort();
    } else if (key.startsWith("cities:") && Array.isArray(data)) {
      result = data.filter((c: any) => typeof c === 'string').sort();
    }

    cache[key] = result;
    return result;
  } catch (error) {
    console.error(`[Geo API Error] ${key}:`, error);
    return [];
  }
}

export async function getAllCountries(): Promise<string[]> {
  return fetchWithCache("countries", `${BASE_URL}/iso`);
}

export async function getStatesByCountry(country: string): Promise<string[]> {
  if (!country) return [];
  return fetchWithCache(`states:${country}`, `${BASE_URL}/states`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country }),
  });
}

export async function getCitiesByState(country: string, state: string): Promise<string[]> {
  if (!country || !state) return [];
  return fetchWithCache(`cities:${country}:${state}`, `${BASE_URL}/state/cities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country, state }),
  });
}
