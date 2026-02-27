import { config } from '../config/index.js';
import { PlaceSearchResponse, PlaceSearchResult, BoundingBox, POI } from '../types/index.js';

export class PlacesService {
  private textSearchUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
  private nearbySearchUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  private rateLimitMs: number;

  constructor(rateLimitMs?: number) {
    this.rateLimitMs = rateLimitMs ?? config.rateLimitMs;
  }

  async searchPOIsInBoundingBox(
    bbox: BoundingBox,
    types: string[],
    keyword?: string,
    pageToken?: string
  ): Promise<PlaceSearchResult[]> {
    const centerLat = (bbox.northeast.lat + bbox.southwest.lat) / 2;
    const centerLng = (bbox.northeast.lng + bbox.southwest.lng) / 2;
    const radius = this.calculateRadius(bbox);

    const params = new URLSearchParams({
      key: config.googleMapsApiKey,
      location: `${centerLat},${centerLng}`,
      radius: radius.toString(),
    });

    if (pageToken) {
      params.set('pagetoken', pageToken);
    } else {
      params.set('type', types[0] || 'restaurant');
    }

    if (keyword) {
      params.set('keyword', keyword);
    }

    await this.delay();

    const response = await fetch(`${this.nearbySearchUrl}?${params}`);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Nearby Search API error:', JSON.stringify(data, null, 2));
      throw new Error(`Places API error: ${data.status}`);
    }

    const results = (data.results || []).map(this.convertNearbyResult);

    if (data.next_page_token) {
      await this.delay(2000);
      const nextResults = await this.searchPOIsInBoundingBox(bbox, types, keyword, data.next_page_token);
      return [...results, ...nextResults];
    }

    return results;
  }

  private convertNearbyResult(result: any): PlaceSearchResult {
    return {
      place_id: result.place_id,
      name: result.name,
      formatted_address: result.vicinity || '',
      geometry: {
        location: result.geometry.location,
      },
      types: result.types,
      business_status: result.business_status,
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
    };
  }

  async searchPOIsByTextQuery(
    query: string,
    pageToken?: string
  ): Promise<PlaceSearchResult[]> {
    const params = new URLSearchParams({
      key: config.googleMapsApiKey,
      query,
    });

    if (pageToken) {
      params.set('pagetoken', pageToken);
    }

    await this.delay();

    const response = await fetch(`${this.baseUrl}?${params}`);
    const data: PlaceSearchResponse = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API error: ${data.status}`);
    }

    const results = data.results || [];

    if (data.next_page_token) {
      await this.delay(2000);
      const nextResults = await this.searchPOIsByTextQuery(query, data.next_page_token);
      return [...results, ...nextResults];
    }

    return results;
  }

  private calculateRadius(bbox: BoundingBox): number {
    const latDiff = Math.abs(bbox.northeast.lat - bbox.southwest.lat);
    const lngDiff = Math.abs(bbox.northeast.lng - bbox.southwest.lng);
    const diagonal = Math.sqrt(latDiff ** 2 + lngDiff ** 2);
    const radius = Math.round((diagonal / 2) * 111000);
    return Math.min(radius, 50000);
  }

  private delay(ms?: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms ?? this.rateLimitMs));
  }

  convertToPOI(result: PlaceSearchResult): POI {
    const now = new Date().toISOString();
    return {
      place_id: result.place_id,
      name: result.name,
      formatted_address: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      types: result.types,
      business_status: result.business_status || 'UNKNOWN',
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      detection_method: 'inferred',
      created_at: now,
      updated_at: now,
    };
  }
}

export const placesService = new PlacesService();
