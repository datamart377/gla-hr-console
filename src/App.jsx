import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Users, CalendarDays, Clock, Wallet, Star, Plus, Check, X,
  Search, Pencil, Trash2, Printer, FileText, Building2, Phone, Mail, MapPin,
  AlertTriangle, ChevronRight, ChevronLeft, UserPlus, ShieldCheck, TrendingUp,
  Circle, Download, Landmark, History, GraduationCap, Award, Briefcase,
  HeartHandshake, Baby, IdCard, FileCheck, Contact,
} from "lucide-react";
import {
  employeesApi, leaveApi, attendanceApi, appraisalsApi,
} from "./api/client.js";
import {
  data, TODAY, DEPARTMENTS, CONTRACT_TYPES, EMP_STATUSES, SITES, LEAVE_TYPES,
  APPRAISAL_METRICS, MARITAL_STATUSES, TERMS_TYPES, REPEATER_SCHEMAS,
  derivePayslip, deriveLeaveBalance, appraisalOverall, workingDaysBetween, normalizeEmployee,
} from "./data.js";

/* ============================ formatting helpers =========================== */
const fmtN = (n) => (Math.round(Number(n) || 0)).toLocaleString("en-US");
const ugx = (n) => "UGX " + fmtN(n);
const ugxShort = (n) => {
  n = Number(n) || 0;
  if (n >= 1e9) return "UGX " + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "UGX " + (n / 1e6).toFixed(1) + "M";
  return ugx(n);
};
const fullName = (e) => (e ? `${e.firstName} ${e.lastName}` : "—");
const initials = (e) => ((e?.firstName || " ")[0] + (e?.lastName || " ")[0]).toUpperCase();
const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  return isNaN(d) ? s : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const AV_COLORS = ["#2c7db0", "#e79138", "#43b078", "#8a5cc8", "#c85a7d", "#3ba39a", "#b9791a", "#5a7fd6"];
const avatarColor = (id) => AV_COLORS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];

/* ============================ tiny UI primitives =========================== */
function Btn({ children, onClick, variant = "default", size = "md", style, type = "button", title }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 8, borderRadius: "var(--radius-sm)",
    fontWeight: 600, fontFamily: "var(--font-sans)", border: "1px solid var(--border-strong)",
    background: "var(--surface)", color: "var(--text)", transition: "background .12s, border-color .12s",
    padding: size === "sm" ? "6px 10px" : "9px 14px", fontSize: size === "sm" ? 12 : 13, lineHeight: 1.2,
  };
  const variants = {
    default: {},
    primary: { background: "var(--ink)", color: "var(--ink-fg)", border: "1px solid var(--ink)" },
    ghost: { background: "transparent", border: "1px solid transparent", color: "var(--text-2)" },
    success: { color: "var(--success)", border: "1px solid color-mix(in srgb, var(--success) 45%, var(--border))" },
    danger: { color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 45%, var(--border))" },
  };
  return (
    <button type={type} title={title} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function Pill({ tone = "muted", children }) {
  const tones = {
    success: ["var(--success)", "var(--success-dim)"],
    warning: ["var(--warning)", "var(--warning-dim)"],
    danger: ["var(--danger)", "var(--danger-dim)"],
    info: ["var(--info)", "var(--info-dim)"],
    accent: ["var(--accent)", "var(--accent-dim)"],
    muted: ["var(--text-2)", "var(--surface-2)"],
  };
  const [fg, bg] = tones[tone] || tones.muted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, color: fg, background: bg, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {children}
    </span>
  );
}
const Tag = ({ children }) => (
  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-2)", fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap" }}>{children}</span>
);

function Card({ children, style, pad = false }) {
  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", ...(pad ? { padding: "18px 20px" } : {}), ...style }}>
      {children}
    </div>
  );
}
const CardHead = ({ title, right }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 20px", borderBottom: "1px solid var(--border)" }}>
    <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>{title}</h3>
    <div style={{ flex: 1 }} />
    {right}
  </div>
);

function Avatar({ emp, size = 34 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size > 40 ? 12 : 9, flex: "none", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: size * 0.4, color: "#fff", background: avatarColor(emp?.id) }}>
      {initials(emp)}
    </div>
  );
}
function EmpCell({ emp }) {
  if (!emp) return <Tag>Unknown</Tag>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <Avatar emp={emp} />
      <div>
        <div style={{ fontWeight: 600, color: "var(--text)" }}>{fullName(emp)}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{emp.jobTitle}</div>
      </div>
    </div>
  );
}

const statusTone = { Active: "success", "On Leave": "warning", Suspended: "info", Terminated: "danger" };
const leaveTone = { Approved: "success", Pending: "warning", Rejected: "danger" };
const attTone = { Present: "success", Field: "info", "Half-day": "warning", Absent: "danger" };

/* ================================ Data table ============================== */
function DataTable({ columns, rows, empty }) {
  if (!rows.length) {
    return (
      <div style={{ padding: "44px 20px", textAlign: "center", color: "var(--muted)" }}>
        <AlertTriangle size={30} style={{ opacity: 0.5, marginBottom: 8 }} />
        <div>{empty || "No records yet."}</div>
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} style={{ textAlign: c.num ? "right" : "left", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-2)", fontWeight: 600, padding: "11px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)", whiteSpace: "nowrap", position: "sticky", top: 0 }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} style={{ transition: "background .1s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {columns.map((c, ci) => (
                <td key={ci} className={c.num ? "mono" : ""} style={{ padding: "12px 16px", borderBottom: ri === rows.length - 1 ? "none" : "1px solid var(--border)", textAlign: c.num ? "right" : "left", whiteSpace: c.num ? "nowrap" : "normal", color: "var(--text)" }}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================= Modal ================================== */
function Modal({ title, sub, onClose, children, footer, wide }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(4,8,12,.6)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 24, zIndex: 100 }}>
      <div className="gla-pop" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--shadow-lg)", width: `min(${wide ? 820 : 640}px, 100%)`, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{title}</h2>
            {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
          </div>
          <Btn variant="ghost" size="sm" onClick={onClose} title="Close"><X size={17} /></Btn>
        </div>
        <div style={{ padding: "20px 22px", overflowY: "auto" }}>{children}</div>
        {footer && (
          <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end", background: "var(--surface)", borderRadius: "0 0 16px 16px" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== Form fields =============================== */
const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--text-2)" };
const controlStyle = { padding: "9px 11px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 13.5, width: "100%" };
function Field({ label, required, full, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={labelStyle}>{label}{required && <span style={{ color: "var(--danger)" }}> *</span>}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: "var(--muted)" }}>{hint}</span>}
    </div>
  );
}
const Input = (p) => <input {...p} style={{ ...controlStyle, ...p.style }} />;
const Select = ({ options, ...p }) => (
  <select {...p} style={{ ...controlStyle, ...p.style }}>
    {options.map((o) => (typeof o === "object" ? <option key={o.value} value={o.value}>{o.label}</option> : <option key={o} value={o}>{o}</option>))}
  </select>
);
const Textarea = (p) => <textarea {...p} style={{ ...controlStyle, minHeight: 66, resize: "vertical", ...p.style }} />;
const FieldsetTitle = ({ children, first }) => (
  <div style={{ gridColumn: "1 / -1", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginTop: first ? 0 : 6, paddingTop: first ? 0 : 8, borderTop: first ? "none" : "1px dashed var(--border)" }}>{children}</div>
);
const formGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" };

/* ============================ Rating (1–5) =============================== */
function Rating({ value }) {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ width: 9, height: 9, borderRadius: 2, background: i <= value ? "var(--accent)" : "var(--surface-2)" }} />
      ))}
    </span>
  );
}

