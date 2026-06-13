const UAParser = require('ua-parser-js');

/**
 * Detect whether the request is from Brave by checking the sec-ch-ua header.
 * Brave includes `"Brave"` as a brand in the sec-ch-ua value, e.g.:
 *   "Brave";v="149", "Chromium";v="149", "Not/A)Brand";v="24"
 * Its User-Agent string is otherwise identical to Chrome, so ua-parser-js
 * cannot distinguish them without this hint.
 */
function isBrave(secChUa) {
  if (!secChUa) return false;
  // The brand token is always a quoted string like "Brave"
  return /"Brave"/i.test(secChUa);
}

/**
 * Map a raw browser name from ua-parser-js to one of the five supported labels.
 * Returns the normalized name plus the major version number.
 */
function normalizeBrowserName(rawName, majorVersion) {
  const name = (rawName || '').toLowerCase();

  let label;
  if (name.includes('firefox')) {
    label = 'Firefox';
  } else if (name.includes('edge') || name.includes('edg')) {
    label = 'Edge';
  } else if (name.includes('safari') && !name.includes('chrome')) {
    // ua-parser-js returns 'Mobile Safari' or 'Safari' for Safari
    label = 'Safari';
  } else if (name.includes('chrome') || name.includes('chromium')) {
    label = 'Chrome';
  } else {
    // Fallback: use the raw name capitalised
    label = rawName || 'Unknown';
  }

  return majorVersion ? `${label} ${majorVersion}` : label;
}

/**
 * Parse a User-Agent string (and optionally the sec-ch-ua header) into
 * structured browser / OS / device information.
 *
 * @param {string} userAgentString  - Value of the User-Agent request header.
 * @param {string} [secChUa]        - Value of the sec-ch-ua request header (optional).
 */
function parseUserAgent(userAgentString, secChUa) {
  const parser = new UAParser(userAgentString || '');
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  const majorVersion = browser.version?.split('.')[0];

  let browserLabel;
  if (isBrave(secChUa)) {
    // Brave identifies itself in sec-ch-ua even though its UA == Chrome
    browserLabel = majorVersion ? `Brave ${majorVersion}` : 'Brave';
  } else {
    browserLabel = normalizeBrowserName(browser.name, majorVersion);
  }

  const osName = [os.name, os.version].filter(Boolean).join(' ');

  let deviceType = device.type || 'desktop';
  if (deviceType === 'mobile') deviceType = 'Mobile';
  else if (deviceType === 'tablet') deviceType = 'Tablet';
  else deviceType = 'Desktop';

  return {
    browser: browserLabel || 'Unknown',
    operatingSystem: osName || 'Unknown',
    deviceType,
    userAgent: userAgentString || '',
  };
}

function getClientIp(req) {
  // 1. Check x-forwarded-for (standard for proxies/load balancers like Nginx/Cloudflare)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // If there are multiple IPs, the first one is the original client IP
    const ips = String(forwarded).split(',');
    return ips[0].trim();
  }

  // 2. Check x-real-ip (common Nginx configuration header)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return String(realIp).trim();
  }

  // 3. Fallback to Express req.ip (honors 'trust proxy' setting) or socket address
  // Note: Localhost will return ::1 or 127.0.0.1
  let ip = req.ip || req.socket?.remoteAddress || null;

  // Cleanup: if IPv6 mapped IPv4, strip the prefix
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  return ip;
}

module.exports = { parseUserAgent, getClientIp };
