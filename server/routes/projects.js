import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { db, stripSecret, createId, hydrateProject, getDbState } from "../store.js";
import { memberSchema, projectSchema, validate } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const all = await getDbState();
  const visible = req.user.role === "ADMIN"
    ? all.projects
    : all.projects.filter((project) => all.memberships.some((member) => member.projectId === project.id && member.userId === req.user.id));
  res.json({ projects: visible.map((project) => hydrateProject(all, project)) });
});

router.post("/", requireAdmin, validate(projectSchema), async (req, res) => {
  const project = {
    id: createId("prj"),
    name: req.body.name,
    description: req.body.description,
    category: req.body.category,
    status: "ACTIVE",
    ownerId: req.user.id
  };

  await db.projects.create(project);
  await db.memberships.add(project.id, req.user.id);
  await db.activities.log(req.user.id, "created project", project.name);

  const all = await getDbState();
  res.status(201).json({ project: hydrateProject(all, project) });
});

router.post("/:projectId/members", requireAdmin, validate(memberSchema), async (req, res) => {
  const project = await db.projects.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: "Project not found" });

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
  }

  await db.memberships.add(project.id, user.id);
  await db.activities.log(req.user.id, "invited", `${user.email} to ${project.name}`);

  res.status(201).json({
    member: { projectId: project.id, userId: user.id, user: stripSecret(user) }
  });
});

export default router;