/* ================================== APP =================================== */
const NAV = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "employees", label: "Employees", Icon: Users },
  { id: "leave", label: "Leave", Icon: CalendarDays },
  { id: "attendance", label: "Attendance", Icon: Clock },
  { id: "payroll", label: "Payroll", Icon: Wallet },
  { id: "appraisals", label: "Appraisals", Icon: Star },
];
const VIEW_META = {
  dashboard: ["Workforce Overview", "Front-end demo — HR snapshot for Global Link Associates Ltd"],
  employees: ["Employee Register", "Staff records, contracts and statutory details"],
  leave: ["Leave Management", "Requests, approvals and statutory balances"],
  attendance: ["Attendance & Timesheets", "Daily clock-in, field sites and overtime"],
  payroll: ["Payroll", "Monthly PAYE & NSSF computation (URA rates)"],
  appraisals: ["Performance Appraisals", "Competency reviews and ratings"],
  staffFile: ["Electronic Staff File", "Complete staff record"],
};

export default function App() {
  const [view, setView] = useState("dashboard");
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [store, setStore] = useState({ employees: [], leave: [], attendance: [], appraisals: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const reload = async () => {
    const [employees, leave, attendance, appraisals] = await Promise.all([
      employeesApi.list(), leaveApi.list(), attendanceApi.list(), appraisalsApi.list(),
    ]);
    setStore({ employees, leave, attendance, appraisals });
  };
  useEffect(() => { reload().then(() => setLoading(false)); }, []);

  const empById = (id) => store.employees.find((e) => e.id === id);
  const openStaffFile = (id) => { setSelectedEmpId(id); setView("staffFile"); };

  const ctx = { store, empById, reload, setModal, setView, openStaffFile };

  const navView = view === "staffFile" ? "employees" : view;
  const [title, sub] = VIEW_META[view];
  const ViewComp = { dashboard: Dashboard, employees: Employees, leave: Leave, attendance: Attendance, payroll: Payroll, appraisals: Appraisals }[view];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "252px 1fr", minHeight: "100vh" }}>
      <Sidebar view={navView} setView={setView} store={store} />
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar title={title} sub={sub} view={view} ctx={ctx} />
        <div className="gla-fade" key={view + (selectedEmpId || "")} style={{ padding: "24px 28px 56px" }}>
          {loading ? <div style={{ color: "var(--muted)", padding: 40 }}>Loading…</div>
            : view === "staffFile" ? <StaffFile ctx={ctx} id={selectedEmpId} />
            : <ViewComp ctx={ctx} />}
        </div>
      </div>
      {modal && modal(ctx)}
    </div>
  );
}

/* ================================ Sidebar ================================= */
function Sidebar({ view, setView, store }) {
  const counts = {
    employees: store.employees.length,
    leave: store.leave.filter((l) => l.status === "Pending").length || "",
    attendance: store.attendance.filter((a) => a.date === TODAY).length,
  };
  return (
    <aside style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
      <div style={{ padding: "20px 20px 16px", display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid var(--sidebar-border)" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flex: "none", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff", fontSize: 15, background: "#1b1e25", boxShadow: "inset 0 2.5px 0 var(--accent), inset 0 0 0 1px rgba(255,255,255,.08)" }}>GL</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#fff", lineHeight: 1.15 }}>
          Global Link<br />Associates
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 400, fontSize: 10, letterSpacing: ".12em", color: "var(--sidebar-muted)", textTransform: "uppercase", marginTop: 4 }}>HR Console</div>
        </div>
      </div>
      <nav style={{ padding: 12, display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sidebar-muted)", padding: "14px 12px 6px" }}>Main</div>
        {NAV.map(({ id, label, Icon }) => {
          const active = view === id;
          const count = counts[id];
          return (
            <button key={id} onClick={() => setView(id)}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 9, border: "none", width: "100%", textAlign: "left", fontWeight: 500, fontSize: 13.5, color: active ? "var(--sidebar-active-fg)" : "var(--sidebar-fg)", background: active ? "var(--sidebar-active-bg)" : "transparent", transition: "background .12s, color .12s" }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,.05)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              <Icon size={18} style={{ opacity: 0.9, color: active ? "var(--accent)" : "inherit" }} />
              <span>{label}</span>
              {count !== "" && count != null && (
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, background: "rgba(255,255,255,.09)", color: "var(--sidebar-fg)", padding: "1px 7px", borderRadius: 20 }}>{count}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "14px 16px", borderTop: "1px solid var(--sidebar-border)", fontSize: 12, color: "var(--sidebar-muted)", display: "flex", alignItems: "center", gap: 7 }}>
        <Circle size={8} fill="var(--accent)" color="var(--accent)" /> Demo prototype · mock data
      </div>
    </aside>
  );
}

/* ================================= Topbar ================================= */
function Topbar({ title, sub, view, ctx }) {
  const addButtons = {
    employees: ["Add employee", (c) => c.setModal(() => (cc) => <EmployeeForm ctx={cc} />)],
    leave: ["New request", (c) => c.setModal(() => (cc) => <LeaveForm ctx={cc} />)],
    attendance: ["Log attendance", (c) => c.setModal(() => (cc) => <AttendanceForm ctx={cc} />)],
    appraisals: ["New appraisal", (c) => c.setModal(() => (cc) => <AppraisalForm ctx={cc} />)],
  };
  const add = addButtons[view];
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "color-mix(in srgb, var(--bg) 85%, transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)", padding: "16px 28px", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{title}</h1>
        <div style={{ color: "var(--text-2)", fontSize: 12.5, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ flex: 1 }} />
      {add && (
        <Btn variant="primary" onClick={() => add[1](ctx)}><Plus size={16} />{add[0]}</Btn>
      )}
    </header>
  );
}

/* =============================== Dashboard =============================== */
function StatCard({ Icon, label, value, meta, tone = "brand" }) {
  const railColor = { brand: "var(--brand)", accent: "var(--accent)", success: "var(--success)", warning: "var(--warning)" }[tone];
  return (
    <Card style={{ padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: railColor }} />
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-2)", fontWeight: 600 }}>
        <Icon size={15} style={{ color: railColor }} />{label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 30, marginTop: 8, lineHeight: 1, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{meta}</div>
    </Card>
  );
}

