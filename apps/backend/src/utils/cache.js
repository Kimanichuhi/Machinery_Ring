// In-process TTL cache for expensive read endpoints.
//
// This is intentionally not Redis: the backend runs as a single Node
// process (see server.js — one app.listen(), no replicas configured
// anywhere in infrastructure/), so there is no second instance that
// would need a shared cache. A Map with expiry gets the same win with
// no new service to host, deploy, or monitor. Revisit this if the
// backend ever runs as multiple instances behind a load balancer.

const MAX_ENTRIES = 1000;
const store = new Map();

export function getCached(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCached(key, value, ttlMs) {
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    const oldestKey = store.keys().next().value;
    store.delete(oldestKey);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearCache() {
  store.clear();
}

export function cacheSize() {
  return store.size;
}

/**
 * Express middleware that caches a GET route's JSON response for `ttlMs`.
 * The cache key includes the requesting user's ID (not just the URL),
 * because several routes derive their response from `req.user.id` rather
 * than from query params alone (e.g. a coordinator's own Local MR) —
 * keying by URL only would leak one user's cached data to another.
 */
export function cacheGetResponse(ttlMs) {
  return (req, res, next) => {
    const key = `${req.originalUrl}::${req.user?.id || "anon"}`;
    const cached = getCached(key);
    if (cached !== undefined) {
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCached(key, body, ttlMs);
      }
      return originalJson(body);
    };

    next();
  };
}
