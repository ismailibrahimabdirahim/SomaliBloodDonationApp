import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";

// Routes
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import requestRoutes from "./routes/requests";
import messageRoutes from "./routes/messages";
import notificationRoutes from "./routes/notifications";
import adminRoutes from "./routes/admin";
import inventoryRoutes from "./routes/inventory";

// Models

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory relative to this file
dotenv.config({ path: path.join(__dirname, '../.env') });

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "DELETE", "PUT"]
    }
  });

  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Logger Middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });

  // Attach io to req
  app.use((req: any, res, next) => {
    req.io = io;
    next();
  });

  // Database Connection
  const MONGODB_URI = process.env.MONGODB_URI?.trim();
  const connectionUri = MONGODB_URI || "mongodb://localhost:27017/somalibd";
  
  mongoose.set('bufferCommands', false);
  mongoose.connect(connectionUri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
    family: 4,
  })
    .then(() => console.log(`✅ SUCCESS: Connected to MongoDB!`))
    .catch(err => console.error("❌ MongoDB connection error:", err.message));

  // Socket.io connection logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join", (email) => {
      if (email) {
        const room = email.toLowerCase();
        socket.join(room);
        console.log(`User ${room} joined room`);
      }
    });

    socket.on("callRequest", (data) => {
      const toRoom = data.to?.toLowerCase();
      io.to(toRoom).emit("callRequest", data);
    });

    socket.on("callAccepted", (data) => {
      io.to(data.to?.toLowerCase()).emit("callAccepted", data);
    });

    socket.on("callEnded", (data) => {
      io.to(data.to?.toLowerCase()).emit("callEnded", data);
    });

    socket.on("voiceStream", (data) => {
      if (data.to) {
        io.to(data.to.toLowerCase()).emit("voiceStream", data);
      }
    });

    socket.on("getConversations", async (email) => {
      try {
        if (!email) return;
        const MessageModel = mongoose.model("Message");
        const UserModel = mongoose.model("User");
        
        const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const messages = await MessageModel.find({
          $or: [
            { sender: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
            { recipient: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }
          ]
        }).sort({ time: -1 }).lean();

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

        const emailsToFetch = Array.from(otherUsersEmails);
        let users: any[] = [];
        if (emailsToFetch.length > 0) {
          users = await UserModel.find({ 
            $or: emailsToFetch.map(e => {
              const escaped = e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              return { email: { $regex: new RegExp(`^${escaped}$`, "i") } };
            })
          });
        }
        
        const userMap = new Map();
        users.forEach(u => {
          if (u && u.email) userMap.set(u.email.toLowerCase(), u);
        });

        const result = [];
        for (const [otherEmail, lastMsg] of conversationsMap.entries()) {
          const user = userMap.get(otherEmail.toLowerCase());
          result.push({
            id: lastMsg._id,
            recipientName: user?.name || "Sombdonate User",
            recipientEmail: otherEmail,
            lastMessage: lastMsg.text,
            time: lastMsg.time,
            unreadCount: unreadCounts.get(otherEmail) || 0,
            avatar: user?.profileImage ? user.profileImage : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=random&color=fff`,
          });
        }
        // CRITICAL FIX: Emit with 'conversations' to match the frontend
        socket.emit("conversations", result);
      } catch (e) {
        console.error("Socket conversations error:", e);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/requests", requestRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/inventory", inventoryRoutes);

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
