import { chromium } from 'playwright-core';
import { execSync, spawn } from 'child_process';

const CDP_URL = process.env.CDP_URL || 'http://localhost:9222';
const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const USER_DATA_DIR = `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\User Data`;

// ---- GraphQL Queries ----

export const ACTIVITIES_QUERY = `
query Activities($includePast: Boolean = true, $limit: Int = 50, $nextPageToken: String, $orderTypes: [RVWebCommonActivityOrderType!] = [RIDES, TRAVEL], $profileType: RVWebCommonActivityProfileType = PERSONAL, $startTimeMs: Float, $endTimeMs: Float) {
  activities(cityID: 827) {
    past(limit: $limit, nextPageToken: $nextPageToken, orderTypes: $orderTypes, profileType: $profileType, startTimeMs: $startTimeMs, endTimeMs: $endTimeMs) @include(if: $includePast) {
      activities {
        buttons { isDefault startEnhancerIcon text url __typename }
        cardURL
        description
        imageURL { light dark __typename }
        subtitle
        title
        uuid
        __typename
      }
      nextPageToken
      __typename
    }
    __typename
  }
}
`;

export const GET_TRIP_QUERY = `
query GetTrip($tripUUID: String!) {
  getTrip(tripUUID: $tripUUID) {
    trip {
      beginTripTime
      cityID
      dropoffTime
      fare
      status
      uuid
      vehicleDisplayName
      vehicleViewID
      waypoints
      marketplace
      __typename
    }
    rating
    receipt {
      carYear
      distance
      distanceLabel
      duration
      vehicleType
      __typename
    }
    __typename
  }
}
`;

// ---- Helpers ----

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function extractFare(fareStr: string | null | undefined): number {
  if (!fareStr) return 0;
  const match = fareStr.match(/([\d,\.]+)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(',', '.')) || 0;
}

function extractCurrency(fareStr: string | null | undefined): string {
  if (!fareStr) return 'DOP';
  const match = fareStr.match(/[A-Z]{3}/);
  return match ? match[0] : 'DOP';
}

function parseActivityDate(subtitle: string | null | undefined): Date | null {
  if (!subtitle) return null;
  const months: Record<string, number> = {
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
    'jan': 0, 'apr': 3, 'aug': 7, 'dec': 11,
  };
  const match = subtitle.match(/(\d+)\s+(\w+)\s*[•\s]\s*(\d+):(\d+)/);
  if (match) {
    const day = parseInt(match[1]);
    const month = months[match[2].toLowerCase().substring(0, 3)];
    const hour = parseInt(match[3]);
    const min = parseInt(match[4]);
    if (month !== undefined) return new Date(new Date().getFullYear(), month, day, hour, min);
  }
  return null;
}

// ---- Types ----

export interface TripData {
  id: string;
  date: Date | null;
  dateLabel: string;
  product_type: string;
  fare: number;
  currency: string;
  fareLabel: string;
  distance: number;
  distance_unit: string;
  duration: string;
  pickup: string;
  dropoff: string;
  status: string;
  marketplace: string;
  rating: number | null;
}

export interface TripSummary {
  total_trips: number;
  total_fare: number;
  total_distance: number;
  vehicle_types: string[];
  by_type: Record<string, { count: number; total_fare: number; total_distance: number; avg_fare: number }>;
}

export interface TripsResult {
  meta: { total: number; date_range: { from: string; to: string }; query_time_ms: number };
  trips: TripData[];
  summary: TripSummary;
}

export interface StatusResult {
  status: string;
  message: string;
}

// ---- CDP connection ----

export async function isBraveReady(): Promise<boolean> {
  try {
    const resp = await fetch(`http://127.0.0.1:${9222}/json/version`);
    return resp.status === 200;
  } catch { return false; }
}

export async function launchBrave(): Promise<boolean> {
  console.log('  Lanzando Brave con remote debugging...');

  // Matar procesos existentes
  try {
    execSync('taskkill /f /im brave.exe 2>nul', { stdio: 'ignore' });
  } catch {}
  await sleep(2000);

  // Iniciar Brave con CDP
  const args = [
    `--remote-debugging-port=${9222}`,
    `--user-data-dir="${USER_DATA_DIR}"`,
    '--no-first-run',
    'https://riders.uber.com/trips',
  ];
  spawn(BRAVE_PATH, args, { detached: true, stdio: 'ignore' });

  // Esperar hasta 30s
  for (let i = 0; i < 30; i++) {
    if (await isBraveReady()) {
      console.log('  Brave listo!');
      return true;
    }
    process.stdout.write('.');
    await sleep(1000);
  }
  console.log('');
  return false;
}

async function withPage<T>(fn: (page: any) => Promise<T>): Promise<T> {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  if (!ctx) { await browser.close(); throw new Error('No browser context found'); }
  let page = ctx.pages().find((p: any) => p.url().includes('uber.com')) || ctx.pages()[0];
  await page.bringToFront();

  if (!page.url().includes('riders.uber.com')) {
    await page.goto('https://riders.uber.com/trips', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);
  }

  try {
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function graphqlQuery(page: any, operationName: string, query: string, variables: Record<string, any>) {
  return page.evaluate((args: { operationName: string; query: string; vars: Record<string, any> }) => {
    return fetch('https://riders.uber.com/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'x',
        'x-uber-rv-session-type': 'desktop_session',
        'referer': 'https://riders.uber.com/trips',
      },
      body: JSON.stringify({
        operationName: args.operationName,
        query: args.query,
        variables: args.vars,
      }),
    }).then(resp => {
      if (!resp.ok) return resp.text().then(text => { throw new Error(`GraphQL ${resp.status}: ${text.substring(0, 200)}`); });
      return resp.json();
    });
  }, { operationName, query, vars: variables });
}

