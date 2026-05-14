import { MongoClient, Db } from 'mongodb';

const uri = process.env.EXPO_PUBLIC_MONGODB_URI || 'mongodb://localhost:27017';
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function connectToDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('nova');
}

export async function getDb(): Promise<Db> {
  return connectToDatabase();
}