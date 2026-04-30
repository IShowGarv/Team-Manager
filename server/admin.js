import bcrypt from "bcryptjs";
import { createId, db } from "./store.js";

export async function initializeAdminFromEnv({ required = false } = {}) {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    if (required) {
      throw new Error("ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required.");
    }
    return null;
  }

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }

  const user = await db.users.findByEmail(email);
  const passwordHash = await bcrypt.hash(password, 12);
  let adminId;

  if (user) {
    await db.users.updateRole(user.id, "ADMIN");
    await db.users.updateStatus(user.id, "ONLINE");
    adminId = user.id;
  } else {
    adminId = createId("usr");
    await db.users.create({
      id: adminId,
      name,
      email,
      passwordHash,
      role: "ADMIN",
      status: "ONLINE"
    });
    await db.activities.log(adminId, "configured", "initial administrator");
  }
  return { id: adminId, email };
}
