import bcrypt from "bcryptjs";
import { createId, readDb, writeDb } from "./store.js";

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

  const db = await readDb();
  const existing = db.users.find((user) => user.email === email);
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 12);
  let adminId = existing?.id;

  await writeDb((draft) => {
    if (existing) {
      const user = draft.users.find((item) => item.id === existing.id);
      user.name = name;
      user.passwordHash = passwordHash;
      user.role = "ADMIN";
      user.status = "ONLINE";
      adminId = user.id;
    } else {
      adminId = createId("usr");
      draft.users.push({
        id: adminId,
        name,
        email,
        passwordHash,
        role: "ADMIN",
        status: "ONLINE",
        createdAt: now
      });
      draft.activities.push({
        id: createId("act"),
        actorId: adminId,
        action: "configured",
        detail: "initial administrator",
        createdAt: now
      });
    }

    return draft;
  });

  return { id: adminId, email };
}
