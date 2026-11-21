import { travelProjectId } from './travel-firebase-config.mjs';

export function firebaseAuthRewrites() {
  const projectId = travelProjectId;
  if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_REDIRECT !== 'true' ||
      !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId || '')) return [];
  return [{
    source: '/__/auth/:path*',
    destination: 'https://' + projectId + '.firebaseapp.com/__/auth/:path*'
  }];
}
