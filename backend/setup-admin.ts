import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User } from "./models/User";
import path from "path";

// Load .env from root directory
dotenv.config({ path: path.join(process.cwd(), '../.env') });

async function setupAdmin() {
  const ADMIN_EMAIL = "Admin@bd.org";
  const ADMIN_PASSWORD = "Admin123!"; // Change this after first login
  const ADMIN_NAME = "Admin User";

  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI?.trim() || "mongodb://localhost:27017/somalibd";
    
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const escapedEmail = ADMIN_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let admin = await User.findOne({ email: { $regex: new RegExp("^" + escapedEmail + "$", "i") } });

    if (admin) {
      // Update existing user to admin
      admin.isAdmin = true;
      admin.isVerified = true;
      await admin.save();
      console.log(`✅ Updated existing user ${ADMIN_EMAIL} to admin`);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      admin = new User({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        isAdmin: true,
        isVerified: true,
        bloodType: "A+",
        location: "Mogadishu",
        donations: 0,
        emailVerified: true,
      });
      await admin.save();
      console.log(`✅ Created new admin user: ${ADMIN_EMAIL}`);
      console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
      console.log("⚠️  Please change this password after first login!");
    }

    console.log("\n✨ Admin setup complete!");
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up admin:", error);
    process.exit(1);
  }
}

setupAdmin();
