import "dotenv/config";
import { initializeAdminFromEnv } from "./admin.js";

try {
  const admin = await initializeAdminFromEnv({ required: true });
  console.log(`Admin account ready: ${admin.email}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
