import jwt from "jsonwebtoken";
import { readDb, stripSecret } from "../store.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const db = await readDb();
    const user = db.users.find((item) => item.id === payload.userId);

    if (!user) {
      return res.status(401).json({ message: "Invalid session" });
    }

    req.user = stripSecret(user);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
}
