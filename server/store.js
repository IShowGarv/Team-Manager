import pool from "./db.js";
import { randomUUID } from "node:crypto";

export function createId(prefix) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

export function stripSecret(user) {
  if (!user) return null;
  const { passwordHash, password_hash, ...safe } = user;
  return { ...safe, passwordHash: password_hash || passwordHash };
}

// Map SQL snake_case to JS camelCase if needed, but the UI expects certain names.
function mapUser(u) {
  if (!u) return null;
  return {
    ...u,
    passwordHash: u.password_hash,
    createdAt: u.created_at,
    updatedAt: u.updated_at
  };
}

function mapProject(p) {
  if (!p) return null;
  return {
    ...p,
    ownerId: p.owner_id,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
}

function mapTask(t) {
  if (!t) return null;
  return {
    ...t,
    projectId: t.project_id,
    creatorId: t.creator_id,
    assigneeId: t.assignee_id,
    dueDate: t.due_date,
    createdAt: t.created_at,
    updatedAt: t.updated_at
  };
}

// State fetcher
export async function getDbState() {
  const users = await db.users.getAll();
  const projects = await db.projects.getAll();
  const memberships = await db.memberships.getAll();
  const tasks = await db.tasks.getAll();
  const activities = await db.activities.getRecent();

  return {
    users,
    projects,
    memberships,
    tasks,
    activities
  };
}

export async function readDb() {
  const users = await pool.query("SELECT * FROM users");
  const projects = await pool.query("SELECT * FROM projects");
  const memberships = await pool.query("SELECT * FROM memberships");
  const tasks = await pool.query("SELECT * FROM tasks");
  const activities = await pool.query("SELECT * FROM activities");

  return {
    users: users.rows.map(mapUser),
    projects: projects.rows.map(mapProject),
    memberships: memberships.rows.map(m => ({ ...m, projectId: m.project_id, userId: m.user_id })),
    tasks: tasks.rows.map(mapTask),
    activities: activities.rows.map(a => ({ ...a, actorId: a.actor_id, createdAt: a.created_at }))
  };
}

export async function writeDb(mutator) {
  const current = await readDb();
  const next = (await mutator(current)) || current;
  return next;
}

// SQL-first operations to replace writeDb in routes
export const db = {
  users: {
    async findByEmail(email) {
      const res = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      return mapUser(res.rows[0]);
    },
    async findById(id) {
      const res = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
      return mapUser(res.rows[0]);
    },
    async create(user) {
      const { id, name, email, passwordHash, role, status } = user;
      await pool.query(
        "INSERT INTO users (id, name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5, $6)",
        [id, name, email, passwordHash, role, status]
      );
      return user;
    },
    async updateStatus(id, status) {
      await pool.query("UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2", [status, id]);
    },
    async updateRole(id, role) {
      await pool.query("UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2", [role, id]);
    },
    async getAll() {
      const res = await pool.query("SELECT * FROM users ORDER BY name ASC");
      return res.rows.map(mapUser);
    }
  },
  projects: {
    async create(project) {
      const { id, name, description, category, status, ownerId } = project;
      await pool.query(
        "INSERT INTO projects (id, name, description, category, status, owner_id) VALUES ($1, $2, $3, $4, $5, $6)",
        [id, name, description, category, status, ownerId]
      );
      return project;
    },
    async getAll() {
      const res = await pool.query("SELECT * FROM projects ORDER BY created_at DESC");
      return res.rows.map(mapProject);
    },
    async findById(id) {
      const res = await pool.query("SELECT * FROM projects WHERE id = $1", [id]);
      return mapProject(res.rows[0]);
    }
  },
  tasks: {
    async create(task) {
      const { id, projectId, creatorId, assigneeId, title, description, priority, status, dueDate } = task;
      await pool.query(
        "INSERT INTO tasks (id, project_id, creator_id, assignee_id, title, description, priority, status, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [id, projectId, creatorId, assigneeId, title, description, priority, status, dueDate]
      );
      return task;
    },
    async updateStatus(id, status) {
      await pool.query("UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2", [status, id]);
    },
    async getAll() {
      const res = await pool.query("SELECT * FROM tasks ORDER BY updated_at DESC");
      return res.rows.map(mapTask);
    },
    async findById(id) {
      const res = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
      return mapTask(res.rows[0]);
    }
  },
  memberships: {
    async add(projectId, userId) {
      const id = createId("mem");
      await pool.query("INSERT INTO memberships (id, project_id, user_id) VALUES ($1, $2, $3)", [id, projectId, userId]);
    },
    async getByProject(projectId) {
      const res = await pool.query("SELECT * FROM memberships WHERE project_id = $1", [projectId]);
      return res.rows.map(m => ({ ...m, projectId: m.project_id, userId: m.user_id }));
    },
    async getByUser(userId) {
      const res = await pool.query("SELECT * FROM memberships WHERE user_id = $1", [userId]);
      return res.rows.map(m => ({ ...m, projectId: m.project_id, userId: m.user_id }));
    },
    async getAll() {
      const res = await pool.query("SELECT * FROM memberships");
      return res.rows.map(m => ({ ...m, projectId: m.project_id, userId: m.user_id }));
    }
  },
  activities: {
    async log(actorId, action, detail) {
      const id = createId("act");
      await pool.query("INSERT INTO activities (id, actor_id, action, detail) VALUES ($1, $2, $3, $4)", [id, actorId, action, detail]);
    },
    async getRecent(limit = 20) {
      const res = await pool.query(
        "SELECT a.*, u.name as actor_name FROM activities a LEFT JOIN users u ON a.actor_id = u.id ORDER BY a.created_at DESC LIMIT $1",
        [limit]
      );
      return res.rows.map(a => ({
        ...a,
        actorId: a.actor_id,
        createdAt: a.created_at,
        actor: { name: a.actor_name }
      }));
    }
  }
};

export function hydrateTask(dbState, task) {
  const project = dbState.projects.find((item) => item.id === task.projectId);
  const assignee = dbState.users.find((item) => item.id === task.assigneeId);
  const creator = dbState.users.find((item) => item.id === task.creatorId);
  return {
    ...task,
    project: project ? { id: project.id, name: project.name, category: project.category } : null,
    assignee: assignee ? stripSecret(assignee) : null,
    creator: creator ? stripSecret(creator) : null
  };
}

export function hydrateProject(dbState, project) {
  const owner = dbState.users.find((user) => user.id === project.ownerId);
  const members = dbState.memberships
    .filter((member) => member.projectId === project.id)
    .map((member) => {
      const user = dbState.users.find((item) => item.id === member.userId);
      return { ...member, user: stripSecret(user) };
    })
    .filter((member) => member.user);
  const tasks = dbState.tasks.filter((task) => task.projectId === project.id);
  return { ...project, owner: owner ? stripSecret(owner) : null, members, tasks };
}

export function projectIdsForUser(dbState, userId) {
  return dbState.memberships.filter((member) => member.userId === userId).map((member) => member.projectId);
}
