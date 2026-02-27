import { collectPOIs, analyzeLocation, listCollections, getCollection } from './cli.js';
import { startMCPServer } from './server/mcp.js';

function showHelp() {
  console.log('Google Street View POI Collector');
  console.log('\nUsage:');
  console.log('  npm run cli -- collect --bbox "40.8,-74.0,40.7,-73.9" --types "restaurant,cafe"');
  console.log('  npm run cli -- analyze --lat 40.7128 --lng -74.006');
  console.log('  npm run cli -- list --limit 10');
  console.log('  npm run cli -- get --id "col_xxx"');
  console.log('  npm run server');
  console.log('\nCommands:');
  console.log('  collect: Collect POIs in a bounding box');
  console.log('  analyze: Analyze building year for a location');
  console.log('  list: List all collections');
  console.log('  get: Get a specific collection');
  console.log('  server: Start the MCP server (stdio)');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  const command = args[0];

  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf('--' + name);
    if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
    return undefined;
  };

  const getFlag = (name: string): boolean => {
    return args.includes('--' + name);
  };

  switch (command) {
    case 'collect': {
      const bbox = getArg('bbox');
      if (!bbox) {
        console.error('Error: --bbox is required');
        process.exit(1);
      }

      const typesStr = getArg('types') || 'restaurant';
      const types = typesStr.split(',').map(t => t.trim());
      const keyword = getArg('keyword');
      const output = getArg('output');
      const noAnalyze = getFlag('no-analyze');

      await collectPOIs(bbox, types, keyword, output, !noAnalyze);
      break;
    }

    case 'analyze': {
      const lat = getArg('lat');
      const lng = getArg('lng');
      if (!lat || !lng) {
        console.error('Error: --lat and --lng are required');
        process.exit(1);
      }

      await analyzeLocation(
        parseFloat(lat),
        parseFloat(lng),
        getArg('min-year') ? parseInt(getArg('min-year')!) : undefined,
        getArg('max-year') ? parseInt(getArg('max-year')!) : undefined
      );
      break;
    }

    case 'list': {
      const limit = getArg('limit') || '10';
      await listCollections(parseInt(limit));
      break;
    }

    case 'get': {
      const id = getArg('id');
      if (!id) {
        console.error('Error: --id is required');
        process.exit(1);
      }
      await getCollection(id);
      break;
    }

    case 'server': {
      await startMCPServer();
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(console.error);
