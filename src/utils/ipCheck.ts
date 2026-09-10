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

import { STORAGE_KEY_WIFI_CONFIG } from './constants';

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export interface WifiConfig {
  /** List of allowed public IP addresses */
  allowedPublicIPs: string[];
  /** List of allowed local IP subnets (e.g., "192.168.1.0/24") */
  allowedLocalSubnets: string[];
  /** Whether fallback mode is enabled (allows GPS/PIN when network is down) */
  fallbackEnabled: boolean;
  /** Last time the config was updated */
  lastUpdated: string;
  /** Who last updated the config */
  updatedBy: string;
}

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
  };
}

// ═══════════════════════════════════════════════════
// Default Config
// ═══════════════════════════════════════════════════

const DEFAULT_WIFI_CONFIG: WifiConfig = {
  allowedPublicIPs: [],
  allowedLocalSubnets: [],
  fallbackEnabled: false,
  lastUpdated: '',
  updatedBy: '',
};

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
      const response = await fetch(api, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) continue;

      const data = await response.json();

      // Extract IP based on API response format
      if (data.ip) return data.ip; // ipify, httpbin
      if (data.origin) return data.origin; // httpbin

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
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000),
    });
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
        // Extract IP from candidate string
        // Format: "candidate:... typ host ... ip 192.168.1.52 ..."
        const ipMatch = candidate.match(/ip (\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) {
          clearTimeout(timeout);
          pc.close();
          resolve(ipMatch[1]);
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
  const config = getWifiConfig();

  // If no IPs configured at all, allow check-in (first-time setup)
  if (config.allowedPublicIPs.length === 0 && config.allowedLocalSubnets.length === 0) {
    return {
      isValid: true,
      publicIP: null,
      localIP: null,
      error: null,
      useFallback: false,
      details: { publicIPValid: true, localIPValid: true },
    };
  }

  // Fetch both IPs in parallel for speed
  const [publicIP, localIP] = await Promise.all([
    fetchPublicIP(),
    fetchLocalIP(),
  ]);

  // Validate Public IP (if any are configured)
  let publicIPValid = true;
  if (config.allowedPublicIPs.length > 0) {
    if (!publicIP) {
      publicIPValid = false;
    } else {
      publicIPValid = isIPAllowed(publicIP, config.allowedPublicIPs);
    }
  }

  // Validate Local IP (if any are configured)
  let localIPValid = true;
  if (config.allowedLocalSubnets.length > 0) {
    if (!localIP) {
      localIPValid = false;
    } else {
      localIPValid = isLocalIPAllowed(localIP, config.allowedLocalSubnets);
    }
  }

  const isValid = publicIPValid && localIPValid;

  if (isValid) {
    return {
      isValid: true,
      publicIP,
      localIP,
      error: null,
      useFallback: false,
      details: { publicIPValid, localIPValid },
    };
  }

  // Build error message based on what failed
  const errors: string[] = [];
  if (config.allowedPublicIPs.length > 0 && !publicIPValid) {
    if (!publicIP) {
      errors.push('Không thể xác định Public IP');
    } else {
      errors.push(`Public IP (${publicIP}) không hợp lệ`);
    }
  }
  if (config.allowedLocalSubnets.length > 0 && !localIPValid) {
    if (!localIP) {
      errors.push('Không thể xác định Local IP');
    } else {
      errors.push(`Local IP (${localIP}) không trong dải mạng quán`);
    }
  }

  return {
    isValid: false,
    publicIP,
    localIP,
    error: errors.join('. ') + '. Vui lòng kết nối Wi-Fi tại cửa hàng để điểm danh.',
    useFallback: config.fallbackEnabled,
    details: { publicIPValid, localIPValid },
  };
}

// ═══════════════════════════════════════════════════
// Config Management
// ═══════════════════════════════════════════════════

/**
 * Get WiFi configuration from localStorage.
 */
export function getWifiConfig(): WifiConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_WIFI_CONFIG);
    if (saved) {
      return { ...DEFAULT_WIFI_CONFIG, ...JSON.parse(saved) };
    }
  } catch {
    // Corrupted data
  }
  return DEFAULT_WIFI_CONFIG;
}

/**
 * Save WiFi configuration to localStorage.
 */
export function saveWifiConfig(config: WifiConfig): void {
  localStorage.setItem(STORAGE_KEY_WIFI_CONFIG, JSON.stringify(config));
}

/**
 * Add a Public IP to the whitelist.
 */
export function addAllowedPublicIP(ip: string, updatedBy: string): void {
  const config = getWifiConfig();
  if (!config.allowedPublicIPs.includes(ip)) {
    config.allowedPublicIPs.push(ip);
    config.lastUpdated = new Date().toISOString();
    config.updatedBy = updatedBy;
    saveWifiConfig(config);
  }
}

/**
 * Remove a Public IP from the whitelist.
 */
export function removeAllowedPublicIP(ip: string, updatedBy: string): void {
  const config = getWifiConfig();
  config.allowedPublicIPs = config.allowedPublicIPs.filter(i => i !== ip);
  config.lastUpdated = new Date().toISOString();
  config.updatedBy = updatedBy;
  saveWifiConfig(config);
}

/**
 * Add a Local IP subnet to the whitelist.
 */
export function addAllowedLocalSubnet(subnet: string, updatedBy: string): void {
  const config = getWifiConfig();
  if (!config.allowedLocalSubnets.includes(subnet)) {
    config.allowedLocalSubnets.push(subnet);
    config.lastUpdated = new Date().toISOString();
    config.updatedBy = updatedBy;
    saveWifiConfig(config);
  }
}

/**
 * Remove a Local IP subnet from the whitelist.
 */
export function removeAllowedLocalSubnet(subnet: string, updatedBy: string): void {
  const config = getWifiConfig();
  config.allowedLocalSubnets = config.allowedLocalSubnets.filter(i => i !== subnet);
  config.lastUpdated = new Date().toISOString();
  config.updatedBy = updatedBy;
  saveWifiConfig(config);
}

/**
 * Toggle fallback mode.
 */
export function toggleFallback(enabled: boolean, updatedBy: string): void {
  const config = getWifiConfig();
  config.fallbackEnabled = enabled;
  config.lastUpdated = new Date().toISOString();
  config.updatedBy = updatedBy;
  saveWifiConfig(config);
}

/**
 * Clear all allowed IPs.
 */
export function clearAllowedIPs(updatedBy: string): void {
  const config = getWifiConfig();
  config.allowedPublicIPs = [];
  config.allowedLocalSubnets = [];
  config.lastUpdated = new Date().toISOString();
  config.updatedBy = updatedBy;
  saveWifiConfig(config);
}
