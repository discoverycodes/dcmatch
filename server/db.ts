import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, gameSessions, transactions, gameSettings, paymentMethods } from '../shared/schema';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create the connection
const client = postgres(connectionString);

// Create the database instance
export const db = drizzle(client, {
  schema: {
    users,
    gameSessions,
    transactions,
    gameSettings,
    paymentMethods,
  },
});

export type Database = typeof db;