import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { hydrateTask, projectIdsForUser, readDb, stripSecret } from "../store.js";
import { overdue } from "../utils.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const db = await readDb();
  const visibleProjectIds = req.user.role === "ADMIN" ? db.projects.map((project) => project.id) : projectIdsForUser(db, req.user.id);
  const projects = db.projects.filter((project) => visibleProjectIds.includes(project.id));
  const tasks = db.tasks
    .filter((task) => req.user.role === "ADMIN" || visibleProjectIds.includes(task.projectId) || task.assigneeId === req.user.id)
    .map((task) => hydrateTask(db, task));

  const completed = tasks.filter((task) => task.status === "DONE").length;
  const distribution = projects.map((project) => {
    const projectTasks = db.tasks.filter((task) => task.projectId === project.id);
    return {
      label: project.category,
      count: projectTasks.length,
      complete: projectTasks.filter((task) => task.status === "DONE").length
    };
  });

  const activities = db.activities
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8)
    .map((activity) => {
      const actor = db.users.find((user) => user.id === activity.actorId);
      return { ...activity, actor: actor ? stripSecret(actor) : null };
    });

  res.json({
    metrics: {
      totalTasks: tasks.length,
      completed,
      overdue: tasks.filter(overdue).length,
      projects: projects.length,
      completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0
    },
    distribution,
    activities,
    recentTasks: tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6)
  });
});

export default router;
