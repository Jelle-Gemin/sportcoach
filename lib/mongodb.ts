import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

const options = {
  maxPoolSize: 10, // Maintain up to 10 connections
  minPoolSize: 2,  // Keep at least 2 connections open
  maxIdleTimeMS: 30000, // Close idle connections after 30s
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to preserve connection across hot reloads
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function getCollection<T = any>(collectionName: string): Promise<import('mongodb').Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

export default clientPromise;
