import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/User";
import path from "path";

// Load .env from root directory
dotenv.config({ path: path.join(process.cwd(), '../.env') });

async function resetAdminStatus() {
  const ADMIN_EMAIL = "Admin@bd.org"; // Only this email should be admin

  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI?.trim() || "mongodb://localhost:27017/somalibd";
    
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Reset all users to isAdmin: false
    const result = await User.updateMany(
      { email: { $ne: ADMIN_EMAIL } },
      { isAdmin: false }
    );
    console.log(`✅ Reset ${result.modifiedCount} users to non-admin`);

    // Ensure the admin email has admin rights
    const escapedEmail = ADMIN_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const admin = await User.findOne({ email: { $regex: new RegExp("^" + escapedEmail + "$", "i") } });
    
    if (admin) {
      admin.isAdmin = true;
      admin.isVerified = true;
      await admin.save();
      console.log(`✅ Confirmed admin status for ${ADMIN_EMAIL}`);
    } else {
      console.log(`⚠️  Admin user ${ADMIN_EMAIL} not found. Please run setup-admin.ts first.`);
    }

    // List all admin users
    const allAdmins = await User.find({ isAdmin: true }).select('email name isAdmin');
    console.log("\n📋 Current Admin Users:");
    allAdmins.forEach(a => {
      console.log(`   - ${a.email} (${a.name})`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting admin status:", error);
    process.exit(1);
  }
}

resetAdminStatus();
