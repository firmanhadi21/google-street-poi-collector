export interface BoundingBox {
  northeast: { lat: number; lng: number };
  southwest: { lat: number; lng: number };
}

export interface POI {
  place_id: string;
  name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  types: string[];
  business_status: string;
  rating?: number;
  user_ratings_total?: number;
  built_year?: number;
  built_month?: string;
  first_seen_year?: number;
  detection_method: 'street_view' | 'inferred';
  image_evidence?: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionRun {
  id: string;
  bounding_box: BoundingBox;
  poi_types: string[];
  keyword?: string;
  started_at: string;
  completed_at?: string;
  total_pois: number;
  pois: POI[];
}

export interface StreetViewMetadata {
  status: 'OK' | 'ZERO_RESULTS' | 'NOT_FOUND' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
  date?: string;
  location?: { lat: number; lng: number };
  pano_id?: string;
  copyright?: string;
}

export interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  types: string[];
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
}

export interface PlaceSearchResponse {
  status: string;
  results?: PlaceSearchResult[];
  next_page_token?: string;
}

export interface YearAnalysisResult {
  poi: POI;
  built_year: number;
  built_month?: string;
  detection_years_checked: number[];
  method: 'binary_search' | 'single_check';
  confidence: 'high' | 'medium' | 'low';
}