function Dashboard({ ctx }) {
  const { store, empById } = ctx;
  const emps = store.employees;
  const active = emps.filter((e) => e.status === "Active").length;
  const onLeaveToday = store.leave.filter((l) => l.status === "Approved" && l.startDate <= TODAY && l.endDate >= TODAY).length;
  const pending = store.leave.filter((l) => l.status === "Pending").length;
  const presentToday = store.attendance.filter((a) => a.date === TODAY && a.status !== "Absent").length;
  const monthlyGross = emps.filter((e) => e.status !== "Terminated").reduce((s, e) => s + (Number(e.grossSalary) || 0), 0);

  const byDept = DEPARTMENTS.map((d) => ({ d, n: emps.filter((e) => e.department === d).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const maxN = Math.max(1, ...byDept.map((x) => x.n));

  const activity = [];
  [...store.leave].sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || "")).slice(0, 4).forEach((l) => {
    activity.push({ Icon: CalendarDays, tone: leaveTone[l.status], emp: empById(l.empId), text: `${l.type.toLowerCase()} leave · ${l.days} day${l.days === 1 ? "" : "s"}`, status: l.status, when: fmtDate(l.requestedAt) });
  });
  store.appraisals.slice(0, 2).forEach((a) => {
    activity.push({ Icon: Star, tone: "info", emp: empById(a.empId), text: `appraised · ${a.period}, overall ${appraisalOverall(a).toFixed(1)}/5`, when: fmtDate(a.date) });
  });

  const upcoming = store.leave.filter((l) => l.status === "Approved" && l.endDate >= TODAY).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 5);

  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <StatCard Icon={Users} label="Total staff" value={emps.length} meta={`${active} active · ${emps.length - active} inactive`} tone="brand" />
        <StatCard Icon={Check} label="Present today" value={presentToday} meta={`of ${emps.length} on the register`} tone="success" />
        <StatCard Icon={CalendarDays} label="On leave today" value={onLeaveToday} meta={`${pending} request${pending === 1 ? "" : "s"} pending`} tone="accent" />
        <StatCard Icon={Wallet} label="Monthly gross" value={ugxShort(monthlyGross)} meta="Payroll run · Sept 2026" tone="warning" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, marginTop: 16 }} className="dash-cols">
        <Card>
          <CardHead title="Headcount by department" />
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 11 }}>
            {byDept.map((x) => (
              <div key={x.d} style={{ display: "grid", gridTemplateColumns: "132px 1fr 34px", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 12.5, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={x.d}>{x.d}</div>
                <div style={{ height: 12, background: "var(--surface-2)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(x.n / maxN) * 100}%`, borderRadius: 6, background: "linear-gradient(90deg, var(--brand), var(--accent))" }} />
                </div>
                <div className="mono" style={{ fontSize: 12.5, textAlign: "right", color: "var(--text)" }}>{x.n}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Recent activity" />
          <div>
            {activity.map((a, i) => {
              const [fg, bg] = { success: ["var(--success)", "var(--success-dim)"], warning: ["var(--warning)", "var(--warning-dim)"], danger: ["var(--danger)", "var(--danger-dim)"], info: ["var(--info)", "var(--info-dim)"] }[a.tone] || ["var(--text-2)", "var(--surface-2)"];
              return (
                <div key={i} style={{ display: "flex", gap: 12, padding: "12px 20px", borderBottom: i === activity.length - 1 ? "none" : "1px solid var(--border)", alignItems: "flex-start" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: bg, color: fg }}><a.Icon size={15} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--text)" }}>
                      <b>{fullName(a.emp)}</b> {a.text} {a.status && <Pill tone={a.tone}>{a.status}</Pill>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{a.when}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card>
          <CardHead title="Upcoming approved leave" />
          <DataTable
            columns={[
              { label: "Employee", render: (l) => <EmpCell emp={empById(l.empId)} /> },
              { label: "Type", render: (l) => <Tag>{l.type}</Tag> },
              { label: "From", render: (l) => fmtDate(l.startDate) },
              { label: "To", render: (l) => fmtDate(l.endDate) },
              { label: "Days", num: true, render: (l) => l.days },
            ]}
            rows={upcoming}
            empty="Nobody is scheduled off — the roster is clear."
          />
        </Card>
      </div>
    </>
  );
}

/* =============================== Employees =============================== */
function Toolbar({ children }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>{children}</div>;
}
function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 340 }}>
      <Search size={16} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ paddingLeft: 34 }} />
    </div>
  );
}

function Employees({ ctx }) {
  const { store, setModal, openStaffFile } = ctx;
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");

  const list = useMemo(() => store.employees.filter((e) => {
    if (dept && e.department !== dept) return false;
    if (!q) return true;
    return [fullName(e), e.id, e.jobTitle, e.department].join(" ").toLowerCase().includes(q.toLowerCase());
  }), [store.employees, q, dept]);

  const del = (e) => setModal(() => (cc) => <ConfirmDelete ctx={cc} api={employeesApi} id={e.id} label={fullName(e)} />);

  const exportCsv = () => {
    const cols = ["id", "firstName", "lastName", "department", "jobTitle", "contractType", "status", "grossSalary", "phone", "email"];
    const lines = [cols.join(",")].concat(list.map((e) => cols.map((c) => `"${String(e[c] ?? "").replace(/"/g, '""')}"`).join(",")));
    downloadFile("gla-employees.csv", lines.join("\n"));
  };

  return (
    <>
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Search name, ID or title…" />
        <Select value={dept} onChange={(e) => setDept(e.target.value)} options={[{ value: "", label: "All departments" }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]} style={{ width: "auto" }} />
        <div style={{ flex: 1 }} />
        <Btn onClick={exportCsv}><FileText size={16} />Export CSV</Btn>
      </Toolbar>
      <Card>
        <DataTable
          columns={[
            { label: "Employee", render: (e) => <EmpCell emp={e} /> },
            { label: "Staff ID", render: (e) => <Tag>{e.id}</Tag> },
            { label: "Department", render: (e) => e.department },
            { label: "Contract", render: (e) => <Tag>{e.contractType}</Tag> },
            { label: "Status", render: (e) => <Pill tone={statusTone[e.status]}>{e.status}</Pill> },
            { label: "Gross (UGX)", num: true, render: (e) => fmtN(e.grossSalary) },
            { label: "", render: (e) => (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <Btn size="sm" onClick={() => openStaffFile(e.id)}>Open file</Btn>
                <Btn size="sm" onClick={() => setModal(() => (cc) => <EmployeeForm ctx={cc} id={e.id} />)}><Pencil size={13} /></Btn>
                <Btn size="sm" variant="danger" onClick={() => del(e)}><Trash2 size={13} /></Btn>
              </div>
            )},
          ]}
          rows={list}
          empty="No employees match your filters."
        />
      </Card>
    </>
  );
}

function KVSection({ title, pairs }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>{title}</div>
      <dl style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "8px 14px", fontSize: 13, margin: 0 }}>
        {pairs.map(([k, v], i) => (
          <React.Fragment key={i}>
            <dt style={{ color: "var(--text-2)" }}>{k}</dt>
            <dd style={{ margin: 0, fontWeight: 500, color: "var(--text)" }}>{v == null || v === "" ? "—" : v}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

function EmployeeProfile({ ctx, id }) {
  const e = ctx.empById(id);
  if (!e) return null;
  const ps = derivePayslip(e);
  const annual = deriveLeaveBalance(e, "Annual");
  return (
    <Modal wide title={fullName(e)} sub={`${e.id} · ${e.department}`} onClose={() => ctx.setModal(null)}
      footer={<>
        <Btn onClick={() => ctx.setModal(() => (cc) => <PayslipModal ctx={cc} id={e.id} />)}><Printer size={15} />Payslip</Btn>
        <Btn variant="primary" onClick={() => ctx.setModal(() => (cc) => <EmployeeForm ctx={cc} id={e.id} />)}><Pencil size={15} />Edit</Btn>
      </>}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
        <Avatar emp={e} size={56} />
        <div>
          <h2 style={{ fontSize: 19, color: "var(--text)" }}>{fullName(e)}</h2>
          <div style={{ color: "var(--muted)", marginTop: 3 }}>{e.jobTitle} · {e.department}</div>
        </div>
        <div style={{ marginLeft: "auto" }}><Pill tone={statusTone[e.status]}>{e.status}</Pill></div>
      </div>
      <KVSection title="Employment" pairs={[["Staff ID", e.id], ["Contract", e.contractType], ["Date joined", fmtDate(e.employmentDate)], ["Department", e.department], ["Status", e.status]]} />
      <KVSection title="Personal" pairs={[["Gender", e.gender], ["Date of birth", fmtDate(e.dob)], ["National ID (NIN)", e.nationalId], ["Phone", e.phone], ["Email", e.email], ["Address", e.address]]} />
      <KVSection title="Statutory & payroll" pairs={[["Gross salary", ugx(ps.gross)], ["PAYE (monthly)", ugx(ps.paye)], ["NSSF employee (5%)", ugx(ps.nssfEmp)], ["NSSF employer (10%)", ugx(ps.nssfEr)], ["Net pay", ugx(ps.net)], ["TIN", e.tin], ["NSSF no.", e.nssfNumber], ["Bank", `${e.bankName} · ${e.bankAccount}`]]} />
      <KVSection title="Leave balances" pairs={[["Annual", `${annual.remaining} of ${annual.entitlement} days left`], ["Sick", `${e.sickUsed || 0} of ${LEAVE_TYPES.Sick.entitlement} days used`]]} />
      <KVSection title="Emergency contact" pairs={[["Name", e.emergencyName], ["Relationship", e.emergencyRelation], ["Phone", e.emergencyPhone]]} />
    </Modal>
  );
}

function nextEmpId(employees) {
  const nums = employees.map((e) => parseInt(String(e.id).replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
  return "GLA-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
}

function EmployeeForm({ ctx, id }) {
  const existing = id ? ctx.empById(id) : null;
  const [f, setF] = useState(() => existing ? { ...existing } : normalizeEmployee({
    id: nextEmpId(ctx.store.employees), firstName: "", lastName: "", gender: "Male", dob: "", nationalId: "",
    phone: "", email: "", address: "", department: "Power Systems", jobTitle: "", contractType: "Permanent",
    status: "Active", employmentDate: "", grossSalary: 1200000, tin: "", nssfNumber: "", bankName: "",
    bankAccount: "", annualUsed: 0, sickUsed: 0, emergencyName: "", emergencyRelation: "", emergencyPhone: "",
  }));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setN = (group, k) => (e) => setF((s) => ({ ...s, [group]: { ...s[group], [k]: e.target.value } }));
  const setArr = (k) => (arr) => setF((s) => ({ ...s, [k]: arr }));

  const submit = async () => {
    if (!f.firstName || !f.lastName || !f.id || !f.jobTitle) return alert("First name, surname, staff ID and job title are required.");
    const out = { ...f, grossSalary: Number(f.grossSalary) || 0, annualUsed: Number(f.annualUsed) || 0, sickUsed: Number(f.sickUsed) || 0 };
    if (existing) await employeesApi.update(id, out); else await employeesApi.create(out);
    await ctx.reload();
    ctx.setModal(null);
  };

  return (
    <Modal wide title={existing ? "Edit employee" : "Add employee"} sub={existing ? existing.id : "New staff record"} onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />{existing ? "Save changes" : "Add employee"}</Btn></>}>
      <div style={formGrid}>
        <FieldsetTitle first>Identity</FieldsetTitle>
        <Field label="First name" required><Input value={f.firstName} onChange={set("firstName")} /></Field>
        <Field label="Surname" required><Input value={f.lastName} onChange={set("lastName")} /></Field>
        <Field label="Staff ID" required hint="Unique — e.g. GLA-009"><Input value={f.id} onChange={set("id")} /></Field>
        <Field label="Gender"><Select value={f.gender} onChange={set("gender")} options={["Male", "Female"]} /></Field>
        <Field label="Date of birth"><Input type="date" value={f.dob} onChange={set("dob")} /></Field>
        <Field label="National ID (NIN)"><Input value={f.nationalId} onChange={set("nationalId")} placeholder="CM…" /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set("phone")} placeholder="+256 7…" /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={set("email")} /></Field>
        <Field label="Residential address" full><Input value={f.address} onChange={set("address")} /></Field>
        <Field label="File number"><Input value={f.fileNumber} onChange={set("fileNumber")} /></Field>
        <Field label="Marital status"><Select value={f.maritalStatus} onChange={set("maritalStatus")} options={MARITAL_STATUSES} /></Field>
        <Field label="Religion"><Input value={f.religion} onChange={set("religion")} /></Field>
        <Field label="Disability"><Input value={f.disability} onChange={set("disability")} /></Field>
        <Field label="Nationality"><Input value={f.nationality} onChange={set("nationality")} /></Field>

        <FieldsetTitle>Role</FieldsetTitle>
        <Field label="Department"><Select value={f.department} onChange={set("department")} options={DEPARTMENTS} /></Field>
        <Field label="Job title" required><Input value={f.jobTitle} onChange={set("jobTitle")} /></Field>
        <Field label="Contract type"><Select value={f.contractType} onChange={set("contractType")} options={CONTRACT_TYPES} /></Field>
        <Field label="Status"><Select value={f.status} onChange={set("status")} options={EMP_STATUSES} /></Field>
        <Field label="Date joined"><Input type="date" value={f.employmentDate} onChange={set("employmentDate")} /></Field>
        <Field label="Gross monthly salary (UGX)" hint="PAYE & NSSF are computed automatically"><Input type="number" value={f.grossSalary} onChange={set("grossSalary")} /></Field>
        <Field label="Position (full title)" full><Input value={f.position} onChange={set("position")} placeholder="e.g. Deputy Chief ICT Officer, Directorate of ICT" /></Field>

        <FieldsetTitle>Origin</FieldsetTitle>
        <Field label="Region of origin"><Input value={f.origin.region} onChange={setN("origin", "region")} /></Field>
        <Field label="District of origin"><Input value={f.origin.district} onChange={setN("origin", "district")} /></Field>
        <Field label="County of origin"><Input value={f.origin.county} onChange={setN("origin", "county")} /></Field>
        <Field label="Village of origin"><Input value={f.origin.village} onChange={setN("origin", "village")} /></Field>

        <FieldsetTitle>Residence</FieldsetTitle>
        <Field label="Residence district"><Input value={f.residence.district} onChange={setN("residence", "district")} /></Field>
        <Field label="Residence county"><Input value={f.residence.county} onChange={setN("residence", "county")} /></Field>
        <Field label="Residence sub county"><Input value={f.residence.subCounty} onChange={setN("residence", "subCounty")} /></Field>
        <Field label="Residence parish"><Input value={f.residence.parish} onChange={setN("residence", "parish")} /></Field>
        <Field label="Residence village"><Input value={f.residence.village} onChange={setN("residence", "village")} /></Field>

        <FieldsetTitle>Contact</FieldsetTitle>
        <Field label="Postal address" full><Input value={f.contact.postalAddress} onChange={setN("contact", "postalAddress")} /></Field>
        <Field label="Telephone"><Input value={f.contact.telephone} onChange={setN("contact", "telephone")} /></Field>
        <Field label="Mobile"><Input value={f.contact.mobile} onChange={setN("contact", "mobile")} /></Field>
        <Field label="Contact email"><Input value={f.contact.email} onChange={setN("contact", "email")} /></Field>
        <Field label="Contact district"><Input value={f.contact.district} onChange={setN("contact", "district")} /></Field>

        <FieldsetTitle>Statutory & bank</FieldsetTitle>
        <Field label="TIN"><Input value={f.tin} onChange={set("tin")} /></Field>
        <Field label="NSSF number"><Input value={f.nssfNumber} onChange={set("nssfNumber")} /></Field>
        <Field label="Bank"><Input value={f.bankName} onChange={set("bankName")} /></Field>
        <Field label="Bank account"><Input value={f.bankAccount} onChange={set("bankAccount")} /></Field>
        <Field label="Annual leave taken (days)"><Input type="number" value={f.annualUsed} onChange={set("annualUsed")} /></Field>
        <Field label="Sick leave taken (days)"><Input type="number" value={f.sickUsed} onChange={set("sickUsed")} /></Field>

        <FieldsetTitle>Terms of Employment</FieldsetTitle>
        <Field label="Terms of employment"><Select value={f.terms.terms} onChange={setN("terms", "terms")} options={TERMS_TYPES} /></Field>
        <Field label="Start date"><Input type="date" value={f.terms.startDate} onChange={setN("terms", "startDate")} /></Field>
        <Field label="End date"><Input type="date" value={f.terms.endDate} onChange={setN("terms", "endDate")} /></Field>
        <Field label="Entry salary"><Input value={f.terms.entrySalary} onChange={setN("terms", "entrySalary")} /></Field>
        <Field label="Appointment authority"><Input value={f.terms.appointmentAuthority} onChange={setN("terms", "appointmentAuthority")} /></Field>
        <Field label="Source of payment"><Input value={f.terms.sourceOfPayment} onChange={setN("terms", "sourceOfPayment")} /></Field>

        <FieldsetTitle>Emergency contact</FieldsetTitle>
        <Field label="Contact name"><Input value={f.emergencyName} onChange={set("emergencyName")} /></Field>
        <Field label="Relationship"><Input value={f.emergencyRelation} onChange={set("emergencyRelation")} /></Field>
        <Field label="Contact phone" full><Input value={f.emergencyPhone} onChange={set("emergencyPhone")} /></Field>

        <Repeater label="Academic Qualifications" Icon={GraduationCap} value={f.academicQualifications} onChange={setArr("academicQualifications")} fields={REPEATER_SCHEMAS.academicQualifications} />
        <Repeater label="Bank Details" Icon={Landmark} value={f.bankDetails} onChange={setArr("bankDetails")} fields={REPEATER_SCHEMAS.bankDetails} />
        <Repeater label="Employment History" Icon={Briefcase} value={f.employmentHistory} onChange={setArr("employmentHistory")} fields={REPEATER_SCHEMAS.employmentHistory} />
        <Repeater label="Professional Specialization" Icon={Award} value={f.professionalSpecialization} onChange={setArr("professionalSpecialization")} fields={REPEATER_SCHEMAS.professionalSpecialization} />
        <Repeater label="Professional Membership" Icon={ShieldCheck} value={f.professionalMembership} onChange={setArr("professionalMembership")} fields={REPEATER_SCHEMAS.professionalMembership} />
        <Repeater label="Children / Dependants" Icon={Baby} value={f.children} onChange={setArr("children")} fields={REPEATER_SCHEMAS.children} />
        <Repeater label="Next of Kin" Icon={HeartHandshake} value={f.nextOfKin} onChange={setArr("nextOfKin")} fields={REPEATER_SCHEMAS.nextOfKin} />
      </div>
    </Modal>
  );
}

/* ================================= Leave ================================= */
function Leave({ ctx }) {
  const { store, empById, reload, setModal } = ctx;
  const [statusFilter, setStatusFilter] = useState("");

  const pend = store.leave.filter((l) => l.status === "Pending").length;
  const appr = store.leave.filter((l) => l.status === "Approved").length;
  const daysTaken = store.leave.filter((l) => l.status === "Approved").reduce((s, l) => s + (l.days || 0), 0);
  const avgAnnual = store.employees.length
    ? Math.round(store.employees.reduce((s, e) => s + deriveLeaveBalance(e, "Annual").remaining, 0) / store.employees.length) : 0;

  let list = [...store.leave].sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
  if (statusFilter) list = list.filter((l) => l.status === statusFilter);

  const decide = async (l, decision) => {
    await leaveApi.update(l.id, { status: decision, decidedBy: "Sarah Nakato (HR)", decidedAt: TODAY });
    if (decision === "Approved" && l.type === "Annual") {
      const e = empById(l.empId);
      if (e) await employeesApi.update(e.id, { annualUsed: (e.annualUsed || 0) + (l.days || 0) });
    }
    await reload();
  };

  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={CalendarDays} label="Pending" value={pend} meta="awaiting decision" tone="accent" />
        <StatCard Icon={Check} label="Approved" value={appr} meta={`${daysTaken} days total`} tone="success" />
        <StatCard Icon={Users} label="Avg annual left" value={`${avgAnnual} days`} meta={`of ${LEAVE_TYPES.Annual.entitlement} statutory`} tone="brand" />
      </div>
      <Toolbar>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: "", label: "All statuses" }, "Pending", "Approved", "Rejected"]} style={{ width: "auto" }} />
      </Toolbar>
      <Card>
        <DataTable
          columns={[
            { label: "Employee", render: (l) => <EmpCell emp={empById(l.empId)} /> },
            { label: "Type", render: (l) => <Tag>{l.type}</Tag> },
            { label: "Period", render: (l) => `${fmtDate(l.startDate)} → ${fmtDate(l.endDate)}` },
            { label: "Days", num: true, render: (l) => l.days },
            { label: "Status", render: (l) => <Pill tone={leaveTone[l.status]}>{l.status}</Pill> },
            { label: "Reason", render: (l) => <span style={{ color: "var(--text-2)" }}>{l.reason || "—"}</span> },
            { label: "", render: (l) => (
              l.status === "Pending" ? (
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <Btn size="sm" variant="success" onClick={() => decide(l, "Approved")}><Check size={13} />Approve</Btn>
                  <Btn size="sm" variant="danger" onClick={() => decide(l, "Rejected")}><X size={13} />Reject</Btn>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Btn size="sm" variant="danger" onClick={() => setModal(() => (cc) => <ConfirmDelete ctx={cc} api={leaveApi} id={l.id} label={l.id} />)}><Trash2 size={13} /></Btn>
                </div>
              )
            )},
          ]}
          rows={list}
          empty="No leave requests found."
        />
      </Card>
    </>
  );
}

function LeaveForm({ ctx }) {
  const emps = ctx.store.employees;
  const [f, setF] = useState({ empId: emps[0]?.id || "", type: "Annual", startDate: TODAY, endDate: TODAY, days: "", reason: "" });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.empId || !f.type || !f.startDate || !f.endDate) return alert("Employee, type and dates are required.");
    const days = Number(f.days) || workingDaysBetween(f.startDate, f.endDate);
    await leaveApi.create({ empId: f.empId, type: f.type, startDate: f.startDate, endDate: f.endDate, days, reason: f.reason, status: "Pending", requestedAt: TODAY, decidedBy: "", decidedAt: "" });
    await ctx.reload();
    ctx.setModal(null);
  };
  return (
    <Modal title="New leave request" sub="Logged as pending for HR approval" onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />Submit request</Btn></>}>
      <div style={formGrid}>
        <Field label="Employee" required full><Select value={f.empId} onChange={set("empId")} options={emps.map((e) => ({ value: e.id, label: `${fullName(e)} · ${e.id}` }))} /></Field>
        <Field label="Leave type" required><Select value={f.type} onChange={set("type")} options={Object.keys(LEAVE_TYPES)} /></Field>
        <Field label="Working days" hint="Blank = auto-count Mon–Fri"><Input type="number" value={f.days} onChange={set("days")} /></Field>
        <Field label="Start date" required><Input type="date" value={f.startDate} onChange={set("startDate")} /></Field>
        <Field label="End date" required><Input type="date" value={f.endDate} onChange={set("endDate")} /></Field>
        <Field label="Reason" full><Textarea value={f.reason} onChange={set("reason")} /></Field>
      </div>
    </Modal>
  );
}

