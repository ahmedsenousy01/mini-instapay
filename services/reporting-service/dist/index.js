var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import "dotenv/config";
import express from "express";
import { clerkClient, clerkMiddleware, getAuth, requireAuth, } from "@clerk/express";
const app = express();
const PORT = 3000;
app.use(clerkMiddleware());
app.get("/protected", requireAuth(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = getAuth(req);
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const user = yield clerkClient.users.getUser(userId);
    res.json({ user });
}));
// Start the server and listen on the specified port
app.listen(PORT, () => {
    console.log(`Example app listening at http://localhost:${PORT}`);
});
