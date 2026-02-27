import { streetViewService } from './streetview.js';
import { POI, YearAnalysisResult } from '../types/index.js';

export class YearDetectorService {

  async analyzePOI(poi: POI): Promise<YearAnalysisResult> {
    const captureInfo = await streetViewService.getLatestCaptureDate(poi.latitude, poi.longitude);

    const poiWithResult: POI = {
      ...poi,
      built_year: captureInfo.year,
      built_month: captureInfo.date,
      first_seen_year: captureInfo.year,
      detection_method: captureInfo.date ? 'street_view' : 'inferred',
      updated_at: new Date().toISOString(),
    };

    return {
      poi: poiWithResult,
      built_year: captureInfo.year || 0,
      built_month: captureInfo.date,
      detection_years_checked: [],
      method: 'single_check',
      confidence: captureInfo.date ? 'high' : 'low',
    };
  }

  async analyzePOIByLocation(
    lat: number,
    lng: number,
    minYear?: number,
    maxYear?: number
  ): Promise<YearAnalysisResult> {
    const captureInfo = await streetViewService.getLatestCaptureDate(lat, lng);

    const mockPoi: POI = {
      place_id: '',
      name: 'Unknown',
      formatted_address: '',
      latitude: lat,
      longitude: lng,
      types: [],
      business_status: 'UNKNOWN',
      built_year: captureInfo.year,
      built_month: captureInfo.date,
      first_seen_year: captureInfo.year,
      detection_method: captureInfo.date ? 'street_view' : 'inferred',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      poi: mockPoi,
      built_year: captureInfo.year || 0,
      built_month: captureInfo.date,
      detection_years_checked: [],
      method: 'single_check',
      confidence: captureInfo.date ? 'high' : 'low',
    };
  }
}

export const yearDetectorService = new YearDetectorService();
