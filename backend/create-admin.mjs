import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function createAdmin() {
  const ADMIN_EMAIL = "Admin@bd.org";
  const ADMIN_PASSWORD = "Admin123!";
  const ADMIN_NAME = "Admin User";

  try {
    const MONGODB_URI = process.env.MONGODB_URI?.trim() || "mongodb://localhost:27017/somalibd";
    
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Define User model inline
    const UserSchema = new mongoose.Schema({
      clerkUserId: { type: String, required: false },
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: false },
      location: { type: String, default: "" },
      bio: { type: String, default: "" },
      bloodType: { type: String, default: "" },
      donations: { type: Number, default: 0 },
      profileImage: { type: String, default: "" },
      isAvailable: { type: Boolean, default: true },
      isAdmin: { type: Boolean, default: false },
      emailVerified: { type: Boolean, default: false },
      verificationCode: { type: String, default: "" },
      verificationCodeExpires: { type: Date, default: null },
      isBlocked: { type: Boolean, default: false },
      isVerified: { type: Boolean, default: false }
    }, { timestamps: true });

    const User = mongoose.model('User', UserSchema);

    // Check if admin already exists
    const escapedEmail = ADMIN_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let admin = await User.findOne({ email: { $regex: new RegExp("^" + escapedEmail + "$", "i") } });

    if (admin) {
      // Update existing user to admin
      admin.isAdmin = true;
      admin.isVerified = true;
      admin.password = await bcrypt.hash(ADMIN_PASSWORD, 10);
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
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
}

createAdmin();
