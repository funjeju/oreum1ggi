import { firebaseAuthRewrites } from './lib/travel-auth-rewrites.mjs';

export default {
  poweredByHeader: false,
  async rewrites() { return firebaseAuthRewrites(); },
};
