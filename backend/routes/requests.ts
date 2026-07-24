import express from "express";
import { Request } from "../models/Request";
import { authMiddleware } from "../middleware/auth";
import { Notification as NotificationModel } from "../models/Notification";
import { User } from "../models/User";

const router = express.Router();

const approvedFilter = {
  $or: [{ status: "approved" }, { status: { $exists: false } }],
};

router.get("/", async (req, res) => {
  try {
    const requests = await Request.find(approvedFilter).sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ message: "Server error: " + (err.message || "Unknown error") });
  }
});

router.get("/mine", authMiddleware, async (req: any, res) => {
  try {
    const requests = await Request.find({ creatorEmail: req.user.email }).sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", authMiddleware, async (req: any, res) => {
  const { name, type, location, urgency, contactEmail, description, proofImage, patientName, hospitalName } = req.body;
  try {
    console.log("[Requests] Creating request with data:", { name, type, location, urgency, creatorEmail: req.user.email, contactEmail });
    
    const newRequest = new Request({
      name,
      type,
      location,
      urgency,
      contactEmail,
      description,
      proofImage,
      patientName,
      hospitalName,
      creatorEmail: req.user.email,
      status: "pending",
    });
    await newRequest.save();

    req.io.emit("pendingRequest", newRequest);

    res.json(newRequest);
  } catch (err: any) {
    console.error("[Requests] Error creating request:", err.message);
    res.status(500).json({ message: "Server error: " + (err.message || "Unknown error") });
  }
});

router.delete("/:id", authMiddleware, async (req: any, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.creatorEmail && request.creatorEmail !== req.user.email) {
      return res.status(401).json({ message: "You can only delete your own requests" });
    }

    await Request.findByIdAndDelete(req.params.id);
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

    if (request.creatorEmail && request.creatorEmail !== req.user.email) {
      return res.status(401).json({ message: "You can only edit your own requests" });
    }

    const { name, type, location, urgency, phone, description, proofImage } = req.body;
    const updateData: Record<string, unknown> = { name, type, location, urgency, phone, description, proofImage };

    if (request.status === "declined") {
      updateData.status = "pending";
    }

    const updated = await Request.findByIdAndUpdate(req.params.id, updateData, { new: true });

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

    if (request.status && request.status !== "approved") {
      return res.status(400).json({ message: "This request is not yet approved by admin" });
    }

    const userEmail = req.user.email;
    if (request.donors && (request.donors as string[]).includes(userEmail)) {
      return res.status(400).json({ message: "You have already donated to this request" });
    }

    await Request.findByIdAndUpdate(req.params.id, { $addToSet: { donors: userEmail } });

    const donor = await User.findOneAndUpdate(
      { email: userEmail },
      { $inc: { donations: 1 } },
      { new: true }
    );

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
              donorName: donor?.name || req.user.name || "Donor",
            },
          });
          await notification.save();
          req.io.to(request.creatorEmail.toLowerCase()).emit("newNotification", notification);
        }
      }
    } catch (notifErr) {
      console.error("[DonateNotif] Error:", notifErr);
    }

    const updatedRequest = await Request.findById(req.params.id).lean();
    req.io.emit("updateRequest", updatedRequest);

    res.json({ message: "Donation recorded" });
  } catch (err: any) {
    console.error("[Donate] Main Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
