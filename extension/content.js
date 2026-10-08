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

// ---- Helpers ----

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

function mapVehicleType(type) {
  if (!type || type === 'Unknown') return 'Cancelado';
  if (type === 'Wait & Save') return 'Uber Espera';
  return type;
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

async function graphqlQuery(operationName, query, variables) {
  const resp = await fetch('https://riders.uber.com/graphql', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': 'x',
      'x-uber-rv-session-type': 'desktop_session',
      'referer': 'https://riders.uber.com/trips',
    },
    body: JSON.stringify({
      operationName,
      query,
      variables,
    }),
  });

  if (resp.status === 401 || resp.status === 403) {
    const error = new Error('AUTH_ERROR');
    error.code = 'AUTH_ERROR';
    throw error;
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`GraphQL ${resp.status}: ${text.substring(0, 200)}`);
  }

  const data = await resp.json();
  if (data.errors && data.errors.some(e => {
    const msg = (e.message || '').toLowerCase();
    return msg.includes('unauthorized') || msg.includes('unauthenticated');
  })) {
    const error = new Error('AUTH_ERROR');
    error.code = 'AUTH_ERROR';
    throw error;
  }

  return data;
}

// ---- Extraction ----

async function extractTrips(from, to) {
  if (!from || !to) {
    return { error: 'INVALID_DATES', message: 'Formato de fecha inválido' };
  }

  const fromDate = new Date(from + 'T00:00:00');
  const toDate = new Date(to + 'T23:59:59');
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return { error: 'INVALID_DATES', message: 'Formato de fecha inválido' };
  }

  if (fromDate > toDate) {
    return { error: 'INVALID_DATES', message: 'Formato de fecha inválido' };
  }

  try {
    const startTimeMs = fromDate.getTime();
    const endTimeMs = toDate.getTime();

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

      const gqlResult = await graphqlQuery('Activities', ACTIVITIES_QUERY, variables);
      const past = gqlResult?.data?.activities?.past;

      if (!past || !past.activities) break;

      allActivities.push(...past.activities);
      nextPageToken = past.nextPageToken || null;
    } while (nextPageToken);

    if (allActivities.length === 0) {
      return {
        meta: { total: 0, date_range: { from, to } },
        trips: [],
        summary: summarizeTrips([]),
      };
    }

    const tripDetails = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < allActivities.length; i += BATCH_SIZE) {
      const batch = allActivities.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (activity) => {
          try {
            const gqlResult = await graphqlQuery('GetTrip', GET_TRIP_QUERY, { tripUUID: activity.uuid });
            const getTrip = gqlResult?.data?.getTrip;
            if (!getTrip) return null;
            return { activity, trip: getTrip.trip, receipt: getTrip.receipt, rating: getTrip.rating };
          } catch (err) {
            if (err.code === 'AUTH_ERROR' || err.message === 'AUTH_ERROR') {
              throw err;
            }
            return null;
          }
        })
      );
      tripDetails.push(...batchResults.filter(Boolean));
    }

    const normalized = tripDetails.map((item, idx) => {
      const trip = item.trip || {};
      const receipt = item.receipt || {};
      const activity = item.activity || {};

      const fareStr = activity.description || trip.fare || '';
      const beginDate = trip.beginTripTime ? new Date(trip.beginTripTime) : null;
      const subtitleDate = parseActivityDate(activity.subtitle);
      const tripDate = beginDate || subtitleDate;

      return {
        id: trip.uuid || activity.uuid || `trip_${idx}`,
        date: tripDate && !isNaN(tripDate.getTime()) ? tripDate.toISOString() : null,
        dateLabel: activity.subtitle || '',
        product_type: mapVehicleType(receipt.vehicleType),
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

    const seen = new Set();
    const unique = normalized.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    return {
      meta: { total: unique.length, date_range: { from, to } },
      trips: unique,
      summary: summarizeTrips(unique),
    };
  } catch (err) {
    if (err.code === 'AUTH_ERROR' || err.message === 'AUTH_ERROR' || err.message?.includes('401') || err.message?.includes('403')) {
      return { error: 'AUTH_ERROR', message: 'Tu sesión de Uber expiró. Recargá la página e iniciá sesión.' };
    }
    return { error: 'EXTENSION_ERROR', message: err.message || 'Error al extraer viajes' };
  }
}

// ---- Message listener ----

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.command === 'extract-trips') {
    extractTrips(message.from, message.to)
      .then((result) => sendResponse(result))
      .catch((err) => {
        sendResponse({
          error: 'EXTENSION_ERROR',
          message: err.message || 'Error al extraer viajes',
        });
      });
    return true;
  }
});
