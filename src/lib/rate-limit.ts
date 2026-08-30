interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const trackers = new Map<string, RateLimitRecord>();

// Clean up expired records every 10 minutes
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of trackers.entries()) {
      if (now > record.resetTime) {
        trackers.delete(key);
      }
    }
  }, 10 * 60 * 1000);
  if (timer.unref) {
    timer.unref();
  }
}

/**
 * In-memory rate limiter
 * @param ip Client IP address
 * @param action Action name (login, order, upload)
 * @param limit Max allowed requests
 * @param windowMs Time window in ms
 */
export function isRateLimited(
  ip: string,
  action: string,
  limit: number,
  windowMs: number
): boolean {
  const key = `${action}:${ip}`;
  const now = Date.now();
  const record = trackers.get(key);

  if (!record || now > record.resetTime) {
    trackers.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count += 1;
  return false;
}

/**
 * Extract client IP from Express request or Web standard Request
 */
export function getClientIp(req: any): string {
  if (!req) return '127.0.0.1';

  // For standard Fetch/Next Request
  if (typeof req.headers?.get === 'function') {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    const realIp = req.headers.get('x-real-ip');
    if (realIp) return realIp.trim();
  }

  // For Express Request
  if (req.headers) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0].trim();
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') return realIp.trim();
  }

  if (req.ip) return req.ip;
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;

  return '127.0.0.1';
}
