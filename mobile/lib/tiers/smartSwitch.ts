import { getApiBaseUrl } from '../api';

const HEALTH_TIMEOUT_MS = 4000;

/**
 * Pings the existing /health endpoint (backend/main.py) with a short timeout to decide
 * whether Tier 1 (cloud) is currently reachable. Short-circuits on navigator.onLine === false
 * where available (web) to avoid a pointless network round trip.
 */
export async function checkCloudAvailable(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    const res = await fetch(`${getApiBaseUrl()}/health`, {
      signal: controller.signal as AbortSignal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}
