const EARTH_METERS = 6371008.8;
export const CHECKIN_RADIUS_METERS = 150;
export const MAX_ACCURACY_METERS = 60;
const MAX_AGE_MS = 120000;

export function locationVerdict(summit, point, now = Date.now()) {
  if (summit?.checkInEnabled !== true ||
      !Number.isFinite(summit.latitude) || !Number.isFinite(summit.longitude)) return 'summit-unavailable';
  if (!point || !Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90 ||
      !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180 ||
      !Number.isFinite(point.accuracy) || point.accuracy < 0 ||
      !Number.isFinite(point.timestamp)) return 'location-invalid';
  if (now - point.timestamp > MAX_AGE_MS || point.timestamp > now + 15000) return 'location-stale';
  if (point.accuracy > MAX_ACCURACY_METERS) return 'location-inaccurate';
  const radians = Math.PI / 180;
  const dLat = (summit.latitude - point.latitude) * radians;
  const dLon = (summit.longitude - point.longitude) * radians;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(summit.latitude * radians) *
    Math.cos(point.latitude * radians) * Math.sin(dLon / 2) ** 2;
  const distance = 2 * EARTH_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
  return distance + point.accuracy <= CHECKIN_RADIUS_METERS ? null : 'outside-summit';
}

function json(status, payload) {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function createVisitHandler({ verifyUser, findSummit, recordVisit }) {
  return async function handle(request) {
    const token = /^Bearer ([^\s]+)$/.exec(request.headers.get('authorization') || '')?.[1];
    if (!token) return json(401, { error: 'auth-required' });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return json(415, { error: 'location-invalid' });
    }
    let uid;
    try {
      uid = await verifyUser(token);
    } catch (error) {
      const credentialErrors = ['auth/argument-error', 'auth/invalid-id-token', 'auth/id-token-expired',
        'auth/id-token-revoked', 'auth/user-disabled', 'auth/user-not-found'];
      if (credentialErrors.includes(error.code)) return json(401, { error: 'auth-required' });
      return json(503, { error: 'service-unavailable' });
    }
    if (!uid) return json(401, { error: 'auth-required' });
    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'location-invalid' });
    }
    if (typeof body?.summitId !== 'string' || body.summitId.length > 160) {
      return json(400, { error: 'summit-unavailable' });
    }
    try {
      const summit = await findSummit(body.summitId);
      const error = locationVerdict(summit, body.position);
      if (error) return json(error === 'summit-unavailable' ? 404 : 422, { error });
      await recordVisit(uid, summit.id);
      return json(200, { summitId: summit.id });
    } catch {
      return json(503, { error: 'service-unavailable' });
    }
  };
}
