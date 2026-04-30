import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { db, stripSecret, createId } from "../store.js";
import { memberSchema, roleSchema, validate } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const users = await db.users.getAll();
  res.json({ users: users.map(stripSecret) });
});

router.post("/invite", requireAdmin, validate(memberSchema), async (req, res) => {
  let user = await db.users.findByEmail(req.body.email);
  if (!user) {
    user = {
      id: createId("usr"),
      name: req.body.name || req.body.email.split("@")[0],
      email: req.body.email,
      passwordHash: "",
      role: req.body.role,
      status: "INVITED"
    };
    await db.users.create(user);
  } else {
    await db.users.updateRole(user.id, req.body.role);
    user.role = req.body.role;
  }

  await db.activities.log(req.user.id, "invited member", user.email);

  res.status(201).json({ user: stripSecret(user) });
});

router.patch("/:userId/role", requireAdmin, validate(roleSchema), async (req, res) => {
  const user = await db.users.findById(req.params.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  await db.users.updateRole(user.id, req.body.role);
  const updated = await db.users.findById(user.id);

  res.json({ user: stripSecret(updated) });
});

export default router;
