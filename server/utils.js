import jwt from "jsonwebtoken";

export function signToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status
  };
}

export function overdue(task) {
  return Boolean(task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date());
}
