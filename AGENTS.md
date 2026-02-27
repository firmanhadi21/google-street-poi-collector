# Google Street View POI Collector - Agent Instructions

## Project Overview

This tool collects POIs from Google Places API and determines when each POI was built by analyzing historical Street View imagery.

## Architecture

```
src/
├── config/index.ts       # Environment configuration
├── types/index.ts       # TypeScript interfaces
├── services/
│   ├── places.ts        # Google Places API client
│   ├── streetview.ts    # Street View Metadata + Static API
│   ├── yearDetector.ts  # Binary search for building year
│   └── cache.ts         # SQLite caching layer
├── server/mcp.ts        # JSON-RPC MCP server (stdio)
├── cli.ts               # CLI commands
└── index.ts             # Entry point
```

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Google Maps API key to `.env`:
   ```
   GOOGLE_MAPS_API_KEY=your_actual_api_key
   ```

3. Enable these APIs in Google Cloud Console:
   - Places API
   - Street View Static API

## Usage

### CLI Commands

```bash
# Collect POIs in a bounding box
npm run cli -- collect --bbox "40.8,-74.0,40.7,-73.9" --types "restaurant,cafe"

# Analyze building year for a location
npm run cli -- analyze --lat 40.7128 --lng -74.006

# List all collections
npm run cli -- list

# Get a specific collection
npm run cli -- get --id "col_xxx"

# Start MCP server
npm run server
```

### MCP Server

Run `npm run server` to start the MCP server (uses stdio for communication).

Available tools:
- `search_pois`: Search POIs within bounding box
- `get_poi_history`: Get building year for a POI
- `analyze_poi_year`: Full year analysis with binary search
- `list_collections`: List all collection runs
- `get_collection`: Get specific collection
- `get_streetview_image_url`: Get Street View image URL

## API Costs

| API | Cost per 1000 requests |
|-----|----------------------|
| Places API (Text Search) | ~$32 |
| Street View Metadata | **FREE** |
| Street View Static | ~$7 |

## Year Detection Algorithm

The system uses binary search to find the earliest year with Street View imagery:
1. Check current year (2026)
2. If exists, binary search backward to find first year
3. If not exists, search forward
4. First year with imagery = approximate built year

## Configuration

Edit `.env`:
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key
- `RATE_LIMIT_MS`: Delay between API calls (default: 100ms)
- `CACHE_DB_PATH`: SQLite cache file path
- `OUTPUT_DIR`: Output directory for collections
- `SERVER_PORT`: MCP server port (default: 3000)

## Development

```bash
# Install dependencies
npm install

# Run TypeScript directly (no build needed)
npx tsx src/index.ts --help

# Build for production
npm run build

# Start MCP server
npm run server
```
