import * as Location from 'expo-location';
import { getApiBaseUrl } from '../api';
import type { ChatHistoryTurn, QueryResult } from '../../hooks/useQuery';

async function getGps(): Promise<{ lat: number; lon: number } | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      return { lat: loc.coords.latitude, lon: loc.coords.longitude };
    }
  } catch {
    // GPS optional
  }
  return null;
}

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: (citations: string[]) => void;
}

/**
 * Web-only: real token streaming from POST /query/stream (backend/main.py). Parses the SSE
 * body manually (fetch + ReadableStream) since EventSource can't send a POST body.
 *
 * Defensive by design: if an intermediate proxy (e.g. Netlify's redirect) buffers the whole
 * response instead of streaming it, the `\n\n`-delimited parsing below still works correctly —
 * it just arrives as one burst instead of incrementally.
 */
export async function streamCloud(
  text: string,
  history: ChatHistoryTurn[],
  opts: { userVehicle?: string; userLocation?: string; country?: string; state?: string; signal?: AbortSignal },
  callbacks: StreamCallbacks
): Promise<void> {
  const BASE_URL = getApiBaseUrl();
  const gps = await getGps();

  const response = await fetch(`${BASE_URL}/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      text,
      history,
      gps,
      vehicle: opts.userVehicle,
      location_name: opts.userLocation,
      country: opts.country,
      state: opts.state,
    }),
    signal: opts.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex: number;
    while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      const dataLine = rawEvent.split('\n').find((l) => l.startsWith('data: '));
      if (!dataLine) continue;

      try {
        const payload = JSON.parse(dataLine.slice(6));
        if (payload.type === 'delta' && payload.text) {
          callbacks.onDelta(payload.text);
        } else if (payload.type === 'done') {
          callbacks.onDone(payload.citations || []);
        }
      } catch {
        // Skip unparsable fragments rather than crashing the stream.
      }
    }
  }
}

/** Native + web vision fallback: the existing non-streaming /query call, unchanged from useQuery.ts. */
export async function queryCloudOnce(
  text: string,
  history: ChatHistoryTurn[] = [],
  attachment: { imageBase64?: string; imageMime?: string } = {},
  userVehicle?: string,
  userLocation?: string,
  country?: string,
  state?: string,
  signal?: AbortSignal
): Promise<QueryResult> {
  const BASE_URL = getApiBaseUrl();
  const gps = await getGps();

  const response = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Bypass-Tunnel-Reminder': 'true',
    },
    body: JSON.stringify({
      text,
      history,
      gps,
      vehicle: userVehicle,
      location_name: userLocation,
      image_base64: attachment.imageBase64,
      image_mime: attachment.imageMime,
      country,
      state,
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return response.json();
}
