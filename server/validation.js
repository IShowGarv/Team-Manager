import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  password: z.string().min(1, "Password is required")
});

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name is required"),
  description: z.string().trim().min(5, "Description is required"),
  category: z.string().trim().min(2).default("Development")
});

export const memberSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER")
});

export const roleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"])
});

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Task title is required"),
  description: z.string().trim().min(3, "Description is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().min(1, "Project is required"),
  assigneeId: z.string().optional().nullable()
});

export const statusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"])
});

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues[0]?.message || "Invalid request",
        errors: result.error.flatten().fieldErrors
      });
    }

    req.body = result.data;
    next();
  };
}
