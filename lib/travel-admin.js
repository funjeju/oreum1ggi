import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { travelProjectId, travelUserCollection } from './travel-firebase-config.mjs';

const APP_NAME = 'oreum1ggi-visits';

function adminApp() {
  const existing = getApps().find(app => app.name === APP_NAME);
  if (existing) return existing;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId || projectId !== travelProjectId) {
    throw new Error('Firebase project configuration is incomplete');
  }
  const email = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (Boolean(email) !== Boolean(privateKey)) throw new Error('Firebase credentials are incomplete');
  const credential = email ? cert({ projectId, clientEmail: email, privateKey }) : applicationDefault();
  return initializeApp({ projectId, credential }, APP_NAME);
}

export async function verifyTravelUser(token) {
  const claims = await getAuth(adminApp()).verifyIdToken(token, true);
  return claims.uid;
}

export async function recordTravelVisit(uid, summitId) {
  const db = getFirestore(adminApp());
  const doc = db.collection(travelUserCollection).doc(uid).collection('visited').doc(summitId);
  await db.runTransaction(async tx => {
    if ((await tx.get(doc)).exists) return;
    tx.create(doc, { summitId, verifiedAt: FieldValue.serverTimestamp() });
  });
}