/* =============================== Attendance ============================== */
function Attendance({ ctx }) {
  const { store, empById, setModal } = ctx;
  const today = store.attendance.filter((a) => a.date === TODAY);
  const present = today.filter((a) => a.status !== "Absent").length;
  const field = today.filter((a) => a.status === "Field").length;
  const ot = today.reduce((s, a) => s + (Number(a.overtime) || 0), 0);
  const list = [...store.attendance].sort((a, b) => (b.date + b.clockIn).localeCompare(a.date + a.clockIn));
  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={Clock} label="Logged today" value={today.length} meta={fmtDate(TODAY)} tone="brand" />
        <StatCard Icon={Check} label="Present / field" value={present} meta={`${field} on field sites`} tone="success" />
        <StatCard Icon={TrendingUp} label="Overtime hours" value={ot.toFixed(1)} meta="today, across crews" tone="accent" />
      </div>
      <Banner Icon={AlertTriangle}>Field technicians clock in at client sites; overtime beyond 8 hours is captured for payroll.</Banner>
      <Card>
        <DataTable
          columns={[
            { label: "Employee", render: (a) => <EmpCell emp={empById(a.empId)} /> },
            { label: "Date", render: (a) => fmtDate(a.date) },
            { label: "In", render: (a) => a.clockIn || "—" },
            { label: "Out", render: (a) => a.clockOut || "—" },
            { label: "Site", render: (a) => a.site },
            { label: "Status", render: (a) => <Pill tone={attTone[a.status]}>{a.status}</Pill> },
            { label: "OT (hrs)", num: true, render: (a) => (Number(a.overtime) || 0).toFixed(1) },
            { label: "", render: (a) => <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn size="sm" variant="danger" onClick={() => setModal(() => (cc) => <ConfirmDelete ctx={cc} api={attendanceApi} id={a.id} label={a.id} />)}><Trash2 size={13} /></Btn></div> },
          ]}
          rows={list}
          empty="No attendance logged yet."
        />
      </Card>
    </>
  );
}

