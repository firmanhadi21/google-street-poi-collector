# Google Street View POI Collector

A Node.js tool that collects POIs from Google Places API and determines when each location was first covered by Street View imagery.

## What It Does

1. **Collect POIs**: Search for places (restaurants, cafes, etc.) in a geographic area
2. **Street View Analysis**: Check when Google Street View vehicles first captured imagery at each location
3. **Export**: Save results as GeoJSON for mapping/analysis

## Important Note

This tool uses the **Street View Metadata API** which returns when imagery was captured, not historical imagery. For full historical Street View dates, use Google Maps (not Google Earth) and look for the clock icon in Street View mode.

## Prerequisites

- Node.js 18+
- Google Maps API Key

## Installation

```bash
# Clone or navigate to the project
cd google-street-poi-collector

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

## Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select an existing one
3. Enable these APIs:
   - **Places API** - for searching POIs
   - **Street View Static API** - for imagery metadata
4. Create an API key
5. Add the key to `.env`:
   ```
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

## Usage

### Collect POIs with Street View Analysis

```bash
# Collect restaurants in a bounding box
npm run cli -- collect --bbox "-7.006148,110.500923,-7.0854341,110.428533" --types "restaurant"
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `--bbox` | Bounding box: `"ne_lat,ne_lng,sw_lat,sw_lng"` |
| `--types` | POI types: `"restaurant,cafe,bar"` |
| `--no-analyze` | Skip Street View analysis (faster) |
| `--output` | Save to file: `-o filename.json` |

### Analyze a Specific Location

```bash
# Check Street View capture date for a location
npm run cli -- analyze --lat -7.0521296 --lng 110.4433455
```

### List Collections

```bash
# List all saved collections
npm run cli -- list

# Get details of a specific collection
npm run cli -- get --id "col_xxx"
```

## Finding Bounding Box Coordinates

1. Go to [Google Maps](https://www.google.com/maps)
2. Search for your target area (e.g., "Tembalang, Semarang, Indonesia")
3. Get coordinates from the URL or use the Geocoding API

Example for Tembalang, Semarang:
- Northeast: -7.006148, 110.500923
- Southwest: -7.0854341, 110.428533

## MCP Server

For AI assistant integration, run the MCP server:

```bash
npm run server
```

The server exposes these tools:
- `search_pois` - Search POIs in bounding box
- `analyze_poi_year` - Get Street View capture date
- `list_collections` - List saved collections
- `get_collection` - Get collection details
- `get_streetview_image_url` - Get Street View image URL

## Output Format

Results are saved in GeoJSON format:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Selaras Resto",
        "address": "Jalan Mulawarman Raya No.69, Kramas",
        "rating": 4.2,
        "first_seen_year": 2024,
        "built_month": "2024-12"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [110.4375185, -7.0662359]
      }
    }
  ]
}
```

## Configuration

Edit `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_MAPS_API_KEY` | Your Google Maps API key | (required) |
| `RATE_LIMIT_MS` | Delay between API calls | 100 |
| `CACHE_DB_PATH` | SQLite cache file path | `./cache.db` |
| `OUTPUT_DIR` | Output directory | `./data` |
| `SERVER_PORT` | MCP server port | 3000 |

## API Costs

| API | Cost (per 1000 requests) |
|-----|-------------------------|
| Places API (Nearby Search) | ~$32 |
| Street View Metadata | **FREE** |
| Street View Static | ~$7 |

## Project Structure

```
google-street-poi-collector/
├── src/
│   ├── config/         # Configuration
│   ├── types/          # TypeScript interfaces
│   ├── services/       # API clients
│   │   ├── places.ts        # Google Places API
│   │   ├── streetview.ts    # Street View API
│   │   ├── yearDetector.ts # Analysis logic
│   │   └── cache.ts        # SQLite caching
│   ├── server/         # MCP server
│   ├── cli.ts          # CLI commands
│   └── index.ts        # Entry point
├── data/               # Output files
├── .env.example        # Environment template
└── package.json
```

## License

MIT
