# TaskFlow - Glass Flow Team Task Manager

TaskFlow is a production-ready full-stack team task manager rebuilt from the provided Glass Flow PRD and UI references. It includes authentication, project and team management, task assignment, role-based access, dashboard metrics, activity tracking, and a Railway-ready deployment setup.

## Features

- Dark Glass Flow UI with translucent panels, neon cyan/violet accents, and responsive layouts
- Signup/login with JWT authentication, bcrypt password hashing, and strong password validation
- Admin/Member RBAC
- Production-safe admin setup through environment variables
- Admin project creation and member invites
- Task creation, assignment, priority, due dates, and status tracking
- Member task status updates for assigned work
- Dashboard metrics for total tasks, completed tasks, overdue tasks, projects, and completion rate
- Activity timeline and task distribution chart
- Search/filter experiences for projects, tasks, and team members
- REST API with persisted document database relationships and Zod validation
- Helmet security headers, restricted CORS, and API rate limiting

## Tech Stack

- React + Vite
- Node.js + Express
- File-backed NoSQL document database
- JWT + bcrypt
- Railway deployment config

## Local Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Frontend dev URL: `http://localhost:5173`  
API URL: `http://localhost:8080/api`

No demo accounts are shipped. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env`; the server creates or updates that admin automatically on startup.

## Production Build

```bash
npm run build
npm start
```

Production URL after start: `http://localhost:8080`

## Railway Deployment

1. Push this repository to GitHub.
2. Create a new Railway project from the GitHub repo.
3. Add the environment variable:

```env
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=https://your-railway-app-url.up.railway.app
DATA_FILE=/data/taskflow-db.json
ADMIN_NAME=Your Name
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
```

4. Add a Railway persistent volume mounted at `/data` so uploaded production data survives restarts and redeploys.

5. Railway will run the configured build and start commands:

```bash
npm run build
npm start
```

The app creates an empty local document database automatically on first start, then creates or updates the admin account from `ADMIN_*` environment variables. It does not ship public demo users or demo tasks.

## REST API

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

Dashboard:

- `GET /api/dashboard`

Projects:

- `GET /api/projects`
- `POST /api/projects` Admin only
- `POST /api/projects/:projectId/members` Admin only

Tasks:

- `GET /api/tasks`
- `POST /api/tasks` Admin only
- `PATCH /api/tasks/:taskId/status` Admin or assigned member

Team:

- `GET /api/users`
- `POST /api/users/invite` Admin only
- `PATCH /api/users/:userId/role` Admin only

## Submission Checklist

- Live Railway URL
- GitHub repository URL
- README
- 2-5 minute demo video showing login/signup, dashboard, project creation, member invite, task creation, task status update, and RBAC behavior
