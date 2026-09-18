/**
 * Wi-Fi IP Whitelisting Utility (Dual-Mode)
 * 
 * PURPOSE: Prevents employees from checking in remotely by validating
 * that their device is connected to the store's Wi-Fi network.
 * 
 * HOW IT WORKS (DUAL VALIDATION):
 * 1. Fetch the device's PUBLIC IP via external API
 * 2. Fetch the device's LOCAL IP via WebRTC
 * 3. Compare BOTH against the store's whitelist
 * 4. If BOTH match → allow check-in/out
 * 5. If either fails → block and show error
 * 
 * SECURITY NOTES:
 * - Public IP: All devices on same Wi-Fi share the same public IP (router's external IP)
 * - Local IP: Each device has unique local IP, but same subnet (192.168.1.x)
 * - GPS/PIN fallback is available when network is down (emergency mode)
 * - This is client-side validation; server-side validation should be added in production
 */

import { OFFICE_WIFI } from './constants';

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export interface IpCheckResult {
  /** Whether the IP is valid (in whitelist) */
  isValid: boolean;
  /** The device's current public IP */
  publicIP: string | null;
  /** The device's current local IP */
  localIP: string | null;
  /** Error message if check failed */
  error: string | null;
  /** Whether fallback mode should be used */
  useFallback: boolean;
  /** Details about what failed */
  details: {
    publicIPValid: boolean;
    localIPValid: boolean;
    /** true when public IP could not be fetched at all (firewall, captive
     *  portal, network error). Distinct from "fetched but wrong" — we
     *  never block on unknown, only on confirmed mismatch. */
    publicIPUnknown: boolean;
  };
}

/**
 * Name of the office Wi-Fi shown in error messages, so employees know
 * exactly which network to connect to.
 */
export const OFFICE_WIFI_NAME = OFFICE_WIFI.displayName;

// ═══════════════════════════════════════════════════
// IP Fetching
// ═══════════════════════════════════════════════════

/**
 * Fetch the device's public IP address.
 * Uses multiple fallback APIs for reliability.
 * 
 * @returns Public IP string or null if failed
 */
export async function fetchPublicIP(): Promise<string | null> {
  // Try multiple APIs for redundancy
  const apis = [
    'https://api.ipify.org?format=json',
    'https://ipapi.co/json/',
    'https://httpbin.org/ip',
  ];

  for (const api of apis) {
    try {
      // BUG 3 FIX: AbortSignal.timeout() is unsupported on Safari < 16.4.
      // Use manual AbortController + setTimeout for cross-browser compat.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      let response: Response;
      try {
        response = await fetch(api, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) continue;

      // BUG 5 FIX: Captive portals return HTML (200 OK but text/html).
      // Check content-type before parsing to avoid silent JSON parse fail.
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('json') && !contentType.includes('text')) {
        continue; // Likely a captive portal redirect page
      }

      const data = await response.json();

      // Extract IP based on API response format
      if (data.ip) return data.ip; // ipify, httpbin
      // httpbin returns "origin": "1.2.3.4, 5.6.7.8" when behind proxy/
      // X-Forwarded-For chain — take only the first (client) IP.
      if (data.origin) return String(data.origin).split(',')[0].trim();

      continue;
    } catch {
      // Try next API
      continue;
    }
  }

  return null; // All APIs failed
}

/**
 * Quick IP check with shorter timeout (for real-time status display).
 */
