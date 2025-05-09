import "dotenv/config";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  clerkClient,
  clerkMiddleware,
  getAuth,
  requireAuth,
} from "@clerk/express";
import { db } from "./db/index.js";
import { accounts } from "./db/schema.js";

const app = express();
const PORT = 5001;

app.use(express.json());
app.use(clerkMiddleware());

// Test endpoint to check database connectivity
app.get("/test-db", async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(accounts).limit(1);
    res.json({
      message: "Database connection successful",
      data: result,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      error: "Database connection failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/dummy-account", async (req: Request, res: Response) => {
  const result = await db.insert(accounts).values({
    userId: "user_2mJ123456789012345678901234567890",
    currency: "USD",
    balance: 1000,
  });
  res.json({
    message: "Dummy account fetched successfully",
    data: result,
  });
});

app.get(
  "/protected",
  (req: Request, res: Response, next: NextFunction) => {
    console.log("transaction service protected route");
    next();
  },
  requireAuth({ signInUrl: "/auth/signin" }),
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await clerkClient.users.getUser(userId);
    res.json({ message: "transaction service protected route", user });
  }
);

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
