/**
 * Simple in-memory rate limiter.
 * Separate instances are created per route group (blueprint, merge) to allow
 * different limits for each.
 *
 * Usage:
 *   app.use('/api/blueprint', createRateLimiter({ maxCalls: 10, windowMs: 60_000 }), blueprintRouter);
 */

/**
 * @param {{ maxCalls: number, windowMs: number }} opts
 */
export function createRateLimiter({ maxCalls, windowMs }) {
  // ip → { count: number, resetAt: number }
  const windows = new Map();

  // Periodically purge expired entries so the map doesn't grow unbounded
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of windows) {
      if (entry.resetAt < now) windows.delete(ip);
    }
  }, windowMs * 2).unref();

  return function rateLimitMiddleware(req, res, next) {
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const now = Date.now();
    const entry = windows.get(ip);

    if (!entry || entry.resetAt < now) {
      windows.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxCalls) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Try again in ${retryAfter}s.`,
      });
    }

    entry.count++;
    next();
  };
}
