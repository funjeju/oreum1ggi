// Public Web SDK identifiers for this site's Firebase app. Server credentials
// are read separately by travel-admin and never enter client configuration.
const defaults = {
  apiKey: 'AIzaSyBGLCVTgWZCIjpmESS5MLZ5qVzxY0OsYbg',
  authDomain: 'allquiz-f1e30.firebaseapp.com',
  projectId: 'allquiz-f1e30',
  storageBucket: 'allquiz-f1e30.firebasestorage.app',
  messagingSenderId: '1055071635103',
  appId: '1:1055071635103:web:81e22177548f181c3044aa',
  measurementId: 'G-QB71GWDTD7'
};

export const travelProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || defaults.projectId;
// An alternate project's configuration must never inherit another project's API
// key, OAuth domain, analytics ID or app identity.
const fallback = travelProjectId === defaults.projectId ? defaults : {};
export const travelFirebaseConfig = {
  projectId: travelProjectId,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallback.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallback.authDomain,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallback.appId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || fallback.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallback.messagingSenderId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || fallback.measurementId
};

export const travelUserCollection = 'oreumTravelUsers';
