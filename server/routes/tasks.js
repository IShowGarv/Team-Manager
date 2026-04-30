import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { createId, db, hydrateTask, projectIdsForUser, readDb, writeDb } from "../store.js";
import { statusSchema, taskSchema, validate } from "../validation.js";

const router = Router();
router.use(requireAuth);

async function canAccess(user, projectId) {
  if (user.role === "ADMIN") return true;
  const memberships = await db.memberships.getByUser(user.id);
  return memberships.some((m) => m.projectId === projectId);
}

router.get("/", async (req, res) => {
  const allData = await readDb();
  const visibleProjectIds = req.user.role === "ADMIN" ? allData.projects.map((p) => p.id) : projectIdsForUser(allData, req.user.id);
  
  const tasks = allData.tasks
    .filter((task) => req.user.role === "ADMIN" || visibleProjectIds.includes(task.projectId) || task.assigneeId === req.user.id)
    .sort((a, b) => a.status.localeCompare(b.status) || new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((task) => hydrateTask(allData, task));
    
  res.json({ tasks });
});

router.post("/", requireAdmin, validate(taskSchema), async (req, res) => {
  const project = await db.projects.findById(req.body.projectId);
  if (!project) return res.status(404).json({ message: "Project not found" });
  
  if (req.body.assigneeId) {
    const memberships = await db.memberships.getByProject(project.id);
    if (!memberships.some((m) => m.userId === req.body.assigneeId)) {
      await db.memberships.add(project.id, req.body.assigneeId);
    }
  }

  const task = {
    id: createId("tsk"),
    title: req.body.title,
    description: req.body.description,
    priority: req.body.priority,
    status: req.body.status,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate).toISOString() : null,
    projectId: req.body.projectId,
    assigneeId: req.body.assigneeId || null,
    creatorId: req.user.id
  };

  await db.tasks.create(task);
  await db.activities.log(req.user.id, "created task", task.title);

  const allData = await readDb();
  res.status(201).json({ task: hydrateTask(allData, task) });
});

router.patch("/:taskId/status", validate(statusSchema), async (req, res) => {
  const task = await db.tasks.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });
  
  if (!(await canAccess(req.user, task.projectId))) {
    return res.status(403).json({ message: "Project access required" });
  }
  
  if (req.user.role !== "ADMIN" && task.assigneeId !== req.user.id) {
    return res.status(403).json({ message: "Only the assignee can update this task" });
  }

  await db.tasks.updateStatus(task.id, req.body.status);
  await db.activities.log(req.user.id, "updated status", `${task.title} to ${req.body.status}`);

  const allData = await readDb();
  const updatedTask = allData.tasks.find(t => t.id === task.id);
  res.json({ task: hydrateTask(allData, updatedTask) });
});

export default router;
