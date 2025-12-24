import { StravaSync } from '../services/stravaSync';
import { fetchAthlete } from '../services/stravaApi';

async function runContinuousSync(accessToken: string, mongoUri: string, dbName: string) {
  const stravaSync = new StravaSync(mongoUri, dbName);
  await stravaSync.connect();

  try {
    const athlete = await fetchAthlete(accessToken);
    const athleteId = athlete.id;

    const result = await stravaSync.continuousHistoricalSync(accessToken, athleteId);
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
