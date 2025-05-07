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

const app = express();
const PORT = 3000;

app.use(clerkMiddleware());

app.get(
  "/protected",
  (req: Request, res: Response, next: NextFunction) => {
    console.log("protected route");
    next();
  },
  requireAuth({ signInUrl: "/signin" }),
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await clerkClient.users.getUser(userId);
    res.json({ user });
  }
);

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
