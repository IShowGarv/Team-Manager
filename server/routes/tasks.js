import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { createId, hydrateTask, projectIdsForUser, readDb, writeDb } from "../store.js";
import { statusSchema, taskSchema, validate } from "../validation.js";

const router = Router();
router.use(requireAuth);

function canAccess(db, user, projectId) {
  return user.role === "ADMIN" || db.memberships.some((member) => member.projectId === projectId && member.userId === user.id);
}

router.get("/", async (req, res) => {
  const db = await readDb();
  const visibleProjectIds = req.user.role === "ADMIN" ? db.projects.map((project) => project.id) : projectIdsForUser(db, req.user.id);
  const tasks = db.tasks
    .filter((task) => req.user.role === "ADMIN" || visibleProjectIds.includes(task.projectId) || task.assigneeId === req.user.id)
    .sort((a, b) => a.status.localeCompare(b.status) || new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((task) => hydrateTask(db, task));
  res.json({ tasks });
});

router.post("/", requireAdmin, validate(taskSchema), async (req, res) => {
  const db = await readDb();
  const project = db.projects.find((item) => item.id === req.body.projectId);
  if (!project) return res.status(404).json({ message: "Project not found" });
  if (req.body.assigneeId && !db.memberships.some((item) => item.projectId === project.id && item.userId === req.body.assigneeId)) {
    return res.status(400).json({ message: "Assignee must be a project member" });
  }

  const now = new Date().toISOString();
  const task = {
    id: createId("tsk"),
    title: req.body.title,
    description: req.body.description,
    priority: req.body.priority,
    status: req.body.status,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate).toISOString() : null,
    projectId: req.body.projectId,
    assigneeId: req.body.assigneeId || null,
    creatorId: req.user.id,
    createdAt: now,
    updatedAt: now
  };

  await writeDb((draft) => {
    draft.tasks.push(task);
    const draftProject = draft.projects.find((item) => item.id === project.id);
    draftProject.updatedAt = now;
    draft.activities.push({ id: createId("act"), actorId: req.user.id, action: "created task", detail: task.title, createdAt: now });
    return draft;
  });

  const next = await readDb();
  res.status(201).json({ task: hydrateTask(next, task) });
});

router.patch("/:taskId/status", validate(statusSchema), async (req, res) => {
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === req.params.taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!canAccess(db, req.user, task.projectId)) return res.status(403).json({ message: "Project access required" });
  if (req.user.role !== "ADMIN" && task.assigneeId !== req.user.id) {
    return res.status(403).json({ message: "Only the assignee can update this task" });
  }

  const now = new Date().toISOString();
  await writeDb((draft) => {
    const found = draft.tasks.find((item) => item.id === task.id);
    found.status = req.body.status;
    found.updatedAt = now;
    draft.activities.push({ id: createId("act"), actorId: req.user.id, action: "updated status", detail: `${found.title} to ${found.status}`, createdAt: now });
    return draft;
  });

  const next = await readDb();
  res.json({ task: hydrateTask(next, next.tasks.find((item) => item.id === task.id)) });
});

export default router;
