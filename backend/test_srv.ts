import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const srvUri = "mongodb+srv://ismailibrahimabdirahim_db_user:56FrrLMRn6SWNFEV@cluster0.heypgc2.mongodb.net/somali_bd?retryWrites=true&w=majority&appName=Cluster0";

console.log('Testing SRV Connection...');
console.log('URI:', srvUri);

mongoose.connect(srvUri, {
  serverSelectionTimeoutMS: 10000,
})
  .then(() => {
    console.log('✅ SUCCESS: Connected with SRV!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ ERROR with SRV:', err.message);
    process.exit(1);
  });
