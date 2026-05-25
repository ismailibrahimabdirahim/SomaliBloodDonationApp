import express from "express";
import { User } from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/", authMiddleware, async (req: any, res) => {
  const start = Date.now();
  const bodySize = JSON.stringify(req.body).length;
  console.log(`[Profile] Update started. Body size: ${(bodySize / 1024).toFixed(2)} KB`);
  
  try {
    const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true }).select("-password");
    console.log(`[Profile] Update success in ${Date.now() - start}ms`);
    res.json(user);
  } catch (err: any) {
    console.error(`[Profile] Update error:`, err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
