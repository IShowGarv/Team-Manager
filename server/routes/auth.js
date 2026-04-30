import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth.js";
import { createId, db, stripSecret } from "../store.js";
import { loginSchema, signupSchema, validate } from "../validation.js";
import { signToken } from "../utils.js";

const router = Router();

router.post("/signup", validate(signupSchema), async (req, res) => {
  const existing = await db.users.findByEmail(req.body.email);
  if (existing) {
    return res.status(409).json({ message: "Email is already registered" });
  }

  const now = new Date().toISOString();
  const user = {
    id: createId("usr"),
    name: req.body.name,
    email: req.body.email,
    passwordHash: await bcrypt.hash(req.body.password, 12),
    role: "MEMBER",
    status: "ONLINE"
  };

  await db.users.create(user);
  await db.activities.log(user.id, "joined", "TaskFlow workspace");

  res.status(201).json({ user: stripSecret(user), token: signToken(user) });
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const user = await db.users.findByEmail(req.body.email);
  if (!user || !user.passwordHash || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  await db.users.updateStatus(user.id, "ONLINE");
  const updatedUser = { ...user, status: "ONLINE" };

  res.json({ user: stripSecret(updatedUser), token: signToken(updatedUser) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
