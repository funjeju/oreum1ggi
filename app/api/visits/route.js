import summitCoordinates from '../../../public/flight/verified-summits.json';
import { recordTravelVisit, verifyTravelUser } from '../../../lib/travel-admin';
import { createVisitHandler } from '../../../lib/travel-visit-policy.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = createVisitHandler({
  verifyUser: verifyTravelUser,
  findSummit: id => summitCoordinates.find(summit => summit.id === id),
  recordVisit: recordTravelVisit
});
