import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { createId, readDb, stripSecret, writeDb } from "../store.js";
import { memberSchema, roleSchema, validate } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const db = await readDb();
  const users = db.users
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(stripSecret);
  res.json({ users });
});

router.post("/invite", requireAdmin, validate(memberSchema), async (req, res) => {
  const db = await readDb();
  const now = new Date().toISOString();
  let user = db.users.find((item) => item.email === req.body.email);
  if (!user) {
    user = {
      id: createId("usr"),
      name: req.body.name || req.body.email.split("@")[0],
      email: req.body.email,
      passwordHash: "",
      role: req.body.role,
      status: "INVITED",
      createdAt: now
    };
  }

  await writeDb((draft) => {
    const existing = draft.users.find((item) => item.email === user.email);
    if (existing) existing.role = req.body.role;
    else draft.users.push(user);
    draft.activities.push({ id: createId("act"), actorId: req.user.id, action: "invited member", detail: user.email, createdAt: now });
    return draft;
  });

  res.status(201).json({ user: stripSecret({ ...user, role: req.body.role }) });
});

router.patch("/:userId/role", requireAdmin, validate(roleSchema), async (req, res) => {
  const db = await readDb();
  if (!db.users.some((user) => user.id === req.params.userId)) return res.status(404).json({ message: "User not found" });

  await writeDb((draft) => {
    const user = draft.users.find((item) => item.id === req.params.userId);
    user.role = req.body.role;
    return draft;
  });

  const next = await readDb();
  res.json({ user: stripSecret(next.users.find((user) => user.id === req.params.userId)) });
});

export default router;
