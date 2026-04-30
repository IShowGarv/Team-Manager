import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { createId, hydrateProject, readDb, stripSecret, writeDb } from "../store.js";
import { memberSchema, projectSchema, validate } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const db = await readDb();
  const visible = req.user.role === "ADMIN"
    ? db.projects
    : db.projects.filter((project) => db.memberships.some((member) => member.projectId === project.id && member.userId === req.user.id));
  res.json({ projects: visible.map((project) => hydrateProject(db, project)) });
});

router.post("/", requireAdmin, validate(projectSchema), async (req, res) => {
  const now = new Date().toISOString();
  const project = {
    id: createId("prj"),
    name: req.body.name,
    description: req.body.description,
    category: req.body.category,
    status: "ACTIVE",
    ownerId: req.user.id,
    createdAt: now,
    updatedAt: now
  };

  await writeDb((draft) => {
    draft.projects.push(project);
    draft.memberships.push({ id: createId("mem"), projectId: project.id, userId: req.user.id, createdAt: now });
    draft.activities.push({ id: createId("act"), actorId: req.user.id, action: "created project", detail: project.name, createdAt: now });
    return draft;
  });

  const db = await readDb();
  res.status(201).json({ project: hydrateProject(db, project) });
});

router.post("/:projectId/members", requireAdmin, validate(memberSchema), async (req, res) => {
  const db = await readDb();
  const project = db.projects.find((item) => item.id === req.params.projectId);
  if (!project) return res.status(404).json({ message: "Project not found" });

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
    if (!draft.users.some((item) => item.id === user.id)) draft.users.push(user);
    if (!draft.memberships.some((item) => item.projectId === project.id && item.userId === user.id)) {
      draft.memberships.push({ id: createId("mem"), projectId: project.id, userId: user.id, createdAt: now });
    }
    draft.activities.push({ id: createId("act"), actorId: req.user.id, action: "invited", detail: `${user.email} to ${project.name}`, createdAt: now });
    return draft;
  });

  res.status(201).json({
    member: { projectId: project.id, userId: user.id, user: stripSecret(user) }
  });
});

export default router;
