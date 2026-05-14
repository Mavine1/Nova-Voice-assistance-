import { Db, Collection, ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';

export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getUserCollection(): Promise<Collection<User>> {
  const db = await getDb();
  return db.collection<User>('users');
}

export async function createUser(email: string, hashedPassword: string): Promise<User> {
  const collection = await getUserCollection();
  const user: User = {
    email,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await collection.insertOne(user);
  return { ...user, _id: result.insertedId };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const collection = await getUserCollection();
  return collection.findOne({ email });
}

export async function findUserById(id: string): Promise<User | null> {
  const collection = await getUserCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}