import express from "express";
import { Inventory } from "../models/Inventory";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// Fetch available approved inventory
router.get("/available", async (req, res) => {
  try {
    const inventory = await Inventory.find({ status: 'approved' }).sort({ createdAt: -1 }).lean();
    res.json(inventory);
  } catch (err: any) {
    res.status(500).json({ message: "Server error" });
  }
});

// Submit a voluntary donation
router.post("/donate", authMiddleware, async (req: any, res) => {
  const { bloodType, location } = req.body;
  try {
    const newDonation = new Inventory({
      donorEmail: req.user.email,
      bloodType,
      location,
      status: 'pending'
    });
    
    await newDonation.save();
    res.json(newDonation);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
