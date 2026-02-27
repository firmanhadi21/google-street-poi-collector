import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { POI, CollectionRun, StreetViewMetadata } from '../types/index.js';

export class CacheService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath ?? config.cacheDbPath;
    this.db = new Database(path);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pois (
        place_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        formatted_address TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        types TEXT,
        business_status TEXT,
        rating REAL,
        user_ratings_total INTEGER,
        built_year INTEGER,
        built_month TEXT,
        first_seen_year INTEGER,
        detection_method TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS street_view_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        year INTEGER,
        available INTEGER NOT NULL,
        date TEXT,
        pano_id TEXT,
        cached_at TEXT NOT NULL,
        UNIQUE(latitude, longitude, year)
      );

      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        bounding_box TEXT NOT NULL,
        poi_types TEXT,
        keyword TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        total_pois INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_pois_location ON pois(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_street_view_location ON street_view_cache(latitude, longitude, year);
    `);
  }

  getPOI(placeId: string): POI | null {
    const row = this.db.prepare('SELECT * FROM pois WHERE place_id = ?').get(placeId) as any;
    if (!row) return null;
    return this.rowToPOI(row);
  }

  savePOI(poi: POI): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pois (
        place_id, name, formatted_address, latitude, longitude, types,
        business_status, rating, user_ratings_total, built_year, built_month,
        first_seen_year, detection_method, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      poi.place_id,
      poi.name,
      poi.formatted_address,
      poi.latitude,
      poi.longitude,
      JSON.stringify(poi.types),
      poi.business_status,
      poi.rating ?? null,
      poi.user_ratings_total ?? null,
      poi.built_year ?? null,
      poi.built_month ?? null,
      poi.first_seen_year ?? null,
      poi.detection_method,
      poi.created_at,
      poi.updated_at
    );
  }

  getStreetViewMetadata(lat: number, lng: number, year: number): StreetViewMetadata | null {
    const row = this.db.prepare(
      'SELECT * FROM street_view_cache WHERE latitude = ? AND longitude = ? AND year = ?'
    ).get(lat, lng, year) as any;

    if (!row) return null;

    return {
      status: row.available ? 'OK' : 'ZERO_RESULTS',
      date: row.date ?? undefined,
      location: { lat: row.latitude, lng: row.longitude },
      pano_id: row.pano_id ?? undefined,
    };
  }

  saveStreetViewMetadata(lat: number, lng: number, year: number, metadata: StreetViewMetadata): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO street_view_cache (
        latitude, longitude, year, available, date, pano_id, cached_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      lat,
      lng,
      year,
      metadata.status === 'OK' ? 1 : 0,
      metadata.date ?? null,
      metadata.pano_id ?? null,
      new Date().toISOString()
    );
  }

  saveCollection(collection: CollectionRun): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO collections (
        id, bounding_box, poi_types, keyword, started_at, completed_at, total_pois
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      collection.id,
      JSON.stringify(collection.bounding_box),
      JSON.stringify(collection.poi_types),
      collection.keyword ?? null,
      collection.started_at,
      collection.completed_at ?? null,
      collection.total_pois
    );

    for (const poi of collection.pois) {
      this.savePOI(poi);
    }
  }

  getCollection(id: string): CollectionRun | null {
    const row = this.db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as any;
    if (!row) return null;

    const pois = this.db.prepare('SELECT * FROM pois WHERE place_id IN (SELECT place_id FROM pois)')
      .all()
      .map((r: any) => this.rowToPOI(r));

    return {
      id: row.id,
      bounding_box: JSON.parse(row.bounding_box),
      poi_types: JSON.parse(row.poi_types),
      keyword: row.keyword,
      started_at: row.started_at,
      completed_at: row.completed_at,
      total_pois: row.total_pois,
      pois: pois.filter((p: POI) => p.place_id.startsWith('ChI')),
    };
  }

  listCollections(limit: number = 10): CollectionRun[] {
    const rows = this.db.prepare(
      'SELECT * FROM collections ORDER BY started_at DESC LIMIT ?'
    ).all(limit) as any[];

    return rows.map(row => ({
      id: row.id,
      bounding_box: JSON.parse(row.bounding_box),
      poi_types: JSON.parse(row.poi_types),
      keyword: row.keyword,
      started_at: row.started_at,
      completed_at: row.completed_at,
      total_pois: row.total_pois,
      pois: [],
    }));
  }

  private rowToPOI(row: any): POI {
    return {
      place_id: row.place_id,
      name: row.name,
      formatted_address: row.formatted_address,
      latitude: row.latitude,
      longitude: row.longitude,
      types: JSON.parse(row.types || '[]'),
      business_status: row.business_status,
      rating: row.rating,
      user_ratings_total: row.user_ratings_total,
      built_year: row.built_year,
      built_month: row.built_month,
      first_seen_year: row.first_seen_year,
      detection_method: row.detection_method,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  close(): void {
    this.db.close();
  }
}

export const cacheService = new CacheService();
