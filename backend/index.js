const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT"]
  }
});

const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Attach io to req so routes can emit real-time events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ─── Mongoose Models ────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  location: { type: String, default: "" },
  phone: { type: String, default: "" },
  bio: { type: String, default: "" },
  bloodType: { type: String, default: "" },
  donations: { type: Number, default: 0 },
  profileImage: { type: String, default: "" }
});
const User = mongoose.model("User", UserSchema);

const RequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  location: { type: String, required: true },
  urgency: { type: String, required: true },
  phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const BloodRequest = mongoose.model("Request", RequestSchema);

const MessageSchema = new mongoose.Schema({
  text: { type: String, default: "" },
  sender: { type: String, required: true },
  recipient: { type: String, required: true },
  type: { type: String, default: "text" }, // "text", "image", "audio"
  attachment: { type: String, default: "" }, // Base64 data
  duration: { type: Number, default: 0 }, // For audio notes
  time: { type: Date, default: Date.now },
  status: { type: String, default: "sent" },
  isEdited: { type: Boolean, default: false }
});
const Message = mongoose.model("Message", MessageSchema);

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' }, // 'info', 'request', 'message'
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model("Notification", NotificationSchema);

// ─── Auth Middleware ────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
}

// ─── Database Connection ────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI?.trim();

if (!MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI is missing from .env!");
} else {
  const lastChar = MONGODB_URI.split('@')[0].slice(-1);
  console.log(`📡 Attempting to connect to MongoDB... (Password ends with: "${lastChar}")`);
}

const connectionUri = MONGODB_URI || "mongodb://localhost:27017/somalibd";

mongoose.set('bufferCommands', false);

mongoose.connect(connectionUri, {
  serverSelectionTimeoutMS: 30000,
})
  .then(() => {
    const dbName = mongoose.connection.name;
    const host = mongoose.connection.host;
    console.log(`✅ SUCCESS: Connected to MongoDB!`);
    console.log(`📡 Host: ${host}`);
    console.log(`🗄️  Database: "${dbName}"`);
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      console.warn("⚠️  NOTICE: Connected to LOCAL MongoDB.");
      console.warn("👉 Your data is stored locally. To use MongoDB Atlas, update MONGODB_URI in .env");
    }
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
  });

// ─── Socket.io ──────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH ROUTES  (/api/auth)
// ═══════════════════════════════════════════════════════════════════════════
const authRouter = express.Router();

// Health check
authRouter.get("/health", async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    const host = mongoose.connection.host;
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    res.json({ status: isConnected ? "ok" : "error", isLocal, dbName: mongoose.connection.name });
  } catch (err) {
    res.status(500).json({ status: "error" });
  }
});

// Register
authRouter.post("/register", async (req, res) => {
  const { name, email, password, phone, bloodType, location, isAvailable } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({
      name,
      email,
      password: hashedPassword,
      phone: phone || "",
      bloodType: bloodType || "",
      location: location || "",
      isAvailable: isAvailable ?? true
    });
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || "secret");
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, bloodType: user.bloodType, location: user.location }
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Login
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || "secret");
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, bloodType: user.bloodType, location: user.location }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

app.use("/api/auth", authRouter);

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE ROUTES  (/api/profile)
// ═══════════════════════════════════════════════════════════════════════════
const profileRouter = express.Router();

profileRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

profileRouter.put("/", authMiddleware, async (req, res) => {
  try {
    const { name, phone, bloodType, location, isAvailable, profileImage, bio } = req.body;
    const updateData = { name, phone, bloodType, location, isAvailable, bio };
    
    // Only update profileImage if it's explicitly provided
    if (profileImage !== undefined) {
      updateData.profileImage = profileImage;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { $set: updateData }, 
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.use("/api/profile", profileRouter);

// ═══════════════════════════════════════════════════════════════════════════
// REQUESTS ROUTES  (/api/requests)
// ═══════════════════════════════════════════════════════════════════════════
const requestRouter = express.Router();

requestRouter.get("/", async (req, res) => {
  try {
    const requests = await BloodRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

requestRouter.post("/", authMiddleware, async (req, res) => {
  const { name, type, location, urgency, phone } = req.body;
  try {
    const newRequest = new BloodRequest({ name, type, location, urgency, phone });
    await newRequest.save();
    
    // Create notifications for ALL users (except the sender)
    // For a real app, this would be filtered by location, but for now we follow the "Bell icon add store" request
    try {
      const users = await User.find({ _id: { $ne: req.user.id } });
      const notifications = users.map(u => ({
        userId: u._id,
        title: "Urgent Blood Request",
        message: `${name} needs ${type} blood in ${location}`,
        type: 'request'
      }));
      await Notification.insertMany(notifications);
    } catch (notifyErr) {
      console.error("Failed to create notifications:", notifyErr);
    }

    req.io.emit("newRequest", newRequest);
    res.json(newRequest);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

requestRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    await BloodRequest.findByIdAndDelete(req.params.id);
    req.io.emit("deleteRequest", req.params.id);
    res.json({ message: "Request deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.use("/api/requests", requestRouter);

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES ROUTES  (/api/messages)
// ═══════════════════════════════════════════════════════════════════════════
const messageRouter = express.Router();

messageRouter.get("/:recipient", authMiddleware, async (req, res) => {
  const { recipient } = req.params;
  const sender = req.user.email;
  try {
    const messages = await Message.find({
      $or: [
        { sender, recipient },
        { sender: recipient, recipient: sender }
      ]
    }).sort({ time: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

messageRouter.post("/", authMiddleware, async (req, res) => {
  const { text, recipient, type, attachment, duration } = req.body;
  const sender = req.user.email;
  try {
    const newMessage = new Message({ 
      text: text || "", 
      sender, 
      recipient,
      type: type || "text",
      attachment: attachment || "",
      duration: duration || 0
    });
    await newMessage.save();
    req.io.emit("newMessage", newMessage);
    res.json(newMessage);
  } catch (err) {
    console.error("Message send error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

messageRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender !== req.user.email) return res.status(401).json({ message: "Unauthorized" });
    await Message.findByIdAndDelete(req.params.id);
    req.io.emit("deleteMessage", req.params.id);
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

messageRouter.put("/:id", authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender !== req.user.email) return res.status(401).json({ message: "Unauthorized" });
    const updatedMessage = await Message.findByIdAndUpdate(req.params.id, { text: req.body.text, isEdited: true }, { new: true });
    req.io.emit("updateMessage", updatedMessage);
    res.json(updatedMessage);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION ROUTES (/api/notifications)
// ═══════════════════════════════════════════════════════════════════════════
const notificationRouter = express.Router();

notificationRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

notificationRouter.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

notificationRouter.put("/read-all", authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.use("/api/notifications", notificationRouter);

app.use("/api/messages", messageRouter);

// ─── Start Server ───────────────────────────────────────────────────────────
httpServer.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