// ---- API ----

export async function checkStatus(): Promise<StatusResult> {
  const result = await withPage(async (page) => {
    const title = await page.title();
    const url = page.url();
    return { connected: true, url, title };
  });
  return { status: 'ok', message: 'Conectado a Brave con sesión de Uber' };
}

export async function searchTrips(from: string, to: string): Promise<TripsResult> {
  const fromDate = new Date(from + 'T00:00:00');
  const toDate = new Date(to + 'T23:59:59');
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new Error('Formato de fecha inválido. Usá YYYY-MM-DD');
  }

  const startTimeMs = fromDate.getTime();
  const endTimeMs = toDate.getTime();

  console.log(`\n[${new Date().toISOString()}] Buscando viajes de ${from} a ${to}...`);

  return withPage(async (page) => {
    // Step 1: Get all activity UUIDs in date range
    const allActivities: any[] = [];
    let nextPageToken: string | null = null;

    do {
      const variables: Record<string, any> = {
        includePast: true,
        limit: 50,
        orderTypes: ['RIDES', 'TRAVEL'],
        profileType: 'PERSONAL',
        startTimeMs,
        endTimeMs,
      };
      if (nextPageToken) variables.nextPageToken = nextPageToken;

      const gqlResult = await graphqlQuery(page, 'Activities', ACTIVITIES_QUERY, variables);
      const past = gqlResult?.data?.activities?.past;

      if (!past || !past.activities) break;

      allActivities.push(...past.activities);
      nextPageToken = past.nextPageToken || null;
    } while (nextPageToken);

    console.log(`  ${allActivities.length} actividades encontradas`);
    if (allActivities.length === 0) return { trips: [], meta: { total: 0, date_range: { from, to }, query_time_ms: startTimeMs }, summary: summarize([]) };

    // Step 2: Get trip details in batches
    const tripDetails: any[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < allActivities.length; i += BATCH_SIZE) {
      const batch = allActivities.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (activity: any) => {
          try {
            const gqlResult = await graphqlQuery(page, 'GetTrip', GET_TRIP_QUERY, { tripUUID: activity.uuid });
            const getTrip = gqlResult?.data?.getTrip;
            if (!getTrip) return null;
            return { activity, trip: getTrip.trip, receipt: getTrip.receipt, rating: getTrip.rating };
          } catch { return null; }
        })
      );
      tripDetails.push(...batchResults.filter(Boolean));
    }

    console.log(`  ${tripDetails.length} viajes con detalle`);

    // Step 3: Normalize
    const normalized: TripData[] = tripDetails.map((item, idx) => {
      const trip = item.trip || {};
      const receipt = item.receipt || {};
      const activity = item.activity || {};

      const fareStr = activity.description || trip.fare || '';
      const beginDate = trip.beginTripTime ? new Date(trip.beginTripTime) : null;
      const subtitleDate = parseActivityDate(activity.subtitle);

      return {
        id: trip.uuid || activity.uuid || `trip_${idx}`,
        date: beginDate || subtitleDate,
        dateLabel: activity.subtitle || '',
        product_type: receipt.vehicleType || 'Unknown',
        fare: extractFare(fareStr),
        currency: extractCurrency(fareStr),
        fareLabel: fareStr,
        distance: parseFloat(receipt.distance) || 0,
        distance_unit: receipt.distanceLabel || 'km',
        duration: receipt.duration || '',
        pickup: trip.waypoints?.[0] || '',
        dropoff: trip.waypoints?.[1] || '',
        status: trip.status || 'COMPLETED',
        marketplace: trip.marketplace || '',
        rating: item.rating || null,
      };
    });

    // Deduplicate
    const seen = new Set<string>();
    const unique = normalized.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    return {
      meta: { total: unique.length, date_range: { from, to }, query_time_ms: startTimeMs },
      trips: unique,
      summary: summarize(unique),
    };
  });
}

function summarize(trips: TripData[]): TripSummary {
  const byType: Record<string, { count: number; total_fare: number; total_distance: number }> = {};
  for (const t of trips) {
    const type = t.product_type || 'Unknown';
    if (!byType[type]) byType[type] = { count: 0, total_fare: 0, total_distance: 0 };
    byType[type].count++;
    byType[type].total_fare += t.fare;
    byType[type].total_distance += t.distance;
  }

  return {
    total_trips: trips.length,
    total_fare: trips.reduce((s, t) => s + t.fare, 0),
    total_distance: trips.reduce((s, t) => s + t.distance, 0),
    vehicle_types: Object.keys(byType).sort(),
    by_type: Object.fromEntries(
      Object.entries(byType).map(([type, info]) => [
        type,
        { ...info, avg_fare: info.count > 0 ? info.total_fare / info.count : 0 },
      ])
    ),
  };
}