function AttendanceForm({ ctx }) {
  const emps = ctx.store.employees;
  const [f, setF] = useState({ empId: emps[0]?.id || "", date: TODAY, status: "Present", clockIn: "", clockOut: "", site: SITES[0], overtime: 0 });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.empId || !f.date) return alert("Employee and date are required.");
    await attendanceApi.create({ ...f, overtime: Number(f.overtime) || 0 });
    await ctx.reload();
    ctx.setModal(null);
  };
  return (
    <Modal title="Log attendance" sub="Daily clock record" onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />Save record</Btn></>}>
      <div style={formGrid}>
        <Field label="Employee" required full><Select value={f.empId} onChange={set("empId")} options={emps.map((e) => ({ value: e.id, label: fullName(e) }))} /></Field>
        <Field label="Date" required><Input type="date" value={f.date} onChange={set("date")} /></Field>
        <Field label="Status"><Select value={f.status} onChange={set("status")} options={["Present", "Field", "Half-day", "Absent"]} /></Field>
        <Field label="Clock in"><Input type="time" value={f.clockIn} onChange={set("clockIn")} /></Field>
        <Field label="Clock out"><Input type="time" value={f.clockOut} onChange={set("clockOut")} /></Field>
        <Field label="Site" full><Select value={f.site} onChange={set("site")} options={SITES} /></Field>
        <Field label="Overtime hours"><Input type="number" value={f.overtime} onChange={set("overtime")} /></Field>
      </div>
    </Modal>
  );
}

