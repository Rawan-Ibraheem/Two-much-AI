/**
 * Backend client for the medicine search API (`backend/server.js`).
 *
 * Everything the UI renders comes from here. The backend owns matching and
 * live source querying; this module only adapts the
 * wire shape (`ingredient`, `packageSize`, `pharmacy`/`branch`) to the shape the
 * components already use (`activeIngredient`, `packSize`, `pharmacyName`/
 * `branchName`).
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export type SortOption = 'cheapest' | 'nearest' | 'freshest' | 'best_match';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface PharmacyOffer {
  id: string;
  pharmacyName: string;
  branchName: string | null;
  address: string | null;
  city: string | null;
  price: number | null;
  currency: string;
  available: boolean | null;
  distanceKm: number | null;
  /** Human label for display, e.g. "5 mins ago". */
  lastChecked: string;
  /** Raw timestamp, used for freshness sorting so we never parse the label. */
  lastCheckedIso: string;
  url: string | null;
  mapsUrl: string | null;
  phone: string | null;
  verificationStatus: string;
  dataStatus: 'live' | 'cached';
  downloadedAt: string | null;
  sourceUrl: string | null;
}

export interface MedicineProduct {
  id: string;
  name: string;
  arabicName: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  packSize: string;
  tags: string[];
  offers: PharmacyOffer[];
}

export interface AiAssist {
  status: string;
  model?: string;
  interpretation?: string | null;
  candidates?: string[];
}

export interface SearchResponse {
  results: MedicineProduct[];
  count: number;
  dataStatus: string;
  freshnessNote: string;
  aiAssist: AiAssist;
  lastChecked: string;
  location: UserLocation | null;
}

export interface ResearchGroup {
  medicineId: string;
  medicineName: string;
  offers: PharmacyOffer[];
}

export interface AssistantRecommendation {
  medicineId: string;
  medicineName: string;
  reason: string;
}

/**
 * `POST /api/assistant/recommend`. The backend owns every branch of this union
 * (including the wording of `message` and `disclaimer`); the UI only renders it.
 */
export type AssistantResponse =
  | { status: 'urgent'; message: string }
  | { status: 'needs_more_information'; message: string }
  | {
      status: 'ok';
      interpretedSymptoms: string[];
      recommendations: AssistantRecommendation[];
      /** Same per-medicine shape `/api/medicines` returns, so it reuses `toMedicine`. */
      pharmacyResults: MedicineProduct[];
      disclaimer: string;
    };

export interface ResearchResponse {
  radiusKm: number;
  sourcePolicy: string;
  location: UserLocation;
  results: ResearchGroup[];
}

// ---------------------------------------------------------------- wire shapes

interface RawBranchInfo {
  address?: string | null;
  city?: string;
  governorate?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  mapsUrl?: string | null;
  pharmacyUrl?: string | null;
  sourceStatus?: string;
  verificationStatus?: string;
}

interface RawOffer {
  pharmacy: string;
  branch?: string | null;
  price: number | null;
  currency?: string;
  available: boolean;
  distanceKm?: number | null;
  lastChecked: string;
  branchInfo?: RawBranchInfo | null;
  /** Only the research endpoint sends this. */
  source?: { websiteUrl?: string; verificationStatus?: string } | null;
  checkedAt?: string;
}

interface RawMedicine {
  id: string;
  name: string;
  arabicName?: string;
  ingredient: string;
  strength?: string;
  form: string;
  packageSize: number;
  searchTerms?: string[];
  offers: RawOffer[];
}

interface RawLiveOffer {
  name: string;
  price: number | null;
  currency?: string;
  available: boolean | null;
  productUrl?: string | null;
  pharmacy: string;
  sourceId: string;
  checkedAt: string;
  verificationStatus?: string;
  dataStatus?: 'real_live_verified' | 'cached';
  downloadedAt?: string;
  sourceUrl?: string;
}

// ------------------------------------------------------------------- adapters

/** "2026-09-10T11:14:55Z" -> "5 mins ago". */
export function formatRelativeTime(iso: string): string {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return 'unknown';

  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} mins ago`;

  const hours = Math.round(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function toOffer(medicineId: string, raw: RawOffer): PharmacyOffer {
  const checkedAt = raw.checkedAt ?? raw.lastChecked;
  const branchName = raw.branch ?? null;
  const slug = `${raw.pharmacy}-${branchName ?? 'online'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    id: `${medicineId}-${slug}`,
    pharmacyName: raw.pharmacy,
    branchName,
    address: raw.branchInfo?.address ?? null,
    city: raw.branchInfo?.city ?? null,
    price: raw.price,
    currency: raw.currency ?? 'EGP',
    available: raw.available,
    distanceKm: raw.distanceKm ?? null,
    lastChecked: formatRelativeTime(checkedAt),
    lastCheckedIso: checkedAt,
    url: raw.branchInfo?.pharmacyUrl ?? raw.source?.websiteUrl ?? null,
    mapsUrl: raw.branchInfo?.mapsUrl ?? null,
    phone: raw.branchInfo?.phone ?? null,
    verificationStatus:
      raw.branchInfo?.verificationStatus ?? raw.source?.verificationStatus ?? 'unverified',
    dataStatus: 'live',
    downloadedAt: null,
    sourceUrl: raw.source?.websiteUrl ?? null
  };
}

