import express from "express";
import { Message } from "../models/Message";
import { User } from "../models/User";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/conversations", authMiddleware, async (req: any, res) => {
  const email = req.user.email;
  try {
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const messages = await Message.find({
      $or: [
        { sender: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
        { recipient: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }
      ]
    })
    .select("-attachment")
    .sort({ time: -1 })
    .lean();

    const conversationsMap = new Map();
    const otherUsersEmails = new Set<string>();
    const unreadCounts = new Map();

    const currentEmail = email.toLowerCase();
    for (const msg of messages) {
      const msgSender = (msg.sender || '').toLowerCase();
      const msgRecipient = (msg.recipient || '').toLowerCase();
      const otherUser = msgSender === currentEmail ? msgRecipient : msgSender;
      
      if (!otherUser) continue;

      if (!conversationsMap.has(otherUser)) {
        conversationsMap.set(otherUser, msg);
        otherUsersEmails.add(otherUser);
      }
      
      if (msgRecipient === currentEmail && msg.status !== 'read') {
        unreadCounts.set(msgSender, (unreadCounts.get(msgSender) || 0) + 1);
      }
    }

    // Fetch all users using a robust case-insensitive search for EACH email
    const emailsToFetch = Array.from(otherUsersEmails);
    
    let users: any[] = [];
    if (emailsToFetch.length > 0) {
      users = await User.find({ 
        $or: emailsToFetch.map(e => {
          const escaped = e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return { email: { $regex: new RegExp(`^${escaped}$`, "i") } };
        })
      });
    }
    
    // Create a map that uses lowercase keys for reliable lookups
    const userMap = new Map();
    users.forEach(u => {
      if (u && u.email) {
        userMap.set(u.email.toLowerCase(), u);
      }
    });

    const result = [];
    for (const [otherEmail, lastMsg] of conversationsMap.entries()) {
      try {
        if (!otherEmail || typeof otherEmail !== 'string') continue;
        
        const safeOtherEmail = otherEmail.toLowerCase();
        const user = userMap.get(safeOtherEmail);
        
        // Only show conversations with users that exist in the database
        if (!user) continue;
        
        result.push({
          id: lastMsg._id,
          recipientName: user.name,
          recipientEmail: otherEmail,
          lastMessage: lastMsg.text,
          time: lastMsg.time,
          unreadCount: unreadCounts.get(otherEmail) || 0,
          avatar: user.profileImage ? user.profileImage : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=random&color=fff`,
        });
      } catch (loopErr) {
        console.error('[Conversations] Loop Error:', loopErr);
      }
    }
    res.json(result);
  } catch (err: any) {
    console.error("[Conversations] Master Error:", err);
    res.status(200).json([]); // Never return 500, return empty array as safety
  }
});

router.get("/:recipient", authMiddleware, async (req: any, res) => {
  const { recipient } = req.params;
  const sender = req.user.email;
  try {
    const messages = await Message.find({
      $or: [
        { sender: { $regex: new RegExp(`^${sender}$`, 'i') }, recipient: { $regex: new RegExp(`^${recipient}$`, 'i') } },
        { sender: { $regex: new RegExp(`^${recipient}$`, 'i') }, recipient: { $regex: new RegExp(`^${sender}$`, 'i') } }
      ],
      deletedFor: { $ne: sender }
    }).sort({ time: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", authMiddleware, async (req: any, res) => {
  const { text, recipient, type, attachment, duration } = req.body;
  const sender = req.user.email;
  try {
    const newMessage = new Message({ text, sender, recipient, type, attachment, duration });
    await newMessage.save();
    
    // Emit real-time event only to sender and recipient rooms (lowercased for safety)
    req.io.to(recipient.toLowerCase()).to(sender.toLowerCase()).emit("newMessage", newMessage);
    
    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", authMiddleware, async (req: any, res) => {
  const { type } = req.query;
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (type === 'everyone') {
      if (message.sender !== req.user.email) return res.status(401).json({ message: "Unauthorized" });
      await Message.findByIdAndDelete(req.params.id);
      req.io.to(message.recipient.toLowerCase()).to(message.sender.toLowerCase()).emit("deleteMessage", req.params.id);
    } else {
      message.deletedFor.push(req.user.email);
      await message.save();
    }
    
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", authMiddleware, async (req: any, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender !== req.user.email) return res.status(401).json({ message: "Unauthorized" });

    const updatedMessage = await Message.findByIdAndUpdate(req.params.id, { text: req.body.text, isEdited: true }, { new: true });
    
    // Emit real-time event
    req.io.to(message.recipient.toLowerCase()).to(message.sender.toLowerCase()).emit("updateMessage", updatedMessage);
    
    res.json(updatedMessage);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/conversations/:recipient", authMiddleware, async (req: any, res) => {
  const { recipient } = req.params;
  const sender = req.user.email;
  try {
    await Message.deleteMany({
      $or: [
        { sender, recipient },
        { sender: recipient, recipient: sender }
      ]
    });
    res.json({ message: "Conversation deleted permanently" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/mark-read", authMiddleware, async (req: any, res) => {
  const { sender } = req.body;
  const recipient = req.user.email;
  try {
    await Message.updateMany(
      { sender, recipient, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );
    
    // Notify the original sender that their messages have been read
    req.io.to(sender.toLowerCase()).emit("messagesRead", { reader: recipient, sender });
    
    res.json({ message: "Messages marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