/* ================================ Payroll =============================== */
function Banner({ Icon = AlertTriangle, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderRadius: 10, fontSize: 12.5, marginBottom: 18, border: "1px solid var(--info-dim)", background: "var(--info-dim)", color: "var(--info)" }}>
      <Icon size={16} style={{ flex: "none" }} />
      <span>{children}</span>
    </div>
  );
}

function Payroll({ ctx }) {
  const { store, setModal } = ctx;
  const emps = store.employees.filter((e) => e.status !== "Terminated");
  const t = emps.reduce((acc, e) => {
    const p = derivePayslip(e);
    acc.g += p.gross; acc.paye += p.paye; acc.ne += p.nssfEmp; acc.nr += p.nssfEr; acc.net += p.net;
    return acc;
  }, { g: 0, paye: 0, ne: 0, nr: 0, net: 0 });

  const exportCsv = () => {
    const cols = ["Staff ID", "Name", "Department", "Gross", "PAYE", "NSSF_Employee", "NSSF_Employer", "Net"];
    const lines = [cols.join(",")].concat(emps.map((e) => {
      const p = derivePayslip(e);
      return [e.id, fullName(e), e.department, p.gross, p.paye, p.nssfEmp, p.nssfEr, p.net].map((x) => `"${x}"`).join(",");
    }));
    downloadFile("gla-payroll-2026-09.csv", lines.join("\n"));
  };

  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={Wallet} label="Gross payroll" value={ugxShort(t.g)} meta={`${emps.length} staff · Sept 2026`} tone="brand" />
        <StatCard Icon={FileText} label="PAYE remittance" value={ugxShort(t.paye)} meta="due to URA by 15th" tone="accent" />
        <StatCard Icon={Building2} label="NSSF total (15%)" value={ugxShort(t.ne + t.nr)} meta={`${ugxShort(t.ne)} staff + ${ugxShort(t.nr)} employer`} tone="warning" />
        <StatCard Icon={Check} label="Net disbursement" value={ugxShort(t.net)} meta="to staff bank accounts" tone="success" />
      </div>
      <Banner>PAYE uses current URA monthly resident bands; NSSF is 5% employee + 10% employer of gross. Figures are indicative for HR planning.</Banner>
      <Card>
        <CardHead title="Payroll register — September 2026" right={<Btn size="sm" onClick={exportCsv}><Download size={14} />Export CSV</Btn>} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{["Employee", "Department", "Gross", "PAYE", "NSSF (5%)", "Net pay", ""].map((h, i) => (
                <th key={i} style={{ textAlign: i >= 2 && i <= 5 ? "right" : "left", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-2)", fontWeight: 600, padding: "11px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)", whiteSpace: "nowrap" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {emps.map((e) => {
                const p = derivePayslip(e);
                return (
                  <tr key={e.id}>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}><EmpCell emp={e} /></td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", color: "var(--text)" }}>{e.department}</td>
                    <td className="mono" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--text)" }}>{fmtN(p.gross)}</td>
                    <td className="mono" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--text)" }}>{fmtN(p.paye)}</td>
                    <td className="mono" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--text)" }}>{fmtN(p.nssfEmp)}</td>
                    <td className="mono" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", fontWeight: 600, color: "var(--text)" }}>{fmtN(p.net)}</td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                      <Btn size="sm" onClick={() => setModal(() => (cc) => <PayslipModal ctx={cc} id={e.id} />)}><Printer size={13} />Payslip</Btn>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 700, background: "var(--ink)", color: "#fff" }}>
                <td style={{ padding: "14px 16px", color: "#fff" }}>Totals</td>
                <td style={{ padding: "14px 16px", color: "rgba(255,255,255,.65)" }}>{emps.length} staff</td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", color: "#fff" }}>{fmtN(t.g)}</td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", color: "#fff" }}>{fmtN(t.paye)}</td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", color: "#fff" }}>{fmtN(t.ne)}</td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", color: "#34d399", fontSize: 14.5 }}>{fmtN(t.net)}</td>
                <td style={{ background: "var(--ink)" }} />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function PayslipModal({ ctx, id }) {
  const e = ctx.empById(id);
  if (!e) return null;
  const p = derivePayslip(e);
  const Row = ({ label, amount, deduct, total }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: total ? "13px 16px" : "10px 16px", borderBottom: "1px solid var(--border)", fontSize: 13.5, background: total ? "var(--ink)" : "transparent", fontWeight: total ? 700 : 400 }}>
      <span style={{ color: total ? "rgba(255,255,255,.85)" : "var(--text-2)" }}>{label}</span>
      <span className="mono" style={{ color: total ? "#34d399" : deduct ? "var(--danger)" : "var(--text)", fontSize: total ? 15 : 13.5 }}>{amount}</span>
    </div>
  );
  return (
    <Modal title="Payslip" sub={`${fullName(e)} — September 2026`} onClose={() => ctx.setModal(null)}
      footer={<Btn variant="primary" onClick={() => window.print()}><Printer size={15} />Print</Btn>}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--text)" }}>Global Link Associates Ltd</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>Plot 100, Gaba Road, Kampala · Payslip Sept 2026</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: "var(--text)" }}>{fullName(e)}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{e.id} · {e.jobTitle}</div>
        </div>
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <Row label="Basic gross salary" amount={ugx(p.gross)} />
        <Row label="PAYE (URA)" amount={"− " + ugx(p.paye)} deduct />
        <Row label="NSSF employee (5%)" amount={"− " + ugx(p.nssfEmp)} deduct />
        <Row label="Net pay" amount={ugx(p.net)} total />
      </div>
      <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", background: "var(--surface)", fontWeight: 600, fontSize: 13, color: "var(--text)" }}>Employer contributions</div>
        <Row label="NSSF employer (10%)" amount={ugx(p.nssfEr)} />
        <Row label="Total cost to company" amount={ugx(p.costToCompany)} />
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "6px 14px", marginTop: 16, fontSize: 12 }}>
        <dt style={{ color: "var(--text-2)" }}>TIN</dt><dd style={{ margin: 0, color: "var(--text)" }}>{e.tin || "—"}</dd>
        <dt style={{ color: "var(--text-2)" }}>NSSF no.</dt><dd style={{ margin: 0, color: "var(--text)" }}>{e.nssfNumber || "—"}</dd>
        <dt style={{ color: "var(--text-2)" }}>Bank</dt><dd style={{ margin: 0, color: "var(--text)" }}>{e.bankName} · {e.bankAccount}</dd>
      </dl>
    </Modal>
  );
}

