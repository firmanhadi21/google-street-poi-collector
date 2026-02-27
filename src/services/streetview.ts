import { config } from '../config/index.js';
import { StreetViewMetadata } from '../types/index.js';

export class StreetViewService {
  private metadataUrl = 'https://maps.googleapis.com/maps/api/streetview/metadata';
  private staticUrl = 'https://maps.googleapis.com/maps/api/streetview';
  private rateLimitMs: number;

  constructor(rateLimitMs?: number) {
    this.rateLimitMs = rateLimitMs ?? config.rateLimitMs;
  }

  async getMetadata(
    lat: number,
    lng: number,
    year?: number
  ): Promise<StreetViewMetadata> {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      key: config.googleMapsApiKey,
    });

    if (year) {
      params.set('date', `${year}`);
    }

    await this.delay();

    const response = await fetch(`${this.metadataUrl}?${params}`);
    const data: StreetViewMetadata = await response.json();

    return data;
  }

  async getMetadataForYear(
    lat: number,
    lng: number,
    year: number
  ): Promise<{ available: boolean; date?: string }> {
    const metadata = await this.getMetadata(lat, lng, year);

    if (metadata.status === 'OK') {
      return { available: true, date: metadata.date };
    }

    if (metadata.status === 'ZERO_RESULTS') {
      return { available: false };
    }

    throw new Error(`Street View Metadata API error: ${metadata.status}`);
  }

  async getLatestCaptureDate(
    lat: number,
    lng: number
  ): Promise<{ date?: string; year?: number }> {
    const metadata = await this.getMetadata(lat, lng);
    
    if (metadata.status === 'OK' && metadata.date) {
      const year = parseInt(metadata.date.substring(0, 4));
      return { date: metadata.date, year };
    }
    
    return {};
  }

  async fetchImage(
    lat: number,
    lng: number,
    year?: number,
    heading?: number,
    fov?: number,
    pitch?: number
  ): Promise<Buffer | null> {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      size: '600x400',
      key: config.googleMapsApiKey,
    });

    if (year) params.set('date', `${year}`);
    if (heading) params.set('heading', heading.toString());
    if (fov) params.set('fov', fov.toString());
    if (pitch) params.set('pitch', pitch.toString());

    await this.delay();

    const response = await fetch(`${this.staticUrl}?${params}`);

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getImageUrl(
    lat: number,
    lng: number,
    year?: number,
    heading?: number,
    fov?: number,
    pitch?: number
  ): Promise<string> {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      size: '600x400',
      key: config.googleMapsApiKey,
    });

    if (year) params.set('date', `${year}`);
    if (heading) params.set('heading', heading.toString());
    if (fov) params.set('fov', fov.toString());
    if (pitch) params.set('pitch', pitch.toString());

    return `${this.staticUrl}?${params}`;
  }

  async getEarliestYearWithImagery(
    lat: number,
    lng: number,
    minYear: number = 2007,
    maxYear: number = new Date().getFullYear()
  ): Promise<{ year: number; month?: string } | null> {
    let currentYear = maxYear;

    while (currentYear >= minYear) {
      const result = await this.getMetadataForYear(lat, lng, currentYear);

      if (result.available) {
        const month = result.date ? result.date.substring(0, 7) : undefined;
        return { year: currentYear, month };
      }

      currentYear--;
    }

    return null;
  }

  private delay(ms?: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms ?? this.rateLimitMs));
  }
}

export const streetViewService = new StreetViewService();
