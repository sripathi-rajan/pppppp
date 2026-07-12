import * as SQLite from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

let db: SQLite.SQLiteDatabase | null = null;
if (Platform.OS !== 'web') {
  try {
    db = SQLite.openDatabaseSync('drivelegal.db');
  } catch (e) {
    console.warn('[LocalDB] Failed to open database:', e);
  }
}

export interface Fine {
  id: number;
  offence_code: string;
  vehicle_class: string;
  state: string;
  amount_inr: number;
  repeat_amount_inr?: number;
  section_ref?: string;
  source_url: string;
  fetched_at: string;
}

export interface Rule {
  rule_id: string;
  section?: string;
  title: string;
  description: string;
  state: string;
  raw_json: string;
}

export interface Zone {
  zone_id: string;
  zone_type: string;
  state: string;
  rule_set_id?: string;
  geometry_json: string;
  fine_multiplier: number;
}

type Position = [number, number];
type Polygon = Position[][];
type MultiPolygon = Polygon[];

const isPointInRing = (lat: number, lon: number, ring: Position[]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const isPointInPolygon = (lat: number, lon: number, polygon: Polygon) => {
  if (!polygon.length || !isPointInRing(lat, lon, polygon[0])) {
    return false;
  }
  return !polygon.slice(1).some((hole) => isPointInRing(lat, lon, hole));
};

const isPointInGeoJson = (lat: number, lon: number, geojson: any) => {
  const geometry = geojson?.type === 'Feature' ? geojson.geometry : geojson;
  if (!geometry) return false;

  if (geometry.type === 'Polygon') {
    return isPointInPolygon(lat, lon, geometry.coordinates as Polygon);
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as MultiPolygon).some((polygon) => isPointInPolygon(lat, lon, polygon));
  }
  return false;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS fines (
  id INTEGER PRIMARY KEY,
  offence_code TEXT NOT NULL,
  vehicle_class TEXT NOT NULL,
  state TEXT NOT NULL,
  amount_inr INTEGER NOT NULL,
  repeat_amount_inr INTEGER,
  section_ref TEXT,
  source_url TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  version_hash TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS rules (
  rule_id TEXT PRIMARY KEY,
  section TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'ALL',
  raw_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS zones (
  zone_id TEXT PRIMARY KEY,
  zone_type TEXT NOT NULL,
  state TEXT NOT NULL,
  rule_set_id TEXT,
  geometry_json TEXT NOT NULL,
  fine_multiplier REAL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  synced_at TEXT NOT NULL,
  module TEXT NOT NULL,
  rows_updated INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  error TEXT
);
`;

export const useLocalDB = () => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      if (!db) {
        setInitialized(true);
        return;
      }
      // Run each CREATE TABLE statement
      SCHEMA.split(';').forEach(stmt => {
        if (stmt.trim()) {
          try {
            db!.execSync(stmt);
          } catch (e) {
            console.warn('[LocalDB] Schema statement error:', e);
          }
        }
      });
      setInitialized(true);
    } catch (e) {
      console.error('[LocalDB] Failed to initialize:', e);
      setInitialized(true); // Don't block the app
    }
  }, []);

  const queryFine = async (offence: string, vehicleClass: string, state: string): Promise<Fine | null> => {
    try {
      if (!db) return null;
      const rows = db.getAllSync<Fine>(
        `SELECT * FROM fines 
         WHERE offence_code = ? AND vehicle_class = ? AND (state = ? OR state = 'ALL')
         ORDER BY CASE WHEN state = ? THEN 0 ELSE 1 END
         LIMIT 1`,
        [offence, vehicleClass, state, state]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (e) {
      console.warn('[LocalDB] queryFine error:', e);
      return null;
    }
  };

  const queryRule = async (ruleId: string): Promise<Rule | null> => {
    try {
      if (!db) return null;
      const rows = db.getAllSync<Rule>(
        'SELECT * FROM rules WHERE rule_id = ?',
        [ruleId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (e) {
      console.warn('[LocalDB] queryRule error:', e);
      return null;
    }
  };

  const getZonesForPoint = async (lat: number, lon: number): Promise<Zone[]> => {
    try {
      if (!db) return [];
      const allZones = db.getAllSync<Zone>('SELECT * FROM zones');

      return allZones.filter(z => {
        try {
          const geojson = JSON.parse(z.geometry_json);
          return isPointInGeoJson(lat, lon, geojson);
        } catch {
          return false;
        }
      });
    } catch (e) {
      console.warn('[LocalDB] getZonesForPoint error:', e);
      return [];
    }
  };

  return { queryFine, queryRule, getZonesForPoint, initialized };
};

