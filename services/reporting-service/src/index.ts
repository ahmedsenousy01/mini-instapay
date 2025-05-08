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
const PORT = 5003;

app.use(express.json());
app.use(clerkMiddleware());

app.get(
  "/protected",
  (req: Request, res: Response, next: NextFunction) => {
    console.log("reporting service protected route");
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
    res.json({ message: "reporting service protected route", user });
  }
);

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
