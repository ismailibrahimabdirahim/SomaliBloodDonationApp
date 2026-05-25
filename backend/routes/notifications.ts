import express from "express";
import { Notification } from "../models/Notification";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// Get all notifications for the current user
router.get("/", authMiddleware, async (req: any, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get unread count for dashboard
router.get("/unread-count", authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.json({ count: 0 });
    }
    
    // Use a try-catch specifically for the count to return 0 if it fails
    try {
      const count = await Notification.countDocuments({ 
        userId: req.user.id, 
        read: false 
      });
      return res.json({ count });
    } catch (countErr) {
      console.error('[NotifCount] Count Error:', countErr);
      return res.json({ count: 0 });
    }
  } catch (err: any) {
    console.error('[NotifCount] Global Error:', err.message);
    res.json({ count: 0 }); // Better to return 0 than crash the dash
  }
});

// Mark all as read
router.put("/read-all", authMiddleware, async (req: any, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Mark a single notification as read
router.put("/:id/read", authMiddleware, async (req: any, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
