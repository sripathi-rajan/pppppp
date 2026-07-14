/**
 * STUB — Tier 2 (local cached 8B model via OPFS) is not implemented in this pass.
 * This file exists purely so SmartSwitch/useSmartChat have a stable interface to build
 * against without any further changes once Tier 2 is actually implemented.
 */

export async function isCached(): Promise<boolean> {
  return false;
}

export async function download(_onProgress?: (pct: number) => void): Promise<void> {
  throw new Error('Tier 2 (local 8B model) is not implemented yet.');
}

export async function generate(_prompt: string): Promise<string> {
  throw new Error('Tier 2 (local 8B model) is not implemented yet.');
}
