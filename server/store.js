import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.resolve(__dirname, "..", process.env.DATA_FILE || "./data/taskflow-db.json");

let cache;
let writeQueue = Promise.resolve();

const emptyDb = {
  users: [],
  projects: [],
  memberships: [],
  tasks: [],
  activities: []
};

export function createId(prefix) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

async function ensureFile() {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(emptyDb, null, 2));
  }
}

export async function readDb() {
  if (!cache) {
    await ensureFile();
    cache = JSON.parse(await fs.readFile(dataFile, "utf8"));
  }
  return structuredClone(cache);
}

export async function writeDb(mutator) {
  writeQueue = writeQueue.then(async () => {
    const current = await readDb();
    const next = (await mutator(current)) || current;
    cache = next;
    await fs.writeFile(dataFile, JSON.stringify(next, null, 2));
    return structuredClone(next);
  });
  return writeQueue;
}

export async function seedIfEmpty() {
  const db = await readDb();
  if (db.users.length > 0) return;

  const now = new Date().toISOString();
  const admin = {
    id: "usr_admin",
    name: "Sarah Jenkins",
    email: "admin@taskflow.dev",
    passwordHash: await bcrypt.hash("Admin123!", 10),
    role: "ADMIN",
    status: "ONLINE",
    createdAt: now
  };
  const member = {
    id: "usr_member",
    name: "David Chen",
    email: "member@taskflow.dev",
    passwordHash: await bcrypt.hash("Member123!", 10),
    role: "MEMBER",
    status: "ONLINE",
    createdAt: now
  };
  const qa = {
    id: "usr_qa",
    name: "Maya Ross",
    email: "qa@taskflow.dev",
    passwordHash: await bcrypt.hash("Member123!", 10),
    role: "MEMBER",
    status: "OFFLINE",
    createdAt: now
  };
  const project = {
    id: "prj_glass_flow",
    name: "Nexus Design System",
    description: "Creating the foundational glass UI kit and product workflow.",
    category: "Design",
    status: "ACTIVE",
    ownerId: admin.id,
    createdAt: now,
    updatedAt: now
  };

  await writeDb((draft) => ({
    users: [admin, member, qa],
    projects: [project],
    memberships: [
      { id: "mem_admin", projectId: project.id, userId: admin.id, createdAt: now },
      { id: "mem_member", projectId: project.id, userId: member.id, createdAt: now },
      { id: "mem_qa", projectId: project.id, userId: qa.id, createdAt: now }
    ],
    tasks: [
      {
        id: "tsk_tokens",
        title: "Implement Glassmorphism UI tokens",
        description: "Update shared components to use translucent panels and neon accents.",
        priority: "URGENT",
        status: "TODO",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        projectId: project.id,
        assigneeId: member.id,
        creatorId: admin.id,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tsk_state",
        title: "Refactor State Management",
        description: "Unify dashboard and board state for smoother transitions.",
        priority: "HIGH",
        status: "IN_PROGRESS",
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        projectId: project.id,
        assigneeId: admin.id,
        creatorId: admin.id,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tsk_colors",
        title: "Define Color Tokens",
        description: "Lock cyan, violet, tertiary alert, and neutral surface scales.",
        priority: "MEDIUM",
        status: "DONE",
        dueDate: new Date(Date.now() - 86400000).toISOString(),
        projectId: project.id,
        assigneeId: qa.id,
        creatorId: admin.id,
        createdAt: now,
        updatedAt: now
      }
    ],
    activities: [
      { id: "act_1", actorId: admin.id, action: "completed", detail: "UI Phase 2", createdAt: now },
      { id: "act_2", actorId: member.id, action: "updated", detail: "Refactor State Management", createdAt: now },
      { id: "act_3", actorId: null, action: "flagged", detail: "Color Tokens as overdue", createdAt: now }
    ]
  }));
}

export function stripSecret(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export function hydrateTask(db, task) {
  const project = db.projects.find((item) => item.id === task.projectId);
  const assignee = db.users.find((item) => item.id === task.assigneeId);
  const creator = db.users.find((item) => item.id === task.creatorId);
  return {
    ...task,
    project: project ? { id: project.id, name: project.name, category: project.category } : null,
    assignee: assignee ? stripSecret(assignee) : null,
    creator: creator ? stripSecret(creator) : null
  };
}

export function hydrateProject(db, project) {
  const owner = db.users.find((user) => user.id === project.ownerId);
  const members = db.memberships
    .filter((member) => member.projectId === project.id)
    .map((member) => ({
      ...member,
      user: stripSecret(db.users.find((user) => user.id === member.userId))
    }))
    .filter((member) => member.user);
  const tasks = db.tasks.filter((task) => task.projectId === project.id);
  return { ...project, owner: owner ? stripSecret(owner) : null, members, tasks };
}

export function projectIdsForUser(db, userId) {
  return db.memberships.filter((member) => member.userId === userId).map((member) => member.projectId);
}
