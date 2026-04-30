import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth.js";
import { createId, readDb, stripSecret, writeDb } from "../store.js";
import { loginSchema, signupSchema, validate } from "../validation.js";
import { signToken } from "../utils.js";

const router = Router();

router.post("/signup", validate(signupSchema), async (req, res) => {
  const db = await readDb();
  if (db.users.some((user) => user.email === req.body.email)) {
    return res.status(409).json({ message: "Email is already registered" });
  }

  const now = new Date().toISOString();
  const user = {
    id: createId("usr"),
    name: req.body.name,
    email: req.body.email,
    passwordHash: await bcrypt.hash(req.body.password, 10),
    role: db.users.length === 0 ? "ADMIN" : "MEMBER",
    status: "ONLINE",
    createdAt: now
  };

  await writeDb((draft) => {
    draft.users.push(user);
    draft.activities.push({
      id: createId("act"),
      actorId: user.id,
      action: "joined",
      detail: "TaskFlow workspace",
      createdAt: now
    });
    return draft;
  });

  res.status(201).json({ user: stripSecret(user), token: signToken(user) });
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const db = await readDb();
  const user = db.users.find((item) => item.email === req.body.email);
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  await writeDb((draft) => {
    const found = draft.users.find((item) => item.id === user.id);
    found.status = "ONLINE";
    return draft;
  });

  res.json({ user: stripSecret({ ...user, status: "ONLINE" }), token: signToken(user) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
