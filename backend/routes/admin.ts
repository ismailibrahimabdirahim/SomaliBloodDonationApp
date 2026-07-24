import express from "express";
import { User } from "../models/User";
import { Request } from "../models/Request";
import { Inventory } from "../models/Inventory";
import { ActivityLog } from "../models/ActivityLog";
import { Notification } from "../models/Notification";
import { adminMiddleware } from "../middleware/auth";

const router = express.Router();

router.use(adminMiddleware);

// Helper function to log activity
const logActivity = async (action: string, description: string, adminEmail: string, targetType: string, targetId: string, targetName: string = '') => {
  try {
    const log = new ActivityLog({
      action,
      description,
      adminEmail,
      targetType,
      targetId,
      targetName
    });
    await log.save();
  } catch (err) {
    console.error('[ActivityLog] Error:', err);
  }
};

// Dashboard Stats
router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonors = await User.countDocuments({ bloodType: { $ne: '' }, isAdmin: false });
    const totalRequests = await Request.countDocuments();
    const pendingRequests = await Request.countDocuments({ status: 'pending' });
    const approvedRequests = await Request.countDocuments({ status: 'approved' });
    const rejectedRequests = await Request.countDocuments({ status: 'declined' });

    res.json({
      totalUsers,
      totalDonors,
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Users Management
router.get("/users", async (req, res) => {
  try {
    const { search } = req.query;
    let query: any = {};
    
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const users = await User.find(query).select("-password").lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/users/:id/block", async (req: any, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    
    await logActivity('block', `Blocked user ${user.name}`, req.user.email, 'user', user._id.toString(), user.name);
    res.json({ message: "User blocked", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/users/:id/unblock", async (req: any, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: false }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    
    await logActivity('unblock', `Unblocked user ${user.name}`, req.user.email, 'user', user._id.toString(), user.name);
    res.json({ message: "User unblocked", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/users/:id", async (req: any, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    await User.findByIdAndDelete(req.params.id);
    await logActivity('delete', `Deleted user ${user.name}`, req.user.email, 'user', user._id.toString(), user.name);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Donors Management
router.get("/donors", async (req, res) => {
  try {
    const { search } = req.query;
    let query: any = { bloodType: { $ne: '' }, isAdmin: false };
    
    if (search) {
      query = {
        $and: [
          { bloodType: { $ne: '' }, isAdmin: false },
          {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } }
            ]
          }
        ]
      };
    }
    
    const donors = await User.find(query).select("-password").lean();
    res.json(donors);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/donors/:id/verify", async (req: any, res) => {
  try {
    const donor = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    
    await logActivity('verify', `Verified donor ${donor.name}`, req.user.email, 'donor', donor._id.toString(), donor.name);
    res.json({ message: "Donor verified", donor });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/donors/:id/unverify", async (req: any, res) => {
  try {
    const donor = await User.findByIdAndUpdate(req.params.id, { isVerified: false }, { new: true });
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    
    await logActivity('unverify', `Unverified donor ${donor.name}`, req.user.email, 'donor', donor._id.toString(), donor.name);
    res.json({ message: "Donor unverified", donor });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Requests Management
router.get("/requests", async (req, res) => {
  try {
    const { search, status } = req.query;
    let query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query = {
        ...query,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
          { type: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const requests = await Request.find(query).sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/requests/:id/approve", async (req: any, res) => {
  try {
    const request = await Request.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!request) return res.status(404).json({ message: "Request not found" });
    
    await logActivity('approve', `Approved request #${request._id.toString().slice(-6)}`, req.user.email, 'request', request._id.toString(), request.name);
    res.json({ message: "Request approved", request });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/requests/:id/reject", async (req: any, res) => {
  try {
    const request = await Request.findByIdAndUpdate(req.params.id, { status: 'declined' }, { new: true });
    if (!request) return res.status(404).json({ message: "Request not found" });
    
    await logActivity('reject', `Rejected request #${request._id.toString().slice(-6)}`, req.user.email, 'request', request._id.toString(), request.name);
    
    // Create notification for the requester
    const requester = await User.findOne({ email: request.creatorEmail });
    console.log('Reject request - creatorEmail:', request.creatorEmail);
    console.log('Reject request - requester found:', requester ? requester._id : 'NOT FOUND');
    
    if (requester) {
      const notification = await Notification.create({
        userId: requester._id,
        title: "Request Rejected",
        message: `Your blood request for ${request.type} at ${request.location} was rejected by the admin.`,
        type: "request",
        read: false,
        metadata: {
          requestId: request._id.toString(),
          bloodType: request.type,
          location: request.location
        }
      });
      console.log('Reject request - notification created:', notification._id);
    } else {
      console.log('Reject request - could not create notification: requester not found');
    }
    
    res.json({ message: "Request rejected", request });
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/requests/:id", async (req: any, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    
    await Request.findByIdAndDelete(req.params.id);
    await logActivity('delete', `Deleted request #${request._id.toString().slice(-6)}`, req.user.email, 'request', request._id.toString(), request.name);
    res.json({ message: "Request deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Activity Log
router.get("/activity-log", async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/activity-log", async (req: any, res) => {
  try {
    await ActivityLog.deleteMany({});
    res.json({ message: "Activity log cleared" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Inventory Management (keep existing)
router.get("/inventory", async (req, res) => {
  try {
    const inventory = await Inventory.find().sort({ createdAt: -1 }).lean();
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/inventory/:id", async (req: any, res) => {
  const { status } = req.body;
  if (!['approved', 'declined'].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!item) return res.status(404).json({ message: "Inventory item not found" });
    
    // If approving, increment donor's donation count
    if (status === 'approved') {
      await User.findOneAndUpdate(
        { email: item.donorEmail },
        { $inc: { donations: 1 } }
      );
    }
    
    await logActivity(
      status === 'approved' ? 'approve' : 'reject',
      `${status === 'approved' ? 'Approved' : 'Rejected'} donation from ${item.donorEmail} (${item.bloodType})`,
      req.user.email,
      'inventory',
      item._id.toString(),
      `${item.bloodType} - ${item.location}`
    );
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/inventory/clear-processed", async (req: any, res) => {
  try {
    const result = await Inventory.deleteMany({ status: { $in: ['approved', 'declined'] } });
    await logActivity(
      'clear',
      `Cleared ${result.deletedCount} processed donations`,
      req.user.email,
      'inventory',
      'bulk',
      'processed donations'
    );
    res.json({ message: `Cleared ${result.deletedCount} processed donations`, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
