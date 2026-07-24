import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { authMiddleware } from "../middleware/auth";
import { generateCode, storeVerificationCode, verifyCode } from "../utils/verificationCodes";
import { sendVerificationEmail } from "../utils/mailer";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", isLocal: true });
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/send-verification", async (req, res) => {
  const { email: rawEmail } = req.body;
  const email = String(rawEmail || "").trim().toLowerCase();

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address (e.g. you@gmail.com)" });
  }

  try {
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = await User.findOne({ email: { $regex: new RegExp("^" + escaped + "$", "i") } });
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const code = generateCode();
    storeVerificationCode(email, code);
    const result = await sendVerificationEmail(email, code);

    res.json({
      message: result.sent
        ? "Verification code sent to your Gmail"
        : "Verification code generated (check server logs in dev mode)",
      ...(result.devCode ? { devCode: result.devCode } : {}),
    });
  } catch (err) {
    console.error("[Auth] send-verification error:", err);
    res.status(500).json({ message: "Failed to send verification email. Check Gmail settings." });
  }
});

router.post("/register", async (req, res) => {
  const { email: rawEmail, password, name, bloodType, location, isAvailable } = req.body;
  const email = String(rawEmail || "").trim().toLowerCase();

  if (!name || !email || !password || !bloodType || !location) {
    return res.status(400).json({ message: "Please fill in all required fields" });
  }

  try {
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let user = await User.findOne({ email: { $regex: new RegExp("^" + escaped + "$", "i") } });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({
      clerkUserId: null,
      name,
      email,
      password: hashedPassword,
      bloodType,
      location,
      isAvailable,
      donations: 0,
      emailVerified: true,
    });

    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email, isAdmin: user.isAdmin }, process.env.JWT_SECRET || "secret");
    res.json({
      token,
      user: {
        id: user._id,
        name,
        email,
        bloodType,
        location,
        donations: 0,
        isAvailable,
        isAdmin: user.isAdmin,
        emailVerified: true,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email: rawEmail, password, isGoogleLogin } = req.body;
  const email = rawEmail;

  try {
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await User.findOne({ email: { $regex: new RegExp("^" + escaped + "$", "i") } }).lean();

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!isGoogleLogin) {
      const isMatch = await bcrypt.compare(password, (user as any).password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
    }

    const token = jwt.sign({ id: (user as any)._id, email: (user as any).email, isAdmin: (user as any).isAdmin }, process.env.JWT_SECRET || "secret");

    res.json({
      token,
      user: {
        id: (user as any)._id,
        name: (user as any).name,
        email: (user as any).email,
        bloodType: (user as any).bloodType,
        location: (user as any).location,
        profileImage: (user as any).profileImage,
        bio: (user as any).bio,
        donations: (user as any).donations,
        isAvailable: (user as any).isAvailable,
        isAdmin: (user as any).isAdmin,
        emailVerified: (user as any).emailVerified ?? true,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/profile/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
