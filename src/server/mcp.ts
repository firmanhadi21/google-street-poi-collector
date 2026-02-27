import { placesService } from '../services/places.js';
import { streetViewService } from '../services/streetview.js';
import { yearDetectorService } from '../services/yearDetector.js';
import { cacheService } from '../services/cache.js';
import { BoundingBox } from '../types/index.js';

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

async function handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
  const { id, method, params } = request;

  try {
    let result: unknown;

    switch (method) {
      case 'search_pois': {
        const bbox = String(params?.bbox);
        const types = String(params?.types || 'restaurant').split(',').map(t => t.trim());
        const keyword = params?.keyword ? String(params.keyword) : undefined;
        const [ne_lat, ne_lng, sw_lat, sw_lng] = bbox.split(',').map(Number);

        const bboxObj: BoundingBox = {
          northeast: { lat: ne_lat, lng: ne_lng },
          southwest: { lat: sw_lat, lng: sw_lng },
        };

        const results = await placesService.searchPOIsInBoundingBox(bboxObj, types, keyword);
        const pois = results.map(r => placesService.convertToPOI(r));
        result = { pois, count: pois.length };
        break;
      }

      case 'get_poi_history': {
        const placeId = params?.place_id ? String(params.place_id) : null;
        const latitude = params?.latitude as number | undefined;
        const longitude = params?.longitude as number | undefined;

        let lat: number, lng: number;

        if (placeId) {
          const poi = cacheService.getPOI(placeId);
          if (!poi) {
            return { jsonrpc: '2.0', id, error: { code: -32602, message: `POI not found: ${placeId}` } };
          }
          lat = poi.latitude;
          lng = poi.longitude;
        } else if (latitude !== undefined && longitude !== undefined) {
          lat = latitude;
          lng = longitude;
        } else {
          return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Either place_id or latitude/longitude required' } };
        }

        result = await yearDetectorService.analyzePOIByLocation(lat, lng);
        break;
      }

      case 'analyze_poi_year': {
        const lat = params?.latitude as number;
        const lng = params?.longitude as number;
        const minYear = params?.min_year as number | undefined;
        const maxYear = params?.max_year as number | undefined;

        result = await yearDetectorService.analyzePOIByLocation(lat, lng, minYear, maxYear);
        break;
      }

      case 'list_collections': {
        const limit = (params?.limit as number) || 10;
        result = cacheService.listCollections(limit);
        break;
      }

      case 'get_collection': {
        const collectionId = String(params?.collection_id);
        const collection = cacheService.getCollection(collectionId);
        if (!collection) {
          return { jsonrpc: '2.0', id, error: { code: -32602, message: `Collection not found: ${collectionId}` } };
        }
        result = collection;
        break;
      }

      case 'get_streetview_image_url': {
        const lat = params?.latitude as number;
        const lng = params?.longitude as number;
        const year = params?.year as number | undefined;
        const heading = params?.heading as number | undefined;
        const fov = params?.fov as number | undefined;
        const url = await streetViewService.getImageUrl(lat, lng, year, heading, fov);
        result = { url };
        break;
      }

      case 'initialize':
      case 'tools/list':
        result = {
          tools: [
            { name: 'search_pois', description: 'Search for POIs within a bounding box' },
            { name: 'get_poi_history', description: 'Get building year for a POI' },
            { name: 'analyze_poi_year', description: 'Analyze a location to determine building year' },
            { name: 'list_collections', description: 'List all collection runs' },
            { name: 'get_collection', description: 'Get details of a specific collection' },
            { name: 'get_streetview_image_url', description: 'Get a Street View image URL' },
          ]
        };
        break;

      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
    }

    return { jsonrpc: '2.0', id, result };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function startMCPServer(): Promise<void> {
  const stdin = process.stdin;
  const stdout = process.stdout;

  let buffer = '';

  stdin.setEncoding('utf8');

  stdin.on('data', async (chunk: string) => {
    buffer += chunk;

    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      if (!line.trim()) continue;

      try {
        const request: JSONRPCRequest = JSON.parse(line);
        const response = await handleRequest(request);
        stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        const errorResponse: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: 0,
          error: { code: -32700, message: 'Parse error' },
        };
        stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    }
  });

  console.error('MCP Server started (JSON-RPC over stdio)');
}
