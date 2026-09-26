import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard, Users, CalendarDays, Clock, Wallet, Star, Plus, Check, X, Menu,
  Search, Pencil, Trash2, Printer, FileText, FileBarChart, Building2, Phone, Mail, MapPin,
  AlertTriangle, ChevronRight, ChevronLeft, ChevronDown, UserPlus, ShieldCheck, TrendingUp,
  Circle, Download, Landmark, History, GraduationCap, Award, Briefcase,
  HeartHandshake, Baby, IdCard, FileCheck, Contact,
  Boxes, PackagePlus, PackageMinus, Warehouse, ClipboardCheck, RefreshCw,
  Navigation, LocateFixed, Smartphone, BarChart3, PieChart, Timer,
  LogOut, LogIn, ShieldQuestion, CalendarCheck, Banknote, Coins, Camera, RotateCcw,
  Settings as SettingsIcon, Megaphone, Building, ShieldCheck as ShieldCheckIcon, Bell,
} from "lucide-react";
import { downloadReportPdf, downloadDocumentPdf, SIGNATORIES, setReportCompany } from "./reportPdf.js";
import { downloadBankReportXlsx, downloadScheduleXlsx } from "./bankXlsx.js";
import {
  employeesApi, leaveApi, attendanceApi, appraisalsApi,
  stockItemsApi, stockMovementsApi, stockClosingsApi, ledgerColumnsApi, payrollRunsApi, suppliersApi, supplierScheduleApi, supplierRunsApi, advancesApi, settingsApi, bankApprovalsApi,
} from "./api/client.js";
import {
  data, TODAY, DEPARTMENTS, deptList, positionsFor, CONTRACT_TYPES, EMP_STATUSES, SITES, LEAVE_TYPES, LEAVE_COLORS,
  APPRAISAL_METRICS, MARITAL_STATUSES, TERMS_TYPES, REPEATER_SCHEMAS,
  derivePayslip, deriveLeaveBalance, appraisalOverall, workingDaysBetween, normalizeEmployee,
  deriveSupplier, resolveScheduleLine, supplierById, SUPPLIER_CATEGORIES, SUPPLIER_STATUSES, SUPPLIER_WHT_RATE, SUPPLIER_VAT_RATE,
  advanceInstallment, advanceModified, ADVANCE_MAX_MONTHS, withAdvanceDeductions, advanceRepaymentForMonth, advanceProgress,
  PERMISSION_MODULES, PERMISSION_ACTIONS, roleById,
  STOCK_CATEGORIES, STOCK_UNITS, MOVEMENT_LABELS, itemBalance, totalStockValue, stockStatus,
  itemValuation, avgCost, movementDelta, sortedMovements, suggestedOrderQty, avgDailyUsage, daysOfCover,
  monthKeyOf, monthLabel, addMonth, prevMonthKey, CURRENT_MONTH, monthLedgerRow, monthIsClosed,
  GEOFENCES, matchGeofence, formatDistance,
  timeToMinutes, minutesToTime, LATE_THRESHOLD_MIN,
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
// Trailing signatory rows for schedule CSV/Excel exports (matches the PDF block).
const signatoryCsvLines = () => ["", '"Approved Signatory"', "",
  SIGNATORIES.map((s) => `"${s.name}"`).join(","),
  SIGNATORIES.map((s) => `"${s.contact}"`).join(",")];
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
function Btn({ children, onClick, variant = "default", size = "md", style, type = "button", title, disabled = false }) {
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
    <button type={type} title={title} disabled={disabled} onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...(disabled ? { cursor: "not-allowed" } : {}), ...style }}>
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
const CardHead = ({ title, sub, right }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 20px", borderBottom: "1px solid var(--border)" }}>
    <div>
      <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>{title}</h3>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
    </div>
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
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px 16px" };

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
  { id: "advances", label: "Salary Advances", Icon: Banknote },
  { id: "suppliers", label: "Suppliers", Icon: Building2 },
  { id: "stock", label: "Stock", Icon: Boxes },
  { id: "appraisals", label: "Appraisals", Icon: Star },
  { id: "reports", label: "Reports", Icon: BarChart3 },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];
// Current user's role definition (from Settings). Admins default to full access.
function currentRole(ctx) {
  const rid = (ctx.currentEmp && ctx.currentEmp.roleId) || (ctx.auth && ctx.auth.role) || "staff";
  return roleById(rid) || roleById("admin");
}
const can = (ctx, moduleId) => { const r = currentRole(ctx); return !r || r.modules?.[moduleId] !== false; };
const canDo = (ctx, action) => { const r = currentRole(ctx); return !r || r.actions?.[action] !== false; };
const VIEW_META = {
  dashboard: ["Workforce Overview", "Front-end demo — HR snapshot for Global Link Associates Ltd"],
  employees: ["Employee Register", "Staff records, contracts and statutory details"],
  leave: ["Leave Management", "Requests, approvals and statutory balances"],
  attendance: ["Attendance & Timesheets", "Daily clock-in, field sites and overtime"],
  payroll: ["Payroll", "Monthly PAYE & NSSF computation (URA rates)"],
  advances: ["Salary Advances", "Staff advance requests, approvals and repayment plans"],
  suppliers: ["Suppliers Register", "Vendor master — bank details, TIN, contacts and tax defaults"],
  stock: ["Stock Management", "Stock in / out with automatic month-end balancing"],
  appraisals: ["Performance Appraisals", "Competency reviews and ratings"],
  reports: ["HR Reports", "Staff analytics — attendance, workforce, leave and payroll"],
  settings: ["Settings Management", "Roles, permissions, announcements and system configuration"],
  staffFile: ["Electronic Staff File", "Complete staff record"],
};

export default function App() {
  const [store, setStore] = useState({ employees: [], leave: [], attendance: [], appraisals: [], stockItems: [], stockMovements: [], stockClosings: [], ledgerColumns: [], payrollRuns: [], suppliers: [], supplierSchedule: [], supplierRuns: [], advances: [], bankApprovals: [], settings: null });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [auth, setAuth] = useState(null); // { empId, role }

  const reload = async () => {
    const [employees, leave, attendance, appraisals, stockItems, stockMovements, stockClosings, ledgerColumns, payrollRuns, suppliers, supplierSchedule, supplierRuns, advances, bankApprovals, settings] = await Promise.all([
      employeesApi.list(), leaveApi.list(), attendanceApi.list(), appraisalsApi.list(),
      stockItemsApi.list(), stockMovementsApi.list(), stockClosingsApi.list(), ledgerColumnsApi.list(), payrollRunsApi.list(), suppliersApi.list(), supplierScheduleApi.list(), supplierRunsApi.list(), advancesApi.list(), bankApprovalsApi.list(), settingsApi.get(),
    ]);
    if (settings && settings.company) setReportCompany(settings.company); // keep report letterhead in sync
    setStore({ employees, leave, attendance, appraisals, stockItems, stockMovements, stockClosings, ledgerColumns, payrollRuns, suppliers, supplierSchedule, supplierRuns, advances, bankApprovals, settings });
  };
  useEffect(() => { reload().then(() => setLoading(false)); }, []);

  const empById = (id) => store.employees.find((e) => e.id === id);
  const signOut = () => setAuth(null);
  const ctx = { store, empById, reload, setModal, auth, currentEmp: auth ? empById(auth.empId) : null, signOut };

  let content;
  if (loading) content = <div style={{ padding: 40, color: "var(--muted)" }}>Loading…</div>;
  else if (!auth) content = <Login employees={store.employees} onLogin={(empId, role) => setAuth({ empId, role })} />;
  else if (auth.role === "staff") content = <StaffPortal ctx={ctx} />;
  else content = <AdminConsole ctx={ctx} />;

  return (<>{content}{modal && modal(ctx)}</>);
}

/* ============================ Responsive shell ============================ */
// True when the viewport is phone/small-tablet width. Drives the drawer layout.
function useIsMobile(bp = 860) {
  const q = `(max-width:${bp}px)`;
  const [m, setM] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q).matches : false));
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on));
  }, [q]);
  return m;
}

// Slide-in overlay that hosts the sidebar on mobile. Locks body scroll while open.
function MobileDrawer({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const h = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", h); };
  }, [open, onClose]);
  return (
    <>
      <div onClick={onClose} aria-hidden style={{ position: "fixed", inset: 0, background: "rgba(4,8,12,.5)", backdropFilter: "blur(2px)", zIndex: 80, opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .2s ease" }} />
      <div role="dialog" aria-modal="true" style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "min(286px, 84vw)", zIndex: 81, transform: open ? "translateX(0)" : "translateX(-102%)", transition: "transform .24s ease", boxShadow: open ? "var(--shadow-lg)" : "none" }}>
        {children}
      </div>
    </>
  );
}

// Hamburger button shown in the header on mobile.
function MenuButton({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Open menu" style={{ flex: "none", width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text)", cursor: "pointer" }}>
      <Menu size={20} />
    </button>
  );
}

function AdminConsole({ ctx }) {
  const [view, setView] = useState("dashboard");
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const openStaffFile = (id) => { setSelectedEmpId(id); setView("staffFile"); };
  const actx = { ...ctx, setView, openStaffFile };
  const navView = view === "staffFile" ? "employees" : view;
  const nav = NAV.filter((n) => can(ctx, n.id));
  const [title, sub] = VIEW_META[view];
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (v) => { setView(v); setMenuOpen(false); };
  const ViewComp = { dashboard: Dashboard, employees: Employees, leave: Leave, attendance: Attendance, payroll: Payroll, advances: Advances, suppliers: Suppliers, stock: Stock, appraisals: Appraisals, reports: Reports, settings: SettingsView }[view];
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "252px 1fr", minHeight: "100vh" }}>
      {isMobile
        ? <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)}><Sidebar view={navView} setView={go} store={ctx.store} nav={nav} /></MobileDrawer>
        : <Sidebar view={navView} setView={setView} store={ctx.store} nav={nav} />}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar title={title} sub={sub} view={view} ctx={actx} onMenu={isMobile ? () => setMenuOpen(true) : null} />
        <div className="gla-fade" key={view + (selectedEmpId || "")} style={{ padding: isMobile ? "16px 14px 48px" : "24px 28px 56px" }}>
          {view === "staffFile" ? <StaffFile ctx={actx} id={selectedEmpId} /> : <ViewComp ctx={actx} />}
        </div>
      </div>
    </div>
  );
}

/* ================================= Login ================================= */
const LOGIN_ROLE_META = {
  admin:   { label: "Administrator", note: "Full access — every module & setting", tone: "#16181d", dim: "#e7e9ec" },
  hr:      { label: "HR Officer", note: "Staff, leave, attendance & payroll", tone: "#2f6f9f", dim: "#e6eff6" },
  finance: { label: "Finance Officer", note: "Payroll, advances, supplier payments & reports", tone: "#12894e", dim: "#e4f4ec" },
  staff:   { label: "Staff — self-service", note: "Clock-in, leave, payslip & advances", tone: "#98690f", dim: "#faf0d3" },
};
function Login({ employees, onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const tryLogin = (em) => {
    const e = employees.find((x) => (x.email || "").toLowerCase() === em.trim().toLowerCase());
    if (!e) { setErr("No staff account matches that email."); return; }
    onLogin(e.id, e.role || "staff");
  };
  const pickByRole = (r) => employees.find((e) => (e.role || "staff") === r);
  const consoleAccounts = ["admin", "hr", "finance"].map(pickByRole).filter(Boolean);
  const staffAccount = employees.find((e) => e.id === "GLA-006") || pickByRole("staff");
  const chip = (e) => {
    if (!e) return null;
    const rm = LOGIN_ROLE_META[e.role || "staff"] || LOGIN_ROLE_META.staff;
    return (
      <button key={e.id} onClick={() => onLogin(e.id, e.role || "staff")} title={`Sign in as ${e.firstName} ${e.lastName}`}
        onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = rm.tone; ev.currentTarget.style.background = "var(--bg-elevated)"; ev.currentTarget.style.boxShadow = "var(--shadow)"; }}
        onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = "var(--border)"; ev.currentTarget.style.background = "var(--surface)"; ev.currentTarget.style.boxShadow = "none"; }}
        style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 11, background: "var(--surface)", cursor: "pointer", textAlign: "left", width: "100%", transition: "all .14s ease" }}>
        <Avatar emp={e} size={34} />
        <div style={{ lineHeight: 1.2, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>{e.firstName} {e.lastName}</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: rm.tone, background: rm.dim, padding: "2px 7px", borderRadius: 20 }}>{rm.label}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{e.jobTitle} · {e.email}</div>
        </div>
        <LogIn size={16} style={{ color: rm.tone, flex: "none" }} />
      </button>
    );
  };
  const sectionLabel = (t) => <div style={{ fontSize: 10, color: "var(--muted)", margin: "0 0 8px", fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase" }}>{t}</div>;
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "radial-gradient(1100px 520px at 50% -10%, var(--info-dim), transparent 60%), var(--bg)" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, justifyContent: "center", marginBottom: 8 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff", fontSize: 16, background: "#16181d", boxShadow: "inset 0 2.5px 0 var(--accent), var(--shadow)" }}>GL</div>
          <div><div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17 }}>Global Link Associates</div><div style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: ".1em", textTransform: "uppercase" }}>IHRSM · Kampala</div></div>
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-2)", marginBottom: 18 }}>Integrated HR and Supplier Management System (IHRSM)</div>
        <Card style={{ padding: 24, boxShadow: "var(--shadow-lg)" }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: "var(--text)" }}>Sign in to your portal</h2>
          <div style={{ color: "var(--text-2)", fontSize: 12.5, marginTop: 4, marginBottom: 18 }}>Your view is set automatically by your role — management get the console, staff get self-service.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <Field label="Work email"><Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="name@glassociates.co.ug" onKeyDown={(e) => e.key === "Enter" && tryLogin(email)} /></Field>
            <Field label="Password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && tryLogin(email)} /></Field>
            {err && <div style={{ fontSize: 12, color: "var(--danger)", background: "var(--danger-dim)", padding: "8px 11px", borderRadius: 8 }}>{err}</div>}
            <Btn variant="primary" onClick={() => tryLogin(email)} style={{ justifyContent: "center", padding: "12px" }}><LogIn size={16} />Sign in</Btn>
          </div>
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px dashed var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Demo accounts</div>
              <div style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: ".04em", textTransform: "uppercase" }}>Tap to sign in</div>
            </div>
            {sectionLabel("Management console")}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{consoleAccounts.map(chip)}</div>
            <div style={{ marginTop: 14 }}>{sectionLabel("Staff portal")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{chip(staffAccount)}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 14, textAlign: "center", lineHeight: 1.5 }}>Demo prototype — the password isn't checked. Each account opens a different role-based view.</div>
          </div>
        </Card>
        <div style={{ textAlign: "center", fontSize: 10.5, color: "var(--muted)", marginTop: 16, fontFamily: "var(--font-mono)", letterSpacing: ".03em" }}>People · Payroll · Leave · Attendance · Advances · Stores</div>
      </div>
    </div>
  );
}

/* ============================ Staff portal ============================== */
const STAFF_META = {
  myportal: ["My Portal", "Your self-service dashboard"],
  clockin: ["Clock In", "Capture attendance with your location"],
  myleave: ["My Leave", "Apply for and track your leave"],
  mypayslip: ["My Payslip", "Your monthly pay breakdown"],
  myadvance: ["Salary Advance", "Request an advance and track repayment"],
  myfile: ["My File", "Your electronic staff record"],
};
const STAFF_NAV = [
  ["myportal", "My Portal", LayoutDashboard],
  ["clockin", "Clock In", LocateFixed],
  ["myleave", "My Leave", CalendarDays],
  ["mypayslip", "My Payslip", Wallet],
  ["myadvance", "Salary Advance", Banknote],
  ["myfile", "My File", IdCard],
];
const byDateDesc = (a, b) => (b.date + (b.clockIn || "")).localeCompare(a.date + (a.clockIn || ""));

function StaffPortal({ ctx }) {
  const emp = ctx.currentEmp;
  const [sv, setSv] = useState("myportal");
  const [title, sub] = STAFF_META[sv];
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (v) => { setSv(v); setMenuOpen(false); };
  if (!emp) return null;
  const sidebar = <StaffSidebar emp={emp} sv={sv} setSv={isMobile ? go : setSv} onSignOut={ctx.signOut} />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "252px 1fr", minHeight: "100vh" }}>
      {isMobile ? <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)}>{sidebar}</MobileDrawer> : sidebar}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 20, background: "color-mix(in srgb, var(--bg) 85%, transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)", padding: isMobile ? "12px 14px" : "16px 28px", display: "flex", alignItems: "center", gap: 12 }}>
          {isMobile && <MenuButton onClick={() => setMenuOpen(true)} />}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
            {!isMobile && <div style={{ color: "var(--text-2)", fontSize: 12.5, marginTop: 2 }}>{sub}</div>}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar emp={emp} size={32} />
            {!isMobile && <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{emp.firstName} {emp.lastName}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Staff</div>
            </div>}
            <Btn variant="ghost" size="sm" onClick={ctx.signOut} title="Sign out"><LogOut size={16} /></Btn>
          </div>
        </header>
        <div className="gla-fade" key={sv} style={{ padding: isMobile ? "16px 14px 48px" : "24px 28px 56px" }}>
          {sv === "myportal" && <MyPortal ctx={ctx} setSv={setSv} />}
          {sv === "clockin" && <MyClockIn ctx={ctx} />}
          {sv === "myleave" && <MyLeave ctx={ctx} />}
          {sv === "mypayslip" && <MyPayslip ctx={ctx} />}
          {sv === "myadvance" && <MyAdvance ctx={ctx} />}
          {sv === "myfile" && <StaffFile ctx={ctx} id={emp.id} onBack={() => setSv("myportal")} backLabel="My Portal" />}
        </div>
      </div>
    </div>
  );
}

function StaffSidebar({ emp, sv, setSv, onSignOut }) {
  return (
    <aside style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
      <div style={{ padding: "20px 20px 16px", display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid var(--sidebar-border)" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flex: "none", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff", fontSize: 15, background: "#1b1e25", boxShadow: "inset 0 2.5px 0 var(--accent), inset 0 0 0 1px rgba(255,255,255,.08)" }}>GL</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#fff", lineHeight: 1.15 }}>
          Global Link<br />Associates
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 400, fontSize: 10, letterSpacing: ".12em", color: "var(--sidebar-muted)", textTransform: "uppercase", marginTop: 4 }}>Staff Portal</div>
        </div>
      </div>
      <nav style={{ padding: 12, display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sidebar-muted)", padding: "14px 12px 6px" }}>Self-service</div>
        {STAFF_NAV.map(([id, label, Icon]) => {
          const active = sv === id;
          return (
            <button key={id} onClick={() => setSv(id)}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 9, border: "none", width: "100%", textAlign: "left", fontWeight: 500, fontSize: 13.5, color: active ? "var(--sidebar-active-fg)" : "var(--sidebar-fg)", background: active ? "var(--sidebar-active-bg)" : "transparent" }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,.05)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              <Icon size={18} style={{ opacity: 0.9, color: active ? "var(--accent)" : "inherit" }} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
      <div style={{ padding: 14, borderTop: "1px solid var(--sidebar-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Avatar emp={emp} size={30} />
          <div style={{ lineHeight: 1.15, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.firstName} {emp.lastName}</div>
            <div style={{ fontSize: 10.5, color: "var(--sidebar-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.jobTitle}</div>
          </div>
        </div>
        <button onClick={onSignOut} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "8px", borderRadius: 8, border: "1px solid var(--sidebar-border)", background: "transparent", color: "var(--sidebar-fg)", fontWeight: 600, fontSize: 12.5 }}><LogOut size={15} />Sign out</button>
      </div>
    </aside>
  );
}

function TodayStatus({ rec }) {
  if (!rec) return <Pill tone="muted">Not clocked in</Pill>;
  if (rec.lat == null) return <Pill tone="info">Clocked in {rec.clockIn}</Pill>;
  return rec.withinFence
    ? <Pill tone="success">Clocked in {rec.clockIn} · within {rec.geoSite}</Pill>
    : <Pill tone="danger">Clocked in {rec.clockIn} · outside fence</Pill>;
}

function MyPortal({ ctx, setSv }) {
  const emp = ctx.currentEmp;
  const today = ctx.store.attendance.find((a) => a.empId === emp.id && a.date === TODAY);
  const annual = deriveLeaveBalance(emp, "Annual");
  const sick = deriveLeaveBalance(emp, "Sick");
  const myLeave = ctx.store.leave.filter((l) => l.empId === emp.id);
  const pending = myLeave.filter((l) => l.status === "Pending").length;
  const myAtt = ctx.store.attendance.filter((a) => a.empId === emp.id);
  const start = (() => { const d = new Date(TODAY + "T00:00:00"); d.setDate(d.getDate() - 13); return d.toISOString().slice(0, 10); })();
  const present14 = myAtt.filter((a) => a.date >= start && a.status !== "Absent" && a.clockIn).length;
  const recentAtt = [...myAtt].sort(byDateDesc).slice(0, 5);
  const action = (Icon, label, onClick, variant) => <Btn variant={variant} onClick={onClick} style={{ justifyContent: "flex-start" }}><Icon size={16} />{label}</Btn>;
  return (
    <>
      <Announcements ctx={ctx} audience="staff" />
      <Card style={{ padding: "20px 22px", marginBottom: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar emp={emp} size={52} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20 }}>Good day, {emp.firstName}</div>
          <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 2 }}>{emp.jobTitle} · {emp.department} · {fmtDate(TODAY)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <TodayStatus rec={today} />
          {!today && <Btn variant="primary" onClick={() => ctx.setModal(() => (cc) => <ClockInModal ctx={cc} empId={emp.id} />)}><LocateFixed size={16} />Clock in now</Btn>}
        </div>
      </Card>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={CalendarDays} label="Annual leave left" value={`${annual.remaining} / ${annual.entitlement}`} meta="working days" tone="success" />
        <StatCard Icon={CalendarCheck} label="Sick leave left" value={`${sick.remaining} / ${sick.entitlement}`} meta="working days" tone="brand" />
        <StatCard Icon={Timer} label="Pending requests" value={pending} meta="awaiting HR decision" tone="accent" />
        <StatCard Icon={Check} label="Present (14 days)" value={present14} meta="days clocked in" tone="success" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }} className="rep-cols">
        <Card>
          <CardHead title="Quick actions" />
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {action(LocateFixed, "Clock in with location", () => ctx.setModal(() => (cc) => <ClockInModal ctx={cc} empId={emp.id} />), "primary")}
            {action(CalendarDays, "Apply for leave", () => ctx.setModal(() => (cc) => <LeaveForm ctx={cc} lockEmpId={emp.id} />))}
            {action(Wallet, "View my payslip", () => setSv("mypayslip"))}
            {action(Banknote, "Request salary advance", () => setSv("myadvance"))}
            {action(IdCard, "View my staff file", () => setSv("myfile"))}
          </div>
        </Card>
        <Card>
          <CardHead title="My recent attendance" right={<Btn size="sm" onClick={() => setSv("clockin")}>View all</Btn>} />
          <DataTable
            columns={[
              { label: "Date", render: (a) => fmtDate(a.date) },
              { label: "In", render: (a) => a.clockIn || "—" },
              { label: "Out", render: (a) => a.clockOut || "—" },
              { label: "Site", render: (a) => a.site },
              { label: "Geo", render: (a) => a.lat == null ? <Pill tone="muted">No GPS</Pill> : a.withinFence ? <Pill tone="success">Within</Pill> : <Pill tone="danger">Outside</Pill> },
            ]}
            rows={recentAtt}
            empty="No attendance yet."
          />
        </Card>
      </div>
    </>
  );
}

function MyClockIn({ ctx }) {
  const emp = ctx.currentEmp;
  const today = ctx.store.attendance.find((a) => a.empId === emp.id && a.date === TODAY);
  const mine = ctx.store.attendance.filter((a) => a.empId === emp.id).sort(byDateDesc).slice(0, 12);
  return (
    <>
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, padding: "18px 20px" }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: "rgba(47,111,159,.12)", color: "var(--brand)" }}><Smartphone size={22} /></div>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Clock in with your location</div>
            <div style={{ color: "var(--text-2)", fontSize: 12.5, marginTop: 2 }}>Your GPS point is checked against the nearest site geofence.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <TodayStatus rec={today} />
            <Btn variant="primary" onClick={() => ctx.setModal(() => (cc) => <ClockInModal ctx={cc} empId={emp.id} />)}><LocateFixed size={16} />{today ? "Clock in again" : "Capture location & clock in"}</Btn>
          </div>
        </div>
      </Card>
      <Card>
        <CardHead title="My clock-in history" />
        <DataTable
          columns={[
            { label: "Date", render: (a) => fmtDate(a.date) },
            { label: "In", render: (a) => a.clockIn || "—" },
            { label: "Out", render: (a) => a.clockOut || "—" },
            { label: "Site", render: (a) => a.site },
            { label: "GPS location", render: (a) => a.lat != null ? <span className="mono" style={{ fontSize: 12 }}>{a.lat.toFixed(5)}, {a.lng.toFixed(5)}</span> : <span style={{ color: "var(--muted)" }}>—</span> },
            { label: "Geo-fence", render: (a) => a.lat == null ? <Pill tone="muted">No location</Pill> : a.withinFence ? <Pill tone="success">Within fence</Pill> : <Pill tone="danger">Outside · {formatDistance(a.distanceM)}</Pill> },
            { label: "Status", render: (a) => <Pill tone={attTone[a.status]}>{a.status}</Pill> },
          ]}
          rows={mine}
          empty="You have no clock-ins yet."
        />
      </Card>
    </>
  );
}

function MyLeave({ ctx }) {
  const emp = ctx.currentEmp;
  const annual = deriveLeaveBalance(emp, "Annual");
  const sick = deriveLeaveBalance(emp, "Sick");
  const mine = [...ctx.store.leave.filter((l) => l.empId === emp.id)].sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
  const dueBack = mine.filter((l) => l.status === "Approved" && !l.returnedAt && !LEAVE_TYPES[l.type]?.duty && l.endDate <= TODAY);
  const reportBack = async (l) => { await leaveApi.update(l.id, { returnedAt: TODAY }); await ctx.reload(); };
  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={CalendarDays} label="Annual leave" value={`${annual.remaining} left`} meta={`of ${annual.entitlement} · ${annual.used} used`} tone="success" />
        <StatCard Icon={CalendarCheck} label="Sick leave" value={`${sick.remaining} left`} meta={`of ${sick.entitlement} · ${sick.used} used`} tone="brand" />
        <StatCard Icon={Timer} label="Requests" value={mine.length} meta={`${mine.filter((l) => l.status === "Pending").length} pending`} tone="accent" />
      </div>
      {dueBack.length > 0 && (
        <Banner Icon={CalendarCheck}>Welcome back! You have {dueBack.length} completed leave{dueBack.length > 1 ? "s" : ""} to confirm.{" "}
          {dueBack.map((l) => <Btn key={l.id} size="sm" variant="success" onClick={() => reportBack(l)} style={{ marginLeft: 6 }}><CalendarCheck size={13} />Report back from {l.type}</Btn>)}
        </Banner>
      )}
      <Toolbar>
        <div style={{ flex: 1 }} />
        <Btn variant="primary" onClick={() => ctx.setModal(() => (cc) => <LeaveForm ctx={cc} lockEmpId={emp.id} />)}><Plus size={16} />Apply for leave</Btn>
      </Toolbar>
      <Card>
        <CardHead title="My leave requests" />
        <DataTable
          columns={[
            { label: "Type", render: (l) => <TypeTag type={l.type} /> },
            { label: "Period", render: (l) => `${fmtDate(l.startDate)} → ${fmtDate(l.endDate)}` },
            { label: "Days", num: true, render: (l) => l.days },
            { label: "Status", render: (l) => { const b = leaveBackStatus(l); return <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><Pill tone={leaveTone[l.status]}>{l.status}</Pill>{b && b.key !== "scheduled" && <Pill tone={b.tone}>{b.label}</Pill>}</div>; } },
            { label: "Reason", render: (l) => <span style={{ color: "var(--text-2)" }}>{l.reason || "—"}</span> },
            { label: "", render: (l) => (l.status === "Approved" && !l.returnedAt && !LEAVE_TYPES[l.type]?.duty && l.endDate <= TODAY)
              ? <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn size="sm" variant="success" onClick={() => reportBack(l)}><CalendarCheck size={13} />Report back</Btn></div>
              : (l.decidedBy ? <span style={{ fontSize: 12, color: "var(--muted)" }}>{l.decidedBy} · {fmtDate(l.decidedAt)}</span> : "—") },
          ]}
          rows={mine}
          empty="You have no leave requests. Use “Apply for leave”."
        />
      </Card>
    </>
  );
}

function MyPayslip({ ctx }) {
  const emp = ctx.currentEmp;
  const runs = ctx.store.payrollRuns || [];
  // Payslips issued to this employee = rows inside processed monthly runs.
  const issued = runs
    .map((run) => ({ run, row: (run.rows || []).find((r) => r.empId === emp.id) }))
    .filter((x) => x.row)
    .sort((a, b) => (a.run.month < b.run.month ? 1 : -1));
  const [month, setMonth] = useState(issued[0] ? issued[0].run.month : "");
  const sel = issued.find((x) => x.run.month === month) || issued[0];
  const currentIssued = issued.some((x) => x.run.month === CURRENT_MONTH);

  const Row = ({ label, amount, deduct, add, total }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: total ? "13px 16px" : "10px 16px", borderBottom: "1px solid var(--border)", fontSize: 13.5, background: total ? "var(--ink)" : "transparent", fontWeight: total ? 700 : 400 }}>
      <span style={{ color: total ? "rgba(255,255,255,.85)" : "var(--text-2)" }}>{label}</span>
      <span className="mono" style={{ color: total ? "#34d399" : deduct ? "var(--danger)" : add ? "var(--success)" : "var(--text)", fontSize: total ? 15 : 13.5 }}>{amount}</span>
    </div>
  );

  if (!issued.length) {
    return (
      <Card style={{ maxWidth: 620 }}>
        <div style={{ padding: "44px 24px", textAlign: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, margin: "0 auto 14px", display: "grid", placeItems: "center", background: "var(--surface-2)", color: "var(--muted)" }}><Wallet size={26} /></div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>No payslips issued yet</div>
          <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 6, maxWidth: 360, marginInline: "auto" }}>Your payslip will appear here automatically once HR processes the monthly payroll. Nothing to do for now.</div>
        </div>
      </Card>
    );
  }

  const r = sel.row, run = sel.run, cols = run.columns || [];
  const paid = run.status === "Paid";
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>Payslip month</span>
        <Select value={sel.run.month} onChange={(e) => setMonth(e.target.value)} options={issued.map((x) => ({ value: x.run.month, label: monthLabel(x.run.month) }))} style={{ width: "auto" }} />
        <Pill tone={paid ? "success" : "info"}>{paid ? "Paid · " + fmtDate(run.paidAt) : "Processed · " + fmtDate(run.processedAt)}</Pill>
      </div>
      {!currentIssued && (
        <Banner Icon={AlertTriangle}>Your {monthLabel(CURRENT_MONTH)} payslip isn't out yet — it will appear here once HR processes this month's payroll. Below is your most recent issued payslip.</Banner>
      )}
      <Card style={{ maxWidth: 620 }}>
        <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>Global Link Associates Ltd</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>Payslip · {monthLabel(run.month)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700 }}>{fullName(emp)}</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>{emp.id} · {emp.jobTitle}</div>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <Row label="Basic gross salary" amount={ugx(r.gross)} />
            <Row label="PAYE (URA)" amount={"− " + ugx(r.paye)} deduct />
            <Row label="NSSF employee (5%)" amount={"− " + ugx(r.nssf5)} deduct />
            {r.advance > 0 && <Row label="Advance / other deductions" amount={"− " + ugx(r.advance)} deduct />}
            {cols.filter((c) => c.kind !== "text").map((c) => {
              const v = Number((r.custom || {})[c.id]) || 0;
              if (!v) return null;
              const isDed = c.kind === "deduction";
              return <Row key={c.id} label={c.label} amount={(isDed ? "− " : "+ ") + ugx(v)} deduct={isDed} add={!isDed} />;
            })}
            <Row label="Net pay" amount={ugx(r.net)} total />
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>Employer NSSF (10%): {ugx(r.contribution)} · Total cost to company: {ugx(r.gross + r.contribution)}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>Issued by {run.processedBy || "HR"} · {fmtDate(run.processedAt)}{paid ? ` · Paid ${fmtDate(run.paidAt)}` : ""}</div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={() => window.print()}><Printer size={15} />Print payslip</Btn>
          </div>
        </div>
      </Card>
    </>
  );
}

/* ============================ Salary advances =========================== */
const advanceTone = { Approved: "success", Pending: "warning", Rejected: "danger" };

function ProgressBar({ pct, tone = "var(--success)", height = 7 }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div style={{ height, borderRadius: height, background: "var(--surface-2)", overflow: "hidden", minWidth: 90 }}>
      <div style={{ width: p + "%", height: "100%", background: tone, borderRadius: height, transition: "width .2s" }} />
    </div>
  );
}

// Recovery status pill for an approved advance (ties to processed payroll).
function advanceStatusPill(a, prog) {
  if (a.status === "Pending") return <Pill tone="warning">Pending</Pill>;
  if (a.status === "Rejected") return <Pill tone="danger">Rejected</Pill>;
  if (prog.cleared) return <Pill tone="success">Cleared</Pill>;
  return <Pill tone="info">Repaying {prog.monthsRecovered}/{prog.months}</Pill>;
}

// Month-by-month recovery schedule for one advance, showing which months are
// recovered (via a processed payroll run), current, or upcoming.
function AdvanceSchedule({ ctx, id }) {
  const a = (ctx.store.advances || []).find((x) => x.id === id);
  const emp = a ? ctx.empById(a.empId) : null;
  if (!a) return null;
  const prog = advanceProgress(a, ctx.store.payrollRuns);
  return (
    <Modal title="Advance repayment schedule" sub={emp ? `${fullName(emp)} · ${emp.id}` : ""} onClose={() => ctx.setModal(null)}
      footer={<Btn variant="primary" onClick={() => ctx.setModal(null)}>Close</Btn>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}><div style={{ fontSize: 11, color: "var(--muted)" }}>Principal</div><div style={{ fontWeight: 700 }}>{ugx(prog.amount)}</div></div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}><div style={{ fontSize: 11, color: "var(--muted)" }}>Recovered</div><div style={{ fontWeight: 700, color: "var(--success)" }}>{ugx(prog.recovered)}</div></div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}><div style={{ fontSize: 11, color: "var(--muted)" }}>Outstanding</div><div style={{ fontWeight: 700, color: prog.outstanding ? "var(--danger)" : "var(--success)" }}>{ugx(prog.outstanding)}</div></div>
      </div>
      <div style={{ marginBottom: 14 }}><ProgressBar pct={prog.amount ? (prog.recovered / prog.amount) * 100 : 0} height={9} /></div>
      <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {prog.schedule.map((s, i) => {
          const isNext = !s.paid && s.month === prog.nextMonth;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: i < prog.schedule.length - 1 ? "1px solid var(--border)" : "none", background: s.paid ? "var(--success-dim)" : "transparent" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Installment {i + 1} · {monthLabel(s.month)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="mono" style={{ fontSize: 12.5 }}>{ugx(s.due)}</span>
                {s.paid ? <Pill tone="success">Recovered</Pill> : isNext ? <Pill tone="info">Next</Pill> : <Pill tone="muted">Scheduled</Pill>}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>A month counts as recovered once its payroll run has been processed. Outstanding balance updates automatically as payroll is run.</div>
    </Modal>
  );
}

function MyAdvance({ ctx }) {
  const emp = ctx.currentEmp;
  const runs = ctx.store.payrollRuns || [];
  const mine = [...(ctx.store.advances || []).filter((a) => a.empId === emp.id)].sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
  const prog = (a) => advanceProgress(a, runs);
  const active = mine.filter((a) => a.status === "Approved" && !prog(a).cleared);
  const outstanding = mine.filter((a) => a.status === "Approved").reduce((s, a) => s + prog(a).outstanding, 0);
  const thisMonth = advanceRepaymentForMonth(mine, emp.id, CURRENT_MONTH);
  const pending = mine.filter((a) => a.status === "Pending").length;
  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={Banknote} label="Outstanding balance" value={ugxShort(outstanding)} meta={active.length ? `${active.length} in repayment` : "nothing owed"} tone={outstanding ? "brand" : "success"} />
        <StatCard Icon={Coins} label="This month's deduction" value={ugxShort(thisMonth)} meta={`${monthLabel(CURRENT_MONTH)} · from net pay`} tone="accent" />
        <StatCard Icon={Timer} label="Pending requests" value={pending} meta="awaiting HR decision" tone="warning" />
      </div>
      <Banner Icon={Banknote}>Request a salary advance and choose how many months to repay it over. HR reviews each request and may adjust the amount or period. The monthly installment is recovered from your pay automatically until the balance clears.</Banner>
      <Toolbar>
        <div style={{ flex: 1 }} />
        <Btn variant="primary" onClick={() => ctx.setModal(() => (cc) => <AdvanceForm ctx={cc} lockEmpId={emp.id} />)}><Plus size={16} />Request advance</Btn>
      </Toolbar>
      <Card>
        <CardHead title="My advances" />
        <DataTable
          columns={[
            { label: "Requested", render: (a) => fmtDate(a.requestedAt) },
            { label: "Amount asked", num: true, render: (a) => ugx(a.amount) },
            { label: "Status", render: (a) => <div style={{ display: "flex", gap: 6, alignItems: "center" }}>{advanceStatusPill(a, prog(a))}{advanceModified(a) && <Tag>modified</Tag>}</div> },
            { label: "Repayment", render: (a) => {
              if (a.status === "Pending") return <span style={{ color: "var(--muted)" }}>—</span>;
              if (a.status === "Rejected") return <span style={{ color: "var(--danger)" }}>Rejected</span>;
              const d = advanceInstallment(a); const g = prog(a);
              return <div style={{ minWidth: 150 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}><span style={{ color: "var(--success)" }}>{ugx(g.recovered)} paid</span><span style={{ color: g.outstanding ? "var(--danger)" : "var(--muted)" }}>{ugx(g.outstanding)} left</span></div>
                <ProgressBar pct={g.amount ? (g.recovered / g.amount) * 100 : 0} />
                <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 3 }}>{ugx(d.monthly)}/mo × {d.months}</div>
              </div>;
            } },
            { label: "HR note", render: (a) => <span style={{ fontSize: 12, color: "var(--text-2)" }}>{a.note || (a.reason ? `“${a.reason}”` : "—")}</span> },
          ]}
          rows={mine}
          empty="You have no advance requests. Use “Request advance”."
        />
      </Card>
    </>
  );
}

function AdvanceForm({ ctx, lockEmpId }) {
  const emps = ctx.store.employees;
  const [f, setF] = useState({ empId: lockEmpId || emps[0]?.id || "", amount: "", months: 3, reason: "" });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const lockedEmp = lockEmpId ? ctx.empById(lockEmpId) : null;
  const amount = Number(f.amount) || 0, months = Number(f.months) || 1;
  const monthly = Math.round(amount / months);
  const reqEmp = ctx.empById(f.empId);
  const net = reqEmp ? derivePayslip(reqEmp).net : 0;
  const pctOfNet = net > 0 ? Math.round((monthly / net) * 100) : 0;
  const submit = async () => {
    if (!f.empId) return alert("Employee is required.");
    if (amount <= 0) return alert("Enter the advance amount.");
    await advancesApi.create({ empId: f.empId, amount, months, reason: f.reason, status: "Pending", requestedAt: TODAY, decidedBy: "", decidedAt: "", approvedAmount: null, approvedMonths: null, startMonth: "", note: "" });
    await ctx.reload(); ctx.setModal(null);
  };
  return (
    <Modal title="Request salary advance" sub="Submitted to HR/Admin for approval" onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />Submit request</Btn></>}>
      <div style={formGrid}>
        {lockedEmp
          ? <Field label="Employee" full><div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)" }}><Avatar emp={lockedEmp} size={28} /><span style={{ fontWeight: 600 }}>{fullName(lockedEmp)}</span><span style={{ color: "var(--muted)", fontSize: 12 }}>· {lockedEmp.id}</span></div></Field>
          : <Field label="Employee" required full><Select value={f.empId} onChange={set("empId")} options={emps.map((e) => ({ value: e.id, label: `${fullName(e)} · ${e.id}` }))} /></Field>}
        <Field label="Advance amount (UGX)" required><Input type="number" value={f.amount} onChange={set("amount")} placeholder="e.g. 500000" /></Field>
        <Field label="Repay over (months)" required><Select value={f.months} onChange={set("months")} options={Array.from({ length: ADVANCE_MAX_MONTHS }, (_, i) => ({ value: i + 1, label: `${i + 1} month${i ? "s" : ""}` }))} /></Field>
        <Field label="Reason" full><Textarea value={f.reason} onChange={set("reason")} placeholder="Briefly explain the reason for the advance" /></Field>
        <div style={{ gridColumn: "1 / -1", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-2)", fontSize: 13 }}>Estimated repayment</span>
          <span className="mono" style={{ fontWeight: 700 }}>{ugx(monthly)} / month × {months}</span>
        </div>
        {net > 0 && amount > 0 && (
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: monthly >= net ? "var(--danger)" : pctOfNet > 40 ? "var(--warning)" : "var(--text-2)" }}>
            That's <b>{pctOfNet}%</b> of {fullName(reqEmp)}'s current net pay ({ugx(net)}){monthly >= net ? " — exceeds net pay, consider a longer period." : pctOfNet > 40 ? " — on the high side." : "."}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Advances({ ctx }) {
  const { store, empById, reload, setModal } = ctx;
  const [statusFilter, setStatusFilter] = useState("");
  const advances = store.advances || [];
  const runs = store.payrollRuns || [];
  const prog = (a) => advanceProgress(a, runs);
  const pend = advances.filter((a) => a.status === "Pending").length;
  const appr = advances.filter((a) => a.status === "Approved");
  const active = appr.filter((a) => !prog(a).cleared);
  const totalPrincipal = appr.reduce((s, a) => s + advanceInstallment(a).amount, 0);
  const totalOutstanding = appr.reduce((s, a) => s + prog(a).outstanding, 0);
  const totalRecovered = appr.reduce((s, a) => s + prog(a).recovered, 0);
  // Recovery scheduled for the current month across all staff.
  const monthlyRecovery = store.employees.reduce((s, e) => s + advanceRepaymentForMonth(advances, e.id, CURRENT_MONTH), 0);

  let list = [...advances].sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
  if (statusFilter) list = list.filter((a) => a.status === statusFilter);

  const approveAsIs = async (a) => {
    await advancesApi.update(a.id, { status: "Approved", approvedAmount: Number(a.amount), approvedMonths: Number(a.months), startMonth: CURRENT_MONTH, decidedBy: "Robert Okello (HR)", decidedAt: TODAY, note: a.note || "Approved as requested." });
    await reload();
  };
  const reject = async (a) => {
    if (window.confirm(`Reject ${fullName(empById(a.empId))}'s advance request?`)) {
      await advancesApi.update(a.id, { status: "Rejected", decidedBy: "Robert Okello (HR)", decidedAt: TODAY });
      await reload();
    }
  };

  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={Timer} label="Pending" value={pend} meta="awaiting decision" tone="accent" />
        <StatCard Icon={Banknote} label="Outstanding" value={ugxShort(totalOutstanding)} meta={`of ${ugxShort(totalPrincipal)} advanced`} tone="brand" />
        <StatCard Icon={Check} label="Recovered to date" value={ugxShort(totalRecovered)} meta="via processed payroll" tone="success" />
        <StatCard Icon={Coins} label="This month's recovery" value={ugxShort(monthlyRecovery)} meta={`${monthLabel(CURRENT_MONTH)} · ${active.length} active`} tone="warning" />
      </div>
      <Banner Icon={Banknote}>Approved advances are recovered automatically through payroll: each month's installment is deducted from net pay and the outstanding balance falls as payroll is processed. An advance clears itself once fully recovered. <b>Approve</b> / <b>Modify & approve</b> / <b>Reject</b> a request; open <b>Schedule</b> to see the month-by-month recovery.</Banner>
      <Toolbar>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: "", label: "All statuses" }, "Pending", "Approved", "Rejected"]} style={{ width: "auto" }} />
      </Toolbar>
      <Card>
        <DataTable
          columns={[
            { label: "Employee", render: (a) => <EmpCell emp={empById(a.empId)} /> },
            { label: "Requested", render: (a) => fmtDate(a.requestedAt) },
            { label: "Amount asked", num: true, render: (a) => ugx(a.amount) },
            { label: "Months", num: true, render: (a) => a.months },
            { label: "Status", render: (a) => <div style={{ display: "flex", gap: 6, alignItems: "center" }}>{advanceStatusPill(a, prog(a))}{advanceModified(a) && <Tag>modified</Tag>}</div> },
            { label: "Recovery", render: (a) => {
              if (a.status !== "Approved") return <span style={{ color: "var(--muted)" }}>—</span>;
              const d = advanceInstallment(a); const g = prog(a);
              return <div style={{ minWidth: 150 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}><span style={{ color: "var(--success)" }}>{ugx(g.recovered)}</span><span style={{ color: g.outstanding ? "var(--danger)" : "var(--muted)" }}>{ugx(g.outstanding)} left</span></div>
                <ProgressBar pct={g.amount ? (g.recovered / g.amount) * 100 : 0} />
                <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 3 }}>{ugx(d.monthly)}/mo × {d.months}</div>
              </div>;
            } },
            { label: "", render: (a) => (
              a.status === "Pending" ? (
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <Btn size="sm" variant="success" onClick={() => approveAsIs(a)} title="Approve as requested"><Check size={13} />Approve</Btn>
                  <Btn size="sm" onClick={() => setModal(() => (cc) => <AdvanceReview ctx={cc} id={a.id} />)} title="Modify then approve"><Pencil size={13} />Modify</Btn>
                  <Btn size="sm" variant="danger" onClick={() => reject(a)} title="Reject"><X size={13} /></Btn>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  {a.status === "Approved" && <Btn size="sm" onClick={() => setModal(() => (cc) => <AdvanceSchedule ctx={cc} id={a.id} />)} title="Repayment schedule"><CalendarDays size={13} />Schedule</Btn>}
                  <Btn size="sm" onClick={() => setModal(() => (cc) => <AdvanceReview ctx={cc} id={a.id} />)} title="Revise decision"><Pencil size={13} />Revise</Btn>
                </div>
              )
            )},
          ]}
          rows={list}
          empty="No advance requests yet."
        />
      </Card>
    </>
  );
}

function AdvanceReview({ ctx, id }) {
  const a = (ctx.store.advances || []).find((x) => x.id === id);
  const emp = a ? ctx.empById(a.empId) : null;
  const [amount, setAmount] = useState(a ? String(a.approvedAmount ?? a.amount) : "");
  const [months, setMonths] = useState(a ? String(a.approvedMonths ?? a.months) : "3");
  const [note, setNote] = useState(a ? (a.note || "") : "");
  if (!a) return null;
  const amt = Number(amount) || 0, mo = Number(months) || 1;
  const monthly = Math.round(amt / mo);
  const changed = amt !== Number(a.amount) || mo !== Number(a.months);
  const net = emp ? derivePayslip(emp).net : 0;
  const pctOfNet = net > 0 ? Math.round((monthly / net) * 100) : 0;
  const afford = net <= 0 ? "unknown" : monthly >= net ? "exceeds" : pctOfNet > 40 ? "high" : "ok";
  const decide = async (status) => {
    if (status === "Approved" && amt <= 0) return alert("Approved amount must be greater than zero.");
    if (status === "Approved" && afford === "exceeds" && !window.confirm(`The monthly repayment (${ugx(monthly)}) is more than ${fullName(emp)}'s net pay (${ugx(net)}). This would push net pay negative. Approve anyway?`)) return;
    await advancesApi.update(a.id, {
      status,
      approvedAmount: status === "Approved" ? amt : null,
      approvedMonths: status === "Approved" ? mo : null,
      startMonth: status === "Approved" ? CURRENT_MONTH : "",
      decidedBy: "Robert Okello (HR)", decidedAt: TODAY,
      note: note.trim() || (status === "Approved" ? (changed ? "Approved with modifications." : "Approved as requested.") : "Request declined."),
    });
    await ctx.reload(); ctx.setModal(null);
  };
  return (
    <Modal title="Review advance request" sub={emp ? `${fullName(emp)} · ${emp.id}` : ""} onClose={() => ctx.setModal(null)}
      footer={<><Btn variant="danger" onClick={() => decide("Rejected")}><X size={15} />Reject</Btn><div style={{ flex: 1 }} /><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={() => decide("Approved")}><Check size={15} />{changed ? "Approve with changes" : "Approve"}</Btn></>}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: "var(--text-2)" }}>Requested amount</span><span className="mono" style={{ fontWeight: 600 }}>{ugx(a.amount)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: "var(--text-2)" }}>Requested period</span><span className="mono">{a.months} month{a.months > 1 ? "s" : ""}</span></div>
        {a.reason && <div style={{ marginTop: 6, color: "var(--text-2)" }}>Reason: “{a.reason}”</div>}
      </div>
      <div style={formGrid}>
        <FieldsetTitle first>Approved terms {changed && <span style={{ color: "var(--warning)", textTransform: "none", letterSpacing: 0 }}>· modified</span>}</FieldsetTitle>
        <Field label="Approved amount (UGX)" required><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Repay over (months)" required><Select value={months} onChange={(e) => setMonths(e.target.value)} options={Array.from({ length: ADVANCE_MAX_MONTHS }, (_, i) => ({ value: String(i + 1), label: `${i + 1} month${i ? "s" : ""}` }))} /></Field>
        <Field label="Note to employee" full hint="Explain any changes (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Approved at a reduced amount over a longer period." /></Field>
        <div style={{ gridColumn: "1 / -1", background: "var(--ink)", color: "#fff", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "rgba(255,255,255,.8)", fontSize: 13 }}>Monthly repayment</span>
          <span className="mono" style={{ fontWeight: 700, color: "#34d399" }}>{ugx(monthly)} × {mo} mo</span>
        </div>
        {net > 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Banner Icon={afford === "ok" ? Check : AlertTriangle} tone={afford === "ok" ? "success" : afford === "high" ? "warning" : "danger"}>
              {afford === "exceeds"
                ? <>Repayment ({ugx(monthly)}/mo) <b>exceeds</b> {fullName(emp)}'s net pay of {ugx(net)} — net would go negative. Lengthen the period or reduce the amount.</>
                : afford === "high"
                ? <>Repayment is <b>{pctOfNet}%</b> of {fullName(emp)}'s {ugx(net)} net pay — quite high. Consider a longer period.</>
                : <>Affordable: repayment is <b>{pctOfNet}%</b> of {fullName(emp)}'s {ugx(net)} net pay.</>}
            </Banner>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ================================ Sidebar ================================= */
function Sidebar({ view, setView, store, nav = NAV }) {
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
          <div title="Integrated HR and Supplier Management System" style={{ fontFamily: "var(--font-mono)", fontWeight: 400, fontSize: 10, letterSpacing: ".12em", color: "var(--sidebar-muted)", textTransform: "uppercase", marginTop: 4 }}>IHRSM</div>
        </div>
      </div>
      <nav style={{ padding: 12, display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sidebar-muted)", padding: "14px 12px 6px" }}>Main</div>
        {nav.map(({ id, label, Icon }) => {
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
function Topbar({ title, sub, view, ctx, onMenu }) {
  const isMobile = !!onMenu;
  const addButtons = {
    employees: ["Add employee", (c) => c.setModal(() => (cc) => <EmployeeForm ctx={cc} />)],
    leave: ["New request", (c) => c.setModal(() => (cc) => <LeaveForm ctx={cc} />)],
    attendance: ["Log attendance", (c) => c.setModal(() => (cc) => <AttendanceForm ctx={cc} />)],
    appraisals: ["New appraisal", (c) => c.setModal(() => (cc) => <AppraisalForm ctx={cc} />)],
  };
  const add = addButtons[view];
  const roleLabel = { admin: "HR / Admin", hr: "HR Officer", finance: "Finance", staff: "Staff" }[ctx.auth && ctx.auth.role] || "Staff";
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "color-mix(in srgb, var(--bg) 85%, transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)", padding: isMobile ? "12px 14px" : "16px 28px", display: "flex", alignItems: "center", gap: isMobile ? 12 : 16 }}>
      {isMobile && <MenuButton onClick={onMenu} />}
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
        {!isMobile && <div style={{ color: "var(--text-2)", fontSize: 12.5, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flex: 1 }} />
      {add && (
        <Btn variant="primary" onClick={() => add[1](ctx)} title={add[0]}><Plus size={16} />{!isMobile && add[0]}</Btn>
      )}
      {ctx.currentEmp && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: isMobile ? 0 : 6, marginLeft: 2, borderLeft: isMobile ? "none" : "1px solid var(--border)" }}>
          <Avatar emp={ctx.currentEmp} size={32} />
          {!isMobile && <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{ctx.currentEmp.firstName} {ctx.currentEmp.lastName}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{roleLabel}</div>
          </div>}
          <Btn variant="ghost" size="sm" onClick={ctx.signOut} title="Sign out"><LogOut size={16} /></Btn>
        </div>
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

  const byDept = [...new Set(emps.map((e) => e.department).filter(Boolean))].map((d) => ({ d, n: emps.filter((e) => e.department === d).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
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
      <Announcements ctx={ctx} audience="admin" />
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

  const list = useMemo(() => store.employees.filter((e) => {
    if (!q) return true;
    return [fullName(e), e.id, e.jobTitle, e.department].join(" ").toLowerCase().includes(q.toLowerCase());
  }), [store.employees, q]);

  const del = (e) => setModal(() => (cc) => <ConfirmDelete ctx={cc} api={employeesApi} id={e.id} label={fullName(e)} />);

  const exportCsv = () => {
    const cols = ["id", "firstName", "lastName", "department", "jobTitle", "contractType", "status", "grossSalary", "phone", "email"];
    const lines = [cols.join(",")].concat(list.map((e) => cols.map((c) => `"${String(e[c] ?? "").replace(/"/g, '""')}"`).join(",")));
    downloadFile("gla-employees.csv", lines.join("\n"));
  };
  const exportPdf = () => downloadReportPdf({
    filename: "GLA-Employee-Register.pdf",
    eyebrow: "Register",
    title: "Employee Register",
    subtitle: "Staff records, contracts and statutory details",
    meta: [`Total staff: ${list.length}`],
    head: ["#", "Name", "Staff ID", "Unit", "Job Title", "Contract", "Status", "Gross (UGX)"],
    body: list.map((e, i) => [i + 1, fullName(e), e.id, e.department, e.jobTitle, e.contractType, e.status, fmtN(e.grossSalary)]),
    orientation: "landscape",
  });

  return (
    <>
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Search name, ID or title…" />
        <div style={{ flex: 1 }} />
        <Btn onClick={exportPdf}><FileText size={16} />PDF</Btn>
        <Btn onClick={exportCsv}><Download size={16} />Export CSV</Btn>
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
      <dl className="stack-dl" style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "8px 14px", fontSize: 13, margin: 0 }}>
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
    phone: "", email: "", address: "", department: (ctx.store.settings?.departments?.[0]?.name) || "Engineering Department", jobTitle: "", contractType: "Permanent",
    status: "Active", employmentDate: "", grossSalary: 1200000, tin: "", nssfNumber: "", bankName: "",
    bankAccount: "", annualUsed: 0, sickUsed: 0, emergencyName: "", emergencyRelation: "", emergencyPhone: "",
  }));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setN = (group, k) => (e) => setF((s) => ({ ...s, [group]: { ...s[group], [k]: e.target.value } }));
  const setArr = (k) => (arr) => setF((s) => ({ ...s, [k]: arr }));

  const submit = async () => {
    if (!f.firstName || !f.lastName || !f.id || !f.jobTitle) return alert("First name, surname, staff ID and job title are required.");
    const out = { ...f, grossSalary: Number(f.grossSalary) || 0, advanceDeductions: Number(f.advanceDeductions) || 0, annualUsed: Number(f.annualUsed) || 0, sickUsed: Number(f.sickUsed) || 0 };
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
        {(() => {
          const depts = (ctx.store.settings?.departments || []);
          const deptNames = depts.map((d) => d.name);
          const deptOpts = deptNames.length ? deptNames : [f.department].filter(Boolean);
          const posList = (depts.find((d) => d.name === f.department)?.positions) || [];
          const posArr = [...posList];
          if (f.jobTitle && !posArr.includes(f.jobTitle)) posArr.unshift(f.jobTitle);
          const posOpts = [{ value: "", label: "— select position —" }, ...posArr.map((p) => ({ value: p, label: p }))];
          return (<>
            <Field label="Department" hint="Managed in Settings → Departments"><Select value={f.department} onChange={set("department")} options={deptOpts} /></Field>
            <Field label="Job title / position" required hint="Positions come from the selected department"><Select value={f.jobTitle} onChange={set("jobTitle")} options={posOpts} /></Field>
          </>);
        })()}
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
        <Field label="Bank branch"><Input value={f.bankBranch || ""} onChange={set("bankBranch")} /></Field>
        <Field label="Other advance deduction (UGX)" hint="Manual monthly deduction (approved advances recover automatically)"><Input type="number" value={f.advanceDeductions || 0} onChange={set("advanceDeductions")} /></Field>
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
// Return-to-work status for an approved leave: scheduled (future), on leave
// (currently out), due back (ended, not reported), or returned.
function leaveBackStatus(l) {
  if (l.status !== "Approved") return null;
  if (l.returnedAt) return { key: "returned", label: `Reported back ${fmtDate(l.returnedAt)}`, tone: "success" };
  if (l.endDate < TODAY) return { key: "due", label: "Due back — not reported", tone: "danger" };
  if (l.startDate <= TODAY && l.endDate >= TODAY) return { key: "on", label: "On leave", tone: "info" };
  return { key: "scheduled", label: "Scheduled", tone: "muted" };
}
const TypeTag = ({ type }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 20, background: "var(--surface-2)", fontSize: 11.5, fontWeight: 600, color: "var(--text-2)" }}>
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: (LEAVE_COLORS[type] || "var(--muted)"), flex: "none" }} />{type}
  </span>
);

function Leave({ ctx }) {
  const [tab, setTab] = useState("requests");
  const tabs = [["requests", "Requests", CalendarDays], ["rota", "Leave rota", ClipboardCheck], ["back", "Report back to work", CalendarCheck]];
  return (
    <>
      <div style={{ display: "inline-flex", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 3, gap: 3, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, background: tab === id ? "var(--bg-elevated)" : "transparent", color: tab === id ? "var(--text)" : "var(--text-2)", boxShadow: tab === id ? "var(--shadow)" : "none" }}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>
      {tab === "requests" && <LeaveRequests ctx={ctx} />}
      {tab === "rota" && <LeaveRota ctx={ctx} />}
      {tab === "back" && <ReportBack ctx={ctx} />}
    </>
  );
}

function LeaveRequests({ ctx }) {
  const { store, empById, reload, setModal } = ctx;
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const pend = store.leave.filter((l) => l.status === "Pending").length;
  const appr = store.leave.filter((l) => l.status === "Approved").length;
  const daysTaken = store.leave.filter((l) => l.status === "Approved").reduce((s, l) => s + (l.days || 0), 0);
  const avgAnnual = store.employees.length
    ? Math.round(store.employees.reduce((s, e) => s + deriveLeaveBalance(e, "Annual").remaining, 0) / store.employees.length) : 0;

  let list = [...store.leave].sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
  if (statusFilter) list = list.filter((l) => l.status === statusFilter);
  if (typeFilter) list = list.filter((l) => l.type === typeFilter);

  const decide = async (l, decision) => {
    await leaveApi.update(l.id, { status: decision, decidedBy: "Sarah Nakato (HR)", decidedAt: TODAY });
    if (decision === "Approved" && l.type === "Annual") {
      const e = empById(l.empId);
      if (e) await employeesApi.update(e.id, { annualUsed: (e.annualUsed || 0) + (l.days || 0) });
    }
    await reload();
  };
  const reportBack = async (l) => { await leaveApi.update(l.id, { returnedAt: TODAY }); await reload(); };

  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={CalendarDays} label="Pending" value={pend} meta="awaiting decision" tone="accent" />
        <StatCard Icon={Check} label="Approved" value={appr} meta={`${daysTaken} days total`} tone="success" />
        <StatCard Icon={Users} label="Avg annual left" value={`${avgAnnual} days`} meta={`of ${LEAVE_TYPES.Annual.entitlement} statutory`} tone="brand" />
      </div>
      <Toolbar>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: "", label: "All statuses" }, "Pending", "Approved", "Rejected"]} style={{ width: "auto" }} />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={[{ value: "", label: "All leave types" }, ...Object.keys(LEAVE_TYPES)]} style={{ width: "auto" }} />
      </Toolbar>
      <Card>
        <DataTable
          columns={[
            { label: "Employee", render: (l) => <EmpCell emp={empById(l.empId)} /> },
            { label: "Type", render: (l) => <TypeTag type={l.type} /> },
            { label: "Period", render: (l) => `${fmtDate(l.startDate)} → ${fmtDate(l.endDate)}` },
            { label: "Days", num: true, render: (l) => l.days },
            { label: "Status", render: (l) => { const b = leaveBackStatus(l); return <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><Pill tone={leaveTone[l.status]}>{l.status}</Pill>{b && b.key !== "scheduled" && <Pill tone={b.tone}>{b.label}</Pill>}</div>; } },
            { label: "Reason", render: (l) => <span style={{ color: "var(--text-2)" }}>{l.reason || "—"}</span> },
            { label: "", render: (l) => (
              l.status === "Pending" ? (
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <Btn size="sm" variant="success" onClick={() => decide(l, "Approved")}><Check size={13} />Approve</Btn>
                  <Btn size="sm" variant="danger" onClick={() => decide(l, "Rejected")}><X size={13} />Reject</Btn>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  {l.status === "Approved" && !l.returnedAt && !LEAVE_TYPES[l.type]?.duty && <Btn size="sm" variant="success" onClick={() => reportBack(l)} title="Mark reported back to work"><CalendarCheck size={13} />Report back</Btn>}
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

/* ------------------------------ Leave rota ------------------------------- */
function LeaveRota({ ctx }) {
  const { store, empById } = ctx;
  const [monthKey, setMonthKey] = useState(CURRENT_MONTH);
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(daysInMonth).padStart(2, "0")}`;
  const approved = store.leave.filter((l) => l.status === "Approved" && l.startDate <= monthEnd && l.endDate >= monthStart)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const dayOf = (dateStr, fallback) => { if (!dateStr || dateStr.slice(0, 7) !== monthKey) return fallback; return Number(dateStr.slice(8, 10)); };
  const onLeaveToday = store.leave.filter((l) => l.status === "Approved" && !l.returnedAt && l.startDate <= TODAY && l.endDate >= TODAY);
  const monthLabelStr = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={CalendarCheck} label="On leave today" value={onLeaveToday.length} meta={fmtDate(TODAY)} tone="info" />
        <StatCard Icon={CalendarDays} label={`Absences in ${monthLabelStr.split(" ")[0]}`} value={approved.length} meta="approved leave overlapping" tone="brand" />
        <StatCard Icon={Users} label="Available today" value={Math.max(0, store.employees.filter((e) => e.status !== "Terminated").length - onLeaveToday.length)} meta="staff at work" tone="success" />
      </div>
      <Banner Icon={ClipboardCheck}>Leave rota — a roster of approved leave. Each bar shows who is away and when across the month; use it to plan cover. Colours match the leave type.</Banner>
      <Card>
        <CardHead title={`Leave rota — ${monthLabelStr}`} right={<div style={{ display: "flex", gap: 6 }}>
          <Btn size="sm" onClick={() => setMonthKey(addMonth(monthKey, -1))}><ChevronLeft size={15} /></Btn>
          <Btn size="sm" onClick={() => setMonthKey(CURRENT_MONTH)}>Today</Btn>
          <Btn size="sm" onClick={() => setMonthKey(addMonth(monthKey, 1))}><ChevronRight size={15} /></Btn>
        </div>} />
        <div style={{ overflowX: "auto", padding: "8px 0 4px" }}>
          <div style={{ minWidth: 720 }}>
            {/* day header */}
            <div style={{ display: "grid", gridTemplateColumns: `180px repeat(${daysInMonth}, 1fr)`, alignItems: "center", padding: "0 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Employee</div>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = new Date(y, m - 1, i + 1); const we = d.getDay() === 0 || d.getDay() === 6;
                return <div key={i} style={{ textAlign: "center", fontSize: 9.5, padding: "6px 0", color: we ? "var(--muted)" : "var(--text-2)", fontFamily: "var(--font-mono)" }}>{i + 1}</div>;
              })}
            </div>
            {approved.length === 0 && <div style={{ padding: "26px 14px", color: "var(--muted)", fontSize: 13 }}>No approved leave overlapping {monthLabelStr}.</div>}
            {approved.map((l) => {
              const startD = dayOf(l.startDate, 1);
              const endD = dayOf(l.endDate, daysInMonth);
              const s = clamp(startD, 1, daysInMonth), e = clamp(endD, 1, daysInMonth);
              const emp = empById(l.empId);
              const color = LEAVE_COLORS[l.type] || "var(--brand)";
              const returned = !!l.returnedAt;
              return (
                <div key={l.id} style={{ display: "grid", gridTemplateColumns: `180px repeat(${daysInMonth}, 1fr)`, alignItems: "center", padding: "7px 14px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp ? fullName(emp) : l.empId}</div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{l.type}</div>
                  </div>
                  <div style={{ gridColumn: `${1 + s} / ${2 + e}`, height: 22, borderRadius: 6, background: color, opacity: returned ? 0.45 : 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10.5, fontWeight: 600, position: "relative" }}
                    title={`${l.type} · ${fmtDate(l.startDate)} → ${fmtDate(l.endDate)}${returned ? " · reported back" : ""}`}>
                    {(e - s) >= 2 ? (returned ? "✓ back" : l.type) : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      {/* type legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, padding: "0 4px" }}>
        {Object.keys(LEAVE_COLORS).map((t) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-2)" }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: LEAVE_COLORS[t] }} />{t}
          </span>
        ))}
      </div>
    </>
  );
}

/* -------------------------- Report back to work -------------------------- */
function ReportBack({ ctx }) {
  const { store, empById, reload } = ctx;
  const approved = store.leave.filter((l) => l.status === "Approved" && !LEAVE_TYPES[l.type]?.duty);
  const pendingBack = approved.filter((l) => !l.returnedAt).sort((a, b) => a.endDate.localeCompare(b.endDate));
  const returned = approved.filter((l) => l.returnedAt).sort((a, b) => (b.returnedAt || "").localeCompare(a.returnedAt || ""));
  const due = pendingBack.filter((l) => l.endDate < TODAY);
  const reportBack = async (l) => { await leaveApi.update(l.id, { returnedAt: TODAY }); await reload(); };

  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={AlertTriangle} label="Due back" value={due.length} meta="leave ended, not reported" tone={due.length ? "danger" : "success"} />
        <StatCard Icon={CalendarDays} label="Awaiting return" value={pendingBack.length} meta="approved, still out" tone="accent" />
        <StatCard Icon={CalendarCheck} label="Reported back" value={returned.length} meta="returns logged" tone="success" />
      </div>
      <Banner Icon={CalendarCheck}>Report back to work — when a staff member resumes duty after leave, log their return here (or they can do it from their portal). Leave that has ended without a return is flagged <b>Due back</b>.</Banner>
      <Card>
        <CardHead title="Awaiting report-back" />
        <DataTable
          columns={[
            { label: "Employee", render: (l) => <EmpCell emp={empById(l.empId)} /> },
            { label: "Type", render: (l) => <TypeTag type={l.type} /> },
            { label: "Leave period", render: (l) => `${fmtDate(l.startDate)} → ${fmtDate(l.endDate)}` },
            { label: "Return status", render: (l) => { const b = leaveBackStatus(l); return <Pill tone={b.tone}>{b.label}</Pill>; } },
            { label: "", render: (l) => <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn size="sm" variant="success" onClick={() => reportBack(l)}><CalendarCheck size={13} />Report back to work</Btn></div> },
          ]}
          rows={pendingBack}
          empty="No staff currently out on leave."
        />
      </Card>
      {returned.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <CardHead title="Recently reported back" />
          <DataTable
            columns={[
              { label: "Employee", render: (l) => <EmpCell emp={empById(l.empId)} /> },
              { label: "Type", render: (l) => <TypeTag type={l.type} /> },
              { label: "Leave period", render: (l) => `${fmtDate(l.startDate)} → ${fmtDate(l.endDate)}` },
              { label: "Reported back", render: (l) => <Pill tone="success">{fmtDate(l.returnedAt)}</Pill> },
            ]}
            rows={returned}
            empty=""
          />
        </Card>
      )}
    </>
  );
}

function LeaveForm({ ctx, lockEmpId }) {
  const emps = ctx.store.employees;
  const [f, setF] = useState({ empId: lockEmpId || emps[0]?.id || "", type: "Annual", startDate: TODAY, endDate: TODAY, days: "", reason: "" });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const lockedEmp = lockEmpId ? ctx.empById(lockEmpId) : null;
  const submit = async () => {
    if (!f.empId || !f.type || !f.startDate || !f.endDate) return alert("Employee, type and dates are required.");
    const days = Number(f.days) || workingDaysBetween(f.startDate, f.endDate);
    await leaveApi.create({ empId: f.empId, type: f.type, startDate: f.startDate, endDate: f.endDate, days, reason: f.reason, status: "Pending", requestedAt: TODAY, decidedBy: "", decidedAt: "", returnedAt: "" });
    await ctx.reload();
    ctx.setModal(null);
  };
  return (
    <Modal title="New leave request" sub="Logged as pending for HR approval" onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />Submit request</Btn></>}>
      <div style={formGrid}>
        {lockedEmp
          ? <Field label="Employee" full><div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)" }}><Avatar emp={lockedEmp} size={28} /><span style={{ fontWeight: 600 }}>{fullName(lockedEmp)}</span><span style={{ color: "var(--muted)", fontSize: 12 }}>· {lockedEmp.id}</span></div></Field>
          : <Field label="Employee" required full><Select value={f.empId} onChange={set("empId")} options={emps.map((e) => ({ value: e.id, label: `${fullName(e)} · ${e.id}` }))} /></Field>}
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
  const field = today.filter((a) => a.status === "Field").length;
  const verified = today.filter((a) => a.withinFence).length;
  const ot = today.reduce((s, a) => s + (Number(a.overtime) || 0), 0);
  const list = [...store.attendance].sort((a, b) => (b.date + b.clockIn).localeCompare(a.date + a.clockIn));
  return (
    <>
      <ClockInCard ctx={ctx} />
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", margin: "16px 0" }}>
        <StatCard Icon={Clock} label="Clocked in today" value={today.length} meta={fmtDate(TODAY)} tone="brand" />
        <StatCard Icon={LocateFixed} label="Geo-verified" value={verified} meta={`${today.length - verified} outside / no GPS`} tone="success" />
        <StatCard Icon={Navigation} label="On field sites" value={field} meta="away from head office" tone="accent" />
        <StatCard Icon={TrendingUp} label="Overtime hours" value={ot.toFixed(1)} meta="today, across crews" tone="warning" />
      </div>
      <Card>
        <CardHead title="Clock-in register" right={<Btn size="sm" onClick={() => setModal(() => (cc) => <AttendanceForm ctx={cc} />)}><Plus size={14} />Manual entry</Btn>} />
        <DataTable
          columns={[
            { label: "Employee", render: (a) => <EmpCell emp={empById(a.empId)} /> },
            { label: "Date", render: (a) => fmtDate(a.date) },
            { label: "In", render: (a) => a.clockIn || "—" },
            { label: "Out", render: (a) => a.clockOut || "—" },
            { label: "Site", render: (a) => a.site },
            { label: "GPS location", render: (a) => a.lat != null
              ? <div><span className="mono" style={{ fontSize: 12 }}>{a.lat.toFixed(5)}, {a.lng.toFixed(5)}</span><div style={{ fontSize: 11, color: "var(--muted)" }}>±{Math.round(a.accuracy || 0)} m · {a.method || "GPS"}</div></div>
              : <span style={{ color: "var(--muted)" }}>—</span> },
            { label: "Geo-fence", render: (a) => a.lat == null ? <Pill tone="muted">No location</Pill> : a.withinFence ? <Pill tone="success">Within fence</Pill> : <Pill tone="danger">Outside · {formatDistance(a.distanceM)}</Pill> },
            { label: "Photo", render: (a) => a.photo
              ? <img src={a.photo} alt="clock-in" onClick={() => setModal(() => () => <PhotoViewer photo={a.photo} emp={empById(a.empId)} rec={a} onClose={() => setModal(null)} />)} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 7, border: "1px solid var(--border)", cursor: "pointer" }} />
              : <span style={{ color: "var(--muted)" }}>—</span> },
            { label: "Status", render: (a) => <Pill tone={attTone[a.status]}>{a.status}</Pill> },
            { label: "OT", num: true, render: (a) => (Number(a.overtime) || 0).toFixed(1) },
            { label: "", render: (a) => <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn size="sm" variant="danger" onClick={() => setModal(() => (cc) => <ConfirmDelete ctx={cc} api={attendanceApi} id={a.id} label={a.id} />)}><Trash2 size={13} /></Btn></div> },
          ]}
          rows={list}
          empty="No attendance logged yet."
        />
      </Card>
    </>
  );
}

function ClockInCard({ ctx }) {
  const emps = ctx.store.employees.filter((e) => e.status !== "Terminated");
  const [empId, setEmpId] = useState(emps[0]?.id || "");
  const emp = ctx.empById(empId);
  const already = ctx.store.attendance.find((a) => a.empId === empId && a.date === TODAY);
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, padding: "18px 20px" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: "rgba(47,111,159,.12)", color: "var(--brand)" }}><Smartphone size={22} /></div>
        <div style={{ minWidth: 220, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Clock in with your location</div>
          <div style={{ color: "var(--text-2)", fontSize: 12.5, marginTop: 2 }}>Staff capture attendance on their phone; the GPS point is verified against the site geofence.</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Signed in as</div>
            <Select value={empId} onChange={(e) => setEmpId(e.target.value)} options={emps.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }))} style={{ width: "auto" }} />
          </div>
          <Btn variant="primary" onClick={() => ctx.setModal(() => (cc) => <ClockInModal ctx={cc} empId={empId} />)} style={{ height: 38 }}><LocateFixed size={16} />Capture location &amp; clock in</Btn>
        </div>
      </div>
      {already && (
        <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", background: "var(--surface)", fontSize: 12.5, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={15} style={{ color: "var(--success)" }} /> {emp ? emp.firstName : "Staff"} already clocked in today at {already.clockIn} — {already.withinFence ? `verified within ${already.geoSite}` : already.lat != null ? `outside geofence (${formatDistance(already.distanceM)})` : "no location captured"}.
        </div>
      )}
    </Card>
  );
}

function FenceMap({ match, pos }) {
  const g = match.fence;
  const bearing = Math.atan2(pos.lng - g.lng, pos.lat - g.lat);
  const ratio = Math.min(1.3, (match.distanceM || 0) / g.radius || 0);
  const cx = 100, cy = 70, R = 40;
  const px = cx + Math.sin(bearing) * R * ratio;
  const py = cy - Math.cos(bearing) * R * ratio;
  const inside = match.within;
  const col = inside ? "var(--success)" : "var(--danger)";
  return (
    <svg viewBox="0 0 200 150" style={{ width: "100%", maxWidth: 280, background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }} aria-label="Geofence position">
      <circle cx={cx} cy={cy} r={R} fill={inside ? "rgba(18,137,78,.10)" : "rgba(194,58,41,.08)"} stroke={col} strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx={cx} cy={cy} r="3" fill="var(--text-2)" />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="var(--border-strong)" strokeWidth="1" />
      <circle cx={px} cy={py} r="5.5" fill={col} stroke="#fff" strokeWidth="1.5" />
      <text x={cx} y={cy + R + 16} textAnchor="middle" fontSize="8.5" fill="var(--muted)">{g.name} · {g.radius} m fence</text>
    </svg>
  );
}

function PhotoViewer({ photo, emp, rec, onClose }) {
  return (
    <Modal title="Clock-in photo" sub={emp ? `${fullName(emp)} · ${fmtDate(rec.date)} ${rec.clockIn || ""}` : ""} onClose={onClose}
      footer={<Btn variant="primary" onClick={onClose}>Close</Btn>}>
      <div style={{ textAlign: "center" }}>
        <img src={photo} alt="Clock-in" style={{ maxWidth: "100%", maxHeight: 420, borderRadius: 14, border: "1px solid var(--border)" }} />
        <div style={{ marginTop: 12 }}>
          {rec.withinFence ? <Pill tone="success">✓ Within {rec.geoSite}</Pill> : <Pill tone="danger">Outside fence</Pill>}
        </div>
        {rec.lat != null && <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-2)" }} className="mono">{rec.lat.toFixed(5)}, {rec.lng.toFixed(5)} · ±{Math.round(rec.accuracy || 0)} m</div>}
      </div>
    </Modal>
  );
}

function ClockInModal({ ctx, empId }) {
  const emp = ctx.empById(empId);
  const [phase, setPhase] = useState("photo"); // photo | camera | geo | locating | located | error
  const [photo, setPhoto] = useState(null);
  const [pos, setPos] = useState(null);
  const [match, setMatch] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const videoRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const streamRef = React.useRef(null);

  const stopCamera = () => { if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; } };
  useEffect(() => stopCamera, []);
  const close = () => { stopCamera(); ctx.setModal(null); };

  // ---- photo capture ----
  const downscale = (imgOrVideo, w, h, max = 520) => {
    const s = Math.min(1, max / w);
    const c = document.createElement("canvas");
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    c.getContext("2d").drawImage(imgOrVideo, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  };
  const startCamera = async () => {
    setErrMsg("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { fileRef.current && fileRef.current.click(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream; setPhase("camera");
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    } catch (e) { fileRef.current && fileRef.current.click(); }
  };
  const capturePhoto = () => {
    const v = videoRef.current; if (!v) return;
    setPhoto(downscale(v, v.videoWidth || 480, v.videoHeight || 640));
    stopCamera(); setPhase("photo");
  };
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => setPhoto(downscale(img, img.width, img.height)); img.src = r.result; };
    r.readAsDataURL(f);
  };
  const demoPhoto = () => {
    const c = document.createElement("canvas"); c.width = 320; c.height = 320;
    const g = c.getContext("2d");
    g.fillStyle = avatarColor(emp ? emp.id : "GLA"); g.fillRect(0, 0, 320, 320);
    g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.arc(160, 130, 70, 0, Math.PI * 2); g.fill();
    g.fillRect(70, 210, 180, 130);
    g.fillStyle = "#fff"; g.font = "bold 96px Helvetica, Arial"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(emp ? initials(emp) : "GL", 160, 135);
    g.font = "500 20px Helvetica, Arial"; g.fillText("DEMO PHOTO", 160, 300);
    setPhoto(c.toDataURL("image/jpeg", 0.8));
  };

  // ---- location capture ----
  const applyPos = (lat, lng, accuracy, method) => { setPos({ lat, lng, accuracy, method }); setMatch(matchGeofence(lat, lng)); setPhase("located"); };
  const useLocation = () => {
    setErrMsg("");
    if (!navigator.geolocation) { setPhase("error"); setErrMsg("This device has no location services."); return; }
    setPhase("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => applyPos(p.coords.latitude, p.coords.longitude, p.coords.accuracy, "GPS"),
      (e) => { setPhase("error"); setErrMsg(e && e.message ? e.message : "Location permission was blocked."); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  const simulate = (g, off) => {
    const jit = () => (Math.random() - 0.5) * 0.0008;
    if (off) applyPos(g.lat + 0.02, g.lng + 0.02, 40, "Simulated");
    else applyPos(g.lat + jit(), g.lng + jit(), 12 + Math.round(Math.random() * 12), "Simulated");
  };
  const confirm = async () => {
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    const within = match ? match.within : false;
    const site = match ? match.fence.name : "Unknown";
    await attendanceApi.create({
      empId, date: TODAY, clockIn: hhmm, clockOut: "", site,
      status: within ? (site.includes("Head Office") ? "Present" : "Field") : "Field",
      overtime: 0, lat: pos.lat, lng: pos.lng, accuracy: Math.round(pos.accuracy || 0),
      geoSite: site, withinFence: within, distanceM: match ? Math.round(match.distanceM) : null, method: pos.method, photo,
    });
    await ctx.reload(); close();
  };

  const stepDots = (n) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14, fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
      <span style={{ color: n >= 1 ? "var(--brand)" : "var(--muted)" }}>① Photo</span>
      <span style={{ width: 22, height: 2, background: "var(--border-strong)", borderRadius: 2 }} />
      <span style={{ color: n >= 2 ? "var(--brand)" : "var(--muted)" }}>② Location</span>
    </div>
  );

  const simRow = (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--border)" }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8 }}>No GPS in this preview? Simulate a location (demo):</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {GEOFENCES.slice(0, 4).map((g) => <Btn key={g.id} size="sm" onClick={() => simulate(g, false)}><MapPin size={12} />{g.name.split(" — ")[0].split(",")[0]}</Btn>)}
        <Btn size="sm" variant="danger" onClick={() => simulate(GEOFENCES[0], true)}><Navigation size={12} />Off-site</Btn>
      </div>
    </div>
  );

  let footer = <Btn onClick={close}>Close</Btn>;
  if (phase === "photo") footer = <><Btn onClick={close}>Cancel</Btn><Btn variant="primary" onClick={() => setPhase("geo")} disabled={!photo} style={!photo ? { opacity: 0.5 } : undefined}>Next: capture location<ChevronRight size={15} /></Btn></>;
  else if (phase === "located") footer = <><Btn onClick={close}>Cancel</Btn><Btn variant="primary" onClick={confirm}><Check size={15} />Confirm clock-in</Btn></>;

  return (
    <Modal title="Phone clock-in" sub={emp ? `${emp.firstName} ${emp.lastName} · ${emp.jobTitle}` : ""} onClose={close} footer={footer}>
      <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={onFile} style={{ display: "none" }} />

      {/* STEP 1 — PHOTO */}
      {phase === "photo" && (
        <div style={{ textAlign: "center", padding: "4px 0" }}>
          {stepDots(1)}
          {!photo ? (
            <>
              <div style={{ width: 60, height: 60, borderRadius: 16, margin: "0 auto 14px", display: "grid", placeItems: "center", background: "rgba(47,111,159,.12)", color: "var(--brand)" }}><Camera size={28} /></div>
              <div style={{ fontWeight: 600, color: "var(--text)" }}>Take your photo to clock in</div>
              <div style={{ fontSize: 12.5, color: "var(--text-2)", margin: "6px auto 16px", maxWidth: 360 }}>Snap a quick photo of yourself. It's stamped on the attendance record together with your GPS location.</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <Btn variant="primary" onClick={startCamera}><Camera size={16} />Take photo</Btn>
                <Btn onClick={() => fileRef.current && fileRef.current.click()}><PackagePlus size={15} />Upload instead</Btn>
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8 }}>No camera in this preview?</div>
                <Btn size="sm" onClick={demoPhoto}><Camera size={12} />Use demo photo</Btn>
              </div>
            </>
          ) : (
            <>
              <img src={photo} alt="Clock-in selfie" style={{ width: 150, height: 150, objectFit: "cover", borderRadius: 16, border: "1px solid var(--border)", margin: "0 auto 12px", display: "block" }} />
              <Pill tone="success">✓ Photo captured</Pill>
              <div style={{ fontSize: 12.5, color: "var(--text-2)", margin: "10px auto 0", maxWidth: 340 }}>Looks good? Continue to capture your location, or retake the photo.</div>
              <div style={{ marginTop: 14 }}><Btn size="sm" onClick={() => { setPhoto(null); }}><RotateCcw size={13} />Retake photo</Btn></div>
            </>
          )}
        </div>
      )}

      {/* CAMERA LIVE PREVIEW */}
      {phase === "camera" && (
        <div style={{ textAlign: "center" }}>
          {stepDots(1)}
          <video ref={videoRef} playsInline muted style={{ width: "100%", maxWidth: 360, borderRadius: 14, background: "#000", transform: "scaleX(-1)" }} />
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
            <Btn onClick={() => { stopCamera(); setPhase("photo"); }}>Cancel</Btn>
            <Btn variant="primary" onClick={capturePhoto}><Camera size={16} />Capture photo</Btn>
          </div>
        </div>
      )}

      {/* STEP 2 — LOCATION */}
      {(phase === "geo" || phase === "error") && (
        <div style={{ textAlign: "center", padding: "4px 0" }}>
          {stepDots(2)}
          <div style={{ width: 60, height: 60, borderRadius: 16, margin: "0 auto 14px", display: "grid", placeItems: "center", background: "rgba(47,111,159,.12)", color: "var(--brand)" }}><LocateFixed size={28} /></div>
          <div style={{ fontWeight: 600, color: "var(--text)" }}>Now capture your GPS location</div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", margin: "6px auto 16px", maxWidth: 360 }}>Your phone's coordinates are checked against the nearest site geofence and stamped on the attendance record.</div>
          <Btn variant="primary" onClick={useLocation} style={{ margin: "0 auto" }}><Navigation size={16} />Use my current location</Btn>
          {phase === "error" && <div style={{ marginTop: 12, fontSize: 12, color: "var(--danger)" }}>{errMsg}</div>}
          {simRow}
        </div>
      )}
      {phase === "locating" && (
        <div style={{ textAlign: "center", padding: "34px 0", color: "var(--text-2)" }}>
          <RefreshCw size={26} className="gla-spin" style={{ color: "var(--brand)", marginBottom: 10 }} />
          <div style={{ fontWeight: 600, color: "var(--text)" }}>Acquiring GPS signal…</div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>Allow location access if your browser asks.</div>
        </div>
      )}
      {phase === "located" && match && (
        <div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            {photo && <img src={photo} alt="Clock-in selfie" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }} />}
            <FenceMap match={match} pos={pos} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ marginBottom: 10 }}>
                {match.within
                  ? <Pill tone="success">✓ Within geofence — {match.fence.name}</Pill>
                  : <Pill tone="danger">Outside geofence — {formatDistance(match.distanceM)} from {match.fence.name}</Pill>}
              </div>
              <dl style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "6px 12px", fontSize: 13, margin: 0 }}>
                <dt style={{ color: "var(--text-2)" }}>Coordinates</dt><dd style={{ margin: 0 }} className="mono">{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</dd>
                <dt style={{ color: "var(--text-2)" }}>Accuracy</dt><dd style={{ margin: 0 }}>±{Math.round(pos.accuracy || 0)} m · {pos.method}</dd>
                <dt style={{ color: "var(--text-2)" }}>Nearest site</dt><dd style={{ margin: 0 }}>{match.fence.name}</dd>
                <dt style={{ color: "var(--text-2)" }}>Distance</dt><dd style={{ margin: 0 }}>{formatDistance(match.distanceM)} (fence {match.fence.radius} m)</dd>
              </dl>
            </div>
          </div>
          {!match.within && <div style={{ marginTop: 14 }}><Banner Icon={AlertTriangle}>This point is outside the site geofence. The clock-in will be recorded and flagged for review.</Banner></div>}
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn size="sm" onClick={useLocation}><RefreshCw size={13} />Re-capture location</Btn>
            <Btn size="sm" onClick={() => { setPhoto(null); setPos(null); setMatch(null); setPhase("photo"); }}><RotateCcw size={13} />Start over</Btn>
          </div>
        </div>
      )}
    </Modal>
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
function Banner({ Icon = AlertTriangle, children, tone = "info" }) {
  const map = { info: ["var(--info-dim)", "var(--info)"], success: ["var(--success-dim)", "var(--success)"], warning: ["var(--warning-dim)", "var(--warning)"], danger: ["var(--danger-dim)", "var(--danger)"] };
  const [bg, fg] = map[tone] || map.info;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderRadius: 10, fontSize: 12.5, marginBottom: 18, border: `1px solid ${bg}`, background: bg, color: fg }}>
      <Icon size={16} style={{ flex: "none" }} />
      <span>{children}</span>
    </div>
  );
}

function ledgerNet(emp, columns) {
  let net = derivePayslip(emp).net;
  (columns || []).forEach((c) => {
    const v = Number((emp.custom || {})[c.id]) || 0;
    if (c.kind === "allowance") net += v;
    else if (c.kind === "deduction") net -= v;
  });
  return net;
}

function buildLedgerRow(e, i, cols) {
  const p = derivePayslip(e);
  const custom = {};
  (cols || []).forEach((c) => { custom[c.id] = (e.custom || {})[c.id] ?? (c.kind === "text" ? "" : 0); });
  return { no: i + 1, empId: e.id, name: fullName(e), department: e.department, bankAccount: e.bankAccount, bankName: e.bankName, bankBranch: e.bankBranch, tin: e.tin, nationalId: e.nationalId, nssfNumber: e.nssfNumber, gross: p.gross, nssf5: p.nssfEmp, paye: p.paye, advance: p.advance, custom, net: ledgerNet(e, cols), contribution: p.nssfEr };
}
function sumLedger(rows, cols) {
  const t = { gross: 0, nssf5: 0, paye: 0, advance: 0, net: 0, contribution: 0, custom: {} };
  (cols || []).forEach((c) => (t.custom[c.id] = 0));
  rows.forEach((r) => { t.gross += r.gross; t.nssf5 += r.nssf5; t.paye += r.paye; t.advance += r.advance; t.net += r.net; t.contribution += r.contribution; (cols || []).forEach((c) => (t.custom[c.id] += Number((r.custom || {})[c.id]) || 0)); });
  return t;
}

// Ledger styles shared by the live ledger and processed snapshots
const LG = {
  grp: (bg, color) => ({ background: bg, color, fontWeight: 700, fontSize: 11.5, letterSpacing: ".04em", textTransform: "uppercase", textAlign: "center", padding: "8px 10px", borderBottom: "1px solid var(--border-strong)", borderRight: "1px solid var(--border-strong)" }),
  sub: { fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-2)", fontWeight: 600, padding: "9px 10px", borderBottom: "1px solid var(--border)", background: "var(--surface)", whiteSpace: "nowrap" },
  cell: { padding: "10px 10px", borderBottom: "1px solid var(--border)", fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap" },
  tot: { padding: "13px 10px", background: "var(--ink)", color: "#fff", fontWeight: 700, whiteSpace: "nowrap" },
};

function Payroll({ ctx }) {
  const [tab, setTab] = useState("salaries");
  const modes = [
    { id: "salaries", label: "Staff Salary Payments", sub: "Monthly salary ledger, payslips & bank report", Icon: Wallet,
      accent: "#2f6f9f", tint: "#e8f1f8", badge: "#2f6f9f" },
    { id: "suppliers", label: "Supplier Schedule Payments", sub: "Procurement payment schedule (WHT & VAT)", Icon: Landmark,
      accent: "#b8860b", tint: "#fbf3da", badge: "#c8951a" },
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18, maxWidth: 720 }} className="rep-cols">
        {modes.map((m) => {
          const active = tab === m.id;
          return (
            <button key={m.id} onClick={() => setTab(m.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer",
                padding: "13px 15px", borderRadius: 13,
                border: active ? `1.5px solid ${m.accent}` : "1.5px solid var(--border)",
                background: active ? m.tint : "var(--bg-elevated)",
                boxShadow: active ? `0 1px 2px rgba(16,19,26,.04), inset 3px 0 0 ${m.accent}` : "var(--shadow)",
                transition: "background .14s, border-color .14s, box-shadow .14s",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = m.accent; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--border)"; }}>
              <span style={{ width: 40, height: 40, flex: "none", borderRadius: 10, display: "grid", placeItems: "center",
                background: active ? m.badge : "var(--surface-2)", color: active ? "#fff" : "var(--muted)", transition: "background .14s, color .14s" }}>
                <m.Icon size={20} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: active ? m.accent : "var(--text)" }}>{m.label}</span>
                  {active && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: "#fff", background: m.badge, padding: "2px 6px", borderRadius: 20 }}>Active</span>}
                </span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--text-2)", marginTop: 2 }}>{m.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
      {tab === "salaries" ? <StaffSalaries ctx={ctx} /> : <SupplierSchedule ctx={ctx} />}
    </>
  );
}

// Sequencing gate: a month may only be processed/paid once the immediately
// previous month has been paid. The earliest month in the system is the baseline.
function previousMonthGate(month, runs) {
  const prev = addMonth(month, -1);
  const hasEarlier = runs.some((r) => r.month < month);
  if (!hasEarlier) return { ok: true, prev };
  const prevRun = runs.find((r) => r.month === prev);
  if (prevRun && prevRun.status === "Paid") return { ok: true, prev };
  return { ok: false, prev };
}

function StaffSalaries({ ctx }) {
  const { store, reload, currentEmp } = ctx;
  const runs = store.payrollRuns || [];
  const months = useMemo(() => {
    const curYear = Number(CURRENT_MONTH.split("-")[0]);
    const set = new Set([CURRENT_MONTH, ...runs.map((r) => r.month)]);
    // Full range: three years back through one year ahead, every month.
    for (let y = curYear - 3; y <= curYear + 1; y++)
      for (let m = 1; m <= 12; m++) set.add(`${y}-${String(m).padStart(2, "0")}`);
    return [...set].sort().reverse();
  }, [runs]);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const run = runs.find((r) => r.month === month);
  const cur = month === CURRENT_MONTH;
  const processGate = previousMonthGate(CURRENT_MONTH, runs);
  const payGate = run ? previousMonthGate(run.month, runs) : { ok: true };
  const prevRun = runs.find((r) => r.month === addMonth(CURRENT_MONTH, -1));

  const processMonth = async () => {
    if (!processGate.ok) { alert(`You must pay ${monthLabel(processGate.prev)} before processing ${monthLabel(CURRENT_MONTH)}.\n\nSalary schedules are settled one month at a time, in order.`); return; }
    const emps = store.employees
      .filter((e) => e.status !== "Terminated" && !e.payrollExcluded)
      .map((e) => withAdvanceDeductions(e, store.advances, CURRENT_MONTH));
    // Carry forward the previous month's schedule: any custom allowance/deduction
    // value entered last month persists into this month unless changed since.
    const prevByEmp = {}; (prevRun?.rows || []).forEach((r) => { prevByEmp[r.empId] = r; });
    const cols = (store.ledgerColumns || []).map((c) => ({ ...c }));
    const rows = emps.map((e, i) => {
      const row = buildLedgerRow(e, i, cols);
      const pv = prevByEmp[e.id];
      if (pv) {
        let changed = false;
        cols.forEach((c) => {
          const curV = (e.custom || {})[c.id];
          const prevV = (pv.custom || {})[c.id];
          const empty = curV === undefined || curV === "" || curV === 0 || curV === null;
          if (empty && prevV !== undefined && prevV !== "" && prevV !== 0 && prevV !== null) { row.custom[c.id] = prevV; changed = true; }
        });
        if (changed) { // recompute net with carried values
          let net = row.gross - row.nssf5 - row.paye - row.advance;
          cols.forEach((c) => { const v = Number(row.custom[c.id]) || 0; if (c.kind === "allowance") net += v; else if (c.kind === "deduction") net -= v; });
          row.net = net;
        }
      }
      return row;
    });
    const totals = sumLedger(rows, cols);
    const rid = `PR-${CURRENT_MONTH}`;
    const who = currentEmp ? `${currentEmp.firstName} ${currentEmp.lastName} (HR)` : "HR";
    const obj = { id: rid, month: CURRENT_MONTH, status: "Processed", processedBy: who, processedAt: TODAY, paidAt: "", columns: cols, rows, totals, basedOn: prevRun ? prevRun.month : "" };
    if (runs.find((r) => r.id === rid)) await payrollRunsApi.update(rid, obj); else await payrollRunsApi.create(obj);
    await reload();
    alert(`Payroll processed for ${monthLabel(CURRENT_MONTH)} — ${rows.length} staff, net ${ugx(totals.net)}.${prevRun ? `\nCarried forward from ${monthLabel(prevRun.month)}.` : ""}\nThe run is locked; mark it paid once salaries are disbursed.`);
  };
  const markPaid = async () => {
    if (!run) return;
    const g = previousMonthGate(run.month, runs);
    if (!g.ok) { alert(`You must pay ${monthLabel(g.prev)} before paying ${monthLabel(run.month)}.\n\nMonths must be paid in order — settle the earlier month first.`); return; }
    await payrollRunsApi.update(run.id, { status: "Paid", paidAt: TODAY }); await reload();
  };
  const setCheque = async (val) => { if (run && val !== (run.chequeNo || "")) { await payrollRunsApi.update(run.id, { chequeNo: val }); await reload(); } };

  return (
    <>
      <PayrollRunBar month={month} setMonth={setMonth} months={months} run={run} cur={cur} onProcess={processMonth} onMarkPaid={markPaid} onSetCheque={setCheque}
        processBlocked={!processGate.ok ? monthLabel(processGate.prev) : null}
        payBlocked={run && !payGate.ok ? monthLabel(payGate.prev) : null} />
      {run ? <LedgerSnapshot run={run} ctx={ctx} onReprocess={cur ? processMonth : null} /> : <LedgerLive ctx={ctx} prevMonthLabel={prevRun ? monthLabel(prevRun.month) : null} />}
    </>
  );
}

function PayrollRunBar({ month, setMonth, months, run, cur, onProcess, onMarkPaid, onSetCheque, processBlocked, payBlocked }) {
  const [cheque, setCheque] = useState(run ? (run.chequeNo || "") : "");
  useEffect(() => { setCheque(run ? (run.chequeNo || "") : ""); }, [run && run.id]);
  const statusPill = run
    ? (run.status === "Paid" ? <Pill tone="success">Paid · {fmtDate(run.paidAt)}</Pill> : <Pill tone="info">Processed · {fmtDate(run.processedAt)}</Pill>)
    : <Pill tone="warning">Draft — not processed</Pill>;
  const exportRun = () => {
    const cols = run.columns || [];
    const header = ["No", "Name", "Account Number", "Bank", "Branch", "TIN", "NIN", "NSSF No", "Gross Pay", "NSSF 5%", "PAYE", "Advance Deductions", ...cols.map((c) => c.label), "Net Pay", "10% Company Contribution"];
    const lines = [header.join(",")].concat(run.rows.map((r) => [r.no, r.name, r.bankAccount, r.bankName, r.bankBranch, r.tin, r.nationalId, r.nssfNumber, r.gross, r.nssf5, r.paye, r.advance, ...cols.map((c) => (r.custom || {})[c.id] ?? ""), r.net, r.contribution].map((x) => `"${x ?? ""}"`).join(",")));
    lines.push(...signatoryCsvLines());
    downloadFile(`gla-payroll-${run.month}.csv`, lines.join("\n"));
  };
  // Excel bank report — a faithful copy of the PDF bank report (same letterhead,
  // title, cheque, table, total and signatories).
  const bankReport = () => downloadBankReportXlsx({
    subtitle: `${monthLabel(run.month)} · net salaries payable`,
    chequeNo: cheque,
    rows: run.rows.map((rw) => ({ no: rw.no, name: rw.name, account: rw.bankAccount, bank: rw.bankName, branch: rw.bankBranch, net: rw.net })),
    filename: `GLA-Bank-Report-${run.month}.xlsx`,
  });
  const exportRunPdf = () => { const cols = run.columns || []; downloadReportPdf({
    filename: `GLA-Payroll-${run.month}.pdf`,
    eyebrow: "Payroll",
    signatories: SIGNATORIES,
    title: "Monthly Salary Ledger",
    subtitle: `${monthLabel(run.month)} · processed run (${run.status})`,
    meta: [`Processed by ${run.processedBy || "HR"} · ${fmtDate(run.processedAt)}${run.status === "Paid" ? ` · Paid ${fmtDate(run.paidAt)}` : ""}`],
    head: ["#", "Name", "Account No.", "Bank", "Branch", "TIN", "NSSF No.", "Gross", "NSSF 5%", "PAYE", "Advance", ...cols.map((c) => c.label), "Net Pay", "10% Co."],
    body: run.rows.map((r) => [r.no, r.name, r.bankAccount || "", r.bankName || "", r.bankBranch || "", r.tin || "", r.nssfNumber || "", fmtN(r.gross), fmtN(r.nssf5), fmtN(r.paye), fmtN(r.advance), ...cols.map((c) => c.kind === "text" ? ((r.custom || {})[c.id] || "") : fmtN(Number((r.custom || {})[c.id]) || 0)), fmtN(r.net), fmtN(r.contribution)]),
    orientation: "landscape",
  }); };
  const bankReportPdf = () => downloadReportPdf({
    filename: `GLA-Bank-Report-${run.month}.pdf`,
    eyebrow: "Payment",
    signatories: SIGNATORIES,
    title: "Staff Bank Payment Schedule Report",
    subtitle: `${monthLabel(run.month)} · net salaries payable`,
    meta: [...(cheque ? [`Cheque No: ${cheque}`] : []), `Total net payable: UGX ${fmtN(run.rows.reduce((s, r) => s + r.net, 0))}`],
    head: ["#", "Name", "Account Number", "Bank", "Branch", "Net Pay (UGX)"],
    body: run.rows.map((r) => [r.no, r.name, r.bankAccount || "", r.bankName || "", r.bankBranch || "", fmtN(r.net)])
      .concat([["", "TOTAL NET PAYABLE", "", "", "", fmtN(run.rows.reduce((s, r) => s + r.net, 0))]]),
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "var(--text-2)" }}>Pay month</span>
      {(() => {
        const [selYear, selMonthNum] = month.split("-");
        const curY = Number(CURRENT_MONTH.split("-")[0]);
        const years = (() => { const set = new Set([selYear, ...months.map((m) => m.split("-")[0])]); for (let y = curY - 15; y <= curY + 10; y++) set.add(String(y)); return [...set].sort().reverse(); })();
        const monthOpts = Array.from({ length: 12 }, (_, i) => {
          const mm = String(i + 1).padStart(2, "0");
          return { value: mm, label: new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" }) };
        });
        const setYM = (y, mm) => setMonth(`${y}-${mm}`);
        return (
          <>
            <Select value={selMonthNum} onChange={(e) => setYM(selYear, e.target.value)} options={monthOpts} style={{ width: "auto" }} />
            <Select value={selYear} onChange={(e) => setYM(e.target.value, selMonthNum)} options={years} style={{ width: "auto" }} />
          </>
        );
      })()}
      {month === CURRENT_MONTH && <Pill tone="info">Current</Pill>}
      {statusPill}
      {run && run.processedBy && <span style={{ fontSize: 12, color: "var(--muted)" }}>by {run.processedBy}</span>}
      <div style={{ flex: 1 }} />
      {cur && !run && <Btn variant="primary" onClick={onProcess} disabled={!!processBlocked} title={processBlocked ? `Pay ${processBlocked} first` : undefined} style={processBlocked ? { opacity: 0.5 } : undefined}><CalendarCheck size={15} />Process payroll</Btn>}
      {cur && run && <Btn onClick={onProcess}><RefreshCw size={14} />Re-process</Btn>}
      {run && run.status !== "Paid" && <Btn variant="primary" onClick={onMarkPaid} disabled={!!payBlocked} title={payBlocked ? `Pay ${payBlocked} first` : undefined} style={payBlocked ? { opacity: 0.5 } : undefined}><Check size={15} />Mark as paid</Btn>}
      {payBlocked && run && run.status !== "Paid" && <span style={{ fontSize: 11.5, color: "var(--warning)" }}>Pay {payBlocked} first</span>}
      {processBlocked && cur && !run && <span style={{ fontSize: 11.5, color: "var(--warning)" }}>Pay {processBlocked} first</span>}
      {run && <Input value={cheque} onChange={(e) => setCheque(e.target.value)} onBlur={() => onSetCheque && onSetCheque(cheque)} placeholder="Cheque No." title="Cheque number for the bank report (saved on this run)" style={{ width: 118, padding: "6px 9px", fontSize: 12.5 }} />}
      {run && <Btn onClick={bankReportPdf}><Landmark size={14} />Bank report (PDF)</Btn>}
      {run && <Btn onClick={bankReport}><Landmark size={14} />Bank report (Excel)</Btn>}
      {run && <Btn onClick={exportRunPdf}><FileText size={14} />PDF</Btn>}
      {run && <Btn onClick={exportRun}><Download size={14} />CSV</Btn>}
    </div>
  );
}

function LedgerSnapshot({ run, ctx, onReprocess }) {
  const cols = run.columns || [];
  const t = sumLedger(run.rows, cols);
  const grp = LG.grp, sub = LG.sub, subR = { ...sub, textAlign: "right" };
  const cell = LG.cell, cellR = { ...cell, textAlign: "right", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
  const tot = LG.tot, totR = { ...tot, textAlign: "right", fontFamily: "var(--font-mono)" };
  const kindSym = { allowance: "+", deduction: "−" };
  const dash = (v) => v ? v : <span style={{ color: "var(--muted)" }}>—</span>;
  // Stale-snapshot check: does this locked run's advance deduction match what the
  // current advance schedule would recover for its month? If the run was processed
  // before an advance was approved/modified, its figures can be out of date.
  const store = ctx && ctx.store;
  const staleAdvance = store ? run.rows.reduce((n, r) => {
    const emp = store.employees.find((e) => e.id === r.empId);
    if (!emp) return n;
    const expected = (Number(emp.advanceDeductions) || 0) + advanceRepaymentForMonth(store.advances, r.empId, run.month);
    return n + ((Number(r.advance) || 0) !== expected ? 1 : 0);
  }, 0) : 0;
  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={Wallet} label="Gross payroll" value={ugxShort(t.gross)} meta={`${run.rows.length} staff`} tone="brand" />
        <StatCard Icon={FileText} label="PAYE (URA)" value={ugxShort(t.paye)} meta="remitted" tone="accent" />
        <StatCard Icon={Building2} label="NSSF total (15%)" value={ugxShort(t.nssf5 + t.contribution)} meta={`${ugxShort(t.nssf5)} staff + ${ugxShort(t.contribution)} co.`} tone="warning" />
        <StatCard Icon={TrendingUp} label="Advance deductions" value={ugxShort(t.advance)} meta="recovered" tone="accent" />
        <StatCard Icon={Check} label="Net paid" value={ugxShort(t.net)} meta={run.status === "Paid" ? "disbursed" : "to disburse"} tone="success" />
      </div>
      {staleAdvance > 0 && run.status !== "Paid" && (
        <Banner Icon={AlertTriangle} tone="warning">
          This run was processed before the current salary-advance schedule and its advance deductions look out of date ({staleAdvance} {staleAdvance === 1 ? "staff member" : "staff members"}). Approved advances are now auto-recovered — {onReprocess ? "click Re-process to refresh this month's figures." : "re-process this month from the current month view to refresh it."}
          {onReprocess && <> <button onClick={onReprocess} style={{ marginLeft: 8, border: "none", background: "var(--warning)", color: "#fff", fontWeight: 700, fontSize: 12, padding: "5px 11px", borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, verticalAlign: "middle" }}><RefreshCw size={13} />Re-process now</button></>}
        </Banner>
      )}
      <Banner Icon={ShieldCheck}>Processed run for {monthLabel(run.month)} — locked snapshot, {run.status}. Figures reflect the ledger at processing and do not change if staff records are later edited. Approved salary advances were auto-populated into the Advance Ded. column and deducted from net pay.</Banner>
      <Card>
        <CardHead title={`Salary Ledger — ${monthLabel(run.month)}`} right={<Pill tone={run.status === "Paid" ? "success" : "info"}>{run.status}</Pill>} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={grp("var(--surface)", "var(--text-2)")}>#</th>
                <th rowSpan={2} style={{ ...grp("var(--surface)", "var(--text-2)"), textAlign: "left" }}>Name</th>
                <th colSpan={3} style={grp("#f2dd83", "#4a3a06")}>Bank Details</th>
                <th colSpan={2} style={grp("#a3c9ea", "#123a54")}>URA Details</th>
                <th colSpan={1} style={grp("#b8e4c6", "#0d3d24")}>NSSF Details</th>
                <th colSpan={6 + cols.length} style={grp("#e0e7f0", "var(--text)")}>Salary Breakdown</th>
              </tr>
              <tr>
                <th style={sub}>Account No.</th><th style={sub}>Bank</th><th style={sub}>Branch</th>
                <th style={sub}>TIN</th><th style={sub}>NIN</th><th style={sub}>NSSF No.</th>
                <th style={subR}>Gross Pay</th><th style={subR}>NSSF 5%</th><th style={subR}>PAYE</th><th style={subR}>Advance Ded.</th>
                {cols.map((c) => <th key={c.id} style={c.kind === "text" ? sub : subR}>{c.label}{kindSym[c.kind] ? ` (${kindSym[c.kind]})` : ""}</th>)}
                <th style={subR}>Net Pay</th><th style={subR}>10% Co. Contrib.</th>
              </tr>
            </thead>
            <tbody>
              {run.rows.map((r) => (
                <tr key={r.empId || r.no}>
                  <td style={{ ...cellR, color: "var(--muted)" }}>{r.no}</td>
                  <td style={cell}><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{r.empId} · {r.department}</div></td>
                  <td style={{ ...cell, fontFamily: "var(--font-mono)", fontSize: 12 }}>{dash(r.bankAccount)}</td>
                  <td style={cell}>{dash(r.bankName)}</td>
                  <td style={cell}>{dash(r.bankBranch)}</td>
                  <td style={{ ...cell, fontFamily: "var(--font-mono)", fontSize: 12 }}>{dash(r.tin)}</td>
                  <td style={{ ...cell, fontFamily: "var(--font-mono)", fontSize: 12 }}>{dash(r.nationalId)}</td>
                  <td style={{ ...cell, fontFamily: "var(--font-mono)", fontSize: 12 }}>{dash(r.nssfNumber)}</td>
                  <td style={cellR}>{fmtN(r.gross)}</td>
                  <td style={cellR}>{fmtN(r.nssf5)}</td>
                  <td style={cellR}>{fmtN(r.paye)}</td>
                  <td style={{ ...cellR, color: r.advance ? "var(--danger)" : "var(--muted)" }}>{r.advance ? fmtN(r.advance) : "—"}</td>
                  {cols.map((c) => {
                    const v = (r.custom || {})[c.id];
                    if (c.kind === "text") return <td key={c.id} style={cell}>{v || <span style={{ color: "var(--muted)" }}>—</span>}</td>;
                    const n = Number(v) || 0;
                    return <td key={c.id} style={{ ...cellR, color: c.kind === "deduction" ? "var(--danger)" : n ? "var(--success)" : "var(--muted)" }}>{n ? (c.kind === "deduction" ? "−" : "+") + fmtN(n) : "—"}</td>;
                  })}
                  <td style={{ ...cellR, fontWeight: 700, color: "var(--success)" }}>{fmtN(r.net)}</td>
                  <td style={cellR}>{fmtN(r.contribution)}</td>
                </tr>
              ))}
              <tr>
                <td style={tot}></td>
                <td style={tot}>TOTALS · {run.rows.length} staff</td>
                <td style={tot} colSpan={6}></td>
                <td style={totR}>{fmtN(t.gross)}</td>
                <td style={totR}>{fmtN(t.nssf5)}</td>
                <td style={totR}>{fmtN(t.paye)}</td>
                <td style={totR}>{fmtN(t.advance)}</td>
                {cols.map((c) => <td key={c.id} style={totR}>{c.kind === "text" ? "" : fmtN(t.custom[c.id] || 0)}</td>)}
                <td style={{ ...totR, color: "#34d399", fontSize: 13.5 }}>{fmtN(t.net)}</td>
                <td style={totR}>{fmtN(t.contribution)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function LedgerLive({ ctx, prevMonthLabel }) {
  const { store, setModal, reload } = ctx;
  const [chequeNo, setChequeNo] = useState("");
  const emps = store.employees
    .filter((e) => e.status !== "Terminated" && !e.payrollExcluded)
    .map((e) => withAdvanceDeductions(e, store.advances, CURRENT_MONTH));
  const excluded = store.employees.filter((e) => e.status !== "Terminated" && e.payrollExcluded);
  const cols = store.ledgerColumns || [];
  const t = emps.reduce((acc, e) => {
    const p = derivePayslip(e);
    acc.g += p.gross; acc.paye += p.paye; acc.ne += p.nssfEmp; acc.nr += p.nssfEr; acc.adv += p.advance; acc.advAuto += (e._advanceRepay || 0); acc.net += ledgerNet(e, cols);
    return acc;
  }, { g: 0, paye: 0, ne: 0, nr: 0, adv: 0, advAuto: 0, net: 0 });
  const colTotal = (c) => emps.reduce((s, e) => s + (Number((e.custom || {})[c.id]) || 0), 0);

  const exportCsv = () => {
    const header = ["No", "Name", "Account Number", "Bank", "Branch", "TIN", "NIN", "NSSF No", "Gross Pay", "NSSF 5%", "PAYE", "Advance Deductions", ...cols.map((c) => c.label), "Net Pay", "10% Company Contribution"];
    const lines = [header.join(",")].concat(emps.map((e, i) => {
      const p = derivePayslip(e);
      return [i + 1, fullName(e), e.bankAccount, e.bankName, e.bankBranch, e.tin, e.nationalId, e.nssfNumber, p.gross, p.nssfEmp, p.paye, p.advance,
        ...cols.map((c) => (e.custom || {})[c.id] ?? ""), ledgerNet(e, cols), p.nssfEr].map((x) => `"${x ?? ""}"`).join(",");
    }));
    lines.push(["", "TOTALS", "", "", "", "", "", "", t.g, t.ne, t.paye, t.adv, ...cols.map((c) => c.kind === "text" ? "" : colTotal(c)), t.net, t.nr].map((x) => `"${x}"`).join(","));
    lines.push(...signatoryCsvLines());
    downloadFile("gla-monthly-salary-ledger.csv", lines.join("\n"));
  };
  const removeCol = async (c) => { if (window.confirm(`Remove the “${c.label}” column?`)) { await ledgerColumnsApi.remove(c.id); await reload(); } };
  const removeFromPayroll = async (e) => {
    if (window.confirm(`Remove ${fullName(e)} from this payroll?\n\nThey stay in the Employees register and can be added back anytime — this only takes them off the salary ledger.`)) {
      await employeesApi.update(e.id, { payrollExcluded: true }); await reload();
    }
  };
  const restoreToPayroll = async (e) => { await employeesApi.update(e.id, { payrollExcluded: false }); await reload(); };
  const bankKey = `staff-${CURRENT_MONTH}`;
  const bankRec = bankApprovalFor(store, bankKey);
  // Excel bank report — a faithful copy of the PDF bank report (same letterhead,
  // title, cheque, table, total and digital signatures).
  const bankReport = () => downloadBankReportXlsx({
    subtitle: `${monthLabel(CURRENT_MONTH)} · net salaries payable`,
    chequeNo,
    signatories: bankSignatories(bankRec),
    rows: emps.map((e, i) => ({ no: i + 1, name: fullName(e), account: e.bankAccount, bank: e.bankName, branch: e.bankBranch, net: ledgerNet(e, cols) })),
    filename: "GLA-Bank-Report.xlsx",
  });
  const exportPdf = () => downloadReportPdf({
    filename: "GLA-Monthly-Salary-Ledger.pdf",
    eyebrow: "Payroll",
    signatories: SIGNATORIES,
    title: "Monthly Salary Ledger",
    subtitle: `${monthLabel(CURRENT_MONTH)} · ${emps.length} staff`,
    meta: [`Gross: UGX ${fmtN(t.g)}   PAYE: UGX ${fmtN(t.paye)}   NSSF (5%): UGX ${fmtN(t.ne)}   Advance: UGX ${fmtN(t.adv)}   Net: UGX ${fmtN(t.net)}`],
    head: ["#", "Name", "Account No.", "Bank", "Branch", "TIN", "NSSF No.", "Gross", "NSSF 5%", "PAYE", "Advance", ...cols.map((c) => c.label), "Net Pay", "10% Co."],
    body: emps.map((e, i) => { const p = derivePayslip(e); return [i + 1, fullName(e), e.bankAccount || "", e.bankName || "", e.bankBranch || "", e.tin || "", e.nssfNumber || "", fmtN(p.gross), fmtN(p.nssfEmp), fmtN(p.paye), fmtN(p.advance), ...cols.map((c) => c.kind === "text" ? ((e.custom || {})[c.id] || "") : fmtN(Number((e.custom || {})[c.id]) || 0)), fmtN(ledgerNet(e, cols)), fmtN(p.nssfEr)]; })
      .concat([["", "TOTALS", "", "", "", "", "", fmtN(t.g), fmtN(t.ne), fmtN(t.paye), fmtN(t.adv), ...cols.map((c) => c.kind === "text" ? "" : fmtN(colTotal(c))), fmtN(t.net), fmtN(t.nr)]]),
    orientation: "landscape",
  });
  const bankReportPdf = (rec = bankRec) => downloadReportPdf({
    filename: "GLA-Bank-Report.pdf",
    eyebrow: "Payment",
    signatories: bankSignatories(rec),
    title: "Staff Bank Payment Schedule Report",
    subtitle: `${monthLabel(CURRENT_MONTH)} · net salaries payable`,
    meta: [...(chequeNo ? [`Cheque No: ${chequeNo}`] : []), `Total net payable: UGX ${fmtN(emps.reduce((s, e) => s + ledgerNet(e, cols), 0))}`, `Status: ${bankApprovalState(rec) === "authorized" ? "AUTHORIZED FOR THE BANK" : bankApprovalState(rec) === "certified" ? "CERTIFIED — awaiting Managing Director authorization" : "DRAFT — awaiting signatures"}`],
    head: ["#", "Name", "Account Number", "Bank", "Branch", "Net Pay (UGX)"],
    body: emps.map((e, i) => [i + 1, fullName(e), e.bankAccount || "", e.bankName || "", e.bankBranch || "", fmtN(ledgerNet(e, cols))])
      .concat([["", "TOTAL NET PAYABLE", "", "", "", fmtN(emps.reduce((s, e) => s + ledgerNet(e, cols), 0))]]),
  });

  const grp = (bg, color) => ({ background: bg, color, fontWeight: 700, fontSize: 11.5, letterSpacing: ".04em", textTransform: "uppercase", textAlign: "center", padding: "8px 10px", borderBottom: "1px solid var(--border-strong)", borderRight: "1px solid var(--border-strong)" });
  const sub = { fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-2)", fontWeight: 600, padding: "9px 10px", borderBottom: "1px solid var(--border)", background: "var(--surface)", whiteSpace: "nowrap" };
  const subR = { ...sub, textAlign: "right" };
  const cell = { padding: "10px 10px", borderBottom: "1px solid var(--border)", fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap" };
  const cellR = { ...cell, textAlign: "right", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
  const tot = { padding: "13px 10px", background: "var(--ink)", color: "#fff", fontWeight: 700, whiteSpace: "nowrap" };
  const totR = { ...tot, textAlign: "right", fontFamily: "var(--font-mono)" };
  const kindSym = { allowance: "+", deduction: "−" };

  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={Wallet} label="Gross payroll" value={ugxShort(t.g)} meta={`${emps.length} staff · Sept 2026`} tone="brand" />
        <StatCard Icon={FileText} label="PAYE (URA)" value={ugxShort(t.paye)} meta="due by 15th" tone="accent" />
        <StatCard Icon={Building2} label="NSSF total (15%)" value={ugxShort(t.ne + t.nr)} meta={`${ugxShort(t.ne)} staff + ${ugxShort(t.nr)} co.`} tone="warning" />
        <StatCard Icon={TrendingUp} label="Advance deductions" value={ugxShort(t.adv)} meta={t.advAuto ? `${ugxShort(t.advAuto)} auto-recovered from approved advances` : "recovered this month"} tone="accent" />
        <StatCard Icon={Check} label="Net payout" value={ugxShort(t.net)} meta="to staff accounts" tone="success" />
      </div>
      <Banner>Monthly Salary Ledger — <b>derived from employee records</b>. Gross, bank, TIN and NSSF come straight from each staff file (edit them on the employee record, not here); PAYE, NSSF and Net Pay compute automatically.{prevMonthLabel ? <> Carries forward from <b>{prevMonthLabel}</b>.</> : ""} Approved salary advances are recovered here per their repayment schedule. Use <b>Add column</b> for a payroll allowance, deduction or note.</Banner>
      <Card>
        <CardHead title="Monthly Salary Ledger — September 2026" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
          <Btn size="sm" onClick={() => setModal(() => (cc) => <ManagePayrollStaff ctx={cc} />)}><Users size={14} />Manage staff</Btn>
          <Input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} placeholder="Cheque No." title="Cheque number for the bank report" style={{ width: 120, padding: "6px 9px", fontSize: 12.5 }} />
          <div style={{ flex: 1 }} />
          <BankSignoffButton ctx={ctx} reportKey={bankKey} reportTitle="Staff Bank Payment Schedule Report" onDownload={(rec) => bankReportPdf(rec)} />
          <Btn size="sm" onClick={() => bankReportPdf()}><Landmark size={14} />Bank report (PDF)</Btn>
          <Btn size="sm" onClick={bankReport}><Landmark size={14} />Bank report (Excel)</Btn>
          <Btn size="sm" onClick={exportPdf}><FileText size={14} />Personal Report (PDF)</Btn>
          <Btn size="sm" onClick={exportCsv}><Download size={14} />Personal Report (Excel/CSV)</Btn>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={grp("var(--surface)", "var(--text-2)")}>#</th>
                <th rowSpan={2} style={{ ...grp("var(--surface)", "var(--text-2)"), textAlign: "left" }}>Name</th>
                <th colSpan={3} style={grp("#f2dd83", "#4a3a06")}>Bank Details</th>
                <th colSpan={2} style={grp("#a3c9ea", "#123a54")}>URA Details</th>
                <th colSpan={1} style={grp("#b8e4c6", "#0d3d24")}>NSSF Details</th>
                <th colSpan={6 + cols.length} style={grp("#e0e7f0", "var(--text)")}>Salary Breakdown</th>
                <th rowSpan={2} style={grp("var(--surface)", "var(--text-2)")}></th>
              </tr>
              <tr>
                <th style={sub}>Account No.</th><th style={sub}>Bank</th><th style={sub}>Branch</th>
                <th style={sub}>TIN</th><th style={sub}>NIN</th>
                <th style={sub}>NSSF No.</th>
                <th style={subR}>Gross Pay</th><th style={subR}>NSSF 5%</th><th style={subR}>PAYE</th><th style={subR}>Advance Ded.</th>
                {cols.map((c) => (
                  <th key={c.id} style={c.kind === "text" ? sub : subR}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {c.label}{kindSym[c.kind] ? <span style={{ color: "var(--muted)" }}>({kindSym[c.kind]})</span> : null}
                      <button onClick={() => removeCol(c)} title="Remove column" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
                    </span>
                  </th>
                ))}
                <th style={subR}>Net Pay</th><th style={subR}>10% Co. Contrib.</th>
              </tr>
            </thead>
            <tbody>
              {emps.map((e, i) => {
                const p = derivePayslip(e);
                const dash = (v) => v ? v : <span style={{ color: "var(--muted)" }}>—</span>;
                return (
                  <tr key={e.id} onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--surface)")} onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}>
                    <td style={{ ...cellR, color: "var(--muted)" }}>{i + 1}</td>
                    <td style={{ ...cell }}><div style={{ fontWeight: 600 }}>{fullName(e)}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{e.id} · {e.department}</div></td>
                    <td style={{ ...cell, fontFamily: "var(--font-mono)", fontSize: 12 }}>{dash(e.bankAccount)}</td>
                    <td style={cell}>{dash(e.bankName)}</td>
                    <td style={cell}>{dash(e.bankBranch)}</td>
                    <td style={{ ...cell, fontFamily: "var(--font-mono)", fontSize: 12 }}>{dash(e.tin)}</td>
                    <td style={{ ...cell, fontFamily: "var(--font-mono)", fontSize: 12 }}>{dash(e.nationalId)}</td>
                    <td style={{ ...cell, fontFamily: "var(--font-mono)", fontSize: 12 }}>{dash(e.nssfNumber)}</td>
                    <td style={cellR}>{fmtN(p.gross)}</td>
                    <td style={cellR}>{fmtN(p.nssfEmp)}</td>
                    <td style={cellR}>{fmtN(p.paye)}</td>
                    <td style={{ ...cellR, color: p.advance ? "var(--danger)" : "var(--muted)", verticalAlign: "top" }}>
                      {p.advance ? fmtN(p.advance) : "—"}
                      {(e._advanceRepay || 0) > 0 && (
                        <div title="Auto-recovered from an approved salary advance for this month" style={{ marginTop: 3, fontFamily: "var(--font-sans)", fontSize: 9.5, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", color: "var(--brand)", display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                          <RefreshCw size={9} />{(p.advance - e._advanceRepay) > 0 ? <>advance {fmtN(e._advanceRepay)}</> : <>auto · advance</>}
                        </div>
                      )}
                      {(e._advanceRepay || 0) > 0 && (p.advance - e._advanceRepay) > 0 && (
                        <div title="Manual deduction on the staff record" style={{ marginTop: 1, fontFamily: "var(--font-sans)", fontSize: 9.5, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: "var(--muted)", textAlign: "right" }}>
                          other {fmtN(p.advance - e._advanceRepay)}
                        </div>
                      )}
                    </td>
                    {cols.map((c) => {
                      const v = (e.custom || {})[c.id];
                      if (c.kind === "text") return <td key={c.id} style={cell}>{v ? v : <span style={{ color: "var(--muted)" }}>—</span>}</td>;
                      const n = Number(v) || 0;
                      return <td key={c.id} style={{ ...cellR, color: c.kind === "deduction" ? "var(--danger)" : n ? "var(--success)" : "var(--muted)" }}>{n ? (c.kind === "deduction" ? "−" : "+") + fmtN(n) : "—"}</td>;
                    })}
                    <td style={{ ...cellR, fontWeight: 700, color: "var(--success)" }}>{fmtN(ledgerNet(e, cols))}</td>
                    <td style={cellR}>{fmtN(p.nssfEr)}</td>
                    <td style={{ ...cell, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                        <Btn size="sm" onClick={() => setModal(() => (cc) => <EmployeeForm ctx={cc} id={e.id} />)} title="Edit staff record"><Pencil size={13} /></Btn>
                        {cols.length > 0 && <Btn size="sm" onClick={() => setModal(() => (cc) => <PayrollRowForm ctx={cc} id={e.id} />)} title="Payroll allowances / deductions"><Coins size={13} /></Btn>}
                        <Btn size="sm" onClick={() => setModal(() => (cc) => <PayslipModal ctx={cc} id={e.id} />)} title="Payslip"><Printer size={13} /></Btn>
                        <Btn size="sm" onClick={() => removeFromPayroll(e)} title="Remove from payroll"><Trash2 size={13} /></Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td style={tot}></td>
                <td style={tot}>TOTALS · {emps.length} staff</td>
                <td style={tot} colSpan={6}></td>
                <td style={totR}>{fmtN(t.g)}</td>
                <td style={totR}>{fmtN(t.ne)}</td>
                <td style={totR}>{fmtN(t.paye)}</td>
                <td style={totR}>{fmtN(t.adv)}</td>
                {cols.map((c) => <td key={c.id} style={totR}>{c.kind === "text" ? "" : fmtN(colTotal(c))}</td>)}
                <td style={{ ...totR, color: "#34d399", fontSize: 13.5 }}>{fmtN(t.net)}</td>
                <td style={totR}>{fmtN(t.nr)}</td>
                <td style={tot}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      {excluded.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-2)" }}>
          <AlertTriangle size={15} style={{ color: "var(--warning)" }} />
          <span><b>{excluded.length}</b> {excluded.length === 1 ? "staff member is" : "staff members are"} off this payroll ({excluded.map((e) => fullName(e)).join(", ")}).</span>
          <Btn size="sm" onClick={() => setModal(() => (cc) => <ManagePayrollStaff ctx={cc} />)}><Users size={13} />Manage staff</Btn>
        </div>
      )}
    </>
  );
}

// Add a staff member to the payroll — restore an existing employee who was taken
// off the ledger (searchable), or jump to creating a brand-new staff record.
// Single place to manage who is on the payroll — every active employee with an
// on/off toggle. Toggling off keeps them in the Employees register but off the
// salary ledger; toggling on brings them back. New hires can be created inline.
function ManagePayrollStaff({ ctx }) {
  const { store, reload, setModal } = ctx;
  const active = store.employees.filter((e) => e.status !== "Terminated").sort((a, b) => a.id.localeCompare(b.id));
  const onCount = active.filter((e) => !e.payrollExcluded).length;
  const [q, setQ] = useState("");
  const list = active.filter((e) => !q || `${fullName(e)} ${e.id} ${e.department || ""}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = async (e) => { await employeesApi.update(e.id, { payrollExcluded: !e.payrollExcluded }); await reload(); };
  return (
    <Modal title="Manage staff on payroll" sub={`${onCount} of ${active.length} active staff on this month's ledger`} onClose={() => setModal(null)}
      footer={<Btn variant="primary" onClick={() => setModal(null)}>Done</Btn>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>Turn a staff member off to take them off this payroll (they stay in the Employees register); turn them on to add them back. Changes apply immediately.</div>
        <SearchBox value={q} onChange={setQ} placeholder="Search name, staff ID or department…" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
          {list.map((e) => {
            const on = !e.payrollExcluded;
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)" }}>
                <Avatar emp={e} size={30} />
                <div style={{ lineHeight: 1.2, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{fullName(e)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{e.id} · {e.department} · gross {fmtN(Number(e.grossSalary) || 0)}</div>
                </div>
                <button type="button" onClick={() => toggle(e)} title={on ? "On payroll — click to remove" : "Off payroll — click to add"}
                  style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: on ? "var(--success)" : "var(--muted)", minWidth: 64, textAlign: "right" }}>{on ? "On payroll" : "Off payroll"}</span>
                  <span style={{ width: 38, height: 22, borderRadius: 20, background: on ? "var(--success)" : "var(--border-strong)", position: "relative", flex: "none", transition: "background .15s" }}>
                    <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
                  </span>
                </button>
              </div>
            );
          })}
          {list.length === 0 && <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--muted)" }}>No staff match “{q}”.</div>}
        </div>
      </div>
    </Modal>
  );
}

function AddColumnForm({ ctx }) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("allowance");
  const submit = async () => {
    if (!label.trim()) return alert("Column name is required.");
    await ledgerColumnsApi.add({ label: label.trim(), kind });
    await ctx.reload(); ctx.setModal(null);
  };
  return (
    <Modal title="Add ledger column" sub="A custom column on the salary ledger" onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />Add column</Btn></>}>
      <div style={formGrid}>
        <Field label="Column name" required full><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Housing Allowance, Loan Repayment, Remarks" /></Field>
        <Field label="Type" full><Select value={kind} onChange={(e) => setKind(e.target.value)} options={[{ value: "allowance", label: "Allowance (+ adds to net)" }, { value: "deduction", label: "Deduction (− subtracts from net)" }, { value: "text", label: "Text / info (no effect on net)" }]} /></Field>
        <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--muted)" }}>Allowance and deduction columns fold into each employee's Net Pay and the column total. Text columns are informational (remarks, signature, etc.).</div>
      </div>
    </Modal>
  );
}

function SupplierSchedule({ ctx }) {
  const { store, reload, currentEmp } = ctx;
  const runs = (store.supplierRuns || []).slice().sort((a, b) => (b.scheduleDate + b.processedAt).localeCompare(a.scheduleDate + a.processedAt));
  const [date, setDate] = useState(TODAY);
  const [view, setView] = useState("draft");
  const run = runs.find((r) => r.id === view);

  const processSchedule = async () => {
    const lines = store.supplierSchedule || [];
    if (!lines.length) { alert("Add at least one line before processing the schedule.\n\nUse “Add line” to pick a supplier from the register and enter the invoice amount."); return; }
    const rows = lines.map((line, i) => { const r = resolveScheduleLine(line); return { no: i + 1, supplierId: r.supplierId, name: r.name, tin: r.tin, email: r.email, bankAccount: r.bankAccount, bankName: r.bankName, bankBranch: r.bankBranch, subTotal: r.subTotal, applyWht: r.applyWht, applyVat: r.applyVat, wht: r.wht, vat: r.vat, net: r.net }; });
    const totals = rows.reduce((a, r) => ({ subTotal: a.subTotal + r.subTotal, wht: a.wht + r.wht, vat: a.vat + r.vat, net: a.net + r.net }), { subTotal: 0, wht: 0, vat: 0, net: 0 });
    const who = currentEmp ? `${currentEmp.firstName} ${currentEmp.lastName} (HR)` : "HR";
    const id = `SPR-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    // Payment effected: generate a payment advice per supplier and "email" it to those with an address on file.
    const emailed = rows.filter((r) => r.email).length;
    await supplierRunsApi.create({ id, scheduleDate: date, processedBy: who, processedAt: TODAY, rows, totals, emailedAt: TODAY, emailedCount: emailed });
    await reload();
    setView(id);
    alert(`Payment effected — ${rows.length} suppliers, net ${ugx(totals.net)}.\n\nA payment advice has been generated for each supplier and emailed to ${emailed} supplier${emailed === 1 ? "" : "s"} with an email on file.\nThe run is saved to history as a locked record.`);
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>Schedule</span>
        <Select value={view} onChange={(e) => setView(e.target.value)} style={{ width: "auto" }}
          options={[{ value: "draft", label: "Current draft" }, ...runs.map((r) => ({ value: r.id, label: `${fmtDate(r.scheduleDate)} · processed` }))]} />
        {run
          ? <Pill tone="info">Processed · {fmtDate(run.processedAt)}{run.processedBy ? ` by ${run.processedBy}` : ""}</Pill>
          : <Pill tone="warning">Draft — not processed</Pill>}
        {runs.length > 0 && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{runs.length} in history</span>}
        <div style={{ flex: 1 }} />
        {!run && <Btn variant="primary" onClick={processSchedule}><ClipboardCheck size={15} />Process schedule</Btn>}
      </div>
      {run ? <SupplierSnapshot run={run} ctx={ctx} /> : <SupplierDraft ctx={ctx} date={date} setDate={setDate} />}
    </>
  );
}

function SupplierSnapshot({ run, ctx }) {
  const rows = run.rows || [];
  const t = run.totals || { subTotal: 0, wht: 0, vat: 0, net: 0 };
  const [cheque, setCheque] = useState(run.chequeNo || "");
  useEffect(() => { setCheque(run.chequeNo || ""); }, [run.id]);
  const saveCheque = async () => { if (cheque !== (run.chequeNo || "") && ctx) { await supplierRunsApi.update(run.id, { chequeNo: cheque }); ctx.reload && ctx.reload(); } };
  const exportCsv = () => {
    const out = ['"SUPPLIERS PAYMENT SCHEDULE (PROCESSED)"', `"Schedule date:","${run.scheduleDate}"`, `"Processed by:","${run.processedBy || "HR"}","on","${run.processedAt}"`,
      ...(cheque ? [`"Cheque No.:","${cheque}"`] : []), ""];
    out.push(["No", "Name", "Account Number", "Bank", "Branch", "Sub Total", "(-)6% Income With Holding", "(+)18% VAT", "Net Pay"].join(","));
    rows.forEach((r) => out.push([r.no, r.name, r.bankAccount, r.bankName, r.bankBranch, r.subTotal, r.wht, r.vat, r.net].map((x) => `"${x ?? ""}"`).join(",")));
    out.push(["", "TOTAL", "", "", "", t.subTotal, t.wht, t.vat, t.net].map((x) => `"${x}"`).join(","));
    out.push(...signatoryCsvLines());
    downloadFile(`gla-supplier-schedule-${run.scheduleDate}.csv`, out.join("\n"));
  };
  const exportPdf = () => downloadReportPdf({
    filename: `GLA-Supplier-Schedule-${run.scheduleDate}.pdf`,
    eyebrow: "Procurement",
    signatories: SIGNATORIES,
    title: "Suppliers Payment Schedule",
    subtitle: `Schedule date: ${fmtDate(run.scheduleDate)} · processed`,
    meta: [`Processed by ${run.processedBy || "HR"} · ${fmtDate(run.processedAt)}`, ...(cheque ? [`Cheque No: ${cheque}`] : []), `Sub-total: UGX ${fmtN(t.subTotal)}   6% WHT: UGX ${fmtN(t.wht)}   18% VAT: UGX ${fmtN(t.vat)}   Net payable: UGX ${fmtN(t.net)}`],
    head: ["#", "Name", "Account Number", "Bank", "Branch", "Sub Total", "(-) 6% WHT", "(+) 18% VAT", "Net Pay"],
    body: rows.map((r) => [r.no, r.name, r.bankAccount || "", r.bankName || "", r.bankBranch || "", fmtN(r.subTotal), r.applyWht ? fmtN(r.wht) : "n/a", r.applyVat ? fmtN(r.vat) : "n/a", fmtN(r.net)])
      .concat([["", "TOTAL", "", "", "", fmtN(t.subTotal), fmtN(t.wht), fmtN(t.vat), fmtN(t.net)]]),
    orientation: "landscape",
  });
  const bankKey = `sup-run-${run.id}`;
  const bankRec = bankApprovalFor(ctx.store, bankKey);
  const bankReportPdf = (rec = bankRec) => downloadReportPdf({
    filename: `GLA-Supplier-Bank-Report-${run.scheduleDate}.pdf`,
    eyebrow: "Procurement",
    signatories: bankSignatories(rec),
    title: "Supplier Bank Payment Schedule Report",
    subtitle: `Schedule date: ${fmtDate(run.scheduleDate)} · net payable to suppliers`,
    meta: [`Processed by ${run.processedBy || "HR"} · ${fmtDate(run.processedAt)}`, `Cheque No: ${cheque || "__________________________"}`, `Total net payable: UGX ${fmtN(t.net)}`, `Status: ${bankApprovalState(rec) === "authorized" ? "AUTHORIZED FOR THE BANK" : bankApprovalState(rec) === "certified" ? "CERTIFIED — awaiting Managing Director authorization" : "DRAFT — awaiting signatures"}`],
    head: ["#", "Supplier", "Account Number", "Bank", "Branch", "Net Pay (UGX)"],
    body: rows.map((r) => [r.no, r.name, r.bankAccount || "", r.bankName || "", r.bankBranch || "", fmtN(r.net)])
      .concat([["", "TOTAL NET PAYABLE", "", "", "", fmtN(t.net)]]),
  });
  const bankReportExcel = () => downloadBankReportXlsx({
    title: "Supplier Bank Payment Schedule Report", eyebrow: "PROCUREMENT", nameHeader: "Supplier",
    subtitle: `Schedule date: ${fmtDate(run.scheduleDate)} · net payable to suppliers`,
    chequeNo: cheque || "__________________________",
    signatories: bankSignatories(bankRec),
    rows: rows.map((r) => ({ no: r.no, name: r.name, account: r.bankAccount, bank: r.bankName, branch: r.bankBranch, net: r.net })),
    filename: `GLA-Supplier-Bank-Report-${run.scheduleDate}.xlsx`,
  });
  const grp = (bg, color) => ({ background: bg, color, fontWeight: 700, fontSize: 11.5, letterSpacing: ".04em", textTransform: "uppercase", textAlign: "center", padding: "8px 10px", borderBottom: "1px solid var(--border-strong)", borderRight: "1px solid var(--border-strong)" });
  const sub = { fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-2)", fontWeight: 600, padding: "9px 10px", borderBottom: "1px solid var(--border)", background: "var(--surface)", whiteSpace: "nowrap" };
  const subR = { ...sub, textAlign: "right" };
  const cell = { padding: "10px 10px", borderBottom: "1px solid var(--border)", fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap" };
  const cellR = { ...cell, textAlign: "right", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
  const tot = { padding: "13px 10px", background: "var(--ink)", color: "#fff", fontWeight: 700, whiteSpace: "nowrap" };
  const totR = { ...tot, textAlign: "right", fontFamily: "var(--font-mono)" };
  const dash = (v) => v ? v : <span style={{ color: "var(--muted)" }}>—</span>;
  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={FileText} label="Sub-total (invoices)" value={ugxShort(t.subTotal)} meta={`${rows.length} suppliers`} tone="brand" />
        <StatCard Icon={TrendingUp} label="6% WHT (deducted)" value={ugxShort(t.wht)} meta="income withholding" tone="warning" />
        <StatCard Icon={Plus} label="18% VAT (added)" value={ugxShort(t.vat)} meta="value-added tax" tone="accent" />
        <StatCard Icon={Check} label="Net payable" value={ugxShort(t.net)} meta="to suppliers" tone="success" />
      </div>
      <Banner Icon={ShieldCheck}>Processed supplier schedule for {fmtDate(run.scheduleDate)} — locked history record. Figures are a snapshot at processing and do not change if the draft is later edited.</Banner>
      <Banner Icon={Mail} tone="success">Payment effected — a <b>payment advice</b> was generated for each supplier and emailed to {run.emailedCount != null ? run.emailedCount : rows.filter((r) => r.email).length} supplier(s) with an email on file{run.emailedAt ? ` on ${fmtDate(run.emailedAt)}` : ""}. Open <b>Advice</b> on any row to view, download or re-send it.</Banner>
      <Card>
        <CardHead title={`Suppliers Payment Schedule — ${fmtDate(run.scheduleDate)}`} right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Pill tone="info">Processed</Pill>
          <Input value={cheque} onChange={(e) => setCheque(e.target.value)} onBlur={saveCheque} placeholder="Cheque No." title="Cheque number for the bank report (saved on this run)" style={{ width: 118, padding: "6px 9px", fontSize: 12.5 }} />
          <Btn size="sm" onClick={() => { const n = rows.filter((r) => r.email).length; alert(`Payment advices re-sent by email to ${n} supplier${n === 1 ? "" : "s"} with an address on file.`); }}><Mail size={14} />Email all advices</Btn>
          <BankSignoffButton ctx={ctx} reportKey={bankKey} reportTitle="Supplier Bank Payment Schedule Report" onDownload={(rec) => bankReportPdf(rec)} />
          <Btn size="sm" onClick={() => bankReportPdf()}><Landmark size={14} />Bank report (PDF)</Btn>
          <Btn size="sm" onClick={bankReportExcel}><Landmark size={14} />Bank report (Excel)</Btn>
          <Btn size="sm" onClick={exportPdf}><FileText size={14} />PDF</Btn>
          <Btn size="sm" onClick={exportCsv}><Download size={14} />Excel/CSV</Btn>
        </div>} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={grp("var(--surface)", "var(--text-2)")}>#</th>
                <th rowSpan={2} style={{ ...grp("var(--surface)", "var(--text-2)"), textAlign: "left" }}>Bank / Name</th>
                <th colSpan={3} style={grp("#ffe94d", "#4a3a06")}>Bank Details</th>
                <th colSpan={3} style={grp("#ffe94d", "#4a3a06")}>Payment Details</th>
                <th rowSpan={2} style={grp("#b8e4c6", "#0d3d24")}>Net Pay</th>
                <th rowSpan={2} style={grp("var(--surface)", "var(--text-2)")}>Advice</th>
              </tr>
              <tr>
                <th style={sub}>Account Number</th><th style={sub}>Bank</th><th style={sub}>Branch</th>
                <th style={subR}>Sub Total</th><th style={subR}>(−) 6% Withholding</th><th style={subR}>(+) 18% VAT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...cellR, color: "var(--muted)" }}>{r.no}</td>
                  <td style={cell}><div style={{ fontWeight: 600 }}>{r.name}</div>{r.email ? <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.email}</div> : null}</td>
                  <td style={{ ...cell, fontFamily: "var(--font-mono)", fontSize: 12 }}>{dash(r.bankAccount)}</td>
                  <td style={cell}>{dash(r.bankName)}</td>
                  <td style={cell}>{dash(r.bankBranch)}</td>
                  <td style={cellR}>{fmtN(r.subTotal)}</td>
                  <td style={{ ...cellR, color: r.applyWht ? "var(--danger)" : "var(--muted)" }}>{r.applyWht ? (r.wht ? "−" + fmtN(r.wht) : "0") : "n/a"}</td>
                  <td style={{ ...cellR, color: r.applyVat ? "var(--success)" : "var(--muted)" }}>{r.applyVat ? (r.vat ? "+" + fmtN(r.vat) : "0") : "n/a"}</td>
                  <td style={{ ...cellR, fontWeight: 700, color: "var(--success)" }}>{fmtN(r.net)}</td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    <Btn size="sm" onClick={() => ctx && ctx.setModal(() => (cc) => <SupplierPaymentAdvice ctx={cc} run={run} row={r} />)} title="Payment advice"><FileText size={13} />Advice</Btn>
                  </td>
                </tr>
              ))}
              <tr>
                <td style={tot}></td>
                <td style={tot}>TOTAL · {rows.length} suppliers</td>
                <td style={tot} colSpan={3}></td>
                <td style={totR}>{fmtN(t.subTotal)}</td>
                <td style={totR}>{fmtN(t.wht)}</td>
                <td style={totR}>{fmtN(t.vat)}</td>
                <td style={{ ...totR, color: "#34d399", fontSize: 13.5 }}>{fmtN(t.net)}</td>
                <td style={tot}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ================== Bank report digital sign-off (2-step) =================
   A bank report is only "authorized for the bank" once TWO signatures are in
   place, in order: the Director of Engineering CERTIFIES first, then the
   Managing Director AUTHORIZES. The MD's signature is dependent on the
   Director of Engineering's — it is blocked until the first is applied, and
   removing the first removes the second. Signatures carry a name, timestamp
   and a verification code, and are embedded in the exported PDF. */
const BANK_SIGN_STEPS = [
  { key: "engineer", position: "Director Engineering", label: "Director of Engineering", verb: "Certify", role: "Certifies the schedule is correct" },
  { key: "md", position: "Managing Director", label: "Managing Director", verb: "Authorize", role: "Authorizes release to the bank", dependsOn: "engineer" },
];
const genSignCode = () => "GLA-" + Math.random().toString(36).slice(2, 7).toUpperCase() + "-" + Date.now().toString(36).slice(-4).toUpperCase();
// Build the signatory block for a bank-report PDF from a sign-off record.
function bankSignatories(rec) {
  const mk = (sig, label) => sig
    ? { name: sig.name, title: label, signedText: sig.name, signedMeta: `Digitally signed ${fmtDate(sig.at)} · ${sig.code}` }
    : { name: "____________________", title: label, pending: "Pending signature" };
  return [mk(rec && rec.engineer, "Director of Engineering"), mk(rec && rec.md, "Managing Director")];
}
const bankApprovalFor = (store, key) => (store.bankApprovals || []).find((r) => r.key === key) || null;
const bankApprovalState = (rec) => rec && rec.engineer && rec.md ? "authorized" : (rec && rec.engineer ? "certified" : "unsigned");

// Sign-off panel — the dependency workflow for a single bank report.
function BankReportSignoff({ ctx, reportKey, reportTitle, onDownload }) {
  const { store, reload, setModal } = ctx;
  const rec = bankApprovalFor(store, reportKey);
  const empByPosition = (pos) => store.employees.find((e) => e.status !== "Terminated" && e.jobTitle === pos);
  const sign = async (step) => {
    if (step.dependsOn && !(rec && rec[step.dependsOn])) { alert(`The ${BANK_SIGN_STEPS.find((s) => s.key === step.dependsOn).label} must sign first.`); return; }
    const holder = empByPosition(step.position);
    const name = window.prompt(`${step.label} — type your full name to ${step.verb.toLowerCase()} and sign this bank report:`, holder ? fullName(holder) : "");
    if (!name || !name.trim()) return;
    const sig = { name: name.trim(), at: TODAY, code: genSignCode() };
    if (rec) await bankApprovalsApi.update(rec.id, { [step.key]: sig });
    else await bankApprovalsApi.create({ key: reportKey, label: reportTitle, [step.key]: sig });
    await reload();
  };
  const revoke = async (step) => {
    if (!rec) return;
    const alsoMd = step.key === "engineer" && rec.md;
    if (!window.confirm(`Remove the ${step.label} signature?${alsoMd ? " This also removes the Managing Director's authorization." : ""}`)) return;
    const patch = { [step.key]: null }; if (step.key === "engineer") patch.md = null;
    await bankApprovalsApi.update(rec.id, patch); await reload();
  };
  const state = bankApprovalState(rec);
  const statePill = state === "authorized" ? <Pill tone="success">Authorized for the bank</Pill>
    : state === "certified" ? <Pill tone="warning">Certified — awaiting authorization</Pill>
    : <Pill tone="muted">Unsigned</Pill>;
  return (
    <Modal title="Bank report sign-off" sub={reportTitle} onClose={() => setModal(null)}
      footer={<><Btn onClick={() => setModal(null)}>Close</Btn><Btn variant="primary" disabled={state !== "authorized"} onClick={() => { onDownload(rec); }}><Landmark size={15} />Download authorized report</Btn></>}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>{statePill}<span style={{ fontSize: 12.5, color: "var(--text-2)" }}>Two signatures are required, in order. The Managing Director can only authorize after the Director of Engineering certifies.</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {BANK_SIGN_STEPS.map((step, i) => {
          const sig = rec && rec[step.key];
          const blocked = step.dependsOn && !(rec && rec[step.dependsOn]);
          const holder = empByPosition(step.position);
          return (
            <div key={step.key} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: sig ? "var(--success-dim)" : "var(--surface)", opacity: blocked ? 0.6 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ width: 26, height: 26, flex: "none", borderRadius: "50%", display: "grid", placeItems: "center", background: sig ? "var(--success)" : "var(--surface-2)", color: sig ? "#fff" : "var(--muted)", fontWeight: 700, fontSize: 13 }}>{sig ? <Check size={15} /> : i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{step.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{step.role}{holder ? ` · ${fullName(holder)}` : ""}</div>
                </div>
                <div style={{ flex: 1 }} />
                {sig
                  ? <Btn size="sm" variant="danger" onClick={() => revoke(step)}><X size={13} />Revoke</Btn>
                  : <Btn size="sm" variant="primary" disabled={blocked} onClick={() => sign(step)} title={blocked ? "Awaiting the Director of Engineering signature" : ""}><Pencil size={13} />{step.verb} & sign</Btn>}
              </div>
              {sig && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border)", display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 700, fontSize: 18, color: "var(--success)" }}>{sig.name}</span>
                  <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Digitally signed {fmtDate(sig.at)} · code {sig.code}</span>
                </div>
              )}
              {blocked && !sig && <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--warning)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} />Locked until the Director of Engineering certifies.</div>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// A small status button that opens the bank-report sign-off (shows current state).
function BankSignoffButton({ ctx, reportKey, reportTitle, onDownload }) {
  const rec = bankApprovalFor(ctx.store, reportKey);
  const state = bankApprovalState(rec);
  const tone = state === "authorized" ? "var(--success)" : state === "certified" ? "var(--warning)" : "var(--muted)";
  const label = state === "authorized" ? "Signed · authorized" : state === "certified" ? "1 of 2 signed" : "Bank sign-off";
  return (
    <Btn size="sm" onClick={() => ctx.setModal(() => (cc) => <BankReportSignoff ctx={cc} reportKey={reportKey} reportTitle={reportTitle} onDownload={onDownload} />)}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: tone, flex: "none" }} />{label}
    </Btn>
  );
}

// Per-supplier payment advice (pay slip) — generated when a schedule is processed
// (payment effected) and "emailed" to the supplier. Viewable, downloadable, resendable.
function SupplierPaymentAdvice({ ctx, run, row }) {
  const company = (ctx.store.settings && ctx.store.settings.company) || {};
  const kv = (label, value) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span><span style={{ color: "var(--text)", fontWeight: 500, textAlign: "right" }}>{value || <span style={{ color: "var(--muted)" }}>—</span>}</span>
    </div>
  );
  const amt = (label, value, tone) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}>
      <span style={{ color: "var(--text-2)" }}>{label}</span><span className="mono" style={{ color: tone || "var(--text)" }}>{value}</span>
    </div>
  );
  const downloadPdf = () => downloadReportPdf({
    filename: `GLA-Payment-Advice-${(row.name || "supplier").replace(/[^\w]+/g, "-")}-${run.scheduleDate}.pdf`,
    eyebrow: "Remittance",
    signatories: SIGNATORIES,
    title: "Supplier Payment Advice",
    subtitle: `${row.name}${row.tin ? " · TIN " + row.tin : ""}`,
    meta: [
      `Payment date: ${fmtDate(run.scheduleDate)}   ·   Reference: ${run.id}`,
      `Paid to: ${[row.bankName, row.bankAccount, row.bankBranch].filter(Boolean).join("  ·  ") || "No bank details on file"}`,
      row.email ? `Emailed to: ${row.email}` : "No email on file",
    ],
    head: ["Description", "Amount (UGX)"],
    body: [
      ["Invoice sub-total", fmtN(row.subTotal)],
      ["Less: 6% income withholding tax", row.applyWht ? "(" + fmtN(row.wht) + ")" : "n/a"],
      ["Add: 18% VAT", row.applyVat ? fmtN(row.vat) : "n/a"],
      ["NET PAID", fmtN(row.net)],
    ],
  });
  const isDraft = run.id === "DRAFT" || !run.emailedAt;
  const resend = () => alert(row.email
    ? `Payment advice ${run.emailedAt ? "re-sent" : "sent"} by email to ${row.name} at ${row.email}.`
    : `${row.name} has no email on file. Add one in the Suppliers register to email their advice.`);
  const printAdvice = () => {
    const w = window.open("", "_blank", "width=760,height=980");
    if (!w) { alert("Please allow pop-ups to print the payment advice."); return; }
    const row2 = (l, v, c) => `<tr><td style="padding:7px 0;color:#555;border-bottom:1px solid #eee">${l}</td><td style="padding:7px 0;text-align:right;font-weight:600;border-bottom:1px solid #eee;color:${c || "#111"}">${v}</td></tr>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Payment Advice — ${row.name}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:36px;max-width:640px}
      .hd{background:#10131a;color:#fff;padding:16px 18px;border-radius:10px}
      .hd h1{font-size:17px;margin:0;font-weight:800}.hd .a{font-size:11px;color:#bcc3cf;margin-top:3px}
      .hd .e{margin-top:9px;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#e0a92b}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-top:14px}
      .box{margin-top:14px;border:1px solid #ddd;border-radius:10px;padding:14px 16px}
      .amt td{font-family:'Courier New',monospace}.net{border-top:2px solid #111;font-weight:800;font-size:15px}
      .sig{margin-top:48px;display:flex;gap:40px}.sig div{flex:1;border-top:1px solid #999;padding-top:6px;font-size:12px;text-align:center}
      @media print{body{margin:14mm}}</style></head><body onload="window.print()">
      <div class="hd"><h1>${company.name || "Global Link Associates Ltd"}</h1><div class="a">${company.address || ""}</div><div class="e">Supplier Payment Advice · Remittance</div></div>
      <table>
        ${row2("Supplier", row.name)}${row2("TIN", row.tin || "—")}
        ${row2("Payment date", fmtDate(run.scheduleDate))}${row2("Reference", run.id)}
        ${row2("Paid to", [row.bankName, row.bankAccount].filter(Boolean).join(" · ") || "—")}${row2("Branch", row.bankBranch || "—")}
      </table>
      <div class="box"><table class="amt">
        ${row2("Invoice sub-total", fmtN(row.subTotal))}
        ${row2("(−) 6% income withholding tax", row.applyWht ? "−" + fmtN(row.wht) : "n/a", row.applyWht ? "#b3261e" : "#999")}
        ${row2("(+) 18% VAT", row.applyVat ? "+" + fmtN(row.vat) : "n/a", row.applyVat ? "#1b7a43" : "#999")}
        <tr class="net"><td style="padding-top:9px">NET PAID</td><td style="padding-top:9px;text-align:right;font-family:'Courier New',monospace;color:#1b7a43">UGX ${fmtN(row.net)}</td></tr>
      </table></div>
      <div class="sig">${(SIGNATORIES || []).map((s) => `<div><b>${s.name}</b><br>${s.contact || ""}</div>`).join("") || "<div>Approved Signatory</div>"}</div>
      </body></html>`);
    w.document.close(); w.focus();
  };
  return (
    <Modal title="Supplier Payment Advice" sub={`${row.name} · ${fmtDate(run.scheduleDate)}`} onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Close</Btn><Btn onClick={printAdvice}><Printer size={15} />Print</Btn><Btn onClick={resend}><Mail size={15} />{row.email ? "Email advice" : "No email on file"}</Btn><Btn variant="primary" onClick={downloadPdf}><FileText size={15} />Download PDF</Btn></>}>
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: "var(--ink)", color: "#fff", padding: "14px 16px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>{company.name || "Global Link Associates Ltd"}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginTop: 2 }}>{company.address || ""}</div>
          <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent)" }}>Payment Advice · Remittance</div>
        </div>
        <div style={{ padding: "14px 16px" }}>
          {row.email && !isDraft && <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--success)", fontWeight: 600 }}><Mail size={14} />Emailed to {row.email}{run.emailedAt ? ` on ${fmtDate(run.emailedAt)}` : ""}</div>}
          {row.email && isDraft && <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}><Mail size={14} />Ready to email to {row.email}</div>}
          {kv("Supplier", row.name)}
          {kv("TIN", row.tin)}
          {kv("Payment date", fmtDate(run.scheduleDate))}
          {kv("Reference", run.id)}
          {kv("Paid to", [row.bankName, row.bankAccount].filter(Boolean).join(" · "))}
          {kv("Branch", row.bankBranch)}
          <div style={{ marginTop: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
            {amt("Invoice sub-total", fmtN(row.subTotal))}
            {amt("(−) 6% income withholding tax" + (row.applyWht ? "" : " · n/a"), row.applyWht ? "−" + fmtN(row.wht) : "—", row.applyWht ? "var(--danger)" : "var(--muted)")}
            {amt("(+) 18% VAT" + (row.applyVat ? "" : " · n/a"), row.applyVat ? "+" + fmtN(row.vat) : "—", row.applyVat ? "var(--success)" : "var(--muted)")}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border)", marginTop: 6, paddingTop: 8, fontWeight: 800 }}><span>Net paid</span><span className="mono" style={{ color: "var(--success)" }}>{ugx(row.net)}</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Single place to manage which suppliers are on the current schedule — every
// active supplier with an on/off toggle. On adds a line (invoice amount entered
// in the table); off removes all their lines. New suppliers can be created inline.
function ManageScheduleSuppliers({ ctx }) {
  const { store, reload, setModal } = ctx;
  const suppliers = (store.suppliers || []).filter((s) => s.status !== "Inactive").sort((a, b) => a.name.localeCompare(b.name));
  const lines = store.supplierSchedule || [];
  const lineCount = (sid) => lines.filter((l) => l.supplierId === sid).length;
  const onCount = new Set(lines.map((l) => l.supplierId)).size;
  const [q, setQ] = useState("");
  const list = suppliers.filter((s) => !q || `${s.name} ${s.tin || ""} ${s.category || ""}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = async (s) => {
    const mine = lines.filter((l) => l.supplierId === s.id);
    if (mine.length) { for (const l of mine) await supplierScheduleApi.remove(l.id); }
    else { await supplierScheduleApi.create({ supplierId: s.id, subTotal: 0, applyWht: s.whtDefault !== false, applyVat: s.vatDefault !== false }); }
    await reload();
  };
  return (
    <Modal title="Manage suppliers on schedule" sub={`${onCount} of ${suppliers.length} active suppliers on this schedule`} onClose={() => setModal(null)}
      footer={<Btn variant="primary" onClick={() => setModal(null)}>Done</Btn>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>Turn a supplier on to add them to this schedule, off to remove them. Enter each invoice amount in the schedule table (the 6% WHT, 18% VAT and Net Pay fill in automatically).</div>
        <SearchBox value={q} onChange={setQ} placeholder="Search supplier, TIN or category…" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
          {list.map((s) => {
            const n = lineCount(s.id);
            const on = n > 0;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)" }}>
                <span style={{ width: 30, height: 30, flex: "none", borderRadius: 8, display: "grid", placeItems: "center", background: "var(--surface-2)", color: "var(--muted)" }}><Landmark size={15} /></span>
                <div style={{ lineHeight: 1.2, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.category || "—"}{s.tin ? ` · TIN ${s.tin}` : ""}{on && n > 1 ? ` · ${n} lines` : ""}</div>
                </div>
                <button type="button" onClick={() => toggle(s)} title={on ? "On schedule — click to remove" : "Off schedule — click to add"}
                  style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: on ? "var(--success)" : "var(--muted)", minWidth: 74, textAlign: "right" }}>{on ? "On schedule" : "Off schedule"}</span>
                  <span style={{ width: 38, height: 22, borderRadius: 20, background: on ? "var(--success)" : "var(--border-strong)", position: "relative", flex: "none", transition: "background .15s" }}>
                    <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
                  </span>
                </button>
              </div>
            );
          })}
          {list.length === 0 && <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--muted)" }}>No suppliers match “{q}”.</div>}
        </div>
      </div>
    </Modal>
  );
}

function SupplierDraft({ ctx, date, setDate }) {
  const { store, setModal, reload } = ctx;
  const lines = store.supplierSchedule || [];
  const rows = lines.map((line) => resolveScheduleLine(line));
  const t = rows.reduce((a, r) => ({ subTotal: a.subTotal + r.subTotal, wht: a.wht + r.wht, vat: a.vat + r.vat, net: a.net + r.net }), { subTotal: 0, wht: 0, vat: 0, net: 0 });
  const hasSuppliers = (store.suppliers || []).some((s) => s.status !== "Inactive");
  const [chequeNo, setChequeNo] = useState("");

  const removeRow = async (r) => {
    if (window.confirm(`Remove “${r.name}” from this schedule?\n\nThis only takes the line off the schedule — the supplier stays in the Suppliers register.`)) {
      await supplierScheduleApi.remove(r.id); await reload();
    }
  };
  const exportCsv = () => {
    const out = [];
    out.push([`SUPPLIERS PAYMENT SCHEDULE : ${date}`].map((x) => `"${x}"`).join(","));
    if (chequeNo) out.push([`Cheque No.:,${chequeNo}`].map((x) => `"${x}"`).join(","));
    out.push(["No", "Name", "TIN", "Account Number", "Bank", "Branch", "Sub Total", "(-)6% Income With Holding", "(+)18% VAT", "Net Pay"].join(","));
    rows.forEach((r, i) => out.push([i + 1, r.name, r.tin, r.bankAccount, r.bankName, r.bankBranch, r.subTotal, r.wht, r.vat, r.net].map((x) => `"${x ?? ""}"`).join(",")));
    out.push(["", "TOTAL", "", "", "", "", t.subTotal, t.wht, t.vat, t.net].map((x) => `"${x}"`).join(","));
    out.push(...signatoryCsvLines());
    downloadFile(`gla-supplier-schedule-${date}.csv`, out.join("\n"));
  };
  const exportPdf = () => downloadReportPdf({
    filename: `GLA-Supplier-Schedule-${date}.pdf`,
    eyebrow: "Procurement",
    signatories: SIGNATORIES,
    title: "Suppliers Payment Schedule",
    subtitle: `Schedule date: ${fmtDate(date)} · ${rows.length} suppliers`,
    meta: [...(chequeNo ? [`Cheque No: ${chequeNo}`] : []), `Sub-total: UGX ${fmtN(t.subTotal)}   6% WHT: UGX ${fmtN(t.wht)}   18% VAT: UGX ${fmtN(t.vat)}   Net payable: UGX ${fmtN(t.net)}`],
    head: ["#", "Name", "Account Number", "Bank", "Branch", "Sub Total", "(-) 6% WHT", "(+) 18% VAT", "Net Pay"],
    body: rows.map((r, i) => [i + 1, r.name, r.bankAccount || "", r.bankName || "", r.bankBranch || "", fmtN(r.subTotal), r.applyWht ? fmtN(r.wht) : "n/a", r.applyVat ? fmtN(r.vat) : "n/a", fmtN(r.net)])
      .concat([["", "TOTAL", "", "", "", fmtN(t.subTotal), fmtN(t.wht), fmtN(t.vat), fmtN(t.net)]]),
    orientation: "landscape",
  });
  // Supplier bank payment schedule — net payable per supplier, like the staff bank report.
  const bankKey = `sup-${date}`;
  const bankRec = bankApprovalFor(store, bankKey);
  const bankReportPdf = (rec = bankRec) => downloadReportPdf({
    filename: `GLA-Supplier-Bank-Report-${date}.pdf`,
    eyebrow: "Procurement",
    signatories: bankSignatories(rec),
    title: "Supplier Bank Payment Schedule Report",
    subtitle: `Schedule date: ${fmtDate(date)} · net payable to suppliers`,
    meta: [`Cheque No: ${chequeNo || "__________________________"}`, `Total net payable: UGX ${fmtN(t.net)}`, `Status: ${bankApprovalState(rec) === "authorized" ? "AUTHORIZED FOR THE BANK" : bankApprovalState(rec) === "certified" ? "CERTIFIED — awaiting Managing Director authorization" : "DRAFT — awaiting signatures"}`],
    head: ["#", "Supplier", "Account Number", "Bank", "Branch", "Net Pay (UGX)"],
    body: rows.map((r, i) => [i + 1, r.name, r.bankAccount || "", r.bankName || "", r.bankBranch || "", fmtN(r.net)])
      .concat([["", "TOTAL NET PAYABLE", "", "", "", fmtN(t.net)]]),
  });
  const bankReportExcel = () => downloadBankReportXlsx({
    title: "Supplier Bank Payment Schedule Report", eyebrow: "PROCUREMENT", nameHeader: "Supplier",
    subtitle: `Schedule date: ${fmtDate(date)} · net payable to suppliers`,
    chequeNo: chequeNo || "__________________________",
    signatories: bankSignatories(bankRec),
    rows: rows.map((r, i) => ({ no: i + 1, name: r.name, account: r.bankAccount, bank: r.bankName, branch: r.bankBranch, net: r.net })),
    filename: `GLA-Supplier-Bank-Report-${date}.xlsx`,
  });

  const grp = (bg, color) => ({ background: bg, color, fontWeight: 700, fontSize: 11.5, letterSpacing: ".04em", textTransform: "uppercase", textAlign: "center", padding: "8px 10px", borderBottom: "1px solid var(--border-strong)", borderRight: "1px solid var(--border-strong)" });
  const sub = { fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-2)", fontWeight: 600, padding: "9px 10px", borderBottom: "1px solid var(--border)", background: "var(--surface)", whiteSpace: "nowrap" };
  const subR = { ...sub, textAlign: "right" };
  const cell = { padding: "10px 10px", borderBottom: "1px solid var(--border)", fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap" };
  const cellR = { ...cell, textAlign: "right", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
  const tot = { padding: "13px 10px", background: "var(--ink)", color: "#fff", fontWeight: 700, whiteSpace: "nowrap" };
  const totR = { ...tot, textAlign: "right", fontFamily: "var(--font-mono)" };
  const dash = (v) => v ? v : <span style={{ color: "var(--muted)" }}>—</span>;

  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={FileText} label="Sub-total (invoices)" value={ugxShort(t.subTotal)} meta={`${rows.length} suppliers`} tone="brand" />
        <StatCard Icon={TrendingUp} label="6% WHT (deducted)" value={ugxShort(t.wht)} meta="income withholding" tone="warning" />
        <StatCard Icon={Plus} label="18% VAT (added)" value={ugxShort(t.vat)} meta="value-added tax" tone="accent" />
        <StatCard Icon={Check} label="Net payable" value={ugxShort(t.net)} meta="to suppliers" tone="success" />
      </div>
      <Banner Icon={Landmark}>Suppliers Payment Schedule — lines are picked from the <b>Suppliers</b> register. Net Pay = Sub total − 6% income withholding tax + 18% VAT. Use <b>Manage suppliers</b> to add or remove suppliers, then enter each invoice amount on its row; bank details, the 6%, 18% and Net Pay fill in automatically.</Banner>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>Schedule date</span>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
      </div>
      <Card>
        <CardHead title={`Suppliers Payment Schedule — ${fmtDate(date)}`} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
          <Btn size="sm" variant="primary" onClick={() => setModal(() => (cc) => <ManageScheduleSuppliers ctx={cc} />)}><Building2 size={14} />Manage suppliers</Btn>
          <Input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} placeholder="Cheque No." title="Cheque number for the bank report" style={{ width: 120, padding: "6px 9px", fontSize: 12.5 }} />
          <div style={{ flex: 1 }} />
          <BankSignoffButton ctx={ctx} reportKey={bankKey} reportTitle="Supplier Bank Payment Schedule Report" onDownload={(rec) => bankReportPdf(rec)} />
          <Btn size="sm" onClick={() => bankReportPdf()}><Landmark size={14} />Bank report (PDF)</Btn>
          <Btn size="sm" onClick={bankReportExcel}><Landmark size={14} />Bank report (Excel)</Btn>
          <Btn size="sm" onClick={exportPdf}><FileText size={14} />Schedule Report (PDF)</Btn>
          <Btn size="sm" onClick={exportCsv}><Download size={14} />Schedule Report (Excel/CSV)</Btn>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={grp("var(--surface)", "var(--text-2)")}>#</th>
                <th rowSpan={2} style={{ ...grp("var(--surface)", "var(--text-2)"), textAlign: "left" }}>Bank / Name</th>
                <th colSpan={3} style={grp("#ffe94d", "#4a3a06")}>Bank Details</th>
                <th colSpan={3} style={grp("#ffe94d", "#4a3a06")}>Payment Details</th>
                <th rowSpan={2} style={grp("#b8e4c6", "#0d3d24")}>Net Pay</th>
                <th rowSpan={2} style={grp("var(--surface)", "var(--text-2)")}></th>
              </tr>
              <tr>
                <th style={sub}>Account Number</th><th style={sub}>Bank</th><th style={sub}>Branch</th>
                <th style={subR}>Sub Total</th><th style={subR}>(−) 6% Withholding</th><th style={subR}>(+) 18% VAT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--surface)")} onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}>
                  <td style={{ ...cellR, color: "var(--muted)" }}>{i + 1}</td>
                  <td style={cell}><div style={{ fontWeight: 600 }}>{r.name}</div>{r.category ? <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.category}{r.tin ? ` · TIN ${r.tin}` : ""}</div> : null}</td>
                  <td style={{ ...cell, fontFamily: "var(--font-mono)", fontSize: 12 }}>{dash(r.bankAccount)}</td>
                  <td style={cell}>{dash(r.bankName)}</td>
                  <td style={cell}>{dash(r.bankBranch)}</td>
                  <td style={cellR}>{fmtN(r.subTotal)}</td>
                  <td style={{ ...cellR, color: r.applyWht ? "var(--danger)" : "var(--muted)" }}>{r.applyWht ? (r.wht ? "−" + fmtN(r.wht) : "0") : "n/a"}</td>
                  <td style={{ ...cellR, color: r.applyVat ? "var(--success)" : "var(--muted)" }}>{r.applyVat ? (r.vat ? "+" + fmtN(r.vat) : "0") : "n/a"}</td>
                  <td style={{ ...cellR, fontWeight: 700, color: "var(--success)" }}>{fmtN(r.net)}</td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                      <Btn size="sm" onClick={() => setModal(() => (cc) => <SupplierPaymentAdvice ctx={cc} run={{ id: "DRAFT", scheduleDate: date, emailedAt: "" }} row={r} />)} title="Payment slip — print or email"><Printer size={13} /></Btn>
                      <Btn size="sm" onClick={() => setModal(() => (cc) => <ScheduleLineForm ctx={cc} id={r.id} />)} title="Edit line"><Pencil size={13} /></Btn>
                      <Btn size="sm" onClick={() => removeRow(r)} title="Remove from schedule"><Trash2 size={13} /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={10} style={{ ...cell, textAlign: "center", color: "var(--muted)", padding: "28px 10px" }}>{hasSuppliers ? "No lines yet. Use “Manage suppliers” to add suppliers to this schedule." : "No suppliers yet. Add suppliers in the Suppliers module first, then pick them here."}</td></tr>}
              {rows.length > 0 && (
                <tr>
                  <td style={tot}></td>
                  <td style={tot}>TOTAL · {rows.length} suppliers</td>
                  <td style={tot} colSpan={3}></td>
                  <td style={totR}>{fmtN(t.subTotal)}</td>
                  <td style={totR}>{fmtN(t.wht)}</td>
                  <td style={totR}>{fmtN(t.vat)}</td>
                  <td style={{ ...totR, color: "#34d399", fontSize: 13.5 }}>{fmtN(t.net)}</td>
                  <td style={tot}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// A schedule line: pick a supplier from the register, enter the invoice sub-total,
// and toggle the 6% WHT / 18% VAT (defaulting to the supplier's tax defaults).
function ScheduleLineForm({ ctx, id }) {
  const adding = !id;
  const suppliers = (ctx.store.suppliers || []).filter((s) => s.status !== "Inactive");
  const existing = (ctx.store.supplierSchedule || []).find((l) => l.id === id);
  const [f, setF] = useState(existing
    ? { supplierId: existing.supplierId, subTotal: existing.subTotal, applyWht: existing.applyWht !== false, applyVat: existing.applyVat !== false }
    : { supplierId: suppliers[0]?.id || "", subTotal: 0, applyWht: suppliers[0]?.whtDefault !== false, applyVat: suppliers[0]?.vatDefault !== false });
  const sup = supplierById(f.supplierId) || {};
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k) => () => setF({ ...f, [k]: !f[k] });
  const pickSupplier = (supplierId) => {
    const s = supplierById(supplierId) || {};
    setF((cur) => ({ ...cur, supplierId, applyWht: s.whtDefault !== false, applyVat: s.vatDefault !== false }));
  };
  // Suppliers already on the current draft — flag so users don't add a duplicate line unknowingly.
  const onDraft = new Set((ctx.store.supplierSchedule || []).filter((l) => l.id !== id).map((l) => l.supplierId));
  const dupe = adding && onDraft.has(f.supplierId);
  const d = deriveSupplier(f);
  const submit = async () => {
    if (!f.supplierId) return alert("Pick a supplier. Add one in the Suppliers module first if the list is empty.");
    const payload = { supplierId: f.supplierId, subTotal: Number(f.subTotal) || 0, applyWht: !!f.applyWht, applyVat: !!f.applyVat };
    if (adding) await supplierScheduleApi.create(payload); else await supplierScheduleApi.update(id, payload);
    await ctx.reload(); ctx.setModal(null);
  };
  const Toggle = ({ on, onClick, label, hint }) => (
    <button type="button" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: on ? "var(--surface)" : "var(--bg-elevated)", cursor: "pointer" }}>
      <span style={{ width: 34, height: 20, borderRadius: 20, background: on ? "var(--success)" : "var(--border-strong)", position: "relative", flex: "none", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
      </span>
      <span style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{hint}</div></span>
    </button>
  );
  const previewRow = { display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0" };
  return (
    <Modal title={adding ? "Add schedule line" : "Edit schedule line"} sub="Pick a supplier and enter the invoice amount" onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />{adding ? "Add line" : "Save changes"}</Btn></>}>
      {!suppliers.length ? (
        <div style={{ padding: "8px 2px", color: "var(--text-2)", fontSize: 13 }}>No active suppliers yet. Open the <b>Suppliers</b> module and add a supplier first, then come back to add it to the schedule.</div>
      ) : (
        <div style={formGrid}>
          <FieldsetTitle first>Supplier</FieldsetTitle>
          <Field label="Supplier" required full hint="Search the Suppliers register by name, TIN or category">
            <SupplierSearch suppliers={suppliers} value={f.supplierId} onSelect={pickSupplier} />
          </Field>
          <div style={{ gridColumn: "1 / -1", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "var(--text-2)" }}>
            <div><b style={{ color: "var(--text)" }}>{sup.name || "—"}</b>{sup.tin ? ` · TIN ${sup.tin}` : ""}</div>
            <div style={{ marginTop: 2 }}>{[sup.bankName, sup.bankAccount, sup.bankBranch].filter(Boolean).join(" · ") || "No bank details on file"}</div>
          </div>
          {dupe && <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, background: "var(--warning-dim)", color: "var(--warning)", borderRadius: 10, padding: "9px 12px", fontSize: 12.5, fontWeight: 600 }}><AlertTriangle size={15} />This supplier is already on the current schedule — adding will create a second invoice line for them.</div>}
          <FieldsetTitle>Invoice</FieldsetTitle>
          <Field label="Sub total (UGX)" full hint="Invoice amount before tax"><Input type="number" value={f.subTotal} onChange={set("subTotal")} /></Field>
          <Field label="6% income withholding"><Toggle on={f.applyWht} onClick={toggle("applyWht")} label={f.applyWht ? "Applied (−6%)" : "Not applied"} hint="Optional — deducted" /></Field>
          <Field label="18% VAT"><Toggle on={f.applyVat} onClick={toggle("applyVat")} label={f.applyVat ? "Applied (+18%)" : "Not applied"} hint="Optional — added" /></Field>
          <div style={{ gridColumn: "1 / -1", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={previewRow}><span style={{ color: "var(--text-2)" }}>Sub total</span><span className="mono">{ugx(d.subTotal)}</span></div>
            <div style={previewRow}><span style={{ color: "var(--text-2)" }}>(−) 6% income withholding{f.applyWht ? "" : " · off"}</span><span className="mono" style={{ color: f.applyWht ? "var(--danger)" : "var(--muted)" }}>{f.applyWht ? "−" + ugx(d.wht) : "—"}</span></div>
            <div style={previewRow}><span style={{ color: "var(--text-2)" }}>(+) 18% VAT{f.applyVat ? "" : " · off"}</span><span className="mono" style={{ color: f.applyVat ? "var(--success)" : "var(--muted)" }}>{f.applyVat ? "+" + ugx(d.vat) : "—"}</span></div>
            <div style={{ ...previewRow, borderTop: "1px dashed var(--border)", marginTop: 4, paddingTop: 8, fontWeight: 700 }}><span>Net Pay</span><span className="mono" style={{ color: "var(--success)" }}>{ugx(d.net)}</span></div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ============================== Suppliers register ============================== */
function Suppliers({ ctx }) {
  const { store, setModal } = ctx;
  const all = store.suppliers || [];
  const scheduleCount = (sid) => (store.supplierSchedule || []).filter((l) => l.supplierId === sid).length;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const list = all.filter((s) => {
    if (cat && s.category !== cat) return false;
    if (!q) return true;
    return [s.name, s.tin, s.category, s.contactPerson, s.bankName, s.email].join(" ").toLowerCase().includes(q.toLowerCase());
  });
  const active = all.filter((s) => s.status !== "Inactive").length;
  const onSchedule = new Set((store.supplierSchedule || []).map((l) => l.supplierId)).size;
  const statusTone = (s) => (s === "Inactive" ? "muted" : "success");
  const addToSchedule = async (s) => { await supplierScheduleApi.create({ supplierId: s.id, subTotal: 0, applyWht: s.whtDefault !== false, applyVat: s.vatDefault !== false }); await ctx.reload(); };
  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={Building2} label="Suppliers" value={all.length} meta={`${active} active`} tone="brand" />
        <StatCard Icon={ClipboardCheck} label="On current schedule" value={onSchedule} meta="lines in the draft" tone="accent" />
        <StatCard Icon={Landmark} label="With bank details" value={all.filter((s) => s.bankAccount).length} meta="ready for EFT" tone="success" />
        <StatCard Icon={FileText} label="VAT-registered" value={all.filter((s) => s.vatDefault !== false).length} meta="charge 18% VAT" tone="warning" />
      </div>
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Search name, TIN, contact, bank…" />
        <Select value={cat} onChange={(e) => setCat(e.target.value)} options={[{ value: "", label: "All categories" }, ...SUPPLIER_CATEGORIES.map((c) => ({ value: c, label: c }))]} style={{ width: "auto" }} />
        <div style={{ flex: 1 }} />
        <Btn variant="primary" onClick={() => setModal(() => (cc) => <SupplierForm ctx={cc} id={null} />)}><Plus size={16} />Add supplier</Btn>
      </Toolbar>
      <Card>
        <DataTable
          columns={[
            { label: "Supplier", render: (s) => (
              <div><div style={{ fontWeight: 600, color: "var(--text)" }}>{s.name}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.category || "—"}{s.tin ? ` · TIN ${s.tin}` : ""}</div></div>
            ) },
            { label: "Contact", render: (s) => (
              <div><div>{s.contactPerson || "—"}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.phone || s.email || ""}</div></div>
            ) },
            { label: "Bank", render: (s) => s.bankAccount ? <div><div>{s.bankName}</div><div className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.bankAccount}</div></div> : <span style={{ color: "var(--muted)" }}>—</span> },
            { label: "Tax", render: (s) => <div style={{ display: "flex", gap: 5 }}>{s.whtDefault !== false && <Tag>6% WHT</Tag>}{s.vatDefault !== false && <Tag>18% VAT</Tag>}{s.whtDefault === false && s.vatDefault === false && <span style={{ color: "var(--muted)" }}>—</span>}</div> },
            { label: "Status", render: (s) => <Pill tone={statusTone(s.status)}>{s.status || "Active"}</Pill> },
            { label: "", render: (s) => (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <Btn size="sm" onClick={() => setModal(() => (cc) => <SupplierView ctx={cc} id={s.id} />)} title="View supplier"><FileText size={13} /></Btn>
                {scheduleCount(s.id) === 0 && s.status !== "Inactive" && <Btn size="sm" variant="success" onClick={() => addToSchedule(s)} title="Add to payment schedule"><Plus size={13} />Schedule</Btn>}
                <Btn size="sm" onClick={() => setModal(() => (cc) => <SupplierForm ctx={cc} id={s.id} />)} title="Edit"><Pencil size={13} /></Btn>
                <Btn size="sm" onClick={() => setModal(() => (cc) => <ConfirmDelete ctx={cc} api={suppliersApi} id={s.id} label={s.name} />)} title="Delete"><Trash2 size={13} /></Btn>
              </div>
            ) },
          ]}
          rows={list}
          empty="No suppliers match your filters. Use “Add supplier” to create one."
        />
      </Card>
    </>
  );
}

function nextSupplierId(suppliers) {
  const nums = (suppliers || []).map((s) => parseInt(String(s.id).replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
  return "SUP-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
}

function SupplierForm({ ctx, id }) {
  const adding = !id;
  const existing = (ctx.store.suppliers || []).find((s) => s.id === id);
  const [f, setF] = useState(existing
    ? { whtDefault: existing.whtDefault !== false, vatDefault: existing.vatDefault !== false, ...existing }
    : { id: nextSupplierId(ctx.store.suppliers), name: "", tin: "", category: SUPPLIER_CATEGORIES[0], contactPerson: "", phone: "", email: "", bankName: "", bankAccount: "", bankBranch: "", address: "", whtDefault: true, vatDefault: true, status: "Active", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k) => () => setF({ ...f, [k]: !f[k] });
  const submit = async () => {
    if (!f.name.trim()) return alert("Supplier name is required.");
    const payload = { ...f, whtDefault: !!f.whtDefault, vatDefault: !!f.vatDefault };
    if (adding) await suppliersApi.create(payload); else await suppliersApi.update(id, payload);
    await ctx.reload(); ctx.setModal(null);
  };
  const Toggle = ({ on, onClick, label, hint }) => (
    <button type="button" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: on ? "var(--surface)" : "var(--bg-elevated)", cursor: "pointer" }}>
      <span style={{ width: 34, height: 20, borderRadius: 20, background: on ? "var(--success)" : "var(--border-strong)", position: "relative", flex: "none", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
      </span>
      <span style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{hint}</div></span>
    </button>
  );
  return (
    <Modal title={adding ? "Add supplier" : "Edit supplier"} sub={adding ? "New vendor record" : f.id} onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />{adding ? "Add supplier" : "Save changes"}</Btn></>}>
      <div style={formGrid}>
        <FieldsetTitle first>Supplier</FieldsetTitle>
        <Field label="Name" required full><Input value={f.name} onChange={set("name")} placeholder="e.g. Nsubuga Technical Supplies Ltd" /></Field>
        <Field label="Category"><Select value={f.category} onChange={set("category")} options={SUPPLIER_CATEGORIES} /></Field>
        <Field label="TIN"><Input value={f.tin} onChange={set("tin")} placeholder="Tax Identification No." /></Field>
        <Field label="Status"><Select value={f.status} onChange={set("status")} options={SUPPLIER_STATUSES} /></Field>
        <Field label="Address"><Input value={f.address} onChange={set("address")} placeholder="Physical / postal address" /></Field>
        <FieldsetTitle>Contact</FieldsetTitle>
        <Field label="Contact person"><Input value={f.contactPerson} onChange={set("contactPerson")} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Email" full><Input value={f.email} onChange={set("email")} /></Field>
        <FieldsetTitle>Bank details</FieldsetTitle>
        <Field label="Account number"><Input value={f.bankAccount} onChange={set("bankAccount")} /></Field>
        <Field label="Bank"><Input value={f.bankName} onChange={set("bankName")} placeholder="e.g. Stanbic Bank" /></Field>
        <Field label="Branch" full><Input value={f.bankBranch} onChange={set("bankBranch")} placeholder="e.g. Garden City" /></Field>
        <FieldsetTitle>Tax defaults</FieldsetTitle>
        <Field label="6% income withholding" hint="Default for new schedule lines"><Toggle on={f.whtDefault} onClick={toggle("whtDefault")} label={f.whtDefault ? "Applies (−6%)" : "Not applied"} hint="Deducted from payment" /></Field>
        <Field label="18% VAT" hint="Default for new schedule lines"><Toggle on={f.vatDefault} onClick={toggle("vatDefault")} label={f.vatDefault ? "Applies (+18%)" : "Not applied"} hint="Added to payment" /></Field>
        <Field label="Notes" full><Textarea value={f.notes} onChange={set("notes")} /></Field>
      </div>
    </Modal>
  );
}

function SupplierView({ ctx, id }) {
  const s = (ctx.store.suppliers || []).find((x) => x.id === id);
  if (!s) return null;
  const runs = (ctx.store.supplierRuns || []).filter((r) => (r.rows || []).some((row) => row.supplierId === id || row.name === s.name));
  const row = (label, value) => (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "6px 14px", fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--border)" }} className="stack-dl">
      <span style={{ color: "var(--muted)" }}>{label}</span><span style={{ color: "var(--text)", fontWeight: 500 }}>{value || <span style={{ color: "var(--muted)" }}>—</span>}</span>
    </div>
  );
  return (
    <Modal title={s.name} sub={`${s.id}${s.category ? " · " + s.category : ""}`} wide onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Close</Btn><Btn variant="primary" onClick={() => ctx.setModal(() => (cc) => <SupplierForm ctx={cc} id={s.id} />)}><Pencil size={15} />Edit</Btn></>}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Pill tone={s.status === "Inactive" ? "muted" : "success"}>{s.status || "Active"}</Pill>
        {s.whtDefault !== false && <Tag>6% WHT</Tag>}
        {s.vatDefault !== false && <Tag>18% VAT</Tag>}
      </div>
      {row("TIN", s.tin)}
      {row("Category", s.category)}
      {row("Address", s.address)}
      {row("Contact person", s.contactPerson)}
      {row("Phone", s.phone)}
      {row("Email", s.email)}
      {row("Bank", s.bankName)}
      {row("Account number", s.bankAccount)}
      {row("Branch", s.bankBranch)}
      {row("Notes", s.notes)}
      {runs.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Payment history</div>
          {runs.map((r) => { const rr = (r.rows || []).find((x) => x.supplierId === id || x.name === s.name); return (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-2)" }}>{fmtDate(r.scheduleDate)}</span>
              <span className="mono" style={{ fontWeight: 600 }}>{ugx(rr ? rr.net : 0)}</span>
            </div>
          ); })}
        </div>
      )}
    </Modal>
  );
}

// Payroll allowances / deductions for one employee — the payroll overlay only.
// Salary, bank and statutory details are read-only here (edited on the employee record).
function PayrollRowForm({ ctx, id }) {
  const existing = ctx.empById(id);
  const cols = ctx.store.ledgerColumns || [];
  const base = existing || {};
  const [f, setF] = useState({ custom: { ...(base.custom || {}) } });
  const setCustom = (cid) => (ev) => setF((s) => ({ ...s, custom: { ...s.custom, [cid]: ev.target.value } }));
  const previewEmp = { ...base, custom: f.custom };
  const preview = derivePayslip(previewEmp);
  const previewNet = ledgerNet(previewEmp, cols);
  const submit = async () => {
    const custom = {};
    cols.forEach((c) => { const v = f.custom[c.id]; custom[c.id] = c.kind === "text" ? (v || "") : (Number(v) || 0); });
    await employeesApi.update(id, { custom });
    await ctx.reload(); ctx.setModal(null);
  };
  if (!existing) return null;
  return (
    <Modal title="Payroll allowances / deductions" sub={fullName(existing)} onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />Save adjustments</Btn></>}>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 14 }}>
        Gross salary, bank and statutory details are read-only here — they come from the staff record. Edit those on the employee record. This dialog sets only the payroll allowance / deduction columns for this staff member.
      </div>
      <div style={formGrid}>
        {cols.length === 0 && <div style={{ gridColumn: "1 / -1", fontSize: 13, color: "var(--muted)" }}>No allowance or deduction columns yet. Use “Add column” on the ledger to create one.</div>}
        {cols.map((c) => (
          <Field key={c.id} label={c.label + (c.kind === "allowance" ? " (+)" : c.kind === "deduction" ? " (−)" : "")} full>
            {c.kind === "text"
              ? <Input value={f.custom[c.id] || ""} onChange={setCustom(c.id)} />
              : <Input type="number" value={f.custom[c.id] || 0} onChange={setCustom(c.id)} />}
          </Field>
        ))}
        <div style={{ gridColumn: "1 / -1", marginTop: 4, padding: "12px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
          <span>Gross: <b className="mono">{ugx(preview.gross)}</b></span>
          <span>PAYE: <b className="mono">{ugx(preview.paye)}</b></span>
          <span>NSSF 5%: <b className="mono">{ugx(preview.nssfEmp)}</b></span>
          <span>Net pay: <b className="mono" style={{ color: "var(--success)" }}>{ugx(previewNet)}</b></span>
        </div>
      </div>
    </Modal>
  );
}

function PayslipModal({ ctx, id }) {
  const base = ctx.empById(id);
  if (!base) return null;
  const e = withAdvanceDeductions(base, ctx.store.advances, CURRENT_MONTH);
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
        {(e._advanceRepay || 0) > 0 && <Row label="Salary advance repayment" amount={"− " + ugx(e._advanceRepay)} deduct />}
        {(p.advance - (e._advanceRepay || 0)) > 0 && <Row label="Other deductions" amount={"− " + ugx(p.advance - (e._advanceRepay || 0))} deduct />}
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

function StaffFile({ ctx, id, onBack, backLabel = "Employees" }) {
  const e = ctx.empById(id);
  if (!e) return <Card pad><div style={{ padding: 24, color: "var(--muted)" }}>Staff member not found.</div></Card>;
  const back = onBack || (() => ctx.setView("employees"));
  const ps = derivePayslip(e);
  const openEdit = () => ctx.setModal(() => (cc) => <EmployeeForm ctx={cc} id={e.id} />);
  const viewDoc = () => alert("Document preview isn’t available in this demo prototype.");

  const exportPdf = () => {
    const or = e.origin || {}, re = e.residence || {}, co = e.contact || {}, tm = e.terms || {};
    downloadDocumentPdf({
      filename: `GLA-Staff-File-${e.id}.pdf`,
      eyebrow: "Personnel",
      title: "Electronic Staff File",
      subtitle: `${fullName(e)} · ${e.id}${e.position || e.jobTitle ? " · " + (e.position || e.jobTitle) : ""}`,
      meta: [`File No: ${na(e.fileNumber)}`],
      sections: [
        { heading: "Bio Data Information", type: "kv", rows: [
          ["Name", fullName(e)], ["Email", na(e.email)], ["Gender", (e.gender || "").toString()],
          ["Date of Birth", fmtDateLong(e.dob)], ["Year Joined", fmtDateLong(e.employmentDate)], ["Nationality", na(e.nationality)],
          ["NIN", na(e.nationalId)], ["TIN", na(e.tin)], ["Marital Status", na(e.maritalStatus)], ["Religion", na(e.religion)], ["Disability", na(e.disability)],
          ["Region of Origin", na(or.region)], ["District of Origin", na(or.district)], ["County of Origin", na(or.county)], ["Village of Origin", na(or.village)],
          ["Residence District", na(re.district)], ["Residence County", na(re.county)], ["Residence Sub County", na(re.subCounty)], ["Residence Parish", na(re.parish)], ["Residence Village", na(re.village)],
        ] },
        { heading: "Contact Information", type: "kv", rows: [
          ["Postal Address", na(co.postalAddress)], ["Telephone", na(co.telephone)], ["Mobile", na(co.mobile)], ["Email", na(co.email)], ["District", na(co.district)],
        ] },
        { heading: "Bank Details", type: "table", head: ["Bank", "Account Name", "Account Number", "Branch"],
          body: (e.bankDetails || []).map((r) => [na(r.bankName), na(r.accountName), na(r.accountNumber), na(r.branch)]), empty: "No bank details on record" },
        { heading: "Employment History", type: "table", head: ["Position", "Employer", "Start", "End"],
          body: (e.employmentHistory || []).map((r) => [na(r.position), na(r.employer), fmtDateLong(r.startDate), fmtDateLong(r.endDate)]), empty: "No employment history on record" },
        { heading: "Academic Qualifications", type: "table", head: ["Qualification", "Institution", "Award Date", "Highest", "Status"],
          body: (e.academicQualifications || []).map((r) => [na(r.title), na(r.institution), fmtDateLong(r.awardDate), r.highest || "No", na(r.status)]), empty: "No academic records on record" },
        { heading: "Terms of Employment", type: "kv", rows: [
          ["Terms of Employment", na(tm.terms)], ["Start Date", fmtDateLong(tm.startDate)], ["End Date", fmtDateLong(tm.endDate)],
          ["Entry Salary", na(tm.entrySalary)], ["Appointment Authority", na(tm.appointmentAuthority)], ["Source of Payment", na(tm.sourceOfPayment)],
        ] },
        { heading: "Professional Specialization", type: "table", head: ["Specialization", "Institution", "Year"],
          body: (e.professionalSpecialization || []).map((r) => [na(r.area), na(r.institution), na(r.year)]), empty: "No specialization on record" },
        { heading: "Professional Membership", type: "table", head: ["Organization", "Membership Number", "Date Joined", "Status"],
          body: (e.professionalMembership || []).map((r) => [na(r.organization), na(r.membershipNumber), fmtDateLong(r.dateJoined), na(r.status)]), empty: "No membership on record" },
        { heading: "Children / Dependants", type: "table", head: ["Name", "Relationship", "Date of Birth", "Gender"],
          body: (e.children || []).map((r) => [na(r.name), na(r.relationship), fmtDateLong(r.dob), na(r.gender)]), empty: "No dependants on record" },
        { heading: "Next of Kin", type: "table", head: ["Surname", "Other Names", "Relationship", "Contact", "Address"],
          body: (e.nextOfKin || []).map((r) => [na(r.surname), na(r.otherNames), na(r.relationship), na(r.contact), na(r.address)]), empty: "No next of kin on record" },
      ],
    });
  };

  return (
    <div className="sf-print" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1040 }}>
      {/* breadcrumb + actions */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          <span style={{ color: "var(--brand)", cursor: "pointer", fontWeight: 600 }} onClick={back}>{backLabel}</span>
          <span style={{ margin: "0 6px" }}>/</span>Staff File
        </div>
        <div style={{ flex: 1 }} />
        <Btn onClick={back}><ChevronLeft size={16} />Back</Btn>
        <Btn onClick={exportPdf}><FileText size={15} />Download PDF</Btn>
        <Btn onClick={() => window.print()}><Printer size={15} />Print</Btn>
        <Btn variant="primary" onClick={openEdit}><Pencil size={15} />Update Staff File</Btn>
      </div>

      {/* print-only letterhead */}
      <div className="print-only sf-letterhead">
        <div className="sf-lh-name">GLOBAL LINK ASSOCIATES LTD</div>
        <div className="sf-lh-sub">Human Resource Department · Electronic Staff File</div>
        <div className="sf-lh-contact">www.glassociates.co.ug · Kampala, Uganda</div>
        <div className="sf-lh-meta">Printed {fmtDateLong(TODAY)} · File No. {na(e.fileNumber)}</div>
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

/* ========================== Stock Management ============================ */
const stockStatusTone = { Healthy: "success", OK: "info", Low: "warning", "Out of stock": "danger" };
// Format days-of-cover (∞ when there's no recent usage).
const fmtCover = (d) => (d === Infinity || d == null ? "—" : d >= 999 ? "999+ d" : Math.round(d) + " d");

/* ------------------------------- stock reports -----------------------------
   Branded PDF (via downloadReportPdf) + CSV for each stock view. All values use
   the moving weighted-average cost (itemValuation), matching the module. */
const REPORT_DATE = () => fmtDate(TODAY);

function stockValuationReport(items, movements) {
  const sorted = [...items].sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name));
  const byCat = {};
  let grand = 0;
  const body = sorted.map((it, i) => {
    const v = itemValuation(it, movements);
    grand += v.value; byCat[it.category] = (byCat[it.category] || 0) + v.value;
    return [i + 1, it.category, it.code, it.name, `${fmtN(v.qty)} ${it.unit}`, fmtN(Math.round(v.avgCost)), fmtN(v.value)];
  });
  body.push(["", "", "", "GRAND TOTAL", "", "", fmtN(grand)]);
  const meta = Object.entries(byCat).sort().map(([c, v]) => `${c}: UGX ${fmtN(v)}`);
  meta.unshift(`Valuation basis: moving weighted-average cost · ${items.length} items · as at ${REPORT_DATE()}`);
  downloadReportPdf({
    filename: "GLA-Stock-Valuation-Report.pdf", eyebrow: "Inventory", signatories: SIGNATORIES,
    title: "Stock Valuation Report", subtitle: `Total stock value: UGX ${fmtN(grand)}`,
    meta, head: ["#", "Category", "Code", "Item", "Qty on hand", "Avg cost", "Value (UGX)"],
    body, orientation: "landscape",
  });
}
function stockValuationCsv(items, movements) {
  const sorted = [...items].sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name));
  const lines = ['"Stock Valuation Report"', `"Valuation basis: moving weighted-average cost as at ${REPORT_DATE()}"`, "",
    ["No", "Category", "Code", "Item", "Unit", "Qty on hand", "Avg cost (UGX)", "Value (UGX)"].join(",")];
  let grand = 0;
  sorted.forEach((it, i) => { const v = itemValuation(it, movements); grand += v.value; lines.push([i + 1, it.category, it.code, it.name, it.unit, v.qty, Math.round(v.avgCost), v.value].map((x) => `"${x ?? ""}"`).join(",")); });
  lines.push(["", "", "", "GRAND TOTAL", "", "", "", grand].map((x) => `"${x}"`).join(","));
  lines.push(...signatoryCsvLines());
  downloadFile("gla-stock-valuation.csv", lines.join("\n"));
}

function reorderReport(items, movements) {
  const low = items.filter((i) => itemBalance(i, movements) <= (Number(i.reorderLevel) || 0))
    .sort((a, b) => itemBalance(a, movements) - itemBalance(b, movements));
  let est = 0;
  const body = low.map((it, i) => {
    const bal = itemBalance(it, movements); const sug = suggestedOrderQty(it, movements);
    const v = itemValuation(it, movements); const orderVal = Math.round(sug * v.avgCost); est += orderVal;
    return [i + 1, it.code, it.name, `${fmtN(bal)} ${it.unit}`, fmtN(it.reorderLevel), fmtN(Math.max(0, it.reorderLevel - bal)), fmtN(sug), fmtN(orderVal)];
  });
  body.push(["", "", "ESTIMATED REPLENISHMENT", "", "", "", "", fmtN(est)]);
  downloadReportPdf({
    filename: "GLA-Reorder-Report.pdf", eyebrow: "Inventory", signatories: SIGNATORIES,
    title: "Reorder / Low-Stock Report", subtitle: `${low.length} item(s) at or below reorder level`,
    meta: [`As at ${REPORT_DATE()} · target replenishment brings stock to 2× the reorder level`],
    head: ["#", "Code", "Item", "Balance", "Reorder level", "Shortfall", "Suggested order", "Est. value (UGX)"],
    body, orientation: "landscape",
  });
}
function reorderCsv(items, movements) {
  const low = items.filter((i) => itemBalance(i, movements) <= (Number(i.reorderLevel) || 0)).sort((a, b) => itemBalance(a, movements) - itemBalance(b, movements));
  const lines = ['"Reorder / Low-Stock Report"', `"As at ${REPORT_DATE()}"`, "",
    ["No", "Code", "Item", "Unit", "Balance", "Reorder level", "Shortfall", "Suggested order", "Est. value (UGX)"].join(",")];
  let est = 0;
  low.forEach((it, i) => { const bal = itemBalance(it, movements); const sug = suggestedOrderQty(it, movements); const v = itemValuation(it, movements); const ov = Math.round(sug * v.avgCost); est += ov; lines.push([i + 1, it.code, it.name, it.unit, bal, it.reorderLevel, Math.max(0, it.reorderLevel - bal), sug, ov].map((x) => `"${x ?? ""}"`).join(",")); });
  lines.push(["", "", "ESTIMATED REPLENISHMENT", "", "", "", "", "", est].map((x) => `"${x}"`).join(","));
  lines.push(...signatoryCsvLines());
  downloadFile("gla-reorder-report.csv", lines.join("\n"));
}

function movementReport(rows, items, label) {
  const itemById = (id) => items.find((i) => i.id === id) || {};
  let inVal = 0, outVal = 0;
  const body = rows.map((m) => {
    const it = itemById(m.itemId); const val = (Number(m.qty) || 0) * (Number(m.unitCost) || 0);
    const d = movementDelta(m);
    if (d >= 0) inVal += Math.abs(val); else outVal += Math.abs(val);
    return [fmtDate(m.date), m.reference || "—", it.name || "—", MOVEMENT_LABELS[m.type] || m.type,
      `${d >= 0 ? "+" : "−"}${fmtN(Math.abs(m.qty))} ${it.unit || ""}`, fmtN(m.unitCost), fmtN(Math.abs(val)),
      m.type === "IN" ? (m.party || "—") : (m.issuedTo || m.party || "—"), m.approvedBy || "—"];
  });
  downloadReportPdf({
    filename: "GLA-Stock-Movement-Report.pdf", eyebrow: "Inventory", signatories: SIGNATORIES,
    title: "Stock Movement Report", subtitle: label,
    meta: [`${rows.length} movement(s) · Receipts: UGX ${fmtN(inVal)} · Issues/adjustments: UGX ${fmtN(outVal)} · generated ${REPORT_DATE()}`],
    head: ["Date", "Reference", "Item", "Type", "Qty", "Unit cost", "Value (UGX)", "Supplier / Issued to", "Approved by"],
    body, orientation: "landscape",
  });
}
function movementCsv(rows, items, label) {
  const itemById = (id) => items.find((i) => i.id === id) || {};
  const lines = [`"Stock Movement Report"`, `"${label}"`, "",
    ["Date", "Reference", "Item", "Code", "Type", "Qty", "Unit", "Unit cost", "Value", "Supplier / Issued to", "Approved by", "Notes"].join(",")];
  rows.forEach((m) => { const it = itemById(m.itemId); const d = movementDelta(m); lines.push([fmtDate(m.date), m.reference || "", it.name || "", it.code || "", MOVEMENT_LABELS[m.type] || m.type, `${d >= 0 ? "+" : "-"}${Math.abs(m.qty)}`, it.unit || "", m.unitCost, Math.abs((Number(m.qty) || 0) * (Number(m.unitCost) || 0)), m.type === "IN" ? (m.party || "") : (m.issuedTo || m.party || ""), m.approvedBy || "", m.reason || m.notes || ""].map((x) => `"${x ?? ""}"`).join(",")); });
  lines.push(...signatoryCsvLines());
  downloadFile("gla-stock-movements.csv", lines.join("\n"));
}

function stockCardReport(item, movements) {
  const ms = sortedMovements(movements.filter((m) => m.itemId === item.id));
  let bal = Number(item.openingStock) || 0;
  const body = [["", "Opening balance", "", "", "", fmtN(bal), ""]];
  ms.forEach((m) => {
    const d = movementDelta(m); bal += d;
    body.push([fmtDate(m.date), m.reference || "—", MOVEMENT_LABELS[m.type] || m.type,
      d > 0 ? "+" + fmtN(Math.abs(m.qty)) : "", d < 0 ? "−" + fmtN(Math.abs(m.qty)) : "",
      fmtN(bal), fmtN(m.unitCost)]);
  });
  const v = itemValuation(item, movements);
  body.push(["", "CLOSING BALANCE", "", "", "", `${fmtN(v.qty)} ${item.unit}`, ""]);
  downloadReportPdf({
    filename: `GLA-Stock-Card-${item.code}.pdf`, eyebrow: "Inventory · Bin Card", signatories: SIGNATORIES,
    title: "Stock Card", subtitle: `${item.name} · ${item.code}`,
    meta: [`Category: ${item.category} · Unit: ${item.unit} · Reorder level: ${fmtN(item.reorderLevel)} ${item.unit}`,
      `Balance on hand: ${fmtN(v.qty)} ${item.unit} · Avg cost: UGX ${fmtN(Math.round(v.avgCost))} · Value: UGX ${fmtN(v.value)} · as at ${REPORT_DATE()}`],
    head: ["Date", "Reference", "Type", "In", "Out", "Balance", "Unit cost"],
    body, orientation: "landscape",
  });
}

function monthEndReport(rows, monthKey, closed) {
  let val = 0;
  const body = rows.map(({ it, opening, inQty, outQty, closing }) => {
    const v = closing * (Number(it.unitCost) || 0); val += v;
    return [it.code, it.name, fmtN(opening), "+" + fmtN(inQty), "−" + fmtN(outQty), fmtN(closing), it.unit, fmtN(v)];
  });
  const tot = rows.reduce((a, r) => ({ o: a.o + r.opening, i: a.i + r.inQty, u: a.u + r.outQty, c: a.c + r.closing }), { o: 0, i: 0, u: 0, c: 0 });
  body.push(["", "TOTALS", fmtN(tot.o), "+" + fmtN(tot.i), "−" + fmtN(tot.u), fmtN(tot.c), "", fmtN(val)]);
  downloadReportPdf({
    filename: `GLA-Stock-MonthEnd-${monthKey}.pdf`, eyebrow: "Inventory", signatories: SIGNATORIES,
    title: "Month-End Stock Balance Report", subtitle: `${monthLabel(monthKey)} · ${closed ? "Closed" : "Open (draft)"}`,
    meta: [`Closing = Opening + In − Out (stock-take adjustments folded into In/Out) · closing value UGX ${fmtN(val)}`],
    head: ["Code", "Item", "Opening", "In", "Out", "Closing", "Unit", "Value (UGX)"],
    body, orientation: "landscape",
  });
}
function monthEndCsv(rows, monthKey) {
  const lines = [`"Month-End Stock Balance Report"`, `"${monthLabel(monthKey)}"`, "",
    ["Code", "Item", "Opening", "In", "Out", "Closing", "Unit", "Value (UGX)"].join(",")];
  let val = 0;
  rows.forEach(({ it, opening, inQty, outQty, closing }) => { const v = closing * (Number(it.unitCost) || 0); val += v; lines.push([it.code, it.name, opening, inQty, outQty, closing, it.unit, v].map((x) => `"${x ?? ""}"`).join(",")); });
  const tot = rows.reduce((a, r) => ({ o: a.o + r.opening, i: a.i + r.inQty, u: a.u + r.outQty, c: a.c + r.closing }), { o: 0, i: 0, u: 0, c: 0 });
  lines.push(["", "TOTALS", tot.o, tot.i, tot.u, tot.c, "", val].map((x) => `"${x}"`).join(","));
  downloadFile(`gla-stock-monthend-${monthKey}.csv`, lines.join("\n"));
}

function Stock({ ctx }) {
  const [tab, setTab] = useState("overview");
  const tabs = [["overview", "Overview", Boxes], ["movements", "Movements", History], ["monthend", "Month-end balance", ClipboardCheck]];
  return (
    <>
      <div style={{ display: "inline-flex", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 3, gap: 3, marginBottom: 16 }}>
        {tabs.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, background: tab === id ? "var(--bg-elevated)" : "transparent", color: tab === id ? "var(--text)" : "var(--text-2)", boxShadow: tab === id ? "var(--shadow)" : "none" }}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>
      {tab === "overview" && <StockOverview ctx={ctx} />}
      {tab === "movements" && <StockMovements ctx={ctx} />}
      {tab === "monthend" && <StockMonthEnd ctx={ctx} />}
    </>
  );
}

function StockOverview({ ctx }) {
  const { store, setModal } = ctx;
  const items = store.stockItems, movements = store.stockMovements;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const totalVal = totalStockValue(items, movements);
  const low = items.filter((i) => itemBalance(i, movements) <= i.reorderLevel).length;
  const inThis = movements.filter((m) => m.type === "IN" && monthKeyOf(m.date) === CURRENT_MONTH).reduce((s, m) => s + Number(m.qty), 0);
  const outThis = movements.filter((m) => m.type === "OUT" && monthKeyOf(m.date) === CURRENT_MONTH).reduce((s, m) => s + Number(m.qty), 0);
  const list = items.filter((i) => {
    if (cat && i.category !== cat) return false;
    if (!q) return true;
    return [i.name, i.code, i.category].join(" ").toLowerCase().includes(q.toLowerCase());
  });
  const openMove = (type, itemId) => setModal(() => (cc) => <MovementForm ctx={cc} type={type} itemId={itemId} />);
  return (
    <>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={Boxes} label="Stock items" value={items.length} meta={`${STOCK_CATEGORIES.length} categories`} tone="brand" />
        <StatCard Icon={Wallet} label="Stock value" value={ugxShort(totalVal)} meta="weighted-average cost" tone="success" />
        <StatCard Icon={AlertTriangle} label="Low / out" value={low} meta="at or below reorder level" tone="warning" />
        <StatCard Icon={TrendingUp} label="This month" value={`${fmtN(inThis)} / ${fmtN(outThis)}`} meta="units in / out · Sept 2026" tone="accent" />
      </div>
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Search item, code or category…" />
        <Select value={cat} onChange={(e) => setCat(e.target.value)} options={[{ value: "", label: "All categories" }, ...STOCK_CATEGORIES.map((c) => ({ value: c, label: c }))]} style={{ width: "auto" }} />
        <div style={{ flex: 1 }} />
        <Btn variant="success" onClick={() => openMove("IN")}><PackagePlus size={16} />Stock In</Btn>
        <Btn variant="danger" onClick={() => openMove("OUT")}><PackageMinus size={16} />Stock Out</Btn>
        <Btn onClick={() => openMove("ADJUST")}><ClipboardCheck size={16} />Stock take</Btn>
        <Btn variant="primary" onClick={() => setModal(() => (cc) => <StockItemForm ctx={cc} />)}><Plus size={16} />Add item</Btn>
      </Toolbar>
      <ReportBar label="Reports">
        <Btn size="sm" onClick={() => stockValuationReport(items, movements)}><FileText size={14} />Valuation (PDF)</Btn>
        <Btn size="sm" onClick={() => stockValuationCsv(items, movements)}><Download size={14} />Valuation (CSV)</Btn>
        <Btn size="sm" onClick={() => reorderReport(items, movements)}><FileText size={14} />Reorder (PDF)</Btn>
        <Btn size="sm" onClick={() => reorderCsv(items, movements)}><Download size={14} />Reorder (CSV)</Btn>
      </ReportBar>
      <Card>
        <DataTable
          columns={[
            { label: "Item", render: (i) => (
              <div><div style={{ fontWeight: 600, color: "var(--text)" }}>{i.name}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }} className="mono">{i.code}</div></div>
            ) },
            { label: "Category", render: (i) => <Tag>{i.category}</Tag> },
            { label: "Balance", num: true, render: (i) => `${fmtN(itemBalance(i, movements))} ${i.unit}` },
            { label: "Reorder / suggested", num: true, render: (i) => { const sug = suggestedOrderQty(i, movements); return <span>{fmtN(i.reorderLevel)}{sug > 0 ? <span style={{ color: "var(--warning)", fontWeight: 600 }}> · order {fmtN(sug)}</span> : ""}</span>; } },
            { label: "Cover", num: true, render: (i) => fmtCover(daysOfCover(i, movements)) },
            { label: "Avg cost", num: true, render: (i) => fmtN(Math.round(itemValuation(i, movements).avgCost)) },
            { label: "Value (UGX)", num: true, render: (i) => fmtN(itemValuation(i, movements).value) },
            { label: "Status", render: (i) => { const s = stockStatus(itemBalance(i, movements), i.reorderLevel); return <Pill tone={stockStatusTone[s]}>{s}</Pill>; } },
            { label: "", render: (i) => (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <Btn size="sm" variant="success" onClick={() => openMove("IN", i.id)}><PackagePlus size={13} />In</Btn>
                <Btn size="sm" variant="danger" onClick={() => openMove("OUT", i.id)}><PackageMinus size={13} />Out</Btn>
                <Btn size="sm" onClick={() => stockCardReport(i, movements)} title="Stock card (PDF)"><Printer size={13} /></Btn>
                <Btn size="sm" onClick={() => setModal(() => (cc) => <StockItemForm ctx={cc} id={i.id} />)}><Pencil size={13} /></Btn>
                <Btn size="sm" onClick={() => setModal(() => (cc) => <ConfirmDelete ctx={cc} api={stockItemsApi} id={i.id} label={i.name} />)}><Trash2 size={13} /></Btn>
              </div>
            ) },
          ]}
          rows={list}
          empty="No stock items match your filters."
        />
      </Card>
    </>
  );
}

// A slim labelled bar for report/export buttons, used across the stock views.
function ReportBar({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 14px", padding: "9px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-2)" }}><FileBarChart size={14} />{label}</span>
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
      {children}
    </div>
  );
}

function StockMovements({ ctx }) {
  const { store, setModal } = ctx;
  const items = store.stockItems, movements = store.stockMovements;
  const itemById = (id) => items.find((i) => i.id === id);
  const [type, setType] = useState("");
  const [itemF, setItemF] = useState("");
  const months = [...new Set(movements.map((m) => monthKeyOf(m.date)))].sort().reverse();
  const [month, setMonth] = useState("");
  let list = [...movements].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  if (type) list = list.filter((m) => m.type === type);
  if (itemF) list = list.filter((m) => m.itemId === itemF);
  if (month) list = list.filter((m) => monthKeyOf(m.date) === month);
  const typeTone = { IN: "success", OUT: "info", ADJUST: "warning" };
  const filterLabel = [month ? monthLabel(month) : "All periods", type ? MOVEMENT_LABELS[type] : "all types", itemF ? (itemById(itemF) || {}).name : "all items"].join(" · ");
  return (
    <>
      <Toolbar>
        <Btn variant="success" onClick={() => setModal(() => (cc) => <MovementForm ctx={cc} type="IN" />)}><PackagePlus size={16} />Stock In</Btn>
        <Btn variant="danger" onClick={() => setModal(() => (cc) => <MovementForm ctx={cc} type="OUT" />)}><PackageMinus size={16} />Stock Out</Btn>
        <Btn onClick={() => setModal(() => (cc) => <MovementForm ctx={cc} type="ADJUST" />)}><ClipboardCheck size={16} />Stock take</Btn>
        <div style={{ flex: 1 }} />
        <Select value={type} onChange={(e) => setType(e.target.value)} options={[{ value: "", label: "All types" }, { value: "IN", label: "Stock In" }, { value: "OUT", label: "Stock Out" }, { value: "ADJUST", label: "Stock Take" }]} style={{ width: "auto" }} />
        <Select value={itemF} onChange={(e) => setItemF(e.target.value)} options={[{ value: "", label: "All items" }, ...items.map((i) => ({ value: i.id, label: i.name }))]} style={{ width: "auto" }} />
        <Select value={month} onChange={(e) => setMonth(e.target.value)} options={[{ value: "", label: "All months" }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]} style={{ width: "auto" }} />
      </Toolbar>
      <ReportBar label="Reports">
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{list.length} movement(s) · {filterLabel}</span>
        <div style={{ flex: 1 }} />
        <Btn size="sm" onClick={() => movementReport(list, items, filterLabel)}><FileText size={14} />Movement report (PDF)</Btn>
        <Btn size="sm" onClick={() => movementCsv(list, items, filterLabel)}><Download size={14} />CSV</Btn>
      </ReportBar>
      <Card>
        <DataTable
          columns={[
            { label: "Date", render: (m) => fmtDate(m.date) },
            { label: "Reference", render: (m) => <span className="mono" style={{ fontSize: 12.5 }}>{m.reference || "—"}</span> },
            { label: "Item", render: (m) => { const it = itemById(m.itemId); return it ? <span>{it.name}</span> : <Tag>Unknown</Tag>; } },
            { label: "Type", render: (m) => <Pill tone={typeTone[m.type] || "info"}>{MOVEMENT_LABELS[m.type] || m.type}</Pill> },
            { label: "Qty", num: true, render: (m) => { const it = itemById(m.itemId); const d = movementDelta(m); return `${d >= 0 ? "+" : "−"}${fmtN(Math.abs(m.qty))} ${it ? it.unit : ""}`; } },
            { label: "Unit cost", num: true, render: (m) => fmtN(m.unitCost) },
            { label: "Value", num: true, render: (m) => fmtN(Math.abs((Number(m.qty) || 0) * (Number(m.unitCost) || 0))) },
            { label: "Supplier / Issued to", render: (m) => m.type === "IN" ? (m.party || "—") : m.type === "ADJUST" ? (m.reason || "Stock take") : (m.issuedTo || m.party || "—") },
            { label: "Approved by", render: (m) => m.type === "IN" ? "—" : (m.approvedBy || "—") },
            { label: "", render: (m) => <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn size="sm" onClick={() => setModal(() => (cc) => <ConfirmDelete ctx={cc} api={stockMovementsApi} id={m.id} label={m.reference || m.id} />)}><Trash2 size={13} /></Btn></div> },
          ]}
          rows={list}
          empty="No stock movements match your filters."
        />
      </Card>
    </>
  );
}

function StockMonthEnd({ ctx }) {
  const { store, reload } = ctx;
  const items = store.stockItems, movements = store.stockMovements, closings = store.stockClosings;
  const keys = [...new Set([...movements.map((m) => monthKeyOf(m.date)), ...closings.map((c) => c.month)])].sort();
  const first = keys[0] || CURRENT_MONTH;
  const months = [];
  for (let k = first; k <= CURRENT_MONTH; k = addMonth(k, 1)) months.push(k);
  const closedMonths = months.filter((m) => monthIsClosed(m, closings));
  const [month, setMonth] = useState(closedMonths.length ? closedMonths[closedMonths.length - 1] : prevMonthKey(CURRENT_MONTH));
  const closed = monthIsClosed(month, closings);
  const closedAt = closed ? (closings.find((c) => c.month === month) || {}).closedAt : null;
  const rows = items.map((it) => ({ it, ...monthLedgerRow(it, month, movements, closings) }));
  const totals = rows.reduce((a, r) => ({ opening: a.opening + r.opening, inQty: a.inQty + r.inQty, outQty: a.outQty + r.outQty, closing: a.closing + r.closing, value: a.value + r.closing * (Number(r.it.unitCost) || 0) }), { opening: 0, inQty: 0, outQty: 0, closing: 0, value: 0 });

  const canPrev = months.indexOf(month) > 0;
  const canNext = months.indexOf(month) < months.length - 1;

  const runClose = async () => {
    for (const { it, opening, inQty, outQty, closing } of rows) {
      const id = `CLS-${month}-${it.id}`;
      const rec = { id, month, itemId: it.id, opening, in: inQty, out: outQty, closing, closedAt: TODAY };
      const existing = closings.find((c) => c.id === id);
      if (existing) await stockClosingsApi.update(id, rec); else await stockClosingsApi.create(rec);
    }
    await reload();
    alert(`Month-end close completed for ${monthLabel(month)}.\nClosing balances now roll forward automatically as the opening balance for ${monthLabel(addMonth(month, 1))}.`);
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <Btn size="sm" onClick={() => canPrev && setMonth(addMonth(month, -1))} style={{ opacity: canPrev ? 1 : 0.4 }}><ChevronLeft size={15} /></Btn>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, minWidth: 150, textAlign: "center" }}>{monthLabel(month)}</div>
        <Btn size="sm" onClick={() => canNext && setMonth(addMonth(month, 1))} style={{ opacity: canNext ? 1 : 0.4 }}><ChevronRight size={15} /></Btn>
        {closed ? <Pill tone="success">Closed · {fmtDate(closedAt)}</Pill> : <Pill tone="warning">Open</Pill>}
        <div style={{ flex: 1 }} />
        <Btn variant="primary" onClick={runClose}><RefreshCw size={15} />{closed ? "Re-run month-end close" : "Run month-end close"}</Btn>
      </div>
      <ReportBar label="Reports">
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{monthLabel(month)} · closing value UGX {fmtN(totals.value)}</span>
        <div style={{ flex: 1 }} />
        <Btn size="sm" onClick={() => monthEndReport(rows, month, closed)}><FileText size={14} />Balance report (PDF)</Btn>
        <Btn size="sm" onClick={() => monthEndCsv(rows, month)}><Download size={14} />CSV</Btn>
      </ReportBar>
      <Banner Icon={ClipboardCheck}>Opening is carried automatically from the previous month's closing balance. Closing = Opening + Stock In − Stock Out (stock-take adjustments fold into In / Out), and rolls forward to next month on close.</Banner>
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{["Item", "Opening", "In", "Out", "Closing", "Unit", "Value (UGX)"].map((h, i) => (
                <th key={i} style={{ textAlign: i >= 1 && i !== 5 ? "right" : "left", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-2)", fontWeight: 600, padding: "11px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)", whiteSpace: "nowrap" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map(({ it, opening, inQty, outQty, closing }) => (
                <tr key={it.id}>
                  <td style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)" }}><div style={{ fontWeight: 600, color: "var(--text)" }}>{it.name}</div><div className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{it.code}</div></td>
                  <td className="mono" style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--text-2)" }}>{fmtN(opening)}</td>
                  <td className="mono" style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--success)" }}>+{fmtN(inQty)}</td>
                  <td className="mono" style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--danger)" }}>−{fmtN(outQty)}</td>
                  <td className="mono" style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", fontWeight: 700, color: "var(--text)" }}>{fmtN(closing)}</td>
                  <td style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", color: "var(--text-2)" }}>{it.unit}</td>
                  <td className="mono" style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--text)" }}>{fmtN(closing * (Number(it.unitCost) || 0))}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: "var(--ink)", color: "#fff" }}>
                <td style={{ padding: "14px 16px" }}>Totals · {items.length} items</td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", color: "rgba(255,255,255,.85)" }}>{fmtN(totals.opening)}</td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", color: "#34d399" }}>+{fmtN(totals.inQty)}</td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", color: "#f0a58f" }}>−{fmtN(totals.outQty)}</td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", color: "#fff" }}>{fmtN(totals.closing)}</td>
                <td />
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", color: "#34d399" }}>{fmtN(totals.value)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function nextStockId(items) {
  const nums = items.map((i) => parseInt(String(i.id).replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
  return "STK-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
}
function StockItemForm({ ctx, id }) {
  const existing = id ? ctx.store.stockItems.find((i) => i.id === id) : null;
  const [f, setF] = useState(existing ? { ...existing } : { id: nextStockId(ctx.store.stockItems), code: "", name: "", category: STOCK_CATEGORIES[0], unit: "pcs", unitCost: 0, reorderLevel: 0, openingStock: 0 });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.name || !f.code) return alert("Item name and code are required.");
    const out = { ...f, unitCost: Number(f.unitCost) || 0, reorderLevel: Number(f.reorderLevel) || 0, openingStock: Number(f.openingStock) || 0 };
    if (existing) await stockItemsApi.update(id, out); else await stockItemsApi.create(out);
    await ctx.reload(); ctx.setModal(null);
  };
  return (
    <Modal title={existing ? "Edit stock item" : "Add stock item"} sub={existing ? existing.id : "New catalogue item"} onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />{existing ? "Save changes" : "Add item"}</Btn></>}>
      <div style={formGrid}>
        <Field label="Item name" required full><Input value={f.name} onChange={set("name")} /></Field>
        <Field label="Item code" required><Input value={f.code} onChange={set("code")} placeholder="e.g. CBL-4CU" /></Field>
        <Field label="Category"><Select value={f.category} onChange={set("category")} options={STOCK_CATEGORIES} /></Field>
        <Field label="Unit"><Select value={f.unit} onChange={set("unit")} options={STOCK_UNITS} /></Field>
        <Field label="Unit cost (UGX)"><Input type="number" value={f.unitCost} onChange={set("unitCost")} /></Field>
        <Field label="Reorder level"><Input type="number" value={f.reorderLevel} onChange={set("reorderLevel")} /></Field>
        <Field label="Opening stock" hint="Balance before the first movement"><Input type="number" value={f.openingStock} onChange={set("openingStock")} /></Field>
      </div>
    </Modal>
  );
}

function MovementForm({ ctx, type, itemId }) {
  const items = ctx.store.stockItems;
  const initItem = items.find((i) => i.id === itemId) || items[0] || {};
  const isIn = type === "IN";
  const isAdjust = type === "ADJUST";
  const curItem = (id) => items.find((i) => i.id === id) || {};
  const balOf = (id) => (id ? itemBalance(curItem(id), ctx.store.stockMovements) : 0);
  const [f, setF] = useState({
    itemId: initItem.id || "", date: TODAY,
    qty: "", counted: isAdjust ? String(balOf(initItem.id)) : "",
    unitCost: initItem.unitCost || 0, reference: "", party: "", issuedTo: "", approvedBy: "", reason: "", notes: "",
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const pickItem = (e) => { const it = curItem(e.target.value); setF((s) => ({ ...s, itemId: e.target.value, unitCost: it.unitCost ?? s.unitCost, counted: isAdjust ? String(itemBalance(it, ctx.store.stockMovements)) : s.counted })); };
  const bal = balOf(f.itemId);
  const unit = curItem(f.itemId).unit || "";
  const adjDelta = isAdjust ? (Number(f.counted) || 0) - bal : 0;
  const overIssue = !isIn && !isAdjust && Number(f.qty) > bal;

  const submit = async () => {
    if (!f.itemId || !f.date) return alert("Item and date are required.");
    if (isAdjust) {
      if (f.counted === "" || isNaN(Number(f.counted)) || Number(f.counted) < 0) return alert("Enter the counted quantity (0 or more).");
      if (adjDelta === 0) return alert("The counted quantity matches the system balance — no adjustment needed.");
      if (!f.reason) return alert("A reason is required for a stock-take adjustment.");
    } else {
      if (!f.qty || Number(f.qty) <= 0) return alert("Enter a quantity greater than zero.");
      if (!isIn && !f.issuedTo) return alert("“Issued to” is required for a stock out.");
      if (overIssue) return alert(`Cannot issue ${fmtN(Number(f.qty))} ${unit} — only ${fmtN(bal)} ${unit} in stock.\n\nStock cannot go negative. Receive more stock first, or reduce the quantity issued.`);
    }
    const rec = { itemId: f.itemId, type, date: f.date, unitCost: Number(f.unitCost) || 0, reference: f.reference, notes: f.notes };
    if (isIn) { rec.qty = Number(f.qty) || 0; rec.party = f.party; }
    else if (isAdjust) { rec.qty = adjDelta; rec.counted = Number(f.counted) || 0; rec.reason = f.reason; rec.approvedBy = f.approvedBy; rec.party = "Physical stock take"; }
    else { rec.qty = Number(f.qty) || 0; rec.issuedTo = f.issuedTo; rec.approvedBy = f.approvedBy; rec.party = f.issuedTo; }
    await stockMovementsApi.create(rec);
    await ctx.reload(); ctx.setModal(null);
  };
  const title = isIn ? "Stock In — receipt" : isAdjust ? "Stock Take — adjustment" : "Stock Out — issue";
  const sub = isIn ? "Add stock received into the store" : isAdjust ? "Reconcile the system balance to a physical count" : "Issue stock out to a job or staff member";
  const submitBtn = isIn ? "Add stock in" : isAdjust ? "Post adjustment" : "Issue stock out";
  return (
    <Modal title={title} sub={sub} onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant={isIn ? "success" : isAdjust ? "primary" : "danger"} onClick={submit}>{isIn ? <PackagePlus size={15} /> : isAdjust ? <ClipboardCheck size={15} /> : <PackageMinus size={15} />}{submitBtn}</Btn></>}>
      <div style={formGrid}>
        <Field label="Item" required full>
          <Select value={f.itemId} onChange={pickItem} options={items.map((i) => ({ value: i.id, label: `${i.name} · ${i.code} (${fmtN(itemBalance(i, ctx.store.stockMovements))} ${i.unit})` }))} />
        </Field>
        <Field label="Date" required><Input type="date" value={f.date} onChange={set("date")} /></Field>
        {isAdjust ? (
          <Field label={`Counted quantity${unit ? " (" + unit + ")" : ""}`} required hint={`System balance: ${fmtN(bal)} ${unit}`}><Input type="number" value={f.counted} onChange={set("counted")} /></Field>
        ) : (
          <Field label={`Quantity${unit ? " (" + unit + ")" : ""}`} required hint={!isIn ? `Available: ${fmtN(bal)} ${unit}` : undefined}><Input type="number" value={f.qty} onChange={set("qty")} /></Field>
        )}
        <Field label={isAdjust ? "Valuation cost (UGX)" : "Unit cost (UGX)"}><Input type="number" value={f.unitCost} onChange={set("unitCost")} /></Field>
        <Field label={isIn ? "Reference (GRN / delivery)" : isAdjust ? "Reference (stock-take)" : "Reference (issue / job)"}><Input value={f.reference} onChange={set("reference")} placeholder={isIn ? "GRN-…" : isAdjust ? "STK-CT-…" : "ISS-…"} /></Field>
        {isIn && <Field label="Supplier"><Input value={f.party} onChange={set("party")} /></Field>}
        {!isIn && !isAdjust && <Field label="Issued to" required><Input value={f.issuedTo} onChange={set("issuedTo")} placeholder="Staff member or job / site" /></Field>}
        {isAdjust && (
          <Field label="Reason" required full><Input value={f.reason} onChange={set("reason")} placeholder="e.g. physical count variance, damage, correction" /></Field>
        )}
        {!isIn && (
          <Field label="Approved by" full>
            <Select value={f.approvedBy} onChange={set("approvedBy")}
              options={[{ value: "", label: "— select approver —" }, ...ctx.store.employees.map((e) => ({ value: `${e.firstName} ${e.lastName}`, label: `${e.firstName} ${e.lastName} · ${e.jobTitle}` }))]} />
          </Field>
        )}
        <Field label="Notes" full><Textarea value={f.notes} onChange={set("notes")} /></Field>
      </div>
      {isAdjust && f.counted !== "" && adjDelta !== 0 && (
        <Banner Icon={ClipboardCheck} tone={adjDelta < 0 ? "warning" : "info"}>
          Adjustment: <b>{adjDelta > 0 ? "+" : "−"}{fmtN(Math.abs(adjDelta))} {unit}</b> — system balance {fmtN(bal)} → counted {fmtN(Number(f.counted) || 0)}. {adjDelta < 0 ? "A shortfall will be written off." : "Surplus stock will be added in."}
        </Banner>
      )}
      {overIssue && (
        <Banner Icon={AlertTriangle} tone="danger">Cannot issue more than the available balance ({fmtN(bal)} {unit}). Stock is not allowed to go negative.</Banner>
      )}
    </Modal>
  );
}

/* ============================= HR Reports =============================== */
const CAT = ["#2f6f9f", "#e3ac2b", "#12894e", "#8a5cc8", "#c85a7d", "#3ba39a", "#b9791a", "#5a7fd6"];
const yearsBetween = (iso, to = TODAY) => { if (!iso) return null; const a = new Date(iso + "T00:00:00"), b = new Date(to + "T00:00:00"); if (isNaN(a) || isNaN(b)) return null; return (b - a) / (365.25 * 24 * 3600 * 1000); };
const avgOf = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);

function Donut({ segments, size = 132, thickness = 20 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: "none" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const dash = (s.value / total) * C;
          const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`} />;
          offset += dash; return el;
        })}
        <text x={cx} y={cy - 1} textAnchor="middle" fontSize="21" fontWeight="800" fill="var(--text)" style={{ fontFamily: "var(--font-display)" }}>{Math.round((segments[0].value / total) * 100)}%</text>
        <text x={cx} y={cy + 15} textAnchor="middle" fontSize="9" fill="var(--muted)">{segments[0].label}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 130 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flex: "none" }} />
            <span style={{ color: "var(--text-2)" }}>{s.label}</span>
            <span className="mono" style={{ marginLeft: "auto", fontWeight: 600 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HBars({ items, max }) {
  const m = max || Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr 50px", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={it.label}>{it.label}</div>
          <div style={{ height: 12, background: "var(--surface-2)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(it.value / m) * 100}%`, background: it.color || "var(--brand)", borderRadius: 6 }} />
          </div>
          <div className="mono" style={{ fontSize: 12.5, textAlign: "right" }}>{it.display != null ? it.display : it.value}</div>
        </div>
      ))}
    </div>
  );
}

function AreaTrend({ points, color = "var(--brand)", height = 168 }) {
  const w = 640, h = height, padL = 26, padB = 22, padT = 12, padR = 10;
  const maxY = Math.max(1, ...points.map((p) => p.value));
  const iw = w - padL - padR, ih = h - padT - padB;
  const X = (i) => padL + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const Y = (v) => padT + ih - (v / maxY) * ih;
  const line = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${X(points.length - 1).toFixed(1)},${(padT + ih).toFixed(1)} L${X(0).toFixed(1)},${(padT + ih).toFixed(1)} Z`;
  const xIdx = [...new Set([0, Math.floor(points.length / 2), points.length - 1])];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: "block" }} aria-label="Daily attendance trend">
      {[0, 0.5, 1].map((f, i) => { const y = padT + ih - f * ih; return (
        <g key={i}><line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--border)" strokeWidth="1" /><text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--muted)">{Math.round(f * maxY)}</text></g>
      ); })}
      <path d={area} fill={color} opacity="0.13" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" />
      {points.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p.value)} r={i === points.length - 1 ? 4 : 2.4} fill={color} />)}
      {xIdx.map((idx) => <text key={idx} x={X(idx)} y={h - 6} textAnchor="middle" fontSize="9" fill="var(--muted)">{points[idx] && points[idx].label}</text>)}
    </svg>
  );
}

function Reports({ ctx }) {
  const [tab, setTab] = useState("attendance");
  const groups = [
    { key: "staff", label: "Staff reports", accent: "#2f6f9f", GroupIcon: Users, tabs: [
      ["attendance", "Attendance", Clock], ["workforce", "Workforce", Users], ["leave", "Leave", CalendarDays],
      ["payroll", "Payroll", Wallet], ["statement", "Statement", Banknote], ["paye", "PAYE", FileText], ["nssf", "NSSF", Building2],
    ] },
    { key: "suppliers", label: "Supplier reports", accent: "#b8860b", GroupIcon: Landmark, tabs: [
      ["supplier-statement", "Statement of Account", Landmark],
    ] },
    { key: "stock", label: "Stock reports", accent: "#12894e", GroupIcon: Boxes, tabs: [
      ["stock-reports", "Inventory", Boxes],
    ] },
  ];
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 18, alignItems: "stretch" }}>
        {groups.map((g) => (
          <div key={g.key} style={{ border: `1.5px solid ${g.accent}44`, borderTop: `3px solid ${g.accent}`, borderRadius: 12, padding: "11px 13px 12px", background: `${g.accent}0d` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
              <g.GroupIcon size={14} style={{ color: g.accent }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".09em", textTransform: "uppercase", color: g.accent, fontWeight: 700 }}>{g.label}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {g.tabs.map(([id, label, Icon]) => {
                const active = tab === id;
                return (
                  <button key={id} onClick={() => setTab(id)}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
                      border: active ? `1px solid ${g.accent}` : "1px solid var(--border)",
                      background: active ? g.accent : "var(--bg-elevated)",
                      color: active ? "#fff" : "var(--text-2)",
                      boxShadow: active ? "var(--shadow)" : "none", transition: "background .12s, color .12s" }}>
                    <Icon size={15} />{label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {tab === "attendance" && <AttendanceReport ctx={ctx} />}
      {tab === "workforce" && <WorkforceReport ctx={ctx} />}
      {tab === "leave" && <LeaveReport ctx={ctx} />}
      {tab === "payroll" && <PayrollReport ctx={ctx} />}
      {tab === "statement" && <PaymentStatement ctx={ctx} />}
      {tab === "paye" && <PayeReport ctx={ctx} />}
      {tab === "nssf" && <NssfReport ctx={ctx} />}
      {tab === "supplier-statement" && <SupplierStatement ctx={ctx} />}
      {tab === "stock-reports" && <StockReports ctx={ctx} />}
    </>
  );
}

// Stock reports hub under Reports — the same inventory reports offered in the
// Stock module, grouped for auditors: valuation, reorder, movement, stock card
// and month-end balance.
function StockReports({ ctx }) {
  const { store } = ctx;
  const items = store.stockItems || [];
  const movements = store.stockMovements || [];
  const closings = store.stockClosings || [];

  const monthKeys = [...new Set([...movements.map((m) => monthKeyOf(m.date)), ...closings.map((c) => c.month), CURRENT_MONTH])].sort();
  const minMonth = monthKeys[0] || CURRENT_MONTH;
  const [meMonth, setMeMonth] = useState(prevMonthKey(CURRENT_MONTH));
  const [cardId, setCardId] = useState(items[0]?.id || "");
  const cardItem = items.find((i) => i.id === cardId) || null;

  const meRows = items.map((it) => ({ it, ...monthLedgerRow(it, meMonth, movements, closings) }));
  const meClosed = monthIsClosed(meMonth, closings);
  const totalValue = items.reduce((s, it) => s + itemValuation(it, movements).value, 0);
  const lowCount = items.filter((i) => itemBalance(i, movements) <= (Number(i.reorderLevel) || 0)).length;

  const cardStyle = { padding: 16 };
  const rTitle = { fontWeight: 700, fontSize: 14, color: "var(--text)" };
  const rDesc = { fontSize: 12.5, color: "var(--text-2)", margin: "4px 0 12px" };

  return (
    <>
      <ReportKpis items={[
        <StatCard key="1" Icon={Boxes} label="Stock items" value={items.length} meta="in register" tone="brand" />,
        <StatCard key="2" Icon={Warehouse} label="Total stock value" value={ugxShort(totalValue)} meta="weighted-average cost" tone="accent" />,
        <StatCard key="3" Icon={PackageMinus} label="At / below reorder" value={lowCount} meta="need replenishment" tone={lowCount ? "warning" : "success"} />,
        <StatCard key="4" Icon={ClipboardCheck} label="Months closed" value={closings.length ? [...new Set(closings.map((c) => c.month))].length : 0} meta="month-end runs" tone="success" />,
      ]} />
      <Banner Icon={Boxes}>Inventory reports for audit — valuation and month-end balances use moving weighted-average cost; stock cards give a full bin-card movement history per item. Pick a month or item where needed, then export PDF or CSV.</Banner>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }} className="rep-cols">
        <Card style={cardStyle}>
          <div style={rTitle}>Stock Valuation</div>
          <div style={rDesc}>Every item's quantity on hand, average cost and total value, grouped by category.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn size="sm" onClick={() => stockValuationReport(items, movements)}><FileText size={14} />PDF</Btn>
            <Btn size="sm" onClick={() => stockValuationCsv(items, movements)}><Download size={14} />CSV</Btn>
          </div>
        </Card>
        <Card style={cardStyle}>
          <div style={rTitle}>Reorder / Low-Stock</div>
          <div style={rDesc}>Items at or below their reorder level, with suggested order quantities and estimated cost.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn size="sm" onClick={() => reorderReport(items, movements)}><FileText size={14} />PDF</Btn>
            <Btn size="sm" onClick={() => reorderCsv(items, movements)}><Download size={14} />CSV</Btn>
          </div>
        </Card>
        <Card style={cardStyle}>
          <div style={rTitle}>Stock Movement</div>
          <div style={rDesc}>All receipts, issues and adjustments across the register, with running values.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn size="sm" onClick={() => movementReport(sortedMovements(movements), items, "All movements")}><FileText size={14} />PDF</Btn>
            <Btn size="sm" onClick={() => movementCsv(sortedMovements(movements), items, "All movements")}><Download size={14} />CSV</Btn>
          </div>
        </Card>
        <Card style={cardStyle}>
          <div style={rTitle}>Stock Card (Bin Card)</div>
          <div style={rDesc}>A single item's full movement history and running balance.</div>
          <div style={{ marginBottom: 10 }}>
            <Select value={cardId} onChange={(e) => setCardId(e.target.value)}
              options={items.map((i) => ({ value: i.id, label: `${i.code} · ${i.name}` }))} />
          </div>
          <Btn size="sm" disabled={!cardItem} onClick={() => cardItem && stockCardReport(cardItem, movements)}><Printer size={14} />Stock card (PDF)</Btn>
        </Card>
        <Card style={cardStyle}>
          <div style={rTitle}>Month-End Balance</div>
          <div style={rDesc}>Opening + In − Out = Closing per item for a chosen month, with closing value.</div>
          <div style={{ marginBottom: 10, maxWidth: 220 }}>
            <MonthYearPicker value={meMonth} onChange={setMeMonth} min={minMonth} max={CURRENT_MONTH} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Btn size="sm" onClick={() => monthEndReport(meRows, meMonth, meClosed)}><FileText size={14} />PDF</Btn>
            <Btn size="sm" onClick={() => monthEndCsv(meRows, meMonth)}><Download size={14} />CSV</Btn>
            {meClosed ? <Pill tone="success">Closed</Pill> : <Pill tone="warning">Open (draft)</Pill>}
          </div>
        </Card>
      </div>
    </>
  );
}

// Searchable supplier picker (type-ahead). Filters by name, TIN or category.
function SupplierSearch({ suppliers, value, onSelect, placeholder = "Search supplier, TIN or category…" }) {
  const selected = suppliers.find((s) => s.id === value) || null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const q = query.trim().toLowerCase();
  const matches = suppliers.filter((s) => !q || `${s.name} ${s.tin || ""} ${s.category || ""}`.toLowerCase().includes(q)).slice(0, 8);
  const pick = (s) => { onSelect(s.id); setQuery(""); setOpen(false); };
  const display = open ? query : (selected ? selected.name : "");
  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
        <input
          value={display}
          placeholder={selected ? selected.name : placeholder}
          onFocus={() => { setOpen(true); setQuery(""); setHi(0); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); if (matches[hi]) pick(matches[hi]); }
            else if (e.key === "Escape") { setOpen(false); }
          }}
          style={{ ...controlStyle, paddingLeft: 32 }}
        />
      </div>
      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg, 0 8px 24px rgba(0,0,0,.14))", maxHeight: 264, overflowY: "auto", padding: 4 }}>
          {matches.length === 0 && <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--muted)" }}>No suppliers match “{query}”.</div>}
          {matches.map((s, i) => (
            <button key={s.id} type="button"
              onMouseEnter={() => setHi(i)}
              onMouseDown={(ev) => { ev.preventDefault(); pick(s); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer", background: i === hi ? "var(--surface-2)" : "transparent" }}>
              <span style={{ width: 28, height: 28, flex: "none", borderRadius: 8, display: "grid", placeItems: "center", background: "var(--surface-2)", color: "var(--muted)" }}><Landmark size={15} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{s.name}{s.status === "Inactive" && <span style={{ color: "var(--muted)", fontWeight: 500 }}> · inactive</span>}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.category || "—"}{s.tin ? ` · TIN ${s.tin}` : ""}</div>
              </div>
              {s.id === value && <Check size={15} style={{ marginLeft: "auto", color: "var(--success)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Supplier Statement of Account — an audit-ready ledger of every processed payment
// to one supplier over a date range, drawn from the locked supplier run history.
function SupplierStatement({ ctx }) {
  const { store } = ctx;
  const suppliers = (store.suppliers || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const runs = (store.supplierRuns || []);
  const runDates = runs.map((r) => r.scheduleDate).sort();
  const minDate = runDates[0] || "2026-01-01";
  const maxDate = runDates[runDates.length - 1] || TODAY;

  const [supId, setSupId] = useState(suppliers[0]?.id || "");
  const [from, setFrom] = useState(minDate);
  const [to, setTo] = useState(maxDate);
  const sup = suppliers.find((s) => s.id === supId) || null;
  const lo = from <= to ? from : to;
  const hi = from <= to ? to : from;

  // Match a processed run row to this supplier by id (new rows) or name (legacy rows).
  const matches = (row) => sup && (row.supplierId === sup.id || row.name === sup.name);
  const lines = runs
    .filter((r) => r.scheduleDate >= lo && r.scheduleDate <= hi)
    .sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate))
    .flatMap((r) => (r.rows || []).filter(matches).map((row) => ({
      date: r.scheduleDate, ref: r.id, processedBy: r.processedBy || "",
      subTotal: row.subTotal || 0, applyWht: row.applyWht, applyVat: row.applyVat,
      wht: row.wht || 0, vat: row.vat || 0, net: row.net || 0,
    })));

  const t = lines.reduce((a, l) => ({ subTotal: a.subTotal + l.subTotal, wht: a.wht + l.wht, vat: a.vat + l.vat, net: a.net + l.net }),
    { subTotal: 0, wht: 0, vat: 0, net: 0 });
  const rangeLbl = `${fmtDate(lo)} – ${fmtDate(hi)}`;
  const supLbl = sup ? `${sup.name}${sup.tin ? " · TIN " + sup.tin : ""}` : "—";
  const detailMeta = sup ? [
    `Supplier: ${sup.name}   TIN: ${sup.tin || "—"}   Category: ${sup.category || "—"}`,
    `Bank: ${[sup.bankName, sup.bankAccount, sup.bankBranch].filter(Boolean).join("  ·  ") || "No bank details on file"}`,
    `Period: ${rangeLbl}   Payments: ${lines.length}   Net paid: UGX ${fmtN(t.net)}`,
  ] : [];
  const fileTag = (sup?.name || "supplier").replace(/[^\w]+/g, "-");

  const exportCsv = () => {
    const out = ['"SUPPLIER STATEMENT OF ACCOUNT"',
      `"Supplier:","${sup?.name || ""}","TIN:","${sup?.tin || ""}"`,
      `"Category:","${sup?.category || ""}"`,
      `"Bank:","${sup?.bankName || ""}","Account:","${sup?.bankAccount || ""}","Branch:","${sup?.bankBranch || ""}"`,
      `"Period:","${rangeLbl}"`, "",
      ["Date", "Reference", "Invoice Sub-total", "6% WHT", "18% VAT", "Net Paid"].join(",")];
    lines.forEach((l) => out.push([l.date, l.ref, l.subTotal, l.applyWht ? l.wht : 0, l.applyVat ? l.vat : 0, l.net].map((x) => `"${x ?? ""}"`).join(",")));
    out.push(["", "TOTALS", t.subTotal, t.wht, t.vat, t.net].map((x) => `"${x}"`).join(","));
    downloadFile(`gla-supplier-statement-${fileTag}-${lo}_${hi}.csv`, out.join("\n"));
  };
  const exportPdf = () => downloadReportPdf({
    filename: `GLA-Supplier-Statement-${fileTag}-${lo}_${hi}.pdf`,
    eyebrow: "Procurement · Statement of Account",
    signatories: SIGNATORIES,
    title: "Supplier Statement of Account",
    subtitle: `${supLbl} · ${rangeLbl}`,
    meta: detailMeta,
    head: ["Date", "Reference", "Sub-total", "6% WHT", "18% VAT", "Net Paid"],
    body: lines.map((l) => [fmtDate(l.date), l.ref, fmtN(l.subTotal), l.applyWht ? fmtN(l.wht) : "n/a", l.applyVat ? fmtN(l.vat) : "n/a", fmtN(l.net)])
      .concat([["", "TOTALS", fmtN(t.subTotal), fmtN(t.wht), fmtN(t.vat), fmtN(t.net)]]),
    orientation: "landscape",
  });
  const exportExcel = () => downloadScheduleXlsx({
    title: "Supplier Statement of Account", eyebrow: "PROCUREMENT · STATEMENT OF ACCOUNT",
    subtitle: `${supLbl} · ${rangeLbl}`,
    meta: detailMeta,
    columns: [
      { header: "Date", width: 14 }, { header: "Reference", width: 14 },
      { header: "Invoice Sub-total", money: true }, { header: "6% WHT", money: true },
      { header: "18% VAT", money: true }, { header: "Net Paid", money: true },
    ],
    rows: lines.map((l) => [fmtDate(l.date), l.ref, l.subTotal, l.applyWht ? l.wht : 0, l.applyVat ? l.vat : 0, l.net]),
    totalsRow: ["", "TOTALS", t.subTotal, t.wht, t.vat, t.net],
    filename: `GLA-Supplier-Statement-${fileTag}-${lo}_${hi}.xlsx`,
  });

  const canExport = lines.length > 0 && sup;
  return (
    <>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px 16px", alignItems: "end" }}>
          <Field label="Supplier">
            <SupplierSearch suppliers={suppliers} value={supId} onSelect={setSupId} />
          </Field>
          <Field label="From date"><Input type="date" value={from} min={minDate} max={maxDate} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To date"><Input type="date" value={to} min={minDate} max={maxDate} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </Card>
      <ReportKpis items={[
        <StatCard key="1" Icon={CalendarCheck} label="Payments in range" value={lines.length} meta={rangeLbl} tone="brand" />,
        <StatCard key="2" Icon={FileText} label="Invoiced (sub-total)" value={ugxShort(t.subTotal)} meta="before tax" tone="accent" />,
        <StatCard key="3" Icon={TrendingUp} label="6% WHT withheld" value={ugxShort(t.wht)} meta="remitted to URA" tone="warning" />,
        <StatCard key="4" Icon={Landmark} label="Net paid" value={ugxShort(t.net)} meta="to supplier" tone="success" />,
      ]} />
      <Banner Icon={Landmark}>Statement of Account for <b>{supLbl}</b> — every processed payment with a schedule date between <b>{fmtDate(lo)}</b> and <b>{fmtDate(hi)}</b>, with the 6% WHT and 18% VAT breakdown per invoice. Pick a supplier and date range above, then export the audit-ready statement.{lines.length === 0 ? " No processed payments fall in this range for this supplier." : ""}</Banner>
      <Card>
        <CardHead title={`Statement of Account — ${sup ? sup.name : "—"}`} sub={rangeLbl} right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn size="sm" disabled={!canExport} onClick={exportPdf}><FileText size={14} />PDF</Btn>
          <Btn size="sm" disabled={!canExport} onClick={exportExcel}><Download size={14} />Excel</Btn>
          <Btn size="sm" disabled={!canExport} onClick={exportCsv}><Download size={14} />CSV</Btn>
        </div>} />
        {sup && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 22px", padding: "0 4px 12px", fontSize: 12.5, color: "var(--text-2)" }}>
            <span><b style={{ color: "var(--muted)", fontWeight: 600 }}>TIN</b> {sup.tin || "—"}</span>
            <span><b style={{ color: "var(--muted)", fontWeight: 600 }}>Category</b> {sup.category || "—"}</span>
            <span><b style={{ color: "var(--muted)", fontWeight: 600 }}>Bank</b> {sup.bankName || "—"} {sup.bankAccount || ""}</span>
            <span><b style={{ color: "var(--muted)", fontWeight: 600 }}>Branch</b> {sup.bankBranch || "—"}</span>
          </div>
        )}
        <DataTable
          columns={[
            { label: "Date", render: (l) => <div><div style={{ fontWeight: 600 }}>{fmtDate(l.date)}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{l.processedBy || "Processed"}</div></div> },
            { label: "Reference", render: (l) => <span className="mono" style={{ fontSize: 12 }}>{l.ref}</span> },
            { label: "Sub-total", num: true, render: (l) => fmtN(l.subTotal) },
            { label: "6% WHT", num: true, render: (l) => l.applyWht ? <span style={{ color: "var(--danger)" }}>−{fmtN(l.wht)}</span> : <span style={{ color: "var(--muted)" }}>n/a</span> },
            { label: "18% VAT", num: true, render: (l) => l.applyVat ? <span style={{ color: "var(--success)" }}>+{fmtN(l.vat)}</span> : <span style={{ color: "var(--muted)" }}>n/a</span> },
            { label: "Net paid", num: true, render: (l) => <span style={{ fontWeight: 700, color: "var(--success)" }}>{fmtN(l.net)}</span> },
          ]}
          rows={lines}
          empty="No processed payments in the selected range."
        />
        {lines.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, padding: "12px 6px 2px", fontSize: 13, flexWrap: "wrap" }}>
            <span style={{ color: "var(--muted)" }}>Invoiced <b style={{ color: "var(--text)" }}>{fmtN(t.subTotal)}</b></span>
            <span style={{ color: "var(--muted)" }}>WHT <b style={{ color: "var(--danger)" }}>{fmtN(t.wht)}</b></span>
            <span style={{ color: "var(--muted)" }}>VAT <b style={{ color: "var(--success)" }}>{fmtN(t.vat)}</b></span>
            <span style={{ color: "var(--muted)" }}>Net paid <b style={{ color: "var(--success)" }}>{fmtN(t.net)}</b></span>
          </div>
        )}
      </Card>
    </>
  );
}

// Normalised per-staff statutory figures for a given month. When that month has a
// processed/paid payroll run, the locked snapshot is used; otherwise the figures
// are derived live from the current staff records (a projection for months not
// yet processed).
function staffStatutoryRows(store, month) {
  const run = (store.payrollRuns || []).find((r) => r.month === month);
  if (run) {
    return {
      source: run.status, // "Paid" | "Processed"
      rows: (run.rows || []).map((row) => ({
        id: row.empId, name: row.name, tin: row.tin || "", nssfNumber: row.nssfNumber || "",
        department: row.department || "", gross: row.gross || 0, paye: row.paye || 0,
        nssfEmp: row.nssf5 || 0, nssfEr: row.contribution || Math.round((row.gross || 0) * 0.1),
      })),
    };
  }
  const emps = store.employees.filter((e) => e.status !== "Terminated");
  return {
    source: "live",
    rows: emps.map((e) => {
      const p = derivePayslip(e);
      return { id: e.id, name: fullName(e), tin: e.tin || "", nssfNumber: e.nssfNumber || "", department: e.department || "", gross: p.gross, paye: p.paye, nssfEmp: p.nssfEmp, nssfEr: p.nssfEr };
    }),
  };
}

// Custom month + year picker (popover). A grid of the twelve months plus
// calendar-style year navigation (‹ year ›, or tap the year for a year grid).
// Value is a "YYYY-MM" string. Not a native date input.
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function MonthYearPicker({ value, onChange, min = "2000-01", max = "2999-12", width = 210 }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("month"); // "month" | "year"
  const ref = useRef(null);
  const [selY, selM] = value.split("-").map(Number);
  const [viewYear, setViewYear] = useState(selY);
  useEffect(() => { setViewYear(selY); }, [value]);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setMode("month"); } };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const [minY, minM] = min.split("-").map(Number);
  const [maxY, maxM] = max.split("-").map(Number);
  const monthOk = (y, m) => { const k = y * 12 + m; return k >= minY * 12 + minM && k <= maxY * 12 + maxM; };
  const yearHasAny = (y) => monthOk(y, 1) || monthOk(y, 12) || (y > minY && y < maxY);
  const label = new Date(selY, selM - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const pickMonth = (m) => { if (!monthOk(viewYear, m)) return; onChange(`${viewYear}-${String(m).padStart(2, "0")}`); setOpen(false); setMode("month"); };
  const yearStart = viewYear - (((viewYear % 12) + 12) % 12); // 12-year block
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i);

  const navBtn = (dir, disabled, onClick) => (
    <button type="button" disabled={disabled} onClick={onClick}
      style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, color: "var(--text)" }}>
      {dir === "prev" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative", width }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ ...controlStyle, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" }}>
        <CalendarDays size={15} style={{ color: "var(--muted)", flex: "none" }} />
        <span style={{ flex: 1, fontWeight: 600 }}>{label}</span>
        <ChevronDown size={15} style={{ color: "var(--muted)", flex: "none", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 40, top: "calc(100% + 6px)", left: 0, width: 260, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 12, boxShadow: "var(--shadow-lg, 0 10px 30px rgba(0,0,0,.16))", padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            {mode === "month"
              ? navBtn("prev", viewYear <= minY, () => setViewYear((y) => Math.max(minY, y - 1)))
              : navBtn("prev", yearStart <= minY, () => setViewYear((y) => y - 12))}
            <button type="button" onClick={() => setMode((mo) => (mo === "month" ? "year" : "month"))}
              style={{ border: "none", background: "transparent", fontWeight: 700, fontSize: 14, color: "var(--text)", cursor: "pointer", padding: "4px 10px", borderRadius: 8 }}>
              {mode === "month" ? viewYear : `${years[0]} – ${years[11]}`}
            </button>
            {mode === "month"
              ? navBtn("next", viewYear >= maxY, () => setViewYear((y) => Math.min(maxY, y + 1)))
              : navBtn("next", yearStart + 12 > maxY, () => setViewYear((y) => y + 12))}
          </div>
          {mode === "month" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {MONTHS_SHORT.map((mlabel, i) => {
                const m = i + 1;
                const sel = viewYear === selY && m === selM;
                const ok = monthOk(viewYear, m);
                return (
                  <button key={m} type="button" disabled={!ok} onClick={() => pickMonth(m)}
                    style={{ padding: "9px 0", borderRadius: 8, border: "1px solid " + (sel ? "var(--accent)" : "transparent"), background: sel ? "var(--accent)" : "transparent", color: sel ? "#fff" : ok ? "var(--text)" : "var(--muted)", fontWeight: 600, fontSize: 13, cursor: ok ? "pointer" : "not-allowed", opacity: ok ? 1 : 0.4 }}>
                    {mlabel}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {years.map((yy) => {
                const sel = yy === selY;
                const ok = yearHasAny(yy);
                return (
                  <button key={yy} type="button" disabled={!ok} onClick={() => { setViewYear(yy); setMode("month"); }}
                    style={{ padding: "9px 0", borderRadius: 8, border: "1px solid " + (sel ? "var(--accent)" : "transparent"), background: sel ? "var(--accent)" : "transparent", color: sel ? "#fff" : ok ? "var(--text)" : "var(--muted)", fontWeight: 600, fontSize: 13, cursor: ok ? "pointer" : "not-allowed", opacity: ok ? 1 : 0.4 }}>
                    {yy}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Month/year picker shared by the statutory schedules. Lists processed months
// plus the current month, using the custom MonthYearPicker popover.
function ReportMonthPicker({ month, setMonth, store, source }) {
  const runMonths = (store.payrollRuns || []).map((r) => r.month);
  const minMonth = runMonths.slice().sort()[0] || CURRENT_MONTH;
  const maxMonth = [...runMonths, CURRENT_MONTH].sort().slice(-1)[0];
  const tag = source === "live"
    ? { label: "Live projection", tone: "info", note: "not yet processed — figures from current staff records" }
    : source === "Paid" ? { label: "Paid run", tone: "success", note: "locked from the processed & paid payroll" }
    : { label: "Processed run", tone: "info", note: "locked from the processed payroll" };
  return (
    <Card>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "12px 20px" }}>
        <Field label="Month & year">
          <MonthYearPicker value={month} onChange={(v) => setMonth(v || CURRENT_MONTH)} min={minMonth} max={maxMonth} />
        </Field>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 9 }}>
          <Pill tone={tag.tone}>{tag.label}</Pill>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{tag.note}</span>
        </div>
      </div>
    </Card>
  );
}

// NSSF Contributions Schedule — the monthly NSSF return for all staff:
// employee 5% + employer 10% = 15% total, keyed by NSSF number.
function NssfReport({ ctx }) {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const rate = ctx.store.settings?.payroll || { nssfEmp: 5, nssfEr: 10 };
  const snap = staffStatutoryRows(ctx.store, month);
  const rows = snap.rows.map((r, i) => ({ no: i + 1, id: r.id, name: r.name, nssfNumber: r.nssfNumber, department: r.department, gross: r.gross, emp: r.nssfEmp, er: r.nssfEr, total: r.nssfEmp + r.nssfEr }));
  const t = rows.reduce((a, r) => ({ gross: a.gross + r.gross, emp: a.emp + r.emp, er: a.er + r.er, total: a.total + r.total }), { gross: 0, emp: 0, er: 0, total: 0 });
  const missing = rows.filter((r) => !r.nssfNumber).length;
  const monthLbl = monthLabel(month);

  const exportCsv = () => {
    const lines = ['"NSSF CONTRIBUTIONS SCHEDULE"', `"Period:","${monthLbl}"`, "",
      ["No", "NSSF Number", "Name", "Staff ID", "Department", "Gross Pay", `Employee ${rate.nssfEmp}%`, `Employer ${rate.nssfEr}%`, `Total ${rate.nssfEmp + rate.nssfEr}%`].join(",")];
    rows.forEach((r) => lines.push([r.no, r.nssfNumber, r.name, r.id, r.department, r.gross, r.emp, r.er, r.total].map((x) => `"${x ?? ""}"`).join(",")));
    lines.push(["", "", "TOTALS", "", "", t.gross, t.emp, t.er, t.total].map((x) => `"${x}"`).join(","));
    downloadFile(`gla-nssf-schedule-${month}.csv`, lines.join("\n"));
  };
  const exportPdf = () => downloadReportPdf({
    filename: `GLA-NSSF-Schedule-${month}.pdf`,
    eyebrow: "Statutory · NSSF",
    signatories: SIGNATORIES,
    title: "NSSF Contributions Schedule",
    subtitle: `${monthLbl} · ${rows.length} staff`,
    meta: [`Employee (${rate.nssfEmp}%): UGX ${fmtN(t.emp)}    Employer (${rate.nssfEr}%): UGX ${fmtN(t.er)}    Total (${rate.nssfEmp + rate.nssfEr}%): UGX ${fmtN(t.total)}`],
    head: ["#", "NSSF Number", "Name", "Gross Pay", `Employee ${rate.nssfEmp}%`, `Employer ${rate.nssfEr}%`, `Total ${rate.nssfEmp + rate.nssfEr}%`],
    body: rows.map((r) => [r.no, r.nssfNumber || "—", r.name, fmtN(r.gross), fmtN(r.emp), fmtN(r.er), fmtN(r.total)])
      .concat([["", "", "TOTALS", fmtN(t.gross), fmtN(t.emp), fmtN(t.er), fmtN(t.total)]]),
    orientation: "landscape",
  });
  const exportExcel = () => downloadScheduleXlsx({
    title: "NSSF Contributions Schedule", eyebrow: "STATUTORY · NSSF",
    subtitle: `${monthLbl} · employee ${rate.nssfEmp}% + employer ${rate.nssfEr}% = ${rate.nssfEmp + rate.nssfEr}% of gross`,
    meta: [`Total remittable to NSSF: UGX ${t.total.toLocaleString("en-US")}`],
    columns: [
      { header: "#", width: 5 }, { header: "NSSF Number", width: 16 }, { header: "Name", width: 24 },
      { header: "Gross Pay", money: true }, { header: `Employee ${rate.nssfEmp}%`, money: true },
      { header: `Employer ${rate.nssfEr}%`, money: true }, { header: `Total ${rate.nssfEmp + rate.nssfEr}%`, money: true },
    ],
    rows: rows.map((r) => [r.no, r.nssfNumber || "—", r.name, r.gross, r.emp, r.er, r.total]),
    totalsRow: ["", "", "TOTALS", t.gross, t.emp, t.er, t.total],
    filename: `GLA-NSSF-Schedule-${month}.xlsx`,
  });

  return (
    <>
      <ReportMonthPicker month={month} setMonth={setMonth} store={ctx.store} source={snap.source} />
      <ReportKpis items={[
        <StatCard key="1" Icon={Users} label="Staff on schedule" value={rows.length} meta={monthLbl} tone="brand" />,
        <StatCard key="2" Icon={Building2} label={`Employee (${rate.nssfEmp}%)`} value={ugxShort(t.emp)} meta="deducted from staff" tone="accent" />,
        <StatCard key="3" Icon={Building2} label={`Employer (${rate.nssfEr}%)`} value={ugxShort(t.er)} meta="company contribution" tone="warning" />,
        <StatCard key="4" Icon={Check} label={`Total (${rate.nssfEmp + rate.nssfEr}%)`} value={ugxShort(t.total)} meta="remit to NSSF" tone="success" />,
      ]} />
      <Banner Icon={Building2}>NSSF Contributions Schedule for <b>{monthLbl}</b> — every active staff member's NSSF contribution: employee {rate.nssfEmp}% + employer {rate.nssfEr}% = {rate.nssfEmp + rate.nssfEr}% of gross, remitted monthly by the 15th.{missing ? ` ${missing} staff have no NSSF number on file — add it on their employee record.` : ""}</Banner>
      <Card>
        <CardHead title={`NSSF Contributions Schedule — ${monthLbl}`} right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn size="sm" onClick={exportPdf}><FileText size={14} />PDF</Btn>
          <Btn size="sm" onClick={exportExcel}><Download size={14} />Excel</Btn>
          <Btn size="sm" onClick={exportCsv}><Download size={14} />CSV</Btn>
        </div>} />
        <DataTable
          columns={[
            { label: "NSSF Number", render: (r) => r.nssfNumber ? <span className="mono" style={{ fontSize: 12 }}>{r.nssfNumber}</span> : <span style={{ color: "var(--danger)", fontSize: 12 }}>Missing</span> },
            { label: "Name", render: (r) => <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{r.id} · {r.department}</div></div> },
            { label: "Gross pay", num: true, render: (r) => fmtN(r.gross) },
            { label: `Employee ${rate.nssfEmp}%`, num: true, render: (r) => fmtN(r.emp) },
            { label: `Employer ${rate.nssfEr}%`, num: true, render: (r) => fmtN(r.er) },
            { label: `Total ${rate.nssfEmp + rate.nssfEr}%`, num: true, render: (r) => <span style={{ fontWeight: 700, color: "var(--success)" }}>{fmtN(r.total)}</span> },
          ]}
          rows={rows}
          empty="No active staff."
        />
      </Card>
    </>
  );
}

// Searchable staff picker (type-ahead combobox). Filters by name or staff ID;
// click or Enter to select. Falls back to the full list when the box is empty.
function EmployeeSearch({ employees, value, onSelect, placeholder = "Search name or staff ID…" }) {
  const selected = employees.find((e) => e.id === value) || null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = employees.filter((e) => {
    if (!q) return true;
    return `${fullName(e)} ${e.id} ${e.department || ""}`.toLowerCase().includes(q);
  }).slice(0, 8);

  const pick = (e) => { onSelect(e.id); setQuery(""); setOpen(false); };
  const display = open ? query : (selected ? `${fullName(selected)} · ${selected.id}` : "");

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
        <input
          value={display}
          placeholder={selected ? `${fullName(selected)} · ${selected.id}` : placeholder}
          onFocus={() => { setOpen(true); setQuery(""); setHi(0); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); if (matches[hi]) pick(matches[hi]); }
            else if (e.key === "Escape") { setOpen(false); }
          }}
          style={{ ...controlStyle, paddingLeft: 32 }}
        />
      </div>
      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg, 0 8px 24px rgba(0,0,0,.14))", maxHeight: 264, overflowY: "auto", padding: 4 }}>
          {matches.length === 0 && <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--muted)" }}>No staff match “{query}”.</div>}
          {matches.map((e, i) => (
            <button key={e.id} type="button"
              onMouseEnter={() => setHi(i)}
              onMouseDown={(ev) => { ev.preventDefault(); pick(e); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer", background: i === hi ? "var(--surface-2)" : "transparent" }}>
              <Avatar emp={e} size={28} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{fullName(e)}{e.status === "Terminated" && <span style={{ color: "var(--muted)", fontWeight: 500 }}> · exited</span>}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{e.id} · {e.department || "—"}</div>
              </div>
              {e.id === value && <Check size={15} style={{ marginLeft: "auto", color: "var(--success)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Payment Statement — a per-employee statement of every salary payment made
// within a selected date range, drawn from the locked/processed payroll runs.
function PaymentStatement({ ctx }) {
  const { store } = ctx;
  const emps = store.employees.slice().sort((a, b) => a.id.localeCompare(b.id));
  const runs = (store.payrollRuns || []).filter((r) => r.status === "Paid" || r.status === "Processed");
  const runDate = (r) => r.paidAt || r.processedAt || `${r.month}-01`;
  const runDates = runs.map(runDate).sort();
  const minDate = runDates[0] || `${CURRENT_MONTH}-01`;
  const maxDate = runDates[runDates.length - 1] || TODAY;

  const [empId, setEmpId] = useState(emps.find((e) => e.status !== "Terminated")?.id || emps[0]?.id || "");
  const [from, setFrom] = useState(minDate);
  const [to, setTo] = useState(maxDate);

  const emp = emps.find((e) => e.id === empId) || null;
  const lo = from <= to ? from : to;
  const hi = from <= to ? to : from;

  // One statement line per run whose pay date falls in the selected date range.
  const lines = runs
    .filter((r) => { const d = runDate(r); return d >= lo && d <= hi; })
    .sort((a, b) => runDate(a).localeCompare(runDate(b)))
    .map((r) => {
      const row = (r.rows || []).find((x) => x.empId === empId);
      if (!row) return null;
      const cols = r.columns || [];
      let allow = 0, other = 0;
      cols.forEach((c) => {
        const v = Number((row.custom || {})[c.id]) || 0;
        if (c.kind === "allowance") allow += v; else if (c.kind === "deduction") other += v;
      });
      return {
        month: r.month, label: monthLabel(r.month), status: r.status,
        paidAt: r.paidAt || r.processedAt || "", runId: r.id,
        gross: row.gross || 0, allow, nssf5: row.nssf5 || 0, paye: row.paye || 0,
        advance: row.advance || 0, other, net: row.net || 0,
      };
    })
    .filter(Boolean);

  const t = lines.reduce((a, l) => ({
    gross: a.gross + l.gross, allow: a.allow + l.allow, nssf5: a.nssf5 + l.nssf5,
    paye: a.paye + l.paye, advance: a.advance + l.advance, other: a.other + l.other, net: a.net + l.net,
  }), { gross: 0, allow: 0, nssf5: 0, paye: 0, advance: 0, other: 0, net: 0 });
  const totalDed = t.nssf5 + t.paye + t.advance + t.other;
  const rangeLbl = `${fmtDate(lo)} – ${fmtDate(hi)}`;
  const empLbl = emp ? `${fullName(emp)} · ${emp.id}` : "—";
  const detailMeta = emp ? [
    `Employee: ${fullName(emp)}   Staff ID: ${emp.id}   Department: ${emp.department || "—"}`,
    `TIN: ${emp.tin || "—"}   NSSF No: ${emp.nssfNumber || "—"}   Bank: ${emp.bankName || "—"} ${emp.bankAccount || ""}`.trim(),
    `Period: ${rangeLbl}   Payments: ${lines.length}   Net received: UGX ${fmtN(t.net)}`,
  ] : [];

  const exportCsv = () => {
    const out = ['"STAFF PAYMENT STATEMENT"',
      `"Employee:","${emp ? fullName(emp) : ""}","Staff ID:","${emp?.id || ""}"`,
      `"TIN:","${emp?.tin || ""}","NSSF No:","${emp?.nssfNumber || ""}"`,
      `"Bank:","${emp?.bankName || ""}","Account:","${emp?.bankAccount || ""}"`,
      `"Period:","${rangeLbl}"`, "",
      ["Period", "Status", "Paid On", "Gross", "Allowances", "NSSF 5%", "PAYE", "Advance", "Other Deductions", "Net Paid"].join(",")];
    lines.forEach((l) => out.push([l.label, l.status, l.paidAt, l.gross, l.allow, l.nssf5, l.paye, l.advance, l.other, l.net].map((x) => `"${x ?? ""}"`).join(",")));
    out.push(["TOTALS", "", "", t.gross, t.allow, t.nssf5, t.paye, t.advance, t.other, t.net].map((x) => `"${x}"`).join(","));
    downloadFile(`gla-payment-statement-${emp?.id || "staff"}-${lo}_${hi}.csv`, out.join("\n"));
  };
  const exportPdf = () => downloadReportPdf({
    filename: `GLA-Payment-Statement-${emp?.id || "staff"}-${lo}_${hi}.pdf`,
    eyebrow: "Payroll · Payment Statement",
    signatories: SIGNATORIES,
    title: "Staff Payment Statement",
    subtitle: `${empLbl} · ${rangeLbl}`,
    meta: detailMeta,
    head: ["Period", "Status", "Gross", "Allow.", "NSSF 5%", "PAYE", "Advance", "Other", "Net Paid"],
    body: lines.map((l) => [l.label, l.status, fmtN(l.gross), fmtN(l.allow), fmtN(l.nssf5), fmtN(l.paye), fmtN(l.advance), fmtN(l.other), fmtN(l.net)])
      .concat([["TOTALS", "", fmtN(t.gross), fmtN(t.allow), fmtN(t.nssf5), fmtN(t.paye), fmtN(t.advance), fmtN(t.other), fmtN(t.net)]]),
    orientation: "landscape",
  });
  const exportExcel = () => downloadScheduleXlsx({
    title: "Staff Payment Statement", eyebrow: "PAYROLL · PAYMENT STATEMENT",
    subtitle: `${empLbl} · ${rangeLbl}`,
    meta: detailMeta,
    columns: [
      { header: "Period", width: 18 }, { header: "Status", width: 12 }, { header: "Paid On", width: 13 },
      { header: "Gross", money: true }, { header: "Allowances", money: true }, { header: "NSSF 5%", money: true },
      { header: "PAYE", money: true }, { header: "Advance", money: true }, { header: "Other Ded.", money: true }, { header: "Net Paid", money: true },
    ],
    rows: lines.map((l) => [l.label, l.status, l.paidAt, l.gross, l.allow, l.nssf5, l.paye, l.advance, l.other, l.net]),
    totalsRow: ["TOTALS", "", "", t.gross, t.allow, t.nssf5, t.paye, t.advance, t.other, t.net],
    filename: `GLA-Payment-Statement-${emp?.id || "staff"}-${lo}_${hi}.xlsx`,
  });

  const canExport = lines.length > 0 && emp;
  return (
    <>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px 16px", alignItems: "end" }}>
          <Field label="Staff member">
            <EmployeeSearch employees={emps} value={empId} onSelect={setEmpId} />
          </Field>
          <Field label="From date"><Input type="date" value={from} min={minDate} max={maxDate} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To date"><Input type="date" value={to} min={minDate} max={maxDate} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </Card>
      <ReportKpis items={[
        <StatCard key="1" Icon={CalendarCheck} label="Payments in range" value={lines.length} meta={rangeLbl} tone="brand" />,
        <StatCard key="2" Icon={Wallet} label="Total gross" value={ugxShort(t.gross)} meta="earnings" tone="accent" />,
        <StatCard key="3" Icon={Coins} label="Total deductions" value={ugxShort(totalDed)} meta="NSSF + PAYE + advances + other" tone="warning" />,
        <StatCard key="4" Icon={Banknote} label="Net received" value={ugxShort(t.net)} meta="paid to bank" tone="success" />,
      ]} />
      <Banner Icon={Banknote}>Payment Statement for <b>{empLbl}</b> — every salary payment with a pay date between <b>{fmtDate(lo)}</b> and <b>{fmtDate(hi)}</b>, with the full earnings and deductions breakdown per month. Search for a staff member and pick the date range above, then export the branded statement.{lines.length === 0 ? " No processed payments fall in this range for this staff member." : ""}</Banner>
      <Card>
        <CardHead title={`Payment Statement — ${emp ? fullName(emp) : "—"}`} sub={rangeLbl} right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn size="sm" disabled={!canExport} onClick={exportPdf}><FileText size={14} />PDF</Btn>
          <Btn size="sm" disabled={!canExport} onClick={exportExcel}><Download size={14} />Excel</Btn>
          <Btn size="sm" disabled={!canExport} onClick={exportCsv}><Download size={14} />CSV</Btn>
        </div>} />
        {emp && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 22px", padding: "0 4px 12px", fontSize: 12.5, color: "var(--text-2)" }}>
            <span><b style={{ color: "var(--muted)", fontWeight: 600 }}>TIN</b> {emp.tin || "—"}</span>
            <span><b style={{ color: "var(--muted)", fontWeight: 600 }}>NSSF</b> {emp.nssfNumber || "—"}</span>
            <span><b style={{ color: "var(--muted)", fontWeight: 600 }}>Bank</b> {emp.bankName || "—"} {emp.bankAccount || ""}</span>
            <span><b style={{ color: "var(--muted)", fontWeight: 600 }}>Dept</b> {emp.department || "—"}</span>
          </div>
        )}
        <DataTable
          columns={[
            { label: "Period", render: (l) => <div><div style={{ fontWeight: 600 }}>{l.label}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{l.status === "Paid" ? `Paid ${fmtDate(l.paidAt)}` : "Processed"}</div></div> },
            { label: "Gross", num: true, render: (l) => fmtN(l.gross) },
            { label: "Allow.", num: true, render: (l) => l.allow ? <span style={{ color: "var(--success)" }}>{fmtN(l.allow)}</span> : "—" },
            { label: "NSSF 5%", num: true, render: (l) => fmtN(l.nssf5) },
            { label: "PAYE", num: true, render: (l) => fmtN(l.paye) },
            { label: "Advance", num: true, render: (l) => l.advance ? fmtN(l.advance) : "—" },
            { label: "Other", num: true, render: (l) => l.other ? fmtN(l.other) : "—" },
            { label: "Net paid", num: true, render: (l) => <span style={{ fontWeight: 700, color: "var(--success)" }}>{fmtN(l.net)}</span> },
          ]}
          rows={lines}
          empty="No payments in the selected range."
        />
        {lines.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, padding: "12px 6px 2px", fontSize: 13, flexWrap: "wrap" }}>
            <span style={{ color: "var(--muted)" }}>Total gross <b style={{ color: "var(--text)" }}>{fmtN(t.gross)}</b></span>
            <span style={{ color: "var(--muted)" }}>Total deductions <b style={{ color: "var(--warning)" }}>{fmtN(totalDed)}</b></span>
            <span style={{ color: "var(--muted)" }}>Net received <b style={{ color: "var(--success)" }}>{fmtN(t.net)}</b></span>
          </div>
        )}
      </Card>
    </>
  );
}

// PAYE Deduction Schedule — the monthly PAYE (income tax) return for all staff,
// computed from each employee's gross using the URA resident individual bands.
function PayeReport({ ctx }) {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const snap = staffStatutoryRows(ctx.store, month);
  const rows = snap.rows.map((r, i) => {
    const rate = r.gross ? r.paye / r.gross : 0;
    return { no: i + 1, id: r.id, name: r.name, tin: r.tin, department: r.department, gross: r.gross, paye: r.paye, rate };
  });
  const t = rows.reduce((a, r) => ({ gross: a.gross + r.gross, paye: a.paye + r.paye }), { gross: 0, paye: 0 });
  const effRate = t.gross ? t.paye / t.gross : 0;
  const taxpayers = rows.filter((r) => r.paye > 0).length;
  const missing = rows.filter((r) => !r.tin).length;
  const monthLbl = monthLabel(month);
  const pct = (r) => `${(r * 100).toFixed(1)}%`;

  const exportCsv = () => {
    const lines = ['"PAYE DEDUCTION SCHEDULE"', `"Period:","${monthLbl}"`, "",
      ["No", "TIN", "Name", "Staff ID", "Department", "Gross Pay", "PAYE", "Effective Rate"].join(",")];
    rows.forEach((r) => lines.push([r.no, r.tin, r.name, r.id, r.department, r.gross, r.paye, pct(r.rate)].map((x) => `"${x ?? ""}"`).join(",")));
    lines.push(["", "", "TOTALS", "", "", t.gross, t.paye, pct(effRate)].map((x) => `"${x}"`).join(","));
    downloadFile(`gla-paye-schedule-${month}.csv`, lines.join("\n"));
  };
  const exportPdf = () => downloadReportPdf({
    filename: `GLA-PAYE-Schedule-${month}.pdf`,
    eyebrow: "Statutory · PAYE",
    signatories: SIGNATORIES,
    title: "PAYE Deduction Schedule",
    subtitle: `${monthLbl} · ${rows.length} staff · ${taxpayers} taxable`,
    meta: [`Total PAYE remittable to URA: UGX ${fmtN(t.paye)}    Total gross: UGX ${fmtN(t.gross)}    Effective rate: ${pct(effRate)}`],
    head: ["#", "TIN", "Name", "Gross Pay", "PAYE", "Rate"],
    body: rows.map((r) => [r.no, r.tin || "—", r.name, fmtN(r.gross), fmtN(r.paye), pct(r.rate)])
      .concat([["", "", "TOTALS", fmtN(t.gross), fmtN(t.paye), pct(effRate)]]),
    orientation: "landscape",
  });
  const exportExcel = () => downloadScheduleXlsx({
    title: "PAYE Deduction Schedule", eyebrow: "STATUTORY · PAYE",
    subtitle: `${monthLbl} · income tax on emoluments, URA resident individual bands`,
    meta: [`Total PAYE remittable to URA: UGX ${t.paye.toLocaleString("en-US")}`],
    columns: [
      { header: "#", width: 5 }, { header: "TIN", width: 16 }, { header: "Name", width: 24 },
      { header: "Department", width: 20 }, { header: "Gross Pay", money: true },
      { header: "PAYE", money: true }, { header: "Effective Rate", align: "right", width: 14 },
    ],
    rows: rows.map((r) => [r.no, r.tin || "—", r.name, r.department, r.gross, r.paye, pct(r.rate)]),
    totalsRow: ["", "", "TOTALS", "", t.gross, t.paye, pct(effRate)],
    filename: `GLA-PAYE-Schedule-${month}.xlsx`,
  });

  return (
    <>
      <ReportMonthPicker month={month} setMonth={setMonth} store={ctx.store} source={snap.source} />
      <ReportKpis items={[
        <StatCard key="1" Icon={Users} label="Staff on schedule" value={rows.length} meta={`${taxpayers} above tax-free threshold`} tone="brand" />,
        <StatCard key="2" Icon={Wallet} label="Total gross" value={ugxShort(t.gross)} meta={monthLbl} tone="accent" />,
        <StatCard key="3" Icon={FileText} label="Total PAYE" value={ugxShort(t.paye)} meta="remit to URA" tone="warning" />,
        <StatCard key="4" Icon={Check} label="Effective rate" value={pct(effRate)} meta="PAYE ÷ gross" tone="success" />,
      ]} />
      <Banner Icon={FileText}>PAYE Deduction Schedule for <b>{monthLbl}</b> — income tax withheld from every active staff member's emoluments, computed on the URA resident individual bands (tax-free up to UGX 235,000; 10% / 20% / 30%, plus 10% on gross above UGX 10m). Remit to URA by the 15th.{missing ? ` ${missing} staff have no TIN on file — add it on their employee record.` : ""}</Banner>
      <Card>
        <CardHead title={`PAYE Deduction Schedule — ${monthLbl}`} right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn size="sm" onClick={exportPdf}><FileText size={14} />PDF</Btn>
          <Btn size="sm" onClick={exportExcel}><Download size={14} />Excel</Btn>
          <Btn size="sm" onClick={exportCsv}><Download size={14} />CSV</Btn>
        </div>} />
        <DataTable
          columns={[
            { label: "TIN", render: (r) => r.tin ? <span className="mono" style={{ fontSize: 12 }}>{r.tin}</span> : <span style={{ color: "var(--danger)", fontSize: 12 }}>Missing</span> },
            { label: "Name", render: (r) => <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{r.id} · {r.department}</div></div> },
            { label: "Gross pay", num: true, render: (r) => fmtN(r.gross) },
            { label: "PAYE", num: true, render: (r) => <span style={{ fontWeight: 700, color: "var(--warning)" }}>{fmtN(r.paye)}</span> },
            { label: "Rate", num: true, render: (r) => <span style={{ color: "var(--muted)", fontSize: 12 }}>{pct(r.rate)}</span> },
          ]}
          rows={rows}
          empty="No active staff."
        />
      </Card>
    </>
  );
}

function AttendanceReport({ ctx }) {
  const { store } = ctx;
  const emps = store.employees.filter((e) => e.status !== "Terminated");
  const [period, setPeriod] = useState("14");

  const dISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const endD = new Date(TODAY + "T00:00:00");
  let startD;
  if (period === "month") startD = new Date(TODAY.slice(0, 7) + "-01T00:00:00");
  else { startD = new Date(endD); startD.setDate(endD.getDate() - (Number(period) - 1)); }
  const start = dISO(startD), end = TODAY;

  const weekdays = [];
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) { const wd = d.getDay(); if (wd !== 0 && wd !== 6) weekdays.push(dISO(d)); }
  const workingDays = weekdays.length || 1;
  const recs = store.attendance.filter((a) => a.date >= start && a.date <= end);

  const present = recs.filter((a) => a.status !== "Absent" && a.clockIn);
  const onTime = present.filter((a) => timeToMinutes(a.clockIn) <= LATE_THRESHOLD_MIN);
  const lateAll = present.length - onTime.length;
  const absentAll = recs.filter((a) => a.status === "Absent").length;
  const geoAll = recs.filter((a) => a.lat != null);
  const withinAll = geoAll.filter((a) => a.withinFence);
  const outsideAll = geoAll.length - withinAll.length;
  const noGps = present.filter((a) => a.lat == null).length;
  const otAll = recs.reduce((s, a) => s + (Number(a.overtime) || 0), 0);
  const expectedAll = emps.length * workingDays || 1;
  const attendanceRate = Math.min(100, Math.round((present.length / expectedAll) * 100));
  const punctuality = present.length ? Math.round((onTime.length / present.length) * 100) : 0;
  const avgInAll = present.length ? minutesToTime(present.reduce((s, a) => s + timeToMinutes(a.clockIn), 0) / present.length) : "—";
  const geoCompliance = geoAll.length ? Math.round((withinAll.length / geoAll.length) * 100) : 0;

  const trend = weekdays.map((dt) => ({ label: dt.slice(8) + "/" + dt.slice(5, 7), value: recs.filter((a) => a.date === dt && a.status !== "Absent" && a.clockIn).length }));

  const deptBars = DEPARTMENTS.filter((d) => emps.some((e) => e.department === d)).map((d, i) => {
    const de = emps.filter((e) => e.department === d);
    const p = recs.filter((a) => a.status !== "Absent" && a.clockIn && de.some((e) => e.id === a.empId)).length;
    const pct = Math.min(100, Math.round((p / (de.length * workingDays || 1)) * 100));
    return { label: d, value: pct, display: pct + "%", color: CAT[i % CAT.length] };
  }).sort((a, b) => b.value - a.value);

  const siteCount = {};
  recs.forEach((a) => { const s = a.geoSite || a.site; if (s && s !== "—") siteCount[s] = (siteCount[s] || 0) + 1; });
  const siteBars = Object.entries(siteCount).map(([s, c], i) => ({ label: s, value: c, color: CAT[i % CAT.length] })).sort((a, b) => b.value - a.value);

  const empStats = emps.map((e) => {
    const rs = recs.filter((a) => a.empId === e.id);
    const pres = rs.filter((a) => a.status !== "Absent" && a.clockIn);
    const late = pres.filter((a) => timeToMinutes(a.clockIn) > LATE_THRESHOLD_MIN);
    const absent = rs.filter((a) => a.status === "Absent");
    const ins = pres.map((a) => timeToMinutes(a.clockIn)).filter((x) => x != null);
    const geo = rs.filter((a) => a.lat != null);
    const within = geo.filter((a) => a.withinFence);
    return {
      e, presentDays: pres.length, lateDays: late.length, absentDays: absent.length,
      avgIn: ins.length ? minutesToTime(ins.reduce((s, x) => s + x, 0) / ins.length) : "—",
      ot: rs.reduce((s, a) => s + (Number(a.overtime) || 0), 0),
      geoPct: geo.length ? Math.round((within.length / geo.length) * 100) : null,
      rate: Math.min(100, Math.round((pres.length / workingDays) * 100)),
    };
  }).sort((a, b) => b.rate - a.rate);

  const exportCsv = () => {
    const cols = ["Staff ID", "Name", "Department", "Present days", "Late days", "Absent days", "Avg clock-in", "Overtime hrs", "Geo-verified %", "Attendance %"];
    const lines = [cols.join(",")].concat(empStats.map((s) => [s.e.id, fullName(s.e), s.e.department, s.presentDays, s.lateDays, s.absentDays, s.avgIn, s.ot, s.geoPct == null ? "" : s.geoPct, s.rate].map((x) => `"${x}"`).join(",")));
    downloadFile(`gla-attendance-report-${start}_to_${end}.csv`, lines.join("\n"));
  };
  const exportPdf = () => downloadReportPdf({
    filename: `GLA-Attendance-Report-${start}_to_${end}.pdf`,
    eyebrow: "Attendance",
    title: "Attendance Report",
    subtitle: `${fmtDate(start)} → ${fmtDate(end)} · ${workingDays} working days`,
    meta: [`Attendance rate: ${attendanceRate}%   Punctuality: ${punctuality}%   Avg clock-in: ${avgInAll}   Geo-compliance: ${geoCompliance}%`],
    head: ["Staff ID", "Name", "Present", "Late", "Absent", "Avg In", "OT hrs", "Geo %", "Attend %"],
    body: empStats.map((s) => [s.e.id, fullName(s.e), s.presentDays, s.lateDays, s.absentDays, s.avgIn, s.ot, s.geoPct == null ? "—" : s.geoPct + "%", s.rate + "%"]),
    orientation: "landscape",
  });
  const periodLabel = period === "month" ? "This month" : `Last ${period} days`;

  return (
    <>
      <Toolbar>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>Period <b style={{ color: "var(--text)" }}>{fmtDate(start)} → {fmtDate(end)}</b> · {workingDays} working days</div>
        <div style={{ flex: 1 }} />
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} options={[{ value: "7", label: "Last 7 days" }, { value: "14", label: "Last 14 days" }, { value: "month", label: "This month" }]} style={{ width: "auto" }} />
        <Btn onClick={exportPdf}><FileText size={15} />PDF</Btn>
        <Btn onClick={exportCsv}><Download size={15} />Export CSV</Btn>
        <Btn onClick={() => window.print()}><Printer size={15} />Print</Btn>
      </Toolbar>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 16 }}>
        <StatCard Icon={Check} label="Attendance rate" value={attendanceRate + "%"} meta={`${present.length} of ${expectedAll} shifts`} tone="success" />
        <StatCard Icon={Timer} label="Punctuality" value={punctuality + "%"} meta={`${lateAll} late arrivals`} tone={punctuality >= 85 ? "success" : "warning"} />
        <StatCard Icon={Clock} label="Avg clock-in" value={avgInAll} meta={`late after ${minutesToTime(LATE_THRESHOLD_MIN)}`} tone="brand" />
        <StatCard Icon={LocateFixed} label="Geo-compliance" value={geoCompliance + "%"} meta={`${outsideAll} outside · ${noGps} no GPS`} tone={geoCompliance >= 90 ? "success" : "warning"} />
        <StatCard Icon={TrendingUp} label="Overtime" value={otAll.toFixed(1) + " h"} meta={`${absentAll} absent days`} tone="accent" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 16 }} className="rep-cols">
        <Card>
          <CardHead title="Daily attendance trend" right={<span style={{ fontSize: 11.5, color: "var(--muted)" }}>staff present per working day</span>} />
          <div style={{ padding: "14px 18px" }}><AreaTrend points={trend} /></div>
        </Card>
        <Card>
          <CardHead title="Punctuality" />
          <div style={{ padding: "18px 20px" }}>
            <Donut segments={[
              { label: "On time", value: onTime.length, color: "var(--success)" },
              { label: "Late", value: lateAll, color: "var(--warning)" },
              { label: "Absent", value: absentAll, color: "var(--danger)" },
            ]} />
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Card>
          <CardHead title="Attendance rate by department" />
          <div style={{ padding: "18px 20px" }}>{deptBars.length ? <HBars items={deptBars} max={100} /> : <div style={{ color: "var(--muted)", fontSize: 13 }}>No data.</div>}</div>
        </Card>
        <Card>
          <CardHead title="Geo-fence compliance" />
          <div style={{ padding: "18px 20px" }}>
            <Donut segments={[
              { label: "Within fence", value: withinAll.length, color: "var(--success)" },
              { label: "Outside fence", value: outsideAll, color: "var(--danger)" },
              { label: "No GPS", value: noGps, color: "var(--muted)" },
            ]} />
          </div>
        </Card>
        <Card>
          <CardHead title="Clock-ins by site" />
          <div style={{ padding: "18px 20px" }}>{siteBars.length ? <HBars items={siteBars} /> : <div style={{ color: "var(--muted)", fontSize: 13 }}>No data.</div>}</div>
        </Card>
      </div>

      <Card>
        <CardHead title={`Per-employee attendance summary — ${periodLabel}`} right={<Btn size="sm" onClick={exportCsv}><Download size={14} />CSV</Btn>} />
        <DataTable
          columns={[
            { label: "Employee", render: (s) => <EmpCell emp={s.e} /> },
            { label: "Dept", render: (s) => s.e.department },
            { label: "Present", num: true, render: (s) => s.presentDays },
            { label: "Late", num: true, render: (s) => s.lateDays ? <span style={{ color: "var(--warning)", fontWeight: 600 }}>{s.lateDays}</span> : 0 },
            { label: "Absent", num: true, render: (s) => s.absentDays ? <span style={{ color: "var(--danger)", fontWeight: 600 }}>{s.absentDays}</span> : 0 },
            { label: "Avg in", render: (s) => s.avgIn },
            { label: "OT (h)", num: true, render: (s) => s.ot.toFixed(1) },
            { label: "Geo %", num: true, render: (s) => s.geoPct == null ? "—" : s.geoPct + "%" },
            { label: "Attendance", num: true, render: (s) => (
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                <div style={{ width: 54, height: 7, background: "var(--surface-2)", borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: `${s.rate}%`, background: s.rate >= 90 ? "var(--success)" : s.rate >= 75 ? "var(--warning)" : "var(--danger)" }} /></div>
                <span className="mono" style={{ fontWeight: 600 }}>{s.rate}%</span>
              </div>
            ) },
          ]}
          rows={empStats}
          empty="No attendance in this period."
        />
      </Card>
    </>
  );
}

function ReportKpis({ items }) {
  return <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 16 }}>{items}</div>;
}
function ChartRow({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>{children}</div>;
}

function WorkforceReport({ ctx }) {
  const emps = ctx.store.employees;
  const active = emps.filter((e) => e.status === "Active").length;
  const tenures = emps.map((e) => yearsBetween(e.employmentDate)).filter((x) => x != null);
  const ages = emps.map((e) => yearsBetween(e.dob)).filter((x) => x != null);
  const perm = emps.filter((e) => e.contractType === "Permanent").length;
  const female = emps.filter((e) => e.gender === "Female").length;

  const deptBars = DEPARTMENTS.filter((d) => emps.some((e) => e.department === d)).map((d, i) => ({ label: d, value: emps.filter((e) => e.department === d).length, color: CAT[i % CAT.length] })).sort((a, b) => b.value - a.value);
  const contract = CONTRACT_TYPES.map((c, i) => ({ label: c, value: emps.filter((e) => e.contractType === c).length, color: CAT[i % CAT.length] })).filter((x) => x.value);
  const gender = [{ label: "Male", value: emps.filter((e) => e.gender === "Male").length, color: CAT[0] }, { label: "Female", value: female, color: CAT[4] }];
  const bands = [["< 2 yrs", (t) => t < 2], ["2–5 yrs", (t) => t >= 2 && t < 5], ["5–10 yrs", (t) => t >= 5 && t < 10], ["10+ yrs", (t) => t >= 10]];
  const tenureBars = bands.map(([label, fn], i) => ({ label, value: tenures.filter(fn).length, color: CAT[i % CAT.length] }));

  return (
    <>
      <ReportKpis items={[
        <StatCard key="1" Icon={Users} label="Total staff" value={emps.length} meta={`${active} active`} tone="brand" />,
        <StatCard key="2" Icon={ShieldCheck} label="Permanent" value={`${Math.round((perm / emps.length) * 100)}%`} meta={`${perm} of ${emps.length}`} tone="success" />,
        <StatCard key="3" Icon={Timer} label="Avg tenure" value={avgOf(tenures).toFixed(1) + " yrs"} meta="since date joined" tone="accent" />,
        <StatCard key="4" Icon={CalendarCheck} label="Avg age" value={Math.round(avgOf(ages)) + " yrs"} meta={`${Math.round((female / emps.length) * 100)}% female`} tone="warning" />,
      ]} />
      <ChartRow>
        <Card><CardHead title="Headcount by department" /><div style={{ padding: "18px 20px" }}><HBars items={deptBars} /></div></Card>
        <Card><CardHead title="Contract type" /><div style={{ padding: "18px 20px" }}><Donut segments={contract} /></div></Card>
        <Card><CardHead title="Gender split" /><div style={{ padding: "18px 20px" }}><Donut segments={gender} /></div></Card>
      </ChartRow>
      <div style={{ marginBottom: 16 }}>
        <Card><CardHead title="Tenure distribution" /><div style={{ padding: "18px 20px" }}><HBars items={tenureBars} /></div></Card>
      </div>
      <Card>
        <CardHead title="Staff register" />
        <DataTable
          columns={[
            { label: "Employee", render: (e) => <EmpCell emp={e} /> },
            { label: "Department", render: (e) => e.department },
            { label: "Contract", render: (e) => <Tag>{e.contractType}</Tag> },
            { label: "Status", render: (e) => <Pill tone={statusTone[e.status]}>{e.status}</Pill> },
            { label: "Joined", render: (e) => fmtDate(e.employmentDate) },
            { label: "Tenure", num: true, render: (e) => { const t = yearsBetween(e.employmentDate); return t == null ? "—" : t.toFixed(1) + " y"; } },
            { label: "Age", num: true, render: (e) => { const a = yearsBetween(e.dob); return a == null ? "—" : Math.floor(a); } },
          ]}
          rows={emps}
          empty="No staff."
        />
      </Card>
    </>
  );
}

function LeaveReport({ ctx }) {
  const emps = ctx.store.employees;
  const leave = ctx.store.leave;
  const approved = leave.filter((l) => l.status === "Approved");
  const pending = leave.filter((l) => l.status === "Pending");
  const rejected = leave.filter((l) => l.status === "Rejected");
  const daysApproved = approved.reduce((s, l) => s + (l.days || 0), 0);

  const byType = Object.keys(LEAVE_TYPES).map((t, i) => ({ label: t, value: leave.filter((l) => l.type === t).length, color: CAT[i % CAT.length] })).filter((x) => x.value);
  const statusDonut = [
    { label: "Approved", value: approved.length, color: "var(--success)" },
    { label: "Pending", value: pending.length, color: "var(--warning)" },
    { label: "Rejected", value: rejected.length, color: "var(--danger)" },
  ];
  const daysByDept = DEPARTMENTS.filter((d) => emps.some((e) => e.department === d)).map((d, i) => {
    const ids = emps.filter((e) => e.department === d).map((e) => e.id);
    return { label: d, value: approved.filter((l) => ids.includes(l.empId)).reduce((s, l) => s + (l.days || 0), 0), color: CAT[i % CAT.length] };
  }).filter((x) => x.value).sort((a, b) => b.value - a.value);
  const util = Math.round(avgOf(emps.map((e) => ((e.annualUsed || 0) / LEAVE_TYPES.Annual.entitlement) * 100)));

  const rows = emps.map((e) => {
    const a = deriveLeaveBalance(e, "Annual");
    const reqs = leave.filter((l) => l.empId === e.id);
    return { e, annualUsed: a.used, annualLeft: a.remaining, sickUsed: e.sickUsed || 0, reqs: reqs.length, daysApproved: reqs.filter((l) => l.status === "Approved").reduce((s, l) => s + (l.days || 0), 0) };
  }).sort((x, y) => y.daysApproved - x.daysApproved);

  return (
    <>
      <ReportKpis items={[
        <StatCard key="1" Icon={CalendarDays} label="Total requests" value={leave.length} meta={`${pending.length} pending`} tone="brand" />,
        <StatCard key="2" Icon={Check} label="Approved" value={approved.length} meta={`${daysApproved} days`} tone="success" />,
        <StatCard key="3" Icon={X} label="Rejected" value={rejected.length} meta="this period" tone="warning" />,
        <StatCard key="4" Icon={Timer} label="Annual utilisation" value={util + "%"} meta={`of ${LEAVE_TYPES.Annual.entitlement}-day entitlement`} tone="accent" />,
      ]} />
      <ChartRow>
        <Card><CardHead title="Requests by leave type" /><div style={{ padding: "18px 20px" }}>{byType.length ? <HBars items={byType} /> : <div style={{ color: "var(--muted)", fontSize: 13 }}>No data.</div>}</div></Card>
        <Card><CardHead title="Request status" /><div style={{ padding: "18px 20px" }}><Donut segments={statusDonut} /></div></Card>
        <Card><CardHead title="Approved days by department" /><div style={{ padding: "18px 20px" }}>{daysByDept.length ? <HBars items={daysByDept} /> : <div style={{ color: "var(--muted)", fontSize: 13 }}>No approved leave yet.</div>}</div></Card>
      </ChartRow>
      <Card>
        <CardHead title="Per-employee leave summary" />
        <DataTable
          columns={[
            { label: "Employee", render: (r) => <EmpCell emp={r.e} /> },
            { label: "Department", render: (r) => r.e.department },
            { label: "Annual used", num: true, render: (r) => r.annualUsed },
            { label: "Annual left", num: true, render: (r) => r.annualLeft },
            { label: "Sick used", num: true, render: (r) => r.sickUsed },
            { label: "Requests", num: true, render: (r) => r.reqs },
            { label: "Days approved", num: true, render: (r) => r.daysApproved },
          ]}
          rows={rows}
          empty="No leave data."
        />
      </Card>
    </>
  );
}

function PayrollReport({ ctx }) {
  const emps = ctx.store.employees.filter((e) => e.status !== "Terminated");
  const t = emps.reduce((acc, e) => { const p = derivePayslip(e); acc.g += p.gross; acc.paye += p.paye; acc.ne += p.nssfEmp; acc.nr += p.nssfEr; acc.net += p.net; acc.ctc += p.costToCompany; return acc; }, { g: 0, paye: 0, ne: 0, nr: 0, net: 0, ctc: 0 });

  const costByDept = DEPARTMENTS.filter((d) => emps.some((e) => e.department === d)).map((d, i) => ({ label: d, value: emps.filter((e) => e.department === d).reduce((s, e) => s + (Number(e.grossSalary) || 0), 0), color: CAT[i % CAT.length] })).sort((a, b) => b.value - a.value);
  const costByDeptDisplay = costByDept.map((x) => ({ ...x, display: ugxShort(x.value) }));
  const bands = [["< 1.5M", (g) => g < 1500000], ["1.5–2.5M", (g) => g >= 1500000 && g < 2500000], ["2.5–4M", (g) => g >= 2500000 && g < 4000000], ["4M +", (g) => g >= 4000000]];
  const salaryBands = bands.map(([label, fn], i) => ({ label, value: emps.filter((e) => fn(Number(e.grossSalary) || 0)).length, color: CAT[i % CAT.length] }));
  const split = [
    { label: "Net pay", value: t.net, color: "var(--success)" },
    { label: "PAYE", value: t.paye, color: "var(--warning)" },
    { label: "NSSF (employee)", value: t.ne, color: "var(--brand)" },
  ];

  const exportCsv = () => {
    const cols = ["Staff ID", "Name", "Department", "Gross", "PAYE", "NSSF_Employee", "NSSF_Employer", "Net", "Cost_to_company"];
    const lines = [cols.join(",")].concat(emps.map((e) => { const p = derivePayslip(e); return [e.id, fullName(e), e.department, p.gross, p.paye, p.nssfEmp, p.nssfEr, p.net, p.costToCompany].map((x) => `"${x}"`).join(","); }));
    downloadFile("gla-payroll-cost-report.csv", lines.join("\n"));
  };
  const exportPdf = () => downloadReportPdf({
    filename: "GLA-Payroll-Cost-Report.pdf",
    eyebrow: "Payroll",
    title: "Payroll Cost Report",
    subtitle: `${monthLabel(CURRENT_MONTH)} · ${emps.length} staff`,
    meta: [`Gross: UGX ${fmtN(t.g)}   PAYE: UGX ${fmtN(t.paye)}   NSSF total: UGX ${fmtN(t.ne + t.nr)}   Net: UGX ${fmtN(t.net)}   Cost to company: UGX ${fmtN(t.ctc)}`],
    head: ["Staff ID", "Name", "Gross", "PAYE", "NSSF 5%", "NSSF 10%", "Net", "Cost to Co."],
    body: emps.map((e) => { const p = derivePayslip(e); return [e.id, fullName(e), fmtN(p.gross), fmtN(p.paye), fmtN(p.nssfEmp), fmtN(p.nssfEr), fmtN(p.net), fmtN(p.costToCompany)]; })
      .concat([["", "TOTALS", fmtN(t.g), fmtN(t.paye), fmtN(t.ne), fmtN(t.nr), fmtN(t.net), fmtN(t.ctc)]]),
    orientation: "landscape",
  });

  return (
    <>
      <ReportKpis items={[
        <StatCard key="1" Icon={Wallet} label="Monthly gross" value={ugxShort(t.g)} meta={`${emps.length} staff`} tone="brand" />,
        <StatCard key="2" Icon={FileText} label="PAYE (URA)" value={ugxShort(t.paye)} meta="monthly remittance" tone="accent" />,
        <StatCard key="3" Icon={Building2} label="NSSF total" value={ugxShort(t.ne + t.nr)} meta="15% of gross" tone="warning" />,
        <StatCard key="4" Icon={Check} label="Net payout" value={ugxShort(t.net)} meta="to staff accounts" tone="success" />,
        <StatCard key="5" Icon={TrendingUp} label="Cost to company" value={ugxShort(t.ctc)} meta="gross + employer NSSF" tone="brand" />,
      ]} />
      <ChartRow>
        <Card><CardHead title="Payroll cost by department" /><div style={{ padding: "18px 20px" }}><HBars items={costByDeptDisplay} /></div></Card>
        <Card><CardHead title="Net vs deductions" /><div style={{ padding: "18px 20px" }}><Donut segments={split} /></div></Card>
        <Card><CardHead title="Salary distribution (UGX)" /><div style={{ padding: "18px 20px" }}><HBars items={salaryBands} /></div></Card>
      </ChartRow>
      <Card>
        <CardHead title="Payroll cost summary" right={<div style={{ display: "flex", gap: 8 }}><Btn size="sm" onClick={exportPdf}><FileText size={14} />PDF</Btn><Btn size="sm" onClick={exportCsv}><Download size={14} />CSV</Btn></div>} />
        <DataTable
          columns={[
            { label: "Employee", render: (e) => <EmpCell emp={e} /> },
            { label: "Department", render: (e) => e.department },
            { label: "Gross", num: true, render: (e) => fmtN(derivePayslip(e).gross) },
            { label: "PAYE", num: true, render: (e) => fmtN(derivePayslip(e).paye) },
            { label: "NSSF (5%)", num: true, render: (e) => fmtN(derivePayslip(e).nssfEmp) },
            { label: "Net", num: true, render: (e) => fmtN(derivePayslip(e).net) },
            { label: "Cost to co.", num: true, render: (e) => fmtN(derivePayslip(e).costToCompany) },
          ]}
          rows={emps}
          empty="No active staff."
        />
      </Card>
    </>
  );
}

/* ========================= Settings Management ========================= */
function Switch({ on, onClick, disabled }) {
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ width: 34, height: 20, borderRadius: 20, border: "none", padding: 0, background: on ? "var(--success)" : "var(--border-strong)", position: "relative", flex: "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1 }}>
      <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .14s", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
    </button>
  );
}

function SettingsView({ ctx }) {
  const s = ctx.store.settings;
  const [tab, setTab] = useState("general");
  if (!s) return null;
  const readOnly = !canDo(ctx, "manageSettings");
  const tabs = [["general", "General", Building], ["departments", "Departments", Building2], ["roles", "Roles & Permissions", ShieldCheckIcon], ["announcements", "Announcements", Megaphone]];
  return (
    <>
      <div style={{ display: "inline-flex", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 3, gap: 3, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, background: tab === id ? "var(--bg-elevated)" : "transparent", color: tab === id ? "var(--text)" : "var(--text-2)", boxShadow: tab === id ? "var(--shadow)" : "none" }}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>
      {readOnly && <Banner Icon={ShieldQuestion}>Your role has read-only access to settings. Ask an administrator to make changes.</Banner>}
      {tab === "general" && <SettingsGeneral ctx={ctx} readOnly={readOnly} />}
      {tab === "departments" && <SettingsDepartments ctx={ctx} readOnly={readOnly} />}
      {tab === "roles" && <SettingsRoles ctx={ctx} readOnly={readOnly} />}
      {tab === "announcements" && <SettingsAnnouncements ctx={ctx} readOnly={readOnly} />}
    </>
  );
}

// Departments & positions manager — admin adds/removes departments and, within
// each, adds/removes positions. Drives the department + job-title pickers on the
// employee form. Persisted to settings.departments.
function SettingsDepartments({ ctx, readOnly }) {
  const s = ctx.store.settings;
  const [depts, setDepts] = useState(() => JSON.parse(JSON.stringify(s.departments || [])));
  const [newDept, setNewDept] = useState("");
  const [newPos, setNewPos] = useState({});
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(depts) !== JSON.stringify(s.departments || []);
  const empCount = (name) => (ctx.store.employees || []).filter((e) => e.department === name && e.status !== "Terminated").length;

  const save = async () => { await settingsApi.update({ departments: depts }); await ctx.reload(); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const addDept = () => {
    const name = newDept.trim();
    if (!name) return;
    if (depts.some((d) => d.name.toLowerCase() === name.toLowerCase())) return alert("A department with that name already exists.");
    setDepts([...depts, { id: `dept-${Date.now().toString(36)}`, name, positions: [] }]);
    setNewDept("");
  };
  const removeDept = (i) => {
    const d = depts[i];
    if (empCount(d.name) > 0) return alert(`${d.name} still has ${empCount(d.name)} active staff assigned. Reassign them first.`);
    if (window.confirm(`Remove the “${d.name}” department?`)) setDepts(depts.filter((_, idx) => idx !== i));
  };
  const renameDept = (i, name) => setDepts(depts.map((d, idx) => idx === i ? { ...d, name } : d));
  const addPos = (i) => {
    const p = (newPos[i] || "").trim();
    if (!p) return;
    if (depts[i].positions.some((x) => x.toLowerCase() === p.toLowerCase())) return;
    setDepts(depts.map((d, idx) => idx === i ? { ...d, positions: [...d.positions, p] } : d));
    setNewPos({ ...newPos, [i]: "" });
  };
  const removePos = (i, p) => setDepts(depts.map((d, idx) => idx === i ? { ...d, positions: d.positions.filter((x) => x !== p) } : d));

  return (
    <>
      <Banner Icon={Building2}>Departments &amp; positions for the organisation. Positions listed here appear as job-title options on each staff record. Add a department or position any time — changes take effect once you save.</Banner>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {depts.map((d, i) => (
          <Card key={d.id || i} style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <Building2 size={18} style={{ color: "var(--accent)", flex: "none" }} />
              <Input value={d.name} onChange={(e) => renameDept(i, e.target.value)} disabled={readOnly} style={{ fontWeight: 700, fontSize: 14, maxWidth: 460 }} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{d.positions.length} position{d.positions.length === 1 ? "" : "s"} · {empCount(d.name)} staff</span>
              <div style={{ flex: 1 }} />
              {!readOnly && <Btn size="sm" variant="danger" onClick={() => removeDept(i)}><Trash2 size={13} />Remove department</Btn>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: readOnly ? 0 : 10 }}>
              {d.positions.map((p) => (
                <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 20, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
                  {p}
                  {!readOnly && <button type="button" onClick={() => removePos(i, p)} title="Remove position" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", padding: 0, fontSize: 15, lineHeight: 1 }}>×</button>}
                </span>
              ))}
              {d.positions.length === 0 && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>No positions yet.</span>}
            </div>
            {!readOnly && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Input value={newPos[i] || ""} onChange={(e) => setNewPos({ ...newPos, [i]: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPos(i); } }}
                  placeholder="Add a position…" style={{ maxWidth: 320 }} />
                <Btn size="sm" onClick={() => addPos(i)}><Plus size={14} />Add position</Btn>
              </div>
            )}
          </Card>
        ))}
      </div>
      {!readOnly && (
        <Card style={{ padding: 16, marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Add a department</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Input value={newDept} onChange={(e) => setNewDept(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDept(); } }}
              placeholder="New department name…" style={{ maxWidth: 420 }} />
            <Btn onClick={addDept}><Plus size={15} />Add department</Btn>
          </div>
        </Card>
      )}
      {!readOnly && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <Btn variant="primary" disabled={!dirty} onClick={save}><Check size={15} />Save changes</Btn>
          {saved && <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>Saved.</span>}
          {dirty && !saved && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Unsaved changes</span>}
        </div>
      )}
    </>
  );
}

function SettingsGeneral({ ctx, readOnly }) {
  const s = ctx.store.settings;
  const [c, setC] = useState({ ...s.company });
  const [p, setP] = useState({ ...s.payroll });
  const [saved, setSaved] = useState(false);
  const setCo = (k) => (e) => { setC({ ...c, [k]: e.target.value }); setSaved(false); };
  const setPa = (k) => (e) => { setP({ ...p, [k]: e.target.value }); setSaved(false); };
  const save = async () => {
    const payroll = { ...p, nssfEmp: Number(p.nssfEmp) || 0, nssfEr: Number(p.nssfEr) || 0, wht: Number(p.wht) || 0, vat: Number(p.vat) || 0, payDay: Number(p.payDay) || 1 };
    await settingsApi.update({ company: c, payroll });
    setReportCompany(c);
    await ctx.reload(); setSaved(true);
  };
  return (
    <>
      <Banner Icon={Building}>Company profile appears on the report letterhead; statutory rates drive PAYE/NSSF and supplier WHT/VAT calculations across payroll. Changes take effect immediately — no developer needed.</Banner>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="rep-cols">
        <Card>
          <CardHead title="Company profile" />
          <div style={{ padding: 20, display: "grid", gap: 12 }}>
            <Field label="Company name"><Input value={c.name || ""} onChange={setCo("name")} disabled={readOnly} /></Field>
            <Field label="Tagline"><Input value={c.tagline || ""} onChange={setCo("tagline")} disabled={readOnly} /></Field>
            <Field label="Postal address"><Input value={c.address || ""} onChange={setCo("address")} disabled={readOnly} /></Field>
            <Field label="Tel / fax"><Input value={c.telephone || ""} onChange={setCo("telephone")} disabled={readOnly} /></Field>
            <Field label="Cell"><Input value={c.cell || ""} onChange={setCo("cell")} disabled={readOnly} /></Field>
            <Field label="Email"><Input value={c.email || ""} onChange={setCo("email")} disabled={readOnly} /></Field>
          </div>
        </Card>
        <Card>
          <CardHead title="Statutory rates & payroll" />
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="NSSF employee (%)"><Input type="number" value={p.nssfEmp} onChange={setPa("nssfEmp")} disabled={readOnly} /></Field>
            <Field label="NSSF employer (%)"><Input type="number" value={p.nssfEr} onChange={setPa("nssfEr")} disabled={readOnly} /></Field>
            <Field label="Supplier WHT (%)"><Input type="number" value={p.wht} onChange={setPa("wht")} disabled={readOnly} /></Field>
            <Field label="VAT (%)"><Input type="number" value={p.vat} onChange={setPa("vat")} disabled={readOnly} /></Field>
            <Field label="Pay day (of month)"><Input type="number" value={p.payDay} onChange={setPa("payDay")} disabled={readOnly} /></Field>
            <Field label="Currency"><Input value={p.currency || ""} onChange={setPa("currency")} disabled={readOnly} /></Field>
            <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--muted)" }}>PAYE follows URA bands automatically. NSSF and supplier WHT/VAT use the percentages above.</div>
          </div>
        </Card>
      </div>
      {!readOnly && <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <Btn variant="primary" onClick={save}><Check size={15} />Save settings</Btn>
        {saved && <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>✓ Saved — applied across the system</span>}
      </div>}
    </>
  );
}

function SettingsRoles({ ctx, readOnly }) {
  const [roles, setRoles] = useState(() => JSON.parse(JSON.stringify(ctx.store.settings.roles || [])));
  const [saved, setSaved] = useState(false);
  const dirty = () => setSaved(false);
  const toggleMod = (ri, key) => { const r = roles[ri]; if (r.system && r.id === "admin") return; const copy = [...roles]; copy[ri] = { ...r, modules: { ...r.modules, [key]: !r.modules[key] } }; setRoles(copy); dirty(); };
  const toggleAct = (ri, key) => { const r = roles[ri]; if (r.system && r.id === "admin") return; const copy = [...roles]; copy[ri] = { ...r, actions: { ...r.actions, [key]: !r.actions[key] } }; setRoles(copy); dirty(); };
  const addRole = () => { const id = "role-" + Date.now().toString(36).slice(-4); setRoles([...roles, { id, name: "New role", description: "", modules: Object.fromEntries(PERMISSION_MODULES.map(([k]) => [k, k === "dashboard"])), actions: Object.fromEntries(PERMISSION_ACTIONS.map(([k]) => [k, false])) }]); dirty(); };
  const rename = (ri, v) => { const copy = [...roles]; copy[ri] = { ...copy[ri], name: v }; setRoles(copy); dirty(); };
  const removeRole = (ri) => { if (roles[ri].system) return; if (window.confirm(`Delete the “${roles[ri].name}” role?`)) { setRoles(roles.filter((_, i) => i !== ri)); dirty(); } };
  const save = async () => { await settingsApi.update({ roles }); await ctx.reload(); setSaved(true); };

  return (
    <>
      <Banner Icon={ShieldCheckIcon}>Define roles and exactly what each can see and do. Module access controls the sidebar; actions gate key operations. The <b>Administrator</b> role always keeps full access. Assign a role to a staff member on their employee record.</Banner>
      {!readOnly && <Toolbar><div style={{ flex: 1 }} /><Btn onClick={addRole}><Plus size={15} />Add role</Btn></Toolbar>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {roles.map((r, ri) => (
          <Card key={r.id}>
            <CardHead title={<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {readOnly || r.system ? <span style={{ fontWeight: 700 }}>{r.name}</span> : <Input value={r.name} onChange={(e) => rename(ri, e.target.value)} style={{ width: 200, fontWeight: 700 }} />}
              {r.system && <Pill tone="muted">System</Pill>}
              {r.portalOnly && <Pill tone="info">Portal only</Pill>}
            </div>} right={!readOnly && !r.system ? <Btn size="sm" variant="danger" onClick={() => removeRole(ri)}><Trash2 size={13} />Delete</Btn> : null} />
            <div style={{ padding: "16px 20px" }}>
              {r.description && <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 14 }}>{r.description}</div>}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Module access</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "6px 16px", marginBottom: 16 }}>
                {PERMISSION_MODULES.map(([key, label]) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--text)" }}>
                    <Switch on={r.portalOnly ? false : r.modules?.[key] !== false} onClick={() => toggleMod(ri, key)} disabled={readOnly || r.portalOnly || (r.system && r.id === "admin")} />
                    {label}
                  </label>
                ))}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "6px 16px" }}>
                {PERMISSION_ACTIONS.map(([key, label]) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--text)" }}>
                    <Switch on={r.portalOnly ? false : r.actions?.[key] !== false} onClick={() => toggleAct(ri, key)} disabled={readOnly || r.portalOnly || (r.system && r.id === "admin")} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {!readOnly && <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <Btn variant="primary" onClick={save}><Check size={15} />Save roles & permissions</Btn>
        {saved && <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>}
      </div>}
    </>
  );
}

function SettingsAnnouncements({ ctx, readOnly }) {
  const list = [...(ctx.store.settings.announcements || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const persist = async (arr) => { await settingsApi.update({ announcements: arr }); await ctx.reload(); };
  const toggle = (a) => persist((ctx.store.settings.announcements || []).map((x) => x.id === a.id ? { ...x, active: !x.active } : x));
  const remove = (a) => { if (window.confirm(`Delete announcement “${a.title}”?`)) persist((ctx.store.settings.announcements || []).filter((x) => x.id !== a.id)); };
  const audienceTone = { all: "brand", staff: "info", admin: "accent" };
  return (
    <>
      <Banner Icon={Megaphone}>Post announcements to the whole company or a specific audience. Active announcements appear on the dashboard and, for staff-facing ones, in the staff portal.</Banner>
      {!readOnly && <Toolbar><div style={{ flex: 1 }} /><Btn variant="primary" onClick={() => ctx.setModal(() => (cc) => <AnnouncementForm ctx={cc} />)}><Plus size={15} />New announcement</Btn></Toolbar>}
      <Card>
        <DataTable
          columns={[
            { label: "Title", render: (a) => <div><div style={{ fontWeight: 600, color: "var(--text)" }}>{a.title}</div><div style={{ fontSize: 12, color: "var(--text-2)", maxWidth: 460, whiteSpace: "normal" }}>{a.body}</div></div> },
            { label: "Audience", render: (a) => <Pill tone={audienceTone[a.audience] || "muted"}>{a.audience === "all" ? "Everyone" : a.audience === "staff" ? "Staff" : "Admins"}</Pill> },
            { label: "Date", render: (a) => fmtDate(a.date) },
            { label: "Active", render: (a) => <Switch on={a.active} onClick={() => toggle(a)} disabled={readOnly} /> },
            { label: "", render: (a) => readOnly ? null : (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <Btn size="sm" onClick={() => ctx.setModal(() => (cc) => <AnnouncementForm ctx={cc} id={a.id} />)}><Pencil size={13} /></Btn>
                <Btn size="sm" variant="danger" onClick={() => remove(a)}><Trash2 size={13} /></Btn>
              </div>
            ) },
          ]}
          rows={list}
          empty="No announcements yet."
        />
      </Card>
    </>
  );
}

function AnnouncementForm({ ctx, id }) {
  const existing = id ? (ctx.store.settings.announcements || []).find((a) => a.id === id) : null;
  const [f, setF] = useState(existing || { title: "", body: "", date: TODAY, audience: "all", active: true });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.title.trim()) return alert("Title is required.");
    const cur = ctx.store.settings.announcements || [];
    let next;
    if (existing) next = cur.map((a) => a.id === id ? { ...a, ...f } : a);
    else next = [...cur, { ...f, id: "ANN-" + Date.now().toString(36).toUpperCase().slice(-6), active: true }];
    await settingsApi.update({ announcements: next });
    await ctx.reload(); ctx.setModal(null);
  };
  return (
    <Modal title={existing ? "Edit announcement" : "New announcement"} sub="Shown on the dashboard / staff portal" onClose={() => ctx.setModal(null)}
      footer={<><Btn onClick={() => ctx.setModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submit}><Check size={15} />{existing ? "Save" : "Post announcement"}</Btn></>}>
      <div style={formGrid}>
        <Field label="Title" required full><Input value={f.title} onChange={set("title")} placeholder="e.g. Payroll cut-off this month" /></Field>
        <Field label="Message" full><Textarea value={f.body} onChange={set("body")} placeholder="Announcement details…" /></Field>
        <Field label="Audience"><Select value={f.audience} onChange={set("audience")} options={[{ value: "all", label: "Everyone" }, { value: "staff", label: "Staff portal" }, { value: "admin", label: "Admins only" }]} /></Field>
        <Field label="Date"><Input type="date" value={f.date} onChange={set("date")} /></Field>
      </div>
    </Modal>
  );
}

// Active announcements banner for a given audience ("admin" or "staff").
function Announcements({ ctx, audience }) {
  const list = ((ctx.store.settings && ctx.store.settings.announcements) || []).filter((a) => a.active && (a.audience === "all" || a.audience === audience));
  if (!list.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
      {list.map((a) => (
        <div key={a.id} style={{ display: "flex", gap: 12, padding: "13px 16px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "linear-gradient(90deg, var(--accent-dim), var(--bg-elevated))" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: "var(--accent)", color: "var(--accent-ink)" }}><Megaphone size={17} /></div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)" }}>{a.title} <span style={{ fontWeight: 400, fontSize: 11.5, color: "var(--muted)" }}>· {fmtDate(a.date)}</span></div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 2 }}>{a.body}</div>
          </div>
        </div>
      ))}
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
