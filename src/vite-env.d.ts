/// <reference types="vite/client" />

/**
 * Typing for the environment variables this app reads.
 * Values are baked into the bundle at BUILD time by Vite — only VITE_*
 * prefixed variables are exposed. They are NOT secrets: anything in the
 * client bundle is readable by users. True secrets belong on a backend.
 */
interface ImportMetaEnv {
  /** Display name of the office Wi-Fi shown in check-in error messages */
  readonly VITE_OFFICE_WIFI_NAME: string;
  /** Office router public IP(s), comma-separated */
  readonly VITE_OFFICE_PUBLIC_IPS: string;
  /** Allowed LAN ranges in CIDR, comma-separated */
  readonly VITE_OFFICE_LOCAL_SUBNETS: string;
  /** "true" to allow GPS/PIN fallback when the Wi-Fi check fails */
  readonly VITE_OFFICE_WIFI_FALLBACK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
