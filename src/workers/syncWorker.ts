import { StravaSync } from '../services/stravaSync';

async function runContinuousSync(accessToken: string, mongoUri: string, dbName: string) {
  const stravaSync = new StravaSync(mongoUri, dbName);
  await stravaSync.connect();

  try {
    console.log('Starting continuous historical sync in worker');
    const result = await stravaSync.continuousHistoricalSync(accessToken);
    console.log('Continuous sync completed:', result);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('Continuous sync failed:', error);
    process.exit(1);
  } finally {
    await stravaSync.disconnect();
  }
}

// Get arguments from command line
const [,, accessToken, mongoUri, dbName] = process.argv;

if (!accessToken || !mongoUri || !dbName) {
  console.error('Usage: tsx syncWorker.ts <accessToken> <mongoUri> <dbName>');
  process.exit(1);
}

runContinuousSync(accessToken, mongoUri, dbName);