/* ============================== Appraisals ============================== */
function Appraisals({ ctx }) {
  const { store, empById, setModal } = ctx;
  const list = [...store.appraisals].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (!list.length) {
    return <Card pad><div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}><Star size={30} style={{ opacity: 0.5, marginBottom: 8 }} /><div>No appraisals recorded. Use “New appraisal” to add one.</div></div></Card>;
  }
  const ratingPill = (ov) => ov >= 4.5 ? ["success", "Excellent"] : ov >= 3.5 ? ["info", "Strong"] : ov >= 2.5 ? ["warning", "Fair"] : ["danger", "Needs support"];
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
      {list.map((a) => {
        const e = empById(a.empId);
        const ov = appraisalOverall(a);
        const [tone, text] = ratingPill(ov);
        return (
          <Card key={a.id}>
            <CardHead title={<EmpCell emp={e} />} right={<Tag>{a.period}</Tag>} />
            <div style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "var(--text)" }}>{ov.toFixed(1)}</div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>/ 5 overall</div>
                <div style={{ marginLeft: "auto" }}><Pill tone={tone}>{text}</Pill></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {APPRAISAL_METRICS.map(([k, lab]) => (
                  <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{lab}</span>
                    <Rating value={Number(a[k]) || 0} />
                  </div>
                ))}
              </div>
              {a.comments && <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--text-2)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>“{a.comments}”</div>}
              <div style={{ marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11.5, color: "var(--muted)", marginRight: "auto" }}>Reviewer: {a.reviewer || "—"}</span>
                <Btn size="sm" variant="danger" onClick={() => setModal(() => (cc) => <ConfirmDelete ctx={cc} api={appraisalsApi} id={a.id} label={a.id} />)}><Trash2 size={13} />Delete</Btn>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function AppraisalForm({ ctx }) {
  const emps = ctx.store.employees;
  const [f, setF] = useState({ empId: emps[0]?.id || "", period: "", reviewer: "", comments: "", technical: 3, safety: 3, teamwork: 3, punctuality: 3, delivery: 3 });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.empId || !f.period) return alert("Employee and period are required.");
    const rec = { ...f, date: TODAY };
    APPRAISAL_METRICS.forEach(([k]) => (rec[k] = Number(f[k]) || 3));
    await appraisalsApi.create(rec);
    await ctx.reload();
    ctx.setModal(null);
  };
  return (
    <Modal wide title="New appraisal" sub="Competency review (1–5 scale)" onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />Save appraisal</Btn></>}>
      <div style={formGrid}>
        <Field label="Employee" required><Select value={f.empId} onChange={set("empId")} options={emps.map((e) => ({ value: e.id, label: fullName(e) }))} /></Field>
        <Field label="Review period" required><Input value={f.period} onChange={set("period")} placeholder="e.g. H2 2026" /></Field>
        <Field label="Reviewer" full><Input value={f.reviewer} onChange={set("reviewer")} /></Field>
        {APPRAISAL_METRICS.map(([k, lab]) => (
          <Field key={k} label={lab}><Select value={f[k]} onChange={set(k)} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} / 5` }))} /></Field>
        ))}
        <Field label="Comments" full><Textarea value={f.comments} onChange={set("comments")} /></Field>
      </div>
    </Modal>
  );
}

/* ========================= Electronic Staff File ======================== */
const na = (v) => (v == null || v === "" ? "N/A" : v);
const fmtDateLong = (s) => {
  if (!s) return "N/A";
  const d = new Date(s + "T00:00:00");
  return isNaN(d) ? s : d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }).replace(",", "");
};

function SFSection({ title, Icon, children, right }) {
  return (
    <Card style={{ overflow: "hidden" }}>
      <div style={{ padding: "15px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        {Icon && <Icon size={18} style={{ color: "var(--brand)" }} />}
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{title}</h3>
        <div style={{ flex: 1 }} />
        {right}
      </div>
      <div>{children}</div>
    </Card>
  );
}
function SFKV({ rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={i}>
              <td style={{ width: 300, minWidth: 200, fontWeight: 600, color: "var(--text)", background: "var(--surface)", padding: "11px 16px", borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border)", verticalAlign: "top" }}>{k}</td>
              <td style={{ color: "var(--text-2)", padding: "11px 16px", borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border)", verticalAlign: "top" }}>{v == null || v === "" ? "N/A" : v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function SFEmpty({ Icon, title, sub }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
      <Icon size={30} style={{ opacity: 0.5, marginBottom: 10 }} />
      <div style={{ color: "var(--text-2)", fontWeight: 600 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
function TypeBadge({ children }) {
  return <span style={{ padding: "4px 12px", borderRadius: 20, background: "var(--success)", color: "#ffffff", fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</span>;
}
const qualStatusTone = { "Pending Approval": "warning", Approved: "success", Rejected: "danger" };

function StaffFile({ ctx, id }) {
  const e = ctx.empById(id);
  if (!e) return <Card pad><div style={{ padding: 24, color: "var(--muted)" }}>Staff member not found.</div></Card>;
  const ps = derivePayslip(e);
  const openEdit = () => ctx.setModal(() => (cc) => <EmployeeForm ctx={cc} id={e.id} />);
  const viewDoc = () => alert("Document preview isn’t available in this demo prototype.");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1040 }}>
      {/* breadcrumb + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          <span style={{ color: "var(--brand)", cursor: "pointer", fontWeight: 600 }} onClick={() => ctx.setView("employees")}>Employees</span>
          <span style={{ margin: "0 6px" }}>/</span>Staff File
        </div>
        <div style={{ flex: 1 }} />
        <Btn onClick={() => ctx.setView("employees")}><ChevronLeft size={16} />Back</Btn>
        <Btn variant="primary" onClick={openEdit}><Pencil size={15} />Update Staff File</Btn>
      </div>

      {/* header banner */}
      <Card style={{ background: "var(--surface)", padding: "24px 26px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>Electronic Staff File</h2>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--text)", marginTop: 4 }}>{fullName(e).toUpperCase()}</div>
        <div style={{ color: "var(--text-2)", marginTop: 10, fontSize: 13 }}>File Number: {na(e.fileNumber)}</div>
        <div style={{ color: "var(--text-2)", marginTop: 4, fontSize: 13 }}>Position: {na(e.position)}</div>
      </Card>

      {/* Bio Data */}
      <SFSection title="Bio Data Information" Icon={IdCard}>
        <SFKV rows={[
          ["Name", fullName(e)],
          ["Email", na(e.email)],
          ["Gender", (e.gender || "").toLowerCase()],
          ["Date of Birth", fmtDateLong(e.dob)],
          ["Year Joined", fmtDateLong(e.employmentDate)],
          ["Nationality", na(e.nationality)],
          ["NIN", na(e.nationalId)],
          ["TIN", na(e.tin)],
          ["Marital Status", na(e.maritalStatus)],
          ["Religion", na(e.religion)],
          ["Disability", na(e.disability)],
          ["Region of Origin", na(e.origin.region)],
          ["District of Origin", na(e.origin.district)],
          ["County of Origin", na(e.origin.county)],
          ["Village of Origin", na(e.origin.village)],
          ["Residence District", na(e.residence.district)],
          ["Residence County", na(e.residence.county)],
          ["Residence Sub County", na(e.residence.subCounty)],
          ["Residence Parish", na(e.residence.parish)],
          ["Residence Village", na(e.residence.village)],
          ["Profile Photo", <Avatar emp={e} size={40} />],
        ]} />
      </SFSection>

      {/* Contact */}
      <SFSection title="Contact Information" Icon={Contact}>
        <SFKV rows={[
          ["Postal Address", na(e.contact.postalAddress)],
          ["Telephone", na(e.contact.telephone)],
          ["Mobile", na(e.contact.mobile)],
          ["Email", na(e.contact.email)],
          ["District", na(e.contact.district)],
        ]} />
      </SFSection>

      {/* Bank Details */}
      <SFSection title="Bank Details" Icon={Landmark}>
        {e.bankDetails.length ? (
          <DataTable
            columns={[
              { label: "Bank", render: (r) => na(r.bankName) },
              { label: "Account Name", render: (r) => na(r.accountName) },
              { label: "Account Number", render: (r) => na(r.accountNumber) },
              { label: "Branch", render: (r) => na(r.branch) },
            ]}
            rows={e.bankDetails}
          />
        ) : <SFEmpty Icon={Landmark} title="No bank details found" sub="Bank account information will be displayed here once records are added." />}
      </SFSection>

      {/* Employment History */}
      <SFSection title="Employment History" Icon={Briefcase}>
        {e.employmentHistory.length ? (
          <DataTable
            columns={[
              { label: "Position", render: (r) => na(r.position) },
              { label: "Employer", render: (r) => na(r.employer) },
              { label: "Start", render: (r) => fmtDateLong(r.startDate) },
              { label: "End", render: (r) => fmtDateLong(r.endDate) },
            ]}
            rows={e.employmentHistory}
          />
        ) : <SFEmpty Icon={History} title="No employment history found" sub="Employment history will be displayed here once records are added." />}
      </SFSection>

      {/* Academic Qualifications */}
      <SFSection title="Academic Qualifications" Icon={GraduationCap}>
        {e.academicQualifications.length ? (
          <div style={{ padding: "18px 20px" }}>
            {e.academicQualifications.map((q, i, arr) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--success)", marginTop: 8, flex: "none" }} />
                  {i < arr.length - 1 && <div style={{ flex: 1, width: 2, background: "var(--border)" }} />}
                </div>
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 14, background: "var(--surface)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: "var(--text)", flex: 1 }}>{q.title}</div>
                    {q.type && <TypeBadge>{q.type}</TypeBadge>}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-2)", display: "flex", flexDirection: "column", gap: 5 }}>
                    <div><b style={{ color: "var(--text)" }}>Institution:</b> {na(q.institution)}</div>
                    <div><b style={{ color: "var(--text)" }}>Award Date:</b> {fmtDateLong(q.awardDate)}</div>
                    {q.highest !== "" && q.highest != null && <div><b style={{ color: "var(--text)" }}>Highest Qualification:</b> {q.highest || "No"}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ color: "var(--text)" }}>Document:</b> <Btn size="sm" onClick={viewDoc}><FileText size={13} />View Document</Btn></div>
                  </div>
                  {q.status && <div style={{ marginTop: 10 }}><Pill tone={qualStatusTone[q.status] || "muted"}>{q.status}</Pill></div>}
                </div>
              </div>
            ))}
          </div>
        ) : <SFEmpty Icon={GraduationCap} title="No academic qualifications found" sub="Academic records will be displayed here once added." />}
      </SFSection>

      {/* Terms of Employment */}
      <SFSection title="Terms of Employment" Icon={FileCheck}>
        <SFKV rows={[
          ["Terms of Employment", na(e.terms.terms)],
          ["Start Date", fmtDateLong(e.terms.startDate)],
          ["End Date", fmtDateLong(e.terms.endDate)],
          ["Entry Salary", na(e.terms.entrySalary)],
          ["Appointment Authority", na(e.terms.appointmentAuthority)],
          ["Source of Payment", na(e.terms.sourceOfPayment)],
        ]} />
      </SFSection>

      {/* Professional Specialization */}
      <SFSection title="Professional Specialization" Icon={Award}>
        {e.professionalSpecialization.length ? (
          <DataTable
            columns={[
              { label: "Specialization", render: (r) => na(r.area) },
              { label: "Institution", render: (r) => na(r.institution) },
              { label: "Year", render: (r) => na(r.year) },
            ]}
            rows={e.professionalSpecialization}
          />
        ) : <SFEmpty Icon={Award} title="No professional specialization found" sub="Professional specialization will be displayed here once records are added." />}
      </SFSection>

      {/* Professional Membership */}
      <SFSection title="Professional Membership" Icon={ShieldCheck}>
        {e.professionalMembership.length ? (
          <DataTable
            columns={[
              { label: "Organization", render: (r) => na(r.organization) },
              { label: "Membership Number", render: (r) => na(r.membershipNumber) },
              { label: "Date Joined", render: (r) => fmtDateLong(r.dateJoined) },
              { label: "Status", render: (r) => na(r.status) },
            ]}
            rows={e.professionalMembership}
          />
        ) : <SFEmpty Icon={ShieldCheck} title="No professional membership found" sub="Membership records will be displayed here once added." />}
      </SFSection>

      {/* Children / Dependants */}
      <SFSection title="Children / Dependants" Icon={Baby}>
        {e.children.length ? (
          <DataTable
            columns={[
              { label: "Name", render: (r) => na(r.name) },
              { label: "Relationship", render: (r) => na(r.relationship) },
              { label: "Date of Birth", render: (r) => fmtDateLong(r.dob) },
              { label: "Gender", render: (r) => na(r.gender) },
            ]}
            rows={e.children}
          />
        ) : <SFEmpty Icon={Baby} title="No dependants found" sub="Children and dependants will be displayed here once added." />}
      </SFSection>

      {/* Next of Kin */}
      <SFSection title="Next of Kin" Icon={HeartHandshake}>
        {e.nextOfKin.length ? (
          <DataTable
            columns={[
              { label: "Surname", render: (r) => na(r.surname) },
              { label: "Other Names", render: (r) => na(r.otherNames) },
              { label: "Relationship", render: (r) => na(r.relationship) },
              { label: "Contact", render: (r) => na(r.contact) },
              { label: "Address", render: (r) => na(r.address) },
            ]}
            rows={e.nextOfKin}
          />
        ) : <SFEmpty Icon={HeartHandshake} title="No next of kin found" sub="Next of kin will be displayed here once added." />}
      </SFSection>
    </div>
  );
}

/* ============================== Repeater ================================ */
function Repeater({ label, Icon, value, onChange, fields }) {
  const rows = value || [];
  const update = (i, key, val) => onChange(rows.map((r, ri) => (ri === i ? { ...r, [key]: val } : r)));
  const add = () => onChange([...rows, Object.fromEntries(fields.map((f) => [f.key, ""]))]);
  const remove = (i) => onChange(rows.filter((_, ri) => ri !== i));
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 10px", paddingTop: 8, borderTop: "1px dashed var(--border)" }}>
        {Icon && <Icon size={14} style={{ color: "var(--muted)" }} />}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>{label}</span>
        <div style={{ flex: 1 }} />
        <Btn size="sm" onClick={add}><Plus size={13} />Add</Btn>
      </div>
      {rows.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>None added.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, background: "var(--surface)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              {fields.map((f) => (
                <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: f.width ? `span ${f.width}` : "auto" }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}>{f.label}</label>
                  {f.type === "select"
                    ? <Select value={r[f.key] ?? ""} onChange={(e) => update(i, f.key, e.target.value)} options={[""].concat(f.options)} style={{ padding: "7px 9px", fontSize: 12.5 }} />
                    : <Input type={f.type || "text"} value={r[f.key] ?? ""} onChange={(e) => update(i, f.key, e.target.value)} style={{ padding: "7px 9px", fontSize: 12.5 }} />}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Btn size="sm" variant="danger" onClick={() => remove(i)}><Trash2 size={12} />Remove</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ Confirm delete ============================ */
function ConfirmDelete({ ctx, api, id, label }) {
  const remove = async () => { await api.remove(id); await ctx.reload(); ctx.setModal(null); };
  return (
    <Modal title="Delete record?" sub={label} onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" style={{ background: "var(--danger)", color: "#fff" }} onClick={remove}><Trash2 size={15} />Delete</Btn></>}>
      <p style={{ margin: 0, color: "var(--text-2)" }}>This will permanently remove “{label}” from the demo data.</p>
    </Modal>
  );
}

/* =============================== utilities ============================== */
function downloadFile(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