export async function fetchPublicIPQuick(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    let response: Response;
    try {
      response = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) return null;
    const data = await response.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════
// Local IP Fetching (via WebRTC)
// ═══════════════════════════════════════════════════

/**
 * Fetch the device's local IP address using WebRTC.
 * This is the IP on the local network (e.g., 192.168.1.52).
 * 
 * @returns Local IP string or null if failed
 */
export async function fetchLocalIP(): Promise<string | null> {
  try {
    // Create RTCPeerConnection to discover local IP
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    
    return new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        pc.close();
        resolve(null);
      }, 2000);

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          clearTimeout(timeout);
          pc.close();
          resolve(null);
          return;
        }

        const candidate = event.candidate.candidate;
        // Extract the first routable IPv4 from the candidate string.
        // NOTE: Chrome does not guarantee an "ip X.X.X.X" segment in the
        // candidate line, so match any IPv4 literal and skip the placeholder
        // 0.0.0.0 (raddr of srflx candidates). mDNS candidates (obfuscated
        // "xxxx.local" names) contain no IPv4 and are skipped by the regex.
        const matches = candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/g) || [];
        const ip = matches.find(m => m !== '0.0.0.0');
        if (ip) {
          clearTimeout(timeout);
          pc.close();
          resolve(ip);
        }
      };

      pc.createOffer().then((offer) => pc.setLocalDescription(offer));
    });
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════
// IP Validation
// ═══════════════════════════════════════════════════

/**
 * Check if a given IP is in the whitelist.
 * Supports both exact match and CIDR notation for flexibility.
 * 
 * @param ip - IP address to check
 * @param allowedIPs - List of allowed IP addresses/subnets
 * @returns true if IP is allowed
 */
export function isIPAllowed(ip: string, allowedIPs: string[]): boolean {
  if (!ip || allowedIPs.length === 0) return false;

  // Normalize the IP
  const normalizedIP = ip.trim();

  // Check exact match
  if (allowedIPs.includes(normalizedIP)) return true;

  // Check if IP is in same subnet (for dynamic IP ranges)
  // Example: If whitelist has "192.168.1.0/24", check if IP is in that range
  for (const allowed of allowedIPs) {
    if (allowed.includes('/')) {
      if (isIPInCIDR(normalizedIP, allowed)) return true;
    }
  }

  return false;
}

/**
 * Check if a local IP is in the allowed subnet.
 * For local IPs, we check if it's in the same subnet.
 * 
 * @param localIP - Local IP address to check
 * @param allowedSubnets - List of allowed subnets (e.g., "192.168.1.0/24")
 * @returns true if local IP is in allowed subnet
 */
export function isLocalIPAllowed(localIP: string, allowedSubnets: string[]): boolean {
  if (!localIP || allowedSubnets.length === 0) return false;

  // Check if IP is in any of the allowed subnets
  for (const subnet of allowedSubnets) {
    if (isIPInCIDR(localIP, subnet)) return true;
  }

  return false;
}

/**
 * Check if an IP is within a CIDR range.
 * Simple implementation for common cases.
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);

    const ipNum = ipToNum(ip);
    const rangeNum = ipToNum(range);

    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

/**
 * Convert IP address to number for comparison.
 */
