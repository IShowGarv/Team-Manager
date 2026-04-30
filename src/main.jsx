import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  Grid2X2,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  Users
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_URL || "";
const statusLabels = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done"
};
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const categories = ["Design", "Development", "Marketing", "QA", "Operations"];

function token() {
  return localStorage.getItem("taskflow_token");
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function titleCase(value = "") {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(name = "TM") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const payload = mode === "signup" ? form : { email: form.email, password: form.password };
      const data = await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify(payload) });
      localStorage.setItem("taskflow_token", data.token);
      onAuth(data.user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-top">
        <strong>AETHER</strong>
        <span>Support</span>
      </header>
      <section className="auth-card glass-panel">
        <div className="auth-switch">
          <button type="button" className={mode === "login" ? "is-active" : ""} onClick={() => setMode("login")}>
            Sign In
          </button>
          <button type="button" className={mode === "signup" ? "is-active" : ""} onClick={() => setMode("signup")}>
            Request Access
          </button>
        </div>
        <h1>{mode === "login" ? "Welcome Back" : "Join The Flow"}</h1>
        <p>Access your digital flow state.</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && (
            <label>
              Full Name
              <span className="field">
                <Users size={20} />
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </span>
            </label>
          )}
          <label>
            Email Address
            <span className="field">
              <Mail size={20} />
              <input
                type="email"
                placeholder="enter@address.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </span>
          </label>
          <label>
            Password
            <span className="field">
              <Lock size={20} />
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                minLength={mode === "signup" ? 12 : 1}
                required
              />
            </span>
          </label>
          {message && <p className="form-error">{message}</p>}
          <button className="gradient-btn" disabled={loading}>
            {loading ? "Processing" : mode === "login" ? "Sign In" : "Create Account"}
            <Sparkles size={18} />
          </button>
          <small>Use your workspace credentials. New public accounts start as Members.</small>
        </form>
      </section>
      <footer className="auth-footer">
        <span>© 2026 AETHER SYSTEMS</span>
        <span>Privacy · Terms · Security</span>
      </footer>
    </main>
  );
}

