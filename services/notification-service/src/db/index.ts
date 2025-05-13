import * as dotenv from "dotenv";
dotenv.config();

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// Verify database connection
pool
  .connect()
  .then(() => {
    console.log("Successfully connected to database");
  })
  .catch((error) => {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  });
