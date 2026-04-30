import "dotenv/config";
import bcrypt from "bcryptjs";
import { createId, readDb, writeDb } from "./store.js";

const name = process.env.ADMIN_NAME;
const email = process.env.ADMIN_EMAIL?.toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!name || !email || !password) {
  console.error("ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required.");
  process.exit(1);
}

if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const db = await readDb();
const existing = db.users.find((user) => user.email === email);
const now = new Date().toISOString();
const passwordHash = await bcrypt.hash(password, 12);

await writeDb((draft) => {
  if (existing) {
    const user = draft.users.find((item) => item.id === existing.id);
    user.name = name;
    user.passwordHash = passwordHash;
    user.role = "ADMIN";
    user.status = "ONLINE";
  } else {
    draft.users.push({
      id: createId("usr"),
      name,
      email,
      passwordHash,
      role: "ADMIN",
      status: "ONLINE",
      createdAt: now
    });
  }

  draft.activities.push({
    id: createId("act"),
    actorId: existing?.id || null,
    action: "configured",
    detail: "initial administrator",
    createdAt: now
  });

  return draft;
});

console.log(`Admin account ready: ${email}`);