function Sidebar({ view, setView, user, onLogout }) {
  const items = [
    ["overview", "Dashboard", LayoutDashboard],
    ["projects", "Projects", FolderKanban],
    ["tasks", "Tasks", ClipboardCheck],
    ["team", "Team", Users],
    ["settings", "Settings", Settings]
  ];

  return (
    <aside className="sidebar glass-edge">
      <div className="brand">
        <div className="brand-icon">TF</div>
        <div>
          <strong>Task Manager</strong>
          <span>Enterprise Flow</span>
        </div>
      </div>
      <nav>
        {items.map(([id, label, Icon]) => (
          <button key={id} className={view === id ? "nav-active" : ""} onClick={() => setView(id)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-user">
        <div className="avatar">{initials(user.name)}</div>
        <div>
          <strong>{user.name}</strong>
          <span>{titleCase(user.role)}</span>
        </div>
      </div>
      <button className="ghost-btn logout" onClick={onLogout}>
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}

function AppHeader({ title, subtitle, user, action, actionLabel, actionIcon: ActionIcon }) {
  return (
    <header className="app-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-actions">
        {action && (
          <button className="glass-btn" onClick={action}>
            {ActionIcon && <ActionIcon size={18} />}
            {actionLabel}
          </button>
        )}
        <Bell size={22} />
        <ShieldCheck size={22} />
        <div className="avatar cyan">{initials(user.name)}</div>
      </div>
    </header>
  );
}

function Overview({ dashboard, tasks }) {
  const maxDistribution = Math.max(1, ...(dashboard?.distribution || []).map((item) => item.count));
  const cards = [
    ["Total Tasks", dashboard?.metrics.totalTasks || 0, ClipboardCheck, "+12%"],
    ["Completed", dashboard?.metrics.completed || 0, CheckCircle2, "+5%"],
    ["Overdue", dashboard?.metrics.overdue || 0, AlertTriangle, "Needs Attention"]
  ];

  return (
    <div className="view-grid">
      <section className="metric-grid">
        {cards.map(([label, value, Icon, trend]) => (
          <article className="metric-card glass-panel" key={label}>
            <div className="metric-icon">
              <Icon size={22} />
            </div>
            <span>{trend}</span>
            <strong>{value}</strong>
            <p>{label}</p>
          </article>
        ))}
      </section>
      <section className="overview-columns">
        <article className="glass-panel chart-panel">
          <div className="section-head">
            <div>
              <h2>Task Distribution</h2>
              <p>Project workload across teams</p>
            </div>
            <SlidersHorizontal size={20} />
          </div>
          <div className="bar-chart">
            {(dashboard?.distribution || []).map((item, index) => (
              <div className="bar-item" key={`${item.label}-${index}`}>
                <div className="bar-shell">
                  <span style={{ height: `${Math.max(18, (item.count / maxDistribution) * 100)}%` }} />
                </div>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </article>
        <article className="glass-panel activity-panel">
          <div className="section-head">
            <h2>Recent Activity</h2>
            <Sparkles size={20} />
          </div>
          <div className="timeline">
            {(dashboard?.activities || []).map((activity) => (
              <div className="timeline-item" key={activity.id}>
                <span className="dot" />
                <div>
                  <strong>{activity.actor?.name || "System"}</strong>
                  <p>{activity.action} <b>{activity.detail}</b></p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
      <section className="glass-panel recent-strip">
        <div className="section-head">
          <h2>Current Flow</h2>
          <span>{dashboard?.metrics.completionRate || 0}% complete</span>
        </div>
        <div className="compact-task-list">
          {tasks.slice(0, 5).map((task) => (
            <TaskMini key={task.id} task={task} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TaskMini({ task }) {
  return (
    <div className="mini-task">
      <span className={`priority-dot ${task.priority.toLowerCase()}`} />
      <strong>{task.title}</strong>
      <small>{task.project?.name}</small>
      <em>{statusLabels[task.status]}</em>
    </div>
  );
}

function Projects({ projects, admin, onCreate }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Active");
  const filtered = projects.filter((project) => {
    const matchesQuery = project.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All Active" || project.category === category;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="view-stack">
      <div className="filter-bar glass-panel">
        <label className="search-field">
          <Search size={21} />
          <input placeholder="Search projects..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="chips">
          {["All Active", ...categories].map((item) => (
            <button key={item} className={category === item ? "chip active" : "chip"} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      {admin && <ProjectComposer onCreate={onCreate} />}
      <div className="project-grid">
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

function ProjectComposer({ onCreate }) {
  const [form, setForm] = useState({ name: "", description: "", category: "Development" });

  async function submit(event) {
    event.preventDefault();
    await onCreate(form);
    setForm({ name: "", description: "", category: "Development" });
  }

  return (
    <form className="composer glass-panel" onSubmit={submit}>
      <input placeholder="New project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      <input placeholder="Project description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
      <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
        {categories.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <button className="gradient-btn">
        <Plus size={18} />
        New Project
      </button>
    </form>
  );
}

function ProjectCard({ project }) {
  const completed = project.tasks.filter((task) => task.status === "DONE").length;
  const progress = project.tasks.length ? Math.round((completed / project.tasks.length) * 100) : 0;

  return (
    <article className="project-card glass-panel">
      <div className="card-top-line" />
      <div className="project-icon">
        <Grid2X2 size={24} />
      </div>
      <span className="status-pill">{project.status === "ACTIVE" ? "In Progress" : titleCase(project.status)}</span>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      <div className="progress-row">
        <span>Progress</span>
        <b>{progress}%</b>
      </div>
      <div className="progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <footer>
        <div className="avatar-stack">
          {project.members.slice(0, 3).map((member) => (
            <span key={member.user.id}>{initials(member.user.name)}</span>
          ))}
        </div>
        <small>{project.tasks.length} tasks</small>
      </footer>
    </article>
  );
}

function TaskBoard({ tasks, projects, user, admin, onCreate, onStatus }) {
  const [query, setQuery] = useState("");
  const filtered = tasks.filter((task) => task.title.toLowerCase().includes(query.toLowerCase()));
  const grouped = {
    TODO: filtered.filter((task) => task.status === "TODO"),
    IN_PROGRESS: filtered.filter((task) => task.status === "IN_PROGRESS"),
    DONE: filtered.filter((task) => task.status === "DONE")
  };

  return (
    <div className="view-stack">
      <div className="board-toolbar">
        <label className="search-field">
          <Search size={21} />
          <input placeholder="Search tasks..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button className="glass-btn">
          <SlidersHorizontal size={18} />
          Filter
        </button>
      </div>
      {admin && projects.length > 0 && <TaskComposer projects={projects} onCreate={onCreate} />}
      <section className="kanban">
        {Object.entries(grouped).map(([status, items]) => (
          <div className="kanban-column" key={status}>
            <div className="column-head">
              <span className={`priority-dot ${status === "DONE" ? "done" : status === "IN_PROGRESS" ? "high" : "low"}`} />
              <h2>{statusLabels[status]}</h2>
              <b>{items.length}</b>
            </div>
            {items.map((task) => (
              <TaskCard key={task.id} task={task} user={user} onStatus={onStatus} />
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

function TaskComposer({ projects, onCreate }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "HIGH",
    status: "TODO",
    dueDate: "",
    projectId: projects[0]?.id || "",
    assigneeId: ""
  });
  const selected = projects.find((project) => project.id === form.projectId) || projects[0];

  useEffect(() => {
    if (!form.projectId && projects[0]) setForm((current) => ({ ...current, projectId: projects[0].id }));
  }, [projects, form.projectId]);

  async function submit(event) {
    event.preventDefault();
    await onCreate({ ...form, assigneeId: form.assigneeId || null });
    setForm((current) => ({ ...current, title: "", description: "", dueDate: "", assigneeId: "" }));
  }

  return (
    <form className="composer task-composer glass-panel" onSubmit={submit}>
      <input placeholder="Task title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
      <input placeholder="Task detail" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
      <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value, assigneeId: "" })}>
        {projects.map((project) => (
          <option value={project.id} key={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}>
        <option value="">Unassigned</option>
        {(selected?.members || []).map((member) => (
          <option value={member.user.id} key={member.user.id}>
            {member.user.name}
          </option>
        ))}
      </select>
      <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
        {priorities.map((priority) => (
          <option key={priority}>{priority}</option>
        ))}
      </select>
      <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
      <button className="gradient-btn">
        <Plus size={18} />
        New Task
      </button>
    </form>
  );
}

function TaskCard({ task, user, onStatus }) {
  const canMove = user.role === "ADMIN" || task.assignee?.id === user.id;

  return (
    <article className={`task-card glass-panel task-${task.priority.toLowerCase()}`}>
      <div className="task-meta">
        <span className={`tag ${task.priority.toLowerCase()}`}>{titleCase(task.priority)}</span>
        <span>{task.project?.category}</span>
      </div>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <div className="task-footer">
        <div className="avatar">{initials(task.assignee?.name || "UA")}</div>
        <select value={task.status} disabled={!canMove} onChange={(event) => onStatus(task.id, event.target.value)}>
          {Object.entries(statusLabels).map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

function Team({ users, admin, onInvite, onRole }) {
  const [query, setQuery] = useState("");
  const filtered = users.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="view-stack">
      <div className="team-summary">
        <article className="metric-card glass-panel">
          <Users size={22} />
          <strong>{users.length}</strong>
          <p>Total Members</p>
        </article>
        <article className="metric-card glass-panel">
          <ShieldCheck size={22} />
          <strong>{users.filter((person) => person.status === "ONLINE").length}</strong>
          <p>Active Now</p>
        </article>
        <article className="metric-card glass-panel">
          <Mail size={22} />
          <strong>{users.filter((person) => person.status === "INVITED").length}</strong>
          <p>Pending Invites</p>
        </article>
      </div>
      {admin && <InviteForm onInvite={onInvite} />}
      <section className="team-table glass-panel">
        <div className="table-tools">
          <label className="search-field">
            <Search size={19} />
            <input placeholder="Search team members..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <span>Showing {filtered.length} of {users.length}</span>
        </div>
        <div className="table-row table-head">
          <span>Member</span>
          <span>Role</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {filtered.map((person) => (
          <div className="table-row" key={person.id}>
            <div className="member-cell">
              <div className="avatar">{initials(person.name)}</div>
              <div>
                <strong>{person.name}</strong>
                <small>{person.email}</small>
              </div>
            </div>
            <span className="tag violet">{person.role}</span>
            <span className={`status ${person.status.toLowerCase()}`}>{titleCase(person.status)}</span>
            {admin ? (
              <select value={person.role} onChange={(event) => onRole(person.id, event.target.value)}>
                <option value="ADMIN">ADMIN</option>
                <option value="MEMBER">MEMBER</option>
              </select>
            ) : (
              <span className="muted">Read only</span>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function InviteForm({ onInvite }) {
  const [form, setForm] = useState({ name: "", email: "", role: "MEMBER" });

  async function submit(event) {
    event.preventDefault();
    await onInvite(form);
    setForm({ name: "", email: "", role: "MEMBER" });
  }

  return (
    <form className="composer glass-panel" onSubmit={submit}>
      <input placeholder="Member name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <input type="email" placeholder="member@company.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
        <option value="MEMBER">MEMBER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <button className="gradient-btn">
        <UserPlus size={18} />
        Invite Member
      </button>
    </form>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const admin = user?.role === "ADMIN";

  async function loadAll() {
    const [dash, projectData, taskData, userData] = await Promise.all([
      api("/dashboard"),
      api("/projects"),
      api("/tasks"),
      api("/users")
    ]);
    setDashboard(dash);
    setProjects(projectData.projects);
    setTasks(taskData.tasks);
    setUsers(userData.users);
  }

  useEffect(() => {
    async function boot() {
      if (!token()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api("/auth/me");
        setUser(me.user);
        await loadAll();
      } catch {
        localStorage.removeItem("taskflow_token");
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, []);

  async function onAuth(nextUser) {
    setUser(nextUser);
    await loadAll();
  }

  async function mutate(label, action) {
    try {
      await action();
      setNotice(label);
      await loadAll();
    } catch (error) {
      setNotice(error.message);
    }
  }

  const headers = useMemo(
    () => ({
      overview: ["Overview", "Welcome back, team performance is looking strong.", () => setView("tasks"), "New Task", Plus],
      projects: ["Active Projects", "Manage and track your high-priority flow states.", null, "", null],
      tasks: ["Sprint Flow", "Focus: Core Architecture Update", null, "", null],
      team: ["Team Directory", "Manage access, roles, and monitor team activity.", null, "", null],
      settings: ["Settings", "Workspace configuration and deployment readiness.", null, "", null]
    }),
    []
  );

  if (loading) return <div className="loading">Initializing flow state...</div>;
  if (!user) return <AuthScreen onAuth={onAuth} />;

  const [title, subtitle, action, actionLabel, ActionIcon] = headers[view];

  return (
    <main className="app-shell">
      <Sidebar view={view} setView={setView} user={user} onLogout={() => {
        localStorage.removeItem("taskflow_token");
        setUser(null);
      }} />
      <section className="workspace">
        <AppHeader title={title} subtitle={subtitle} user={user} action={action} actionLabel={actionLabel} actionIcon={ActionIcon} />
        {notice && <button className="notice" onClick={() => setNotice("")}>{notice}</button>}
        {view === "overview" && <Overview dashboard={dashboard} tasks={tasks} />}
        {view === "projects" && (
          <Projects projects={projects} admin={admin} onCreate={(form) => mutate("Project created", () => api("/projects", { method: "POST", body: JSON.stringify(form) }))} />
        )}
        {view === "tasks" && (
          <TaskBoard
            tasks={tasks}
            projects={projects}
            user={user}
            admin={admin}
            onCreate={(form) => mutate("Task created", () => api("/tasks", { method: "POST", body: JSON.stringify(form) }))}
            onStatus={(taskId, status) => mutate("Task status updated", () => api(`/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }))}
          />
        )}
        {view === "team" && (
          <Team
            users={users}
            admin={admin}
            onInvite={(form) => mutate("Invite sent", () => api("/users/invite", { method: "POST", body: JSON.stringify(form) }))}
            onRole={(userId, role) => mutate("Role updated", () => api(`/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }))}
          />
        )}
        {view === "settings" && (
          <section className="glass-panel settings-panel">
            <h2>Deployment Ready</h2>
            <p>Railway uses the included build and start commands. Set JWT_SECRET and create your admin account before inviting the team.</p>
            <div className="settings-grid">
              <span>REST API</span><b>/api</b>
              <span>Database</span><b>File NoSQL</b>
              <span>Auth</span><b>JWT + bcrypt</b>
              <span>RBAC</span><b>Admin / Member</b>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
