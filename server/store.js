import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

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

export function stripSecret(user) {
  if (!user) return null;
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
    .map((member) => {
      const user = db.users.find((item) => item.id === member.userId);
      return { ...member, user: stripSecret(user) };
    })
    .filter((member) => member.user);
  const tasks = db.tasks.filter((task) => task.projectId === project.id);
  return { ...project, owner: owner ? stripSecret(owner) : null, members, tasks };
}

export function projectIdsForUser(db, userId) {
  return db.memberships.filter((member) => member.userId === userId).map((member) => member.projectId);
}
