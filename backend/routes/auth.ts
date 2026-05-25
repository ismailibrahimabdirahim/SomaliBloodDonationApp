import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", isLocal: true });
});

router.post("/register", async (req, res) => {
    const { name, email: rawEmail, password, phone, bloodType, location, isAvailable } = req.body;
    const email = rawEmail;
    try {
      // Use case-insensitive search to find existing users
      const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let user = await User.findOne({ email: { $regex: new RegExp("^" + escaped + "$", "i") } });
      if (user) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 4); // Fast salt rounds for demo
      user = new User({
        name,
        email,
        password: hashedPassword,
        phone,
        bloodType,
        location,
        isAvailable,
        donations: 0
      });

      await user.save();
      const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || "secret");
      res.json({ token, user: { id: user._id, name, email, phone, bloodType, location, donations: 0, isAvailable } });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
});

const userCache = new Map<string, any>();

router.post("/login", async (req, res) => {
  const { email: rawEmail, password, isGoogleLogin } = req.body;
  const email = rawEmail;
  
  try {
    let user = userCache.get(email.toLowerCase());
    
    if (!user) {
      const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      user = await User.findOne({ email: { $regex: new RegExp("^" + escaped + "$", "i") } }).lean();
      if (user) userCache.set(email.toLowerCase(), user);
    }
    
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!isGoogleLogin) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || "secret");

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone, 
        bloodType: user.bloodType, 
        location: user.location,
        profileImage: user.profileImage,
        bio: user.bio,
        donations: user.donations,
        isAvailable: user.isAvailable
      } 
    });
  } catch (err: any) {
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch public profile by email
router.get("/profile/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: { $regex: new RegExp("^" + escaped + "$", "i") } }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/profile", authMiddleware, async (req: any, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, req.body, { new: true }).select("-password");
    // Clear cache to reflect updates
    userCache.delete(req.user.email.toLowerCase());
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