function ipToNum(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

// ═══════════════════════════════════════════════════
// Main Validation Function
// ═══════════════════════════════════════════════════

/**
 * Validate if the device is on the store's Wi-Fi network.
 * 
 * DUAL VALIDATION FLOW:
 * 1. Fetch device's PUBLIC IP (external API)
 * 2. Fetch device's LOCAL IP (WebRTC)
 * 3. Check PUBLIC IP against allowedPublicIPs
 * 4. Check LOCAL IP against allowedLocalSubnets
 * 5. BOTH must pass for validation to succeed
 * 
 * @returns IpCheckResult with validation status
 */
export async function validateWifiConnection(): Promise<IpCheckResult> {
  const config = OFFICE_WIFI;

  // If no IPs configured at all, allow check-in (first-time setup)
  if (config.publicIPs.length === 0 && config.localSubnets.length === 0) {
    return {
      isValid: true,
      publicIP: null,
      localIP: null,
      error: null,
      useFallback: false,
      details: { publicIPValid: true, localIPValid: true, publicIPUnknown: false },
    };
  }

  // Fetch both IPs in parallel for speed
  const [publicIP, localIP] = await Promise.all([
    fetchPublicIP(),
    fetchLocalIP(),
  ]);

  // Validate Public IP (if any are configured)
  //
  // BUG 1 FIX: publicIP === null means "unknown" (firewall blocked the
  // external API, captive portal, network issue) — NOT "wrong IP".
  // We never block on unknown; we only block on confirmed mismatch
  // (IP fetched but doesn't match whitelist). When unknown + fallback
  // enabled → GPS/PIN fallback. When unknown + fallback disabled →
  // still allow (better than blocking every employee on corporate nets
  // that block IP-lookup APIs).
  let publicIPValid = true;
  let publicIPUnknown = false;
  if (config.publicIPs.length > 0) {
    if (!publicIP) {
      publicIPUnknown = true;
      // null = unknown, NOT invalid. Treat as pass — the real security
      // boundary is server-side (Phase 4). Blocking on "can't determine"
      // is worse than allowing with GPS verification.
      publicIPValid = true;
    } else {
      publicIPValid = isIPAllowed(publicIP, [...config.publicIPs]);
    }
  }

  // Validate Local IP (if any are configured)
  //
  // WHY localIP === null is treated as PASS (not FAIL):
  // Modern browsers (Chrome 116+, Safari 17+, Firefox 125+, Edge 116+)
  // enable mDNS ICE candidate obfuscation by default. This means
  // WebRTC candidates return a UUID-like "xxxxxxxx-xxxx-xxxx-xxxx-
  // xxxxxxxxxxxx.local" string instead of a real IPv4/IPv6 address.
  // Our regex in fetchLocalIP() never matches this format, so
  // localIP is null on the vast majority of real devices — even
  // when the device IS on the correct office Wi-Fi. Treating null
  // as a failure would block every employee, which is worse than
  // skipping the local-IP check entirely. The Public IP check
  // remains the authoritative signal; local IP is a bonus layer
  // that only activates on browsers/devices that still expose
  // non-mDNS candidates (e.g. older browsers, certain VPN setups,
  // or hosts with the mDNS flag disabled).
  let localIPValid = true;
  if (config.localSubnets.length > 0 && localIP) {
    localIPValid = isLocalIPAllowed(localIP, [...config.localSubnets]);
  }

  const isValid = publicIPValid && localIPValid;

  // BUG 1 FIX: When public IP is unknown (firewall/blocked API), we pass
  // the WiFi check anyway but flag it so the gate can offer GPS fallback.
  // This prevents the most common false-positive block on corporate networks.
  if (isValid) {
    return {
      isValid: true,
      publicIP,
      localIP,
      error: null,
      // If public IP is unknown, enable fallback so GPS verification
      // still happens as a safety net (even when VITE_OFFICE_WIFI_FALLBACK
      // is false — unknown IP + no fallback = silent block on every
      // corporate network that blocks ipify).
      useFallback: publicIPUnknown ? true : false,
      details: { publicIPValid, localIPValid, publicIPUnknown },
    };
  }

  // Build error message based on what failed
  const errors: string[] = [];
  if (config.publicIPs.length > 0 && !publicIPValid && !publicIPUnknown) {
    // Only show IP mismatch when we ACTUALLY fetched the IP and it didn't
    // match. null/unknown was already treated as pass above.
    errors.push(`Public IP (${publicIP}) không hợp lệ`);
  }
  // Only report a local-IP error when we actually GOT a local IP and
  // it failed the subnet check. If localIP is null (mDNS obfuscation)
  // the check was silently skipped — see the comment above — so there
  // is nothing useful to show the user here.
  if (config.localSubnets.length > 0 && localIP && !localIPValid) {
    errors.push(`Local IP (${localIP}) không trong dải mạng quán`);
  }

  return {
    isValid: false,
    publicIP,
    localIP,
    error: `Bạn đang không kết nối Wifi nội bộ công ty. Vui lòng kết nối Wifi ${config.displayName} để chấm công. (${errors.join('. ')})`,
    useFallback: config.fallbackEnabled,
    details: { publicIPValid, localIPValid, publicIPUnknown },
  };
}


