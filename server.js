const express = require('express');
const path = require('path');
const { chromium } = require('playwright-core');
const { execSync, spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const CDP_PORT = 9222;
const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const USER_DATA_DIR = `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\User Data`;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Helpers ----

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function extractFare(fareStr) {
  if (!fareStr) return 0;
  const match = fareStr.match(/([\d,\.]+)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(',', '.')) || 0;
}

function extractCurrency(fareStr) {
  if (!fareStr) return 'DOP';
  const match = fareStr.match(/[A-Z]{3}/);
  return match ? match[0] : 'DOP';
}

function parseActivityDate(subtitle) {
  if (!subtitle) return null;
  const months = {
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

// ---- CDP ----

async function isBraveReady() {
  try {
    const resp = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
    return resp.status === 200;
  } catch { return false; }
}

async function launchBrave() {
  console.log('  Lanzando Brave con remote debugging...');

  try { execSync('taskkill /f /im brave.exe 2>nul', { stdio: 'ignore' }); } catch {}
  await sleep(2000);

  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir="${USER_DATA_DIR}"`,
    '--no-first-run',
    'https://riders.uber.com/trips',
  ];
  spawn(BRAVE_PATH, args, { detached: true, stdio: 'ignore' });

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

async function withPage(fn) {
  const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
  const ctx = browser.contexts()[0];
  if (!ctx) { await browser.close(); throw new Error('No browser context found'); }
  let page = ctx.pages().find(p => p.url().includes('uber.com')) || ctx.pages()[0];
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

async function graphqlQuery(page, operationName, query, variables) {
  return page.evaluate(args => {
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

// ---- GraphQL Queries ----

const ACTIVITIES_QUERY = `
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

const GET_TRIP_QUERY = `
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

// ---- API Routes ----

app.get('/api/status', async (req, res) => {
  try {
    if (!(await isBraveReady())) {
      const launched = await launchBrave();
      if (!launched) {
        return res.status(503).json({ status: 'error', message: 'No se pudo iniciar Brave. Asegurate de que esté instalado en la ruta por defecto.' });
      }
    }

    await withPage(async (page) => {
      const title = await page.title();
      const url = page.url();
    });

    res.json({ status: 'ok', message: 'Conectado a Brave con sesión de Uber', brave_launched: true });
  } catch (err) {
    console.error('Status check error:', err.message);
    res.status(503).json({
      status: 'error',
      message: err.message.includes('ECONNREFUSED')
        ? 'Brave no está corriendo con CDP. Intentando lanzar automáticamente...'
        : err.message,
    });
  }
});

app.post('/api/trips', async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({ error: 'Se requieren los campos "from" y "to" (YYYY-MM-DD)' });
    }

    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T23:59:59');
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Usá YYYY-MM-DD' });
    }

    const startTimeMs = fromDate.getTime();
    const endTimeMs = toDate.getTime();

    console.log(`\n[${new Date().toISOString()}] Buscando viajes de ${from} a ${to}...`);

    const result = await withPage(async (page) => {
      // Get all activity UUIDs in date range
      const allActivities = [];
      let nextPageToken = null;

      do {
        const variables = {
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
      if (allActivities.length === 0) return { trips: [], meta: { total: 0, date_range: { from, to }, query_time_ms: startTimeMs }, summary: summarizeTrips([]) };

      // Get trip details in batches
      const tripDetails = [];
      const BATCH_SIZE = 5;

      for (let i = 0; i < allActivities.length; i += BATCH_SIZE) {
        const batch = allActivities.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (activity) => {
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

      // Normalize
      const normalized = tripDetails.map((item, idx) => {
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
      const seen = new Set();
      const unique = normalized.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      return {
        meta: { total: unique.length, date_range: { from, to }, query_time_ms: startTimeMs },
        trips: unique,
        summary: summarizeTrips(unique),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Trips search error:', err.message);

    if (err.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ error: 'No se pudo conectar a Brave. Asegurate de que esté corriendo con --remote-debugging-port=9222', detail: err.message });
    }
    res.status(500).json({ error: 'Error al buscar viajes', detail: err.message });
  }
});

function summarizeTrips(trips) {
  const byType = {};
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

// ---- Start ----

app.listen(PORT, () => {
  console.log(`\n  🚗 Uber Trip Analyzer corriendo en http://localhost:${PORT}\n`);
});
