import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(-1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Add event listeners for connection issues
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });

export type Transaction = typeof schema.transactions.$inferSelect;
