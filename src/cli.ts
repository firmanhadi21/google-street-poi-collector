import { placesService } from './services/places.js';
import { yearDetectorService } from './services/yearDetector.js';
import { cacheService } from './services/cache.js';
import { config } from './config/index.js';
import { BoundingBox, CollectionRun } from './types/index.js';
import fs from 'fs/promises';
import path from 'path';

function generateId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function collectPOIs(
  bboxString: string,
  types: string[],
  keyword?: string,
  outputPath?: string,
  analyzeYears: boolean = true
): Promise<CollectionRun> {
  const [ne_lat, ne_lng, sw_lat, sw_lng] = bboxString.split(',').map(Number);

  const bbox: BoundingBox = {
    northeast: { lat: ne_lat, lng: ne_lng },
    southwest: { lat: sw_lat, lng: sw_lng },
  };

  const collectionId = generateId();
  const startedAt = new Date().toISOString();

  console.log(`Starting collection ${collectionId}`);
  console.log(`Bounding box: ${bboxString}`);
  console.log(`Types: ${types.join(', ')}`);
  if (keyword) console.log(`Keyword: ${keyword}`);

  console.log('\nSearching for POIs...');
  const results = await placesService.searchPOIsInBoundingBox(bbox, types, keyword);

  console.log(`Found ${results.length} POIs`);

  const pois = results.map(r => placesService.convertToPOI(r));

  if (analyzeYears) {
    console.log('\nAnalyzing building years...');
    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      console.log(`  [${i + 1}/${pois.length}] Analyzing: ${poi.name}`);

      try {
        const result = await yearDetectorService.analyzePOI(poi);
        pois[i] = result.poi;
      } catch (error) {
        console.error(`    Error: ${error}`);
      }
    }
  }

  const completedAt = new Date().toISOString();

  const collection: CollectionRun = {
    id: collectionId,
    bounding_box: bbox,
    poi_types: types,
    keyword,
    started_at: startedAt,
    completed_at: completedAt,
    total_pois: pois.length,
    pois,
  };

  cacheService.saveCollection(collection);

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(collection, null, 2));
    console.log(`\nSaved to: ${outputPath}`);
  }

  return collection;
}

export async function analyzeLocation(
  lat: number,
  lng: number,
  minYear?: number,
  maxYear?: number
): Promise<void> {
  console.log(`Analyzing location: ${lat}, ${lng}`);
  console.log(`Year range: ${minYear ?? 2007} - ${maxYear ?? new Date().getFullYear()}`);

  const result = await yearDetectorService.analyzePOIByLocation(lat, lng, minYear, maxYear);

  console.log('\nResult:');
  console.log(JSON.stringify(result, null, 2));
}

export async function listCollections(limit: number = 10): Promise<void> {
  const collections = cacheService.listCollections(limit);
  console.log(`Found ${collections.length} collections:\n`);
  console.log(JSON.stringify(collections, null, 2));
}

export async function getCollection(collectionId: string): Promise<void> {
  const collection = cacheService.getCollection(collectionId);
  if (!collection) {
    console.error(`Collection not found: ${collectionId}`);
    return;
  }
  console.log(JSON.stringify(collection, null, 2));
}