function toLiveOffer(raw: RawLiveOffer): PharmacyOffer {
  const slug = `${raw.sourceId}-${raw.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id: `live-${slug}`,
    pharmacyName: raw.pharmacy,
    branchName: null,
    address: null,
    city: null,
    price: raw.price,
    currency: raw.currency ?? 'EGP',
    available: raw.available,
    distanceKm: null,
    lastChecked: formatRelativeTime(raw.checkedAt),
    lastCheckedIso: raw.checkedAt,
    url: raw.productUrl ?? null,
    mapsUrl: null,
    phone: null,
    verificationStatus: raw.verificationStatus ?? 'live_verified',
    dataStatus: raw.dataStatus === 'cached' ? 'cached' : 'live',
    downloadedAt: raw.downloadedAt ?? null,
    sourceUrl: raw.sourceUrl ?? null
  };
}

function toLiveSearchResponse(body: {
  offers?: RawLiveOffer[];
  dataStatus?: string;
  note?: string;
}): SearchResponse {
  const groups = new Map<string, { offers: PharmacyOffer[] }>();
  for (const rawOffer of body.offers ?? []) {
    const name = rawOffer.name?.trim();
    if (!name) continue;
    const group = groups.get(name) ?? { offers: [] };
    group.offers.push(toLiveOffer(rawOffer));
    groups.set(name, group);
  }

  const results = [...groups.entries()].map(([name, group], index) => ({
    id: `live-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    arabicName: name,
    activeIngredient: '',
    strength: '',
    dosageForm: 'Live pharmacy listing',
    packSize: 'See pharmacy product page',
    tags: [],
    offers: group.offers
  }));

  return {
    results,
    count: results.length,
    dataStatus: body.dataStatus ?? 'live_checked_no_match',
    freshnessNote: body.note ?? 'Results queried from connected pharmacy websites.',
    aiAssist: { status: 'not_needed' },
    lastChecked: results.flatMap((medicine) => medicine.offers).at(0)?.lastCheckedIso ?? '',
    location: null
  };
}

function toMedicine(raw: RawMedicine): MedicineProduct {
  return {
    id: raw.id,
    name: raw.name,
    arabicName: raw.arabicName ?? raw.name,
    activeIngredient: raw.ingredient,
    strength: raw.strength ?? '',
    dosageForm: raw.form,
    packSize: `${raw.packageSize} ${raw.form}`,
    tags: raw.searchTerms ?? [],
    offers: raw.offers.map((offer) => toOffer(raw.id, offer))
  };
}

// -------------------------------------------------------------------- requests

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return typeof body?.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export async function searchMedicines(options: {
  query: string;
  sort: SortOption;
  availableOnly: boolean;
  location: UserLocation | null;
  signal?: AbortSignal;
}): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: options.query });

  const response = await fetch(`${API_BASE_URL}/api/medicines/live?${params}`, {
    signal: options.signal
  });
  if (!response.ok) {
    throw new Error(await readError(response, `Search failed (HTTP ${response.status}).`));
  }

  return toLiveSearchResponse(await response.json());
}

export async function researchAvailability(options: {
  query: string;
  location: UserLocation;
  radiusKm?: number;
  signal?: AbortSignal;
}): Promise<ResearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/research/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: options.query,
      location: options.location,
      radiusKm: options.radiusKm ?? 10
    }),
    signal: options.signal
  });
  if (!response.ok) {
    throw new Error(await readError(response, `Research failed (HTTP ${response.status}).`));
  }

  const body = await response.json();
  return {
    radiusKm: body.radiusKm ?? 10,
    sourcePolicy: body.sourcePolicy ?? '',
    location: body.location,
    results: (body.results ?? []).map((group: { medicineId: string; medicineName: string; offers: RawOffer[] }) => ({
      medicineId: group.medicineId,
      medicineName: group.medicineName,
      offers: group.offers.map((offer) => toOffer(group.medicineId, offer))
    }))
  };
}

/**
 * Symptom description -> the backend's own interpretation, medicine options and
 * (when it resolves them) real pharmacy offers. No medical logic lives here:
 * every field rendered by the UI is passed straight through from the response.
 */
export async function askAssistant(options: {
  message: string;
  location: UserLocation | null;
  signal?: AbortSignal;
}): Promise<AssistantResponse> {
  const response = await fetch(`${API_BASE_URL}/api/assistant/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: options.message,
      ...(options.location ? { location: options.location } : {})
    }),
    signal: options.signal
  });
  if (!response.ok) {
    throw new Error(await readError(response, `Assistant failed (HTTP ${response.status}).`));
  }

  const body = await response.json();
  if (body.status === 'ok') {
    if (!Array.isArray(body.recommendations) || !Array.isArray(body.pharmacyResults)) {
      throw new Error('Assistant returned an unexpected response.');
    }
    return {
      status: 'ok',
      interpretedSymptoms: body.interpretedSymptoms ?? [],
      recommendations: body.recommendations ?? [],
      pharmacyResults: (body.pharmacyResults ?? []).map(toMedicine),
      disclaimer: body.disclaimer ?? ''
    };
  }
  if (body.status === 'urgent' || body.status === 'needs_more_information') {
    return { status: body.status, message: typeof body.message === 'string' ? body.message : '' };
  }
  throw new Error('Assistant returned an unexpected response.');
}

/** Browser geolocation, wrapped so callers can `await` it. */
export function requestBrowserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser does not expose a location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => reject(new Error(error.message || 'Location permission was declined.')),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  });
}

/** Fallback so the demo still works when location is denied. Labelled in the UI. */
export const ALEXANDRIA_CENTRE: UserLocation = { latitude: 31.2001, longitude: 29.9187 };

export { API_BASE_URL };
