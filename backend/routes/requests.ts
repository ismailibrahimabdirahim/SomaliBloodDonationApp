import express from "express";
import { Request } from "../models/Request";
import { authMiddleware } from "../middleware/auth";
import { Notification as NotificationModel } from "../models/Notification";
import { User } from "../models/User";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ message: "Server error: " + (err.message || "Unknown error") });
  }
});

router.post("/", authMiddleware, async (req: any, res) => {
  const { name, type, location, urgency, phone, description } = req.body;
  try {
    const newRequest = new Request({ name, type, location, urgency, phone, description, creatorEmail: req.user.email });
    await newRequest.save();
    
    // Emit real-time event
    req.io.emit("newRequest", newRequest);
    
    res.json(newRequest);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", authMiddleware, async (req: any, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    // Allow deletion if: creatorEmail matches, OR request is legacy (no creatorEmail set)
    if (request.creatorEmail && request.creatorEmail !== req.user.email) {
      return res.status(401).json({ message: "You can only delete your own requests" });
    }
    
    await Request.findByIdAndDelete(req.params.id);
    
    // Emit real-time event
    req.io.emit("deleteRequest", req.params.id);
    
    res.json({ message: "Request deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", authMiddleware, async (req: any, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    // Allow update if owner, or legacy (no creatorEmail)
    if (request.creatorEmail && request.creatorEmail !== req.user.email) {
      return res.status(401).json({ message: "You can only edit your own requests" });
    }

    const { name, type, location, urgency, phone, description } = req.body;
    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      { name, type, location, urgency, phone, description },
      { new: true }
    );

    req.io.emit("updateRequest", updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/donate", authMiddleware, async (req: any, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    // Check if user already donated
    const userEmail = req.user.email;
    if (request.donors && (request.donors as string[]).includes(userEmail)) {
      return res.status(400).json({ message: "You have already donated to this request" });
    }

    // Add user to donors list
    await Request.findByIdAndUpdate(req.params.id, { $addToSet: { donors: userEmail } });

    // Increment user donations
    const donor = await User.findOneAndUpdate(
      { email: userEmail },
      { $inc: { donations: 1 } },
      { new: true }
    );

    // Create Notification for the requester (in a separate try-catch to avoid crashing)
    try {
      if (request.creatorEmail) {
        const requester = await User.findOne({ email: request.creatorEmail });
        if (requester && requester._id) {
          const notification = new NotificationModel({
            userId: requester._id,
            title: "New Blood Donor!",
            message: `${donor?.name || req.user.name || "Someone"} has agreed to donate blood for your request at ${request.location}. Check your messages!`,
            type: "request",
            metadata: {
              donorEmail: req.user.email,
              donorName: donor?.name || req.user.name || "Donor"
            }
          });
          await notification.save();
          
          // Emit real-time notification to the requester's room (lowercased)
          req.io.to(request.creatorEmail.toLowerCase()).emit("newNotification", notification);
        }
      }
    } catch (notifErr) {
      console.error('[DonateNotif] Error:', notifErr);
    }

    // BROADCAST the updated request to everyone so the button turns GREEN instantly
    const updatedRequest = await Request.findById(req.params.id).lean();
    req.io.emit("updateRequest", updatedRequest);

    res.json({ message: "Donation recorded" });
  } catch (err: any) {
    console.error('[Donate] Main Error:', err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
