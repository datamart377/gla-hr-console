/* -------------------------------------------------------------------------
   In-memory data store + derived helpers.

   Single source of truth for the front-end demo prototype. In production the
   API client would fetch these records from the Express backend; here the
   client (src/api/client.js) reads and writes this object directly so the
   prototype runs with no server.

   Reference: Global Link Associates Ltd — engineering services, Kampala.
   Statutory figures use Uganda URA monthly PAYE bands + NSSF (5% + 10%).
   ------------------------------------------------------------------------- */

const _now = new Date();
export const TODAY = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;

export const DEPARTMENTS = [
  "Power Systems", "HVAC & Refrigeration", "Electrical Installation",
  "Petroleum Equipment", "Civil & Construction", "Finance", "Administration",
  "ICT",
];
export const CONTRACT_TYPES = ["Permanent", "Fixed-term", "Casual"];
export const EMP_STATUSES = ["Active", "On Leave", "Suspended", "Terminated"];
export const MARITAL_STATUSES = ["single", "married", "divorced", "widowed", "N/A"];
export const TERMS_TYPES = ["confirmed-contract", "probation", "temporary", "contract", "permanent"];
export const QUALIFICATION_TYPES = ["CERTIFICATE", "DIPLOMA", "DEGREE", "MASTERS", "PHD", "OTHER"];
export const APPROVAL_STATES = ["Pending Approval", "Approved", "Rejected"];
export const SITES = [
  "Head Office — Gaba Rd", "TotalEnergies Kireka", "Umeme Substation, Lugogo",
  "Shell Nakawa", "NWSC Ggaba Works", "Client Site — Namanve",
];

// Uganda statutory leave (Employment Act 2006) — working-day entitlements
export const LEAVE_TYPES = {
  Annual: { entitlement: 21, paid: true },
  Sick: { entitlement: 30, paid: true },
  Maternity: { entitlement: 60, paid: true },
  Paternity: { entitlement: 4, paid: true },
  Study: { entitlement: 10, paid: true },
  Sabbatical: { entitlement: 0, paid: false },
  Compassionate: { entitlement: 0, paid: true },
  "Official Travel": { entitlement: 0, paid: true, duty: true },
  Unpaid: { entitlement: 0, paid: false },
};

// Colours for the leave rota / roster bars and type tags.
export const LEAVE_COLORS = {
  Annual: "#2f6f9f", Sick: "#c23a29", Maternity: "#c85a7d", Paternity: "#8a5cc8",
  Study: "#2f9f8f", Sabbatical: "#98690f", Compassionate: "#5a7fd6",
  "Official Travel": "#12894e", Unpaid: "#8b95a1",
};

export const APPRAISAL_METRICS = [
  ["technical", "Technical skill"],
  ["safety", "Safety compliance"],
  ["teamwork", "Teamwork"],
  ["punctuality", "Punctuality"],
  ["delivery", "Delivery"],
];

// Schema descriptors for the repeatable staff-file sections (used by the
// edit form's generic repeater and to document each record's shape).
export const REPEATER_SCHEMAS = {
  academicQualifications: [
    { key: "title", label: "Qualification", width: 2 },
    { key: "institution", label: "Institution", width: 2 },
    { key: "awardDate", label: "Award date", type: "date" },
    { key: "type", label: "Type", type: "select", options: QUALIFICATION_TYPES },
    { key: "highest", label: "Highest?", type: "select", options: ["No", "Yes"] },
    { key: "status", label: "Status", type: "select", options: APPROVAL_STATES },
  ],
  bankDetails: [
    { key: "bankName", label: "Bank", width: 2 },
    { key: "accountName", label: "Account name", width: 2 },
    { key: "accountNumber", label: "Account number" },
    { key: "branch", label: "Branch" },
  ],
  employmentHistory: [
    { key: "position", label: "Position", width: 2 },
    { key: "employer", label: "Employer", width: 2 },
    { key: "startDate", label: "Start", type: "date" },
    { key: "endDate", label: "End", type: "date" },
  ],
  professionalSpecialization: [
    { key: "area", label: "Specialization", width: 2 },
    { key: "institution", label: "Institution", width: 2 },
    { key: "year", label: "Year" },
  ],
  professionalMembership: [
    { key: "organization", label: "Organization", width: 2 },
    { key: "membershipNumber", label: "Membership no." },
    { key: "dateJoined", label: "Date joined", type: "date" },
    { key: "status", label: "Status" },
  ],
  children: [
    { key: "name", label: "Name", width: 2 },
    { key: "relationship", label: "Relationship" },
    { key: "dob", label: "Date of birth", type: "date" },
    { key: "gender", label: "Gender", type: "select", options: ["Female", "Male"] },
  ],
  nextOfKin: [
    { key: "surname", label: "Surname" },
    { key: "otherNames", label: "Other names" },
    { key: "relationship", label: "Relationship" },
    { key: "contact", label: "Contact" },
    { key: "address", label: "Address" },
  ],
};

export const data = {
  employees: [
    { id: "GLA-001", firstName: "Robert", lastName: "Okello", gender: "Male", dob: "1984-03-12", nationalId: "CM840121001AB", phone: "+256 772 413 501", email: "r.okello@glassociates.co.ug", address: "Ntinda, Kampala", department: "Engineering Department", jobTitle: "Director Engineering", contractType: "Permanent", employmentDate: "2013-06-01", status: "Active", grossSalary: 4200000, nssfNumber: "NSSF-0113501", tin: "1000345678", bankName: "Stanbic Bank", bankAccount: "9030001234501", emergencyName: "Alice Okello", emergencyPhone: "+256 701 220 145", emergencyRelation: "Spouse", annualUsed: 6, sickUsed: 2,
      fileNumber: "RO.84.13.0112", position: "Director Engineering, Engineering Department",
      maritalStatus: "married", religion: "Christian", disability: "None",
      origin: { region: "Northern", district: "Gulu", county: "Aswa", village: "Laroo" },
      residence: { district: "Kampala", county: "Nakawa", subCounty: "Ntinda", parish: "Kigoowa", village: "Kiwatule" },
      contact: { postalAddress: "P.O. Box 100, Kampala", telephone: "+256 772 413 501", mobile: "+256 701 220 100", email: "r.okello@glassociates.co.ug", district: "Kampala" },
      terms: { terms: "permanent", startDate: "2013-06-01", endDate: "", entrySalary: "GLA-E4", appointmentAuthority: "Board of Directors", sourceOfPayment: "Company Payroll" },
      bankDetails: [{ bankName: "Stanbic Bank", accountName: "Robert Okello", accountNumber: "9030001234501", branch: "Garden City" }],
      academicQualifications: [
        { title: "BSc Electrical Engineering", institution: "Makerere University", awardDate: "2008-01-15", type: "DEGREE", highest: "Yes", status: "Approved" },
        { title: "Chartered Engineer (CEng)", institution: "Engineers Registration Board", awardDate: "2015-06-20", type: "CERTIFICATE", highest: "No", status: "Approved" },
      ],
      employmentHistory: [{ position: "Electrical Engineer", employer: "Umeme Ltd", startDate: "2009-02-01", endDate: "2013-05-30" }],
      professionalMembership: [{ organization: "Uganda Institution of Professional Engineers", membershipNumber: "UIPE-2214", dateJoined: "2014-03-01", status: "Active" }],
      children: [{ name: "Daniel Okello", relationship: "SON", dob: "2014-09-12", gender: "Male" }],
      nextOfKin: [{ surname: "Okello", otherNames: "Alice", relationship: "SPOUSE", contact: "+256 701 220 145", address: "Ntinda, Kampala" }] },
    { id: "GLA-002", firstName: "Sarah", lastName: "Nakato", gender: "Female", dob: "1988-11-02", nationalId: "CF881102045CD", phone: "+256 782 909 220", email: "s.nakato@glassociates.co.ug", address: "Muyenga, Kampala", department: "Human Resources & Sales and Marketing Department", jobTitle: "HR & Admin Manager", contractType: "Permanent", employmentDate: "2015-02-16", status: "Active", grossSalary: 3600000, nssfNumber: "NSSF-0209220", tin: "1000456781", bankName: "Centenary Bank", bankAccount: "3100456789012", emergencyName: "John Nakato", emergencyPhone: "+256 772 118 900", emergencyRelation: "Brother", annualUsed: 9, sickUsed: 0,
      maritalStatus: "married", religion: "Muslim",
      academicQualifications: [{ title: "MBA Human Resource Management", institution: "Uganda Management Institute", awardDate: "2016-11-10", type: "MASTERS", highest: "Yes", status: "Approved" }],
      children: [{ name: "Amina Nakato", relationship: "DAUGHTER", dob: "2017-04-03", gender: "Female" }],
      nextOfKin: [{ surname: "Nakato", otherNames: "John", relationship: "BROTHER", contact: "+256 772 118 900", address: "Muyenga, Kampala" }] },
    { id: "GLA-003", firstName: "Grace", lastName: "Auma", gender: "Female", dob: "1990-07-19", nationalId: "CF900719077EF", phone: "+256 700 551 034", email: "g.auma@glassociates.co.ug", address: "Bukoto, Kampala", department: "Human Resources & Sales and Marketing Department", jobTitle: "Accountant", contractType: "Permanent", employmentDate: "2017-09-04", status: "Active", grossSalary: 2900000, nssfNumber: "NSSF-0351034", tin: "1000567812", bankName: "Stanbic Bank", bankAccount: "9030007788110", emergencyName: "Peter Auma", emergencyPhone: "+256 758 300 221", emergencyRelation: "Father", annualUsed: 3, sickUsed: 5,
      maritalStatus: "single",
      academicQualifications: [{ title: "ACCA", institution: "ACCA Global", awardDate: "2019-03-12", type: "CERTIFICATE", highest: "Yes", status: "Approved" }] },
    { id: "GLA-004", firstName: "David", lastName: "Mugisha", gender: "Male", dob: "1986-01-28", nationalId: "CM860128033GH", phone: "+256 772 660 908", email: "d.mugisha@glassociates.co.ug", address: "Kireka, Wakiso", department: "Engineering Department", jobTitle: "Service Engineer", contractType: "Permanent", employmentDate: "2016-05-10", status: "On Leave", grossSalary: 2450000, nssfNumber: "NSSF-0460908", tin: "1000678123", bankName: "Absa Bank", bankAccount: "6009123400567", emergencyName: "Ruth Mugisha", emergencyPhone: "+256 703 880 552", emergencyRelation: "Spouse", annualUsed: 14, sickUsed: 1,
      maritalStatus: "married",
      nextOfKin: [{ surname: "Mugisha", otherNames: "Ruth", relationship: "SPOUSE", contact: "+256 703 880 552", address: "Kireka, Wakiso" }] },
    { id: "GLA-005", firstName: "Joseph", lastName: "Ssekandi", gender: "Male", dob: "1993-09-06", nationalId: "CM930906088IJ", phone: "+256 704 231 776", email: "j.ssekandi@glassociates.co.ug", address: "Nabweru, Wakiso", department: "Engineering Department", jobTitle: "Workshop Technician", contractType: "Fixed-term", employmentDate: "2021-03-01", status: "Active", grossSalary: 1650000, nssfNumber: "NSSF-0531776", tin: "1000789234", bankName: "Equity Bank", bankAccount: "1001234567890", emergencyName: "Mary Ssekandi", emergencyPhone: "+256 772 445 019", emergencyRelation: "Mother", annualUsed: 5, sickUsed: 0, maritalStatus: "single" },
    { id: "GLA-006", firstName: "Peter", lastName: "Wanyama", gender: "Male", dob: "1995-12-15", nationalId: "CM951215099KL", phone: "+256 758 110 442", email: "p.wanyama@glassociates.co.ug", address: "Kyaliwajjala, Wakiso", department: "Engineering Department", jobTitle: "Field Service Technician", contractType: "Permanent", employmentDate: "2019-07-22", status: "Active", grossSalary: 1350000, nssfNumber: "NSSF-0610442", tin: "1000890345", bankName: "Centenary Bank", bankAccount: "3100998877665", emergencyName: "Esther Wanyama", emergencyPhone: "+256 701 556 210", emergencyRelation: "Sister", annualUsed: 11, sickUsed: 3, maritalStatus: "married" },
    { id: "GLA-007", firstName: "Mary", lastName: "Nabirye", gender: "Female", dob: "1991-04-23", nationalId: "CF910423055MN", phone: "+256 772 004 118", email: "m.nabirye@glassociates.co.ug", address: "Najjera, Wakiso", department: "Human Resources & Sales and Marketing Department", jobTitle: "Sales & Marketing Officers", contractType: "Permanent", employmentDate: "2018-11-05", status: "Active", grossSalary: 1950000, nssfNumber: "NSSF-0704118", tin: "1000901456", bankName: "DFCU Bank", bankAccount: "0104556677889", emergencyName: "Samuel Nabirye", emergencyPhone: "+256 704 991 300", emergencyRelation: "Spouse", annualUsed: 2, sickUsed: 1, maritalStatus: "married" },
    { id: "GLA-008", firstName: "Isaac", lastName: "Tumwine", gender: "Male", dob: "1992-08-30", nationalId: "CM920830066OP", phone: "+256 706 778 210", email: "i.tumwine@glassociates.co.ug", address: "Namanve, Mukono", department: "Engineering Department", jobTitle: "Field Service Engineer", contractType: "Casual", employmentDate: "2022-02-14", status: "Active", grossSalary: 1200000, nssfNumber: "NSSF-0788210", tin: "1001012567", bankName: "Equity Bank", bankAccount: "1009988776655", emergencyName: "Betty Tumwine", emergencyPhone: "+256 772 660 004", emergencyRelation: "Spouse", annualUsed: 8, sickUsed: 0, maritalStatus: "married" },
    // Fully-populated exemplar staff file (mirrors the reference Electronic Staff File layout).
    { id: "GLA-009", firstName: "Juma", lastName: "Katongole", gender: "Male", dob: "1986-11-25", nationalId: "CM86024101F9CK", phone: "+256 702 278 793", email: "juma.katongole@mak.ac.ug", address: "Kampala", department: "Engineering Department", jobTitle: "Technical Support Staff", contractType: "Fixed-term", employmentDate: "2012-06-01", status: "Active", grossSalary: 3800000, nssfNumber: "N/A", tin: "N/A", bankName: "", bankAccount: "", emergencyName: "Nandyose Linah", emergencyPhone: "0774557554", emergencyRelation: "Spouse", annualUsed: 4, sickUsed: 0,
      fileNumber: "KJ.86.12.0567",
      position: "Technical Support Staff, Engineering Department",
      maritalStatus: "married", religion: "N/A", disability: "None", nationality: "Uganda",
      origin: { region: "N/A", district: "MASAKA", county: "N/A", village: "N/A" },
      residence: { district: "N/A", county: "N/A", subCounty: "N/A", parish: "N/A", village: "N/A" },
      contact: { postalAddress: "", telephone: "702278793", mobile: "N/A", email: "", district: "" },
      terms: { terms: "confirmed-contract", startDate: "2022-10-03", endDate: "2026-10-02", entrySalary: "PU5", appointmentAuthority: "Appointments Board", sourceOfPayment: "IPPS" },
      bankDetails: [],
      employmentHistory: [],
      academicQualifications: [
        { title: "Project Management Professional (PMP)®", institution: "Project Management Institute", awardDate: "2026-01-10", type: "CERTIFICATE", highest: "", status: "Pending Approval" },
        { title: "Oracle Autonomous Database Cloud 2019 Certified Specialist", institution: "Oracle University", awardDate: "2022-07-22", type: "CERTIFICATE", highest: "No", status: "Pending Approval" },
        { title: "Troubleshooting I.T Remote Administration", institution: "LinkedIn Learning", awardDate: "2022-03-07", type: "CERTIFICATE", highest: "No", status: "Pending Approval" },
      ],
      professionalSpecialization: [],
      professionalMembership: [],
      children: [
        { name: "Lashira Katongole", relationship: "DAUGHTER", dob: "2018-10-18", gender: "Female" },
        { name: "Raudhah Katongole", relationship: "DAUGHTER", dob: "2020-05-20", gender: "Female" },
        { name: "Katongole Labibah", relationship: "DAUGHTER", dob: "", gender: "Female" },
      ],
      nextOfKin: [
        { surname: "NANDYOSE", otherNames: "LINAH", relationship: "SPOUSE", contact: "0774557554", address: "N/A" },
        { surname: "NAMPIJJA", otherNames: "SARAH", relationship: "SISTER", contact: "0706892304", address: "N/A" },
      ] },
  ],
  leave: [
    { id: "LR-1041", empId: "GLA-004", type: "Annual", startDate: "2026-09-01", endDate: "2026-09-09", days: 7, reason: "Family travel to Mbarara.", status: "Approved", requestedAt: "2026-08-20", decidedBy: "Sarah Nakato", decidedAt: "2026-08-22" },
    { id: "LR-1042", empId: "GLA-006", type: "Sick", startDate: "2026-09-04", endDate: "2026-09-05", days: 2, reason: "Malaria — clinic note attached.", status: "Pending", requestedAt: "2026-09-03", decidedBy: "", decidedAt: "" },
    { id: "LR-1043", empId: "GLA-001", type: "Annual", startDate: "2026-09-22", endDate: "2026-09-26", days: 5, reason: "Annual leave balance clearance.", status: "Pending", requestedAt: "2026-09-02", decidedBy: "", decidedAt: "" },
    { id: "LR-1044", empId: "GLA-003", type: "Compassionate", startDate: "2026-08-27", endDate: "2026-08-28", days: 2, reason: "Bereavement — immediate family.", status: "Approved", requestedAt: "2026-08-26", decidedBy: "Sarah Nakato", decidedAt: "2026-08-26" },
    { id: "LR-1045", empId: "GLA-005", type: "Unpaid", startDate: "2026-10-05", endDate: "2026-10-16", days: 10, reason: "Personal — extended.", status: "Rejected", requestedAt: "2026-08-30", decidedBy: "Sarah Nakato", decidedAt: "2026-08-31" },
    { id: "LR-1046", empId: "GLA-002", type: "Study", startDate: "2026-09-14", endDate: "2026-09-18", days: 5, reason: "CIPS exam preparation.", status: "Approved", requestedAt: "2026-09-01", decidedBy: "Sarah Nakato", decidedAt: "2026-09-02", returnedAt: "" },
    { id: "LR-1047", empId: "GLA-009", type: "Official Travel", startDate: "2026-09-08", endDate: "2026-09-10", days: 3, reason: "Site assessment — Gulu regional office.", status: "Approved", requestedAt: "2026-09-04", decidedBy: "Sarah Nakato", decidedAt: "2026-09-04", returnedAt: "2026-09-11" },
    { id: "LR-1048", empId: "GLA-007", type: "Sabbatical", startDate: "2026-11-01", endDate: "2027-01-31", days: 65, reason: "Approved 3-month sabbatical.", status: "Approved", requestedAt: "2026-08-15", decidedBy: "Sarah Nakato", decidedAt: "2026-08-18", returnedAt: "" },
  ],
  attendance: [
    { id: "AT-9001", empId: "GLA-001", date: "2026-09-03", clockIn: "08:02", clockOut: "17:14", site: "Head Office — Gaba Rd", status: "Present", overtime: 0, lat: 0.28035, lng: 32.61805, accuracy: 11, geoSite: "Head Office — Gaba Rd", withinFence: true, distanceM: 8, method: "GPS" },
    { id: "AT-9002", empId: "GLA-006", date: "2026-09-03", clockIn: "07:41", clockOut: "18:35", site: "Umeme Substation, Lugogo", status: "Field", overtime: 1.5, lat: 0.33012, lng: 32.60018, accuracy: 19, geoSite: "Umeme Substation, Lugogo", withinFence: true, distanceM: 14, method: "GPS" },
    { id: "AT-9003", empId: "GLA-005", date: "2026-09-03", clockIn: "08:20", clockOut: "17:05", site: "Client Site — Namanve", status: "Field", overtime: 0, lat: 0.36618, lng: 32.70012, accuracy: 23, geoSite: "Client Site — Namanve", withinFence: true, distanceM: 12, method: "GPS" },
    { id: "AT-9004", empId: "GLA-003", date: "2026-09-03", clockIn: "08:00", clockOut: "17:00", site: "Head Office — Gaba Rd", status: "Present", overtime: 0, lat: 0.28024, lng: 32.61792, accuracy: 9, geoSite: "Head Office — Gaba Rd", withinFence: true, distanceM: 11, method: "GPS" },
    { id: "AT-9005", empId: "GLA-008", date: "2026-09-03", clockIn: "07:30", clockOut: "16:20", site: "Client Site — Namanve", status: "Field", overtime: 0, lat: 0.36631, lng: 32.70008, accuracy: 17, geoSite: "Client Site — Namanve", withinFence: true, distanceM: 16, method: "GPS" },
    { id: "AT-9006", empId: "GLA-007", date: "2026-09-03", clockIn: "08:34", clockOut: "", site: "Head Office — Gaba Rd", status: "Half-day", overtime: 0, lat: 0.28600, lng: 32.62400, accuracy: 28, geoSite: "Head Office — Gaba Rd", withinFence: false, distanceM: 918, method: "GPS" },
  ],
  appraisals: [
    { id: "AP-501", empId: "GLA-006", period: "H1 2026", reviewer: "Robert Okello", technical: 5, safety: 4, teamwork: 4, punctuality: 3, delivery: 5, comments: "Strong on three-phase installations; improve timekeeping on early call-outs.", date: "2026-07-10" },
    { id: "AP-502", empId: "GLA-004", period: "H1 2026", reviewer: "Sarah Nakato", technical: 5, safety: 5, teamwork: 5, punctuality: 4, delivery: 4, comments: "Excellent supervision of petroleum dispensing maintenance crews.", date: "2026-07-12" },
  ],
};

/* --------------------- staff-file shape normalization --------------------- */
// Every employee is guaranteed the full staff-file shape, so the UI never has
// to guard against missing nested sections. Records above only spell out the
// fields that differ from these defaults.
const staffDefaults = () => ({
  fileNumber: "", position: "", nationality: "Uganda", maritalStatus: "N/A",
  religion: "N/A", disability: "None",
  origin: { region: "N/A", district: "N/A", county: "N/A", village: "N/A" },
  residence: { district: "N/A", county: "N/A", subCounty: "N/A", parish: "N/A", village: "N/A" },
  contact: { postalAddress: "", telephone: "", mobile: "N/A", email: "", district: "" },
  terms: { terms: "N/A", startDate: "", endDate: "", entrySalary: "", appointmentAuthority: "", sourceOfPayment: "" },
  bankDetails: [], employmentHistory: [], academicQualifications: [],
  professionalSpecialization: [], professionalMembership: [], children: [], nextOfKin: [],
  bankBranch: "", advanceDeductions: 0, custom: {},
});

export function normalizeEmployee(e) {
  const d = staffDefaults();
  const m = {
    ...d, ...e,
    origin: { ...d.origin, ...(e.origin || {}) },
    residence: { ...d.residence, ...(e.residence || {}) },
    contact: { ...d.contact, ...(e.contact || {}) },
    terms: { ...d.terms, ...(e.terms || {}) },
  };
  // Portal role: management get the admin console, everyone else the staff portal.
  // Seeded so each role can be demoed: GLA-001 Administrator, GLA-002 HR Officer,
  // GLA-003 Finance Officer, everyone else self-service staff.
  if (!m.role) m.role = ({ "GLA-001": "admin", "GLA-002": "hr", "GLA-003": "finance" })[e.id] || "staff";
  // PAYE basis: "primary" uses the progressive URA bands; "secondary" is a flat 40%.
  if (m.employerType !== "secondary") m.employerType = "primary";
  if (!m.position) m.position = e.jobTitle ? `${e.jobTitle}, ${e.department}` : "";
  if (!m.fileNumber) m.fileNumber = e.id;
  if (!m.contact.email) m.contact.email = e.email || "";
  if (!m.contact.telephone) m.contact.telephone = e.phone || "";
  return m;
}

data.employees = data.employees.map(normalizeEmployee);
// Seed a couple of salary advances + bank branches for the ledger demo.
// GLA-004 carries a manual "other deduction"; GLA-006's deduction comes from an
// approved salary advance below (auto-fed into payroll), not a manual entry.
[["GLA-004", 300000]].forEach(([id, v]) => { const e = data.employees.find((x) => x.id === id); if (e) e.advanceDeductions = v; });
[["GLA-001", "Garden City"], ["GLA-002", "Kampala Road"], ["GLA-003", "Garden City"], ["GLA-004", "Kireka"]].forEach(([id, b]) => { const e = data.employees.find((x) => x.id === id); if (e) e.bankBranch = b; });

// Custom ledger columns — HR adds these from the Payroll ledger via "Add column".
data.ledgerColumns = [];

// Processed monthly payroll runs (locked snapshots). August 2026 is seeded as Paid
// below (see seedAugustRun) once salary advances are defined, so its advance
// deductions match the auto-recovery schedule.
data.payrollRuns = [];
data.bankApprovals = []; // two-step digital sign-off records for bank reports

// Procurement. Net = Sub total − 6% WHT + 18% VAT.
export const SUPPLIER_WHT_RATE = 0.06; // (−) 6% income withholding tax
export const SUPPLIER_VAT_RATE = 0.18; // (+) 18% VAT
export const SUPPLIER_CATEGORIES = [
  "Electrical Materials", "Transformers & Parts", "Hardware & Steel", "HVAC Spares",
  "Petroleum Equipment", "Fuels & Lubricants", "Tools & Equipment", "Civil & Construction",
  "ICT & Office", "Professional Services", "Consumables", "Other",
];
export const SUPPLIER_STATUSES = ["Active", "Inactive"];

// Suppliers master register (vendor master). Bank, TIN, contacts and tax defaults
// live here; the payment schedule references a supplier and adds the invoice amount.
data.suppliers = [
  { id: "SUP-001", name: "Kalyango Bashiri", tin: "1002233445", category: "Professional Services", contactPerson: "Kalyango Bashiri", phone: "+256 772 145 880", email: "kbashiri@gmail.com", bankAccount: "", bankName: "", bankBranch: "", address: "Nansana, Wakiso", whtDefault: true, vatDefault: true, status: "Active", notes: "Individual consultant — no bank on file yet." },
  { id: "SUP-002", name: "Nsubuga Technical Supplies Ltd", tin: "1000771234", category: "Electrical Materials", contactPerson: "Ronald Nsubuga", phone: "+256 414 259 771", email: "sales@nsubugatech.co.ug", bankAccount: "3204598811023", bankName: "Stanbic Bank", bankBranch: "Garden City", address: "Plot 44, Industrial Area, Kampala", whtDefault: true, vatDefault: true, status: "Active", notes: "" },
  { id: "SUP-003", name: "Kampala Hardware & Steel", tin: "1000889077", category: "Hardware & Steel", contactPerson: "Grace Nalwoga", phone: "+256 392 776 210", email: "info@klahardware.co.ug", bankAccount: "0102009887654", bankName: "Centenary Bank", bankBranch: "Kampala Road", address: "Kampala Road, Kampala", whtDefault: true, vatDefault: false, status: "Active", notes: "Not VAT-registered." },
  { id: "SUP-004", name: "Victoria Fuels (U) Ltd", tin: "1000456120", category: "Fuels & Lubricants", contactPerson: "Denis Ssembatya", phone: "+256 700 934 512", email: "accounts@victoriafuels.co.ug", bankAccount: "6009345120088", bankName: "Absa Bank", bankBranch: "Kireka", address: "Kireka, Wakiso", whtDefault: false, vatDefault: false, status: "Active", notes: "Fuel supplied on URA-exempt terms." },
  { id: "SUP-005", name: "CoolTech Supplies", tin: "1000512347", category: "HVAC Spares", contactPerson: "Aisha Namusoke", phone: "+256 752 330 145", email: "cooltech.ug@gmail.com", bankAccount: "1044120087765", bankName: "Equity Bank", bankBranch: "Ntinda", address: "Ntinda, Kampala", whtDefault: true, vatDefault: true, status: "Active", notes: "" },
];
export const supplierById = (id) => (data.suppliers || []).find((s) => s.id === id) || null;

// A schedule line references a supplier + this invoice's amount and tax toggles.
data.supplierSchedule = [
  { id: "SL-001", supplierId: "SUP-001", subTotal: 1000000, applyWht: true, applyVat: true },
  { id: "SL-002", supplierId: "SUP-002", subTotal: 4500000, applyWht: true, applyVat: true },
  { id: "SL-003", supplierId: "SUP-003", subTotal: 2750000, applyWht: true, applyVat: false },
  { id: "SL-004", supplierId: "SUP-004", subTotal: 3200000, applyWht: false, applyVat: false },
];

// Compute WHT / VAT / net for a schedule line.
export function deriveSupplier(s) {
  const subTotal = Number(s.subTotal) || 0;
  const applyWht = s.applyWht !== false; // 6% withholding — optional, on by default
  const applyVat = s.applyVat !== false; // 18% VAT — optional, on by default
  const wht = applyWht ? Math.round(subTotal * ((data.settings?.payroll?.wht ?? 6) / 100)) : 0;
  const vat = applyVat ? Math.round(subTotal * ((data.settings?.payroll?.vat ?? 18) / 100)) : 0;
  return { subTotal, applyWht, applyVat, wht, vat, net: subTotal - wht + vat };
}
// Join a schedule line with its supplier master + computed amounts → a full row.
export function resolveScheduleLine(line) {
  const s = supplierById(line.supplierId) || {};
  return {
    ...line,
    supplierId: line.supplierId,
    name: s.name || line.name || "Unknown supplier",
    tin: s.tin || "",
    email: s.email || "",
    category: s.category || "",
    bankAccount: s.bankAccount || "",
    bankName: s.bankName || "",
    bankBranch: s.bankBranch || "",
    ...deriveSupplier(line),
  };
}

// Processed supplier payment schedules (locked history). Seed several past
// schedules so each supplier's statement of account has audit history.
data.supplierRuns = [
  { id: "SPR-2606", scheduleDate: "2026-06-18", processedBy: "Sarah Nakato (HR)", processedAt: "2026-06-18",
    rows: [
      { no: 1, supplierId: "SUP-001", name: "Kalyango Bashiri", tin: "1002233445", bankAccount: "", bankName: "", bankBranch: "", subTotal: 800000, applyWht: true, applyVat: true, wht: 48000, vat: 144000, net: 896000 },
      { no: 2, supplierId: "SUP-002", name: "Nsubuga Technical Supplies Ltd", tin: "1000771234", bankAccount: "3204598811023", bankName: "Stanbic Bank", bankBranch: "Garden City", subTotal: 2000000, applyWht: true, applyVat: true, wht: 120000, vat: 360000, net: 2240000 },
    ],
    totals: { subTotal: 2800000, wht: 168000, vat: 504000, net: 3136000 } },
  { id: "SPR-2607", scheduleDate: "2026-07-22", processedBy: "Grace Auma (Finance)", processedAt: "2026-07-22",
    rows: [
      { no: 1, supplierId: "SUP-002", name: "Nsubuga Technical Supplies Ltd", tin: "1000771234", bankAccount: "3204598811023", bankName: "Stanbic Bank", bankBranch: "Garden City", subTotal: 3000000, applyWht: true, applyVat: true, wht: 180000, vat: 540000, net: 3360000 },
      { no: 2, supplierId: "SUP-003", name: "Kampala Hardware & Steel", tin: "1000889077", bankAccount: "0102009887654", bankName: "Centenary Bank", bankBranch: "Kampala Road", subTotal: 1200000, applyWht: true, applyVat: false, wht: 72000, vat: 0, net: 1128000 },
      { no: 3, supplierId: "SUP-005", name: "CoolTech Supplies", tin: "1000512347", bankAccount: "1044120087765", bankName: "Equity Bank", bankBranch: "Ntinda", subTotal: 1500000, applyWht: true, applyVat: true, wht: 90000, vat: 270000, net: 1680000 },
    ],
    totals: { subTotal: 5700000, wht: 342000, vat: 810000, net: 6168000 } },
  { id: "SPR-2608", scheduleDate: "2026-08-20", processedBy: "Sarah Nakato (HR)", processedAt: "2026-08-20",
    rows: [
      { no: 1, supplierId: "SUP-002", name: "Nsubuga Technical Supplies Ltd", tin: "1000771234", bankAccount: "3204598811023", bankName: "Stanbic Bank", bankBranch: "Garden City", subTotal: 3800000, applyWht: true, applyVat: true, wht: 228000, vat: 684000, net: 4256000 },
      { no: 2, supplierId: "SUP-003", name: "Kampala Hardware & Steel", tin: "1000889077", bankAccount: "0102009887654", bankName: "Centenary Bank", bankBranch: "Kampala Road", subTotal: 1500000, applyWht: true, applyVat: false, wht: 90000, vat: 0, net: 1410000 },
    ],
    totals: { subTotal: 5300000, wht: 318000, vat: 684000, net: 5666000 } },
];

/* =========================================================================
   Settings Management — admin-configurable, no developer needed for routine
   changes: company profile, statutory rates, roles & permissions, announcements.
   ========================================================================= */
export const PERMISSION_MODULES = [
  ["dashboard", "Dashboard"], ["employees", "Employees"], ["leave", "Leave"],
  ["attendance", "Attendance"], ["payroll", "Payroll"], ["advances", "Salary Advances"],
  ["suppliers", "Suppliers"], ["stock", "Stock"], ["appraisals", "Appraisals"], ["reports", "Reports"], ["settings", "Settings"],
];
export const PERMISSION_ACTIONS = [
  ["editEmployees", "Add / edit employee records"],
  ["approveLeave", "Approve or reject leave"],
  ["processPayroll", "Process & pay payroll"],
  ["manageAdvances", "Approve salary advances"],
  ["manageStock", "Adjust stock & month-end"],
  ["manageSettings", "Change system settings"],
];
const allMods = (v) => Object.fromEntries(PERMISSION_MODULES.map(([k]) => [k, v]));
const allActs = (v) => Object.fromEntries(PERMISSION_ACTIONS.map(([k]) => [k, v]));

data.settings = {
  company: {
    name: "Global Link Associates Ltd",
    tagline: "Engineering & Contracting",
    address: "P.O. Box 71674, Kampala - Uganda.",
    telephone: "256-0414270704",
    cell: "0711506063, 0772413777",
    email: "glassociates.ug@gmail.com",
  },
  payroll: { nssfEmp: 5, nssfEr: 10, wht: 6, vat: 18, payDay: 28, currency: "UGX" },
  // Organisation structure — departments and the positions under each. Admin-editable
  // from Settings → Departments. New departments/positions can be added any time.
  departments: [
    { id: "dept-eng", name: "Engineering Department", positions: [
      "Field Service Technician", "Field Service Engineer", "Director Engineering", "Workshop Technician",
      "Service Engineer", "Health, Safety & Environment Manager", "Stores Manager", "Technical Support Staff",
    ] },
    { id: "dept-hrsm", name: "Human Resources & Sales and Marketing Department", positions: [
      "Managing Director", "Sales & Marketing Officers", "Accountant",
    ] },
  ],
  roles: [
    { id: "admin", name: "Administrator", system: true, description: "Full access to every module and action.", modules: allMods(true), actions: allActs(true) },
    { id: "hr", name: "HR Officer", description: "Runs day-to-day HR: staff, leave, attendance, payroll.", modules: { ...allMods(true), stock: false, settings: false }, actions: { ...allActs(true), manageSettings: false, manageStock: false } },
    { id: "finance", name: "Finance Officer", description: "Payroll, advances, suppliers and reports.", modules: { dashboard: true, employees: true, leave: false, attendance: false, payroll: true, advances: true, suppliers: true, stock: true, appraisals: false, reports: true, settings: false }, actions: { editEmployees: false, approveLeave: false, processPayroll: true, manageAdvances: true, manageStock: true, manageSettings: false } },
    { id: "staff", name: "Staff (self-service)", system: true, portalOnly: true, description: "Self-service portal only — clock-in, leave, payslip, advances.", modules: allMods(false), actions: allActs(false) },
  ],
  announcements: [
    { id: "ANN-001", title: "September payroll cut-off", body: "All timesheets and overtime for September must be submitted by the 25th. Payroll runs on the 28th.", date: "2026-09-05", active: true, audience: "all" },
    { id: "ANN-002", title: "Safety refresher — field teams", body: "Mandatory safety briefing for all field technicians on Friday at 8:00am, Head Office.", date: "2026-09-02", active: true, audience: "staff" },
    { id: "ANN-003", title: "Q3 appraisals window open", body: "Line managers: submit Q3 competency reviews before month-end.", date: "2026-08-28", active: false, audience: "admin" },
  ],
};

export const roleById = (id) => (data.settings.roles || []).find((r) => r.id === id);

// Organisation structure helpers (driven by admin-editable settings.departments).
export const deptList = () => (data.settings?.departments || []).map((d) => d.name);
export const positionsFor = (name) => ((data.settings?.departments || []).find((d) => d.name === name)?.positions) || [];

// Salary advance requests. Staff request an amount + repayment months; HR/Admin
// approves as-is, approves with modifications (adjusted amount/months), or rejects.
export const ADVANCE_MAX_MONTHS = 12;
export function advanceInstallment(a) {
  const decided = a.status === "Approved";
  const amount = Number(decided ? (a.approvedAmount ?? a.amount) : a.amount) || 0;
  const months = Number(decided ? (a.approvedMonths ?? a.months) : a.months) || 1;
  return { amount, months, monthly: Math.round(amount / months) };
}
export const advanceModified = (a) =>
  a.status === "Approved" && ((a.approvedAmount != null && Number(a.approvedAmount) !== Number(a.amount)) || (a.approvedMonths != null && Number(a.approvedMonths) !== Number(a.months)));
// Whole months from month key a → b (e.g. "2026-09" → "2026-11" = 2).
export function monthsBetween(a, b) {
  const [ay, am] = a.split("-").map(Number), [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}
// The advance installment due for one employee in a given month across all their
// approved advances. Repayment runs for `months` starting at startMonth; the final
// installment absorbs any rounding remainder so the schedule sums to the principal.
export function advanceRepaymentForMonth(advances, empId, monthKey) {
  return (advances || [])
    .filter((a) => a.empId === empId && a.status === "Approved")
    .reduce((sum, a) => {
      const { amount, months, monthly } = advanceInstallment(a);
      const start = a.startMonth || CURRENT_MONTH;
      const idx = monthsBetween(start, monthKey);
      if (idx < 0 || idx >= months) return sum;
      const due = idx === months - 1 ? amount - monthly * (months - 1) : monthly;
      return sum + due;
    }, 0);
}
// Employee clone whose advanceDeductions includes approved-advance repayments for the month.
export function withAdvanceDeductions(emp, advances, monthKey) {
  const repay = advanceRepaymentForMonth(advances, emp.id, monthKey);
  return { ...emp, advanceDeductions: (Number(emp.advanceDeductions) || 0) + repay, _advanceRepay: repay };
}

// Recovery progress for one approved advance, tied to ACTUAL processed/paid payroll
// runs — not just the calendar. A month's installment counts as recovered only once
// a payroll run exists for that month. Returns the full schedule with per-month state.
export function advanceProgress(a, payrollRuns) {
  const { amount, months, monthly } = advanceInstallment(a);
  const start = a.startMonth || CURRENT_MONTH;
  const done = new Set((payrollRuns || []).filter((r) => r.status === "Processed" || r.status === "Paid").map((r) => r.month));
  let recovered = 0, monthsRecovered = 0;
  const schedule = [];
  if (a.status === "Approved") {
    for (let i = 0; i < months; i++) {
      const mk = addMonth(start, i);
      const due = i === months - 1 ? amount - monthly * (months - 1) : monthly;
      const paid = done.has(mk);
      if (paid) { recovered += due; monthsRecovered++; }
      schedule.push({ month: mk, due, paid });
    }
  }
  const outstanding = Math.max(0, amount - recovered);
  const cleared = a.status === "Approved" && months > 0 && outstanding === 0;
  const nextMonth = (schedule.find((x) => !x.paid) || {}).month || "";
  return { amount, months, monthly, start, recovered, outstanding, monthsRecovered, schedule, cleared, nextMonth };
}

data.advances = [
  { id: "ADV-2608-01", empId: "GLA-006", amount: 800000, months: 4, reason: "School fees for the new term", status: "Approved", requestedAt: "2026-08-18", decidedBy: "Sarah Nakato (HR)", decidedAt: "2026-08-20", approvedAmount: 600000, approvedMonths: 3, startMonth: "2026-08", note: "Approved at UGX 600,000 recovered over 3 months to keep the monthly deduction manageable." },
  { id: "ADV-2609-01", empId: "GLA-003", amount: 500000, months: 2, reason: "Medical emergency", status: "Pending", requestedAt: "2026-09-01", decidedBy: "", decidedAt: "", approvedAmount: null, approvedMonths: null, startMonth: "", note: "" },
];

// Seed a run of Paid months (Apr–Aug 2026) so payment statements have real
// history across a date range. Advance deductions are drawn from each record's
// manual deduction PLUS any approved-advance installment due that month, so each
// locked snapshot is consistent with the auto-recovery schedule and the
// September ledger carries forward correctly.
(function seedPaidRuns() {
  const months = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];
  const cols = data.ledgerColumns.map((c) => ({ ...c }));
  months.forEach((month) => {
    const emps = data.employees.filter((e) => e.status !== "Terminated");
    const rows = emps.map((e, i) => {
      const gross = Number(e.grossSalary) || 0, nssf5 = Math.round(gross * 0.05), paye = derivePAYE(gross, e.employerType);
      const advance = (Number(e.advanceDeductions) || 0) + advanceRepaymentForMonth(data.advances, e.id, month);
      const custom = {}; cols.forEach((c) => { custom[c.id] = (e.custom || {})[c.id] ?? (c.kind === "text" ? "" : 0); });
      let net = gross - nssf5 - paye - advance;
      cols.forEach((c) => { const v = Number(custom[c.id]) || 0; if (c.kind === "allowance") net += v; else if (c.kind === "deduction") net -= v; });
      return { no: i + 1, empId: e.id, name: `${e.firstName} ${e.lastName}`, department: e.department, bankAccount: e.bankAccount, bankName: e.bankName, bankBranch: e.bankBranch, tin: e.tin, nationalId: e.nationalId, nssfNumber: e.nssfNumber, gross, nssf5, paye, advance, custom, net, contribution: Math.round(gross * 0.1) };
    });
    const totals = rows.reduce((a, r) => ({ gross: a.gross + r.gross, nssf5: a.nssf5 + r.nssf5, paye: a.paye + r.paye, advance: a.advance + r.advance, net: a.net + r.net, contribution: a.contribution + r.contribution }), { gross: 0, nssf5: 0, paye: 0, advance: 0, net: 0, contribution: 0 });
    data.payrollRuns.push({ id: `PR-${month}`, month, status: "Paid", processedBy: "Sarah Nakato (HR)", processedAt: `${month}-28`, paidAt: `${month}-30`, columns: cols, rows, totals });
  });
})();

/* ----------------------------- derived helpers ---------------------------- */

// Uganda URA monthly PAYE for resident individuals.
// New rates under the Income Tax (Amendment) Act, 2026 — effective 1 July 2026:
//   0 – 335,000           : NIL
//   335,001 – 410,000     : 20% × (TI − 335,000)
//   410,001 – 485,000     : 15,000 + 25% × (TI − 410,000)
//   485,001 – 10,000,000  : 33,750 + 30% × (TI − 485,000)
//   Above 10,000,000      : the above + 10% × (TI − 10,000,000)
export function derivePAYE(gross, employerType) {
  const g = Number(gross) || 0;
  // Secondary employment: URA taxes the whole chargeable income at a flat 40%
  // (the tax-free band and lower rates belong to the primary employer).
  if (employerType === "secondary") return Math.round(0.4 * g);
  let t = 0;
  if (g <= 335000) t = 0;
  else if (g <= 410000) t = 0.2 * (g - 335000);
  else if (g <= 485000) t = 15000 + 0.25 * (g - 410000);
  else {
    t = 33750 + 0.3 * (g - 485000);
    if (g > 10000000) t += 0.1 * (g - 10000000);
  }
  return Math.round(t);
}

export const deriveNssfEmployee = (g) => Math.round((Number(g) || 0) * ((data.settings?.payroll?.nssfEmp ?? 5) / 100));
export const deriveNssfEmployer = (g) => Math.round((Number(g) || 0) * ((data.settings?.payroll?.nssfEr ?? 10) / 100));

export function derivePayslip(emp) {
  const gross = Number(emp.grossSalary) || 0;
  const paye = derivePAYE(gross, emp.employerType);
  const nssfEmp = deriveNssfEmployee(gross);
  const nssfEr = deriveNssfEmployer(gross);
  const advance = Number(emp.advanceDeductions) || 0;
  // Net = gross − NSSF (5%) − PAYE − salary advance / other deductions (ledger convention)
  return { gross, paye, nssfEmp, nssfEr, advance, net: gross - paye - nssfEmp - advance, costToCompany: gross + nssfEr };
}

export function deriveLeaveBalance(emp, type = "Annual") {
  const ent = (LEAVE_TYPES[type] || {}).entitlement || 0;
  const used = type === "Annual" ? emp.annualUsed || 0 : type === "Sick" ? emp.sickUsed || 0 : 0;
  return { entitlement: ent, used, remaining: Math.max(0, ent - used) };
}

export const appraisalOverall = (a) =>
  APPRAISAL_METRICS.reduce((s, [k]) => s + (Number(a[k]) || 0), 0) / APPRAISAL_METRICS.length;

export function workingDaysBetween(a, b) {
  const s = new Date(a + "T00:00:00");
  const e = new Date(b + "T00:00:00");
  if (isNaN(s) || isNaN(e) || e < s) return 1;
  let n = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n || 1;
}

/* =========================================================================
   Stock Management — items, movements, month-end balancing.
   ========================================================================= */
export const STOCK_CATEGORIES = [
  "Cables & Conductors", "Transformers & Parts", "HVAC Spares",
  "Petroleum Equipment Parts", "Tools", "Consumables", "PPE / Safety", "Office Supplies",
];
export const STOCK_UNITS = ["pcs", "set", "m", "roll", "litre", "box", "pair"];
export const MOVEMENT_TYPES = ["IN", "OUT", "ADJUST"];
export const MOVEMENT_LABELS = { IN: "Stock In", OUT: "Stock Out", ADJUST: "Stock Take" };

data.stockItems = [
  { id: "STK-001", code: "CBL-4CU", name: "4mm² Copper Cable", category: "Cables & Conductors", unit: "m", unitCost: 6500, reorderLevel: 200, openingStock: 500 },
  { id: "STK-002", code: "TRF-BSH33", name: "33kV Transformer Bushing", category: "Transformers & Parts", unit: "pcs", unitCost: 850000, reorderLevel: 4, openingStock: 12 },
  { id: "STK-003", code: "HVA-R410A", name: "R410A Refrigerant Gas", category: "HVAC Spares", unit: "litre", unitCost: 45000, reorderLevel: 20, openingStock: 60 },
  { id: "STK-004", code: "PET-NOZ", name: "Fuel Dispenser Nozzle", category: "Petroleum Equipment Parts", unit: "pcs", unitCost: 320000, reorderLevel: 5, openingStock: 15 },
  { id: "STK-005", code: "TLS-SDSET", name: "Insulated Screwdriver Set", category: "Tools", unit: "set", unitCost: 180000, reorderLevel: 3, openingStock: 8 },
  { id: "STK-006", code: "CON-LUG4", name: "Cable Lugs 4mm² (box/100)", category: "Consumables", unit: "box", unitCost: 55000, reorderLevel: 10, openingStock: 40 },
  { id: "STK-007", code: "PPE-HELM", name: "Safety Helmet", category: "PPE / Safety", unit: "pcs", unitCost: 35000, reorderLevel: 15, openingStock: 50 },
  { id: "STK-008", code: "PPE-VEST", name: "Hi-Vis Vest", category: "PPE / Safety", unit: "pcs", unitCost: 22000, reorderLevel: 20, openingStock: 35 },
  { id: "STK-009", code: "TRF-CB63", name: "Circuit Breaker 63A", category: "Transformers & Parts", unit: "pcs", unitCost: 240000, reorderLevel: 6, openingStock: 18 },
  { id: "STK-010", code: "HVA-COIL", name: "Compressor Oil", category: "HVAC Spares", unit: "litre", unitCost: 38000, reorderLevel: 10, openingStock: 25 },
];

data.stockMovements = [
  { id: "MOV-0801", itemId: "STK-001", type: "IN", date: "2026-08-05", qty: 1000, unitCost: 6500, reference: "GRN-0810", party: "Kampala Cables Ltd", notes: "Bulk cable delivery" },
  { id: "MOV-0802", itemId: "STK-001", type: "OUT", date: "2026-08-12", qty: 400, unitCost: 6500, reference: "ISS-0455", issuedTo: "Peter Wanyama", approvedBy: "Robert Okello (HOD)", party: "Peter Wanyama", notes: "Umeme substation wiring" },
  { id: "MOV-0803", itemId: "STK-003", type: "IN", date: "2026-08-08", qty: 40, unitCost: 45000, reference: "GRN-0811", party: "CoolTech Supplies", notes: "" },
  { id: "MOV-0804", itemId: "STK-003", type: "OUT", date: "2026-08-20", qty: 25, unitCost: 45000, reference: "ISS-0460", issuedTo: "Joseph Ssekandi", approvedBy: "Sarah Nakato (Admin)", party: "Joseph Ssekandi", notes: "HVAC recharge" },
  { id: "MOV-0805", itemId: "STK-007", type: "OUT", date: "2026-08-15", qty: 10, unitCost: 35000, reference: "ISS-0462", issuedTo: "Field crew", approvedBy: "Mary Nabirye (Stores)", party: "Field crew", notes: "New crew PPE" },
  { id: "MOV-0806", itemId: "STK-009", type: "IN", date: "2026-08-18", qty: 10, unitCost: 240000, reference: "GRN-0814", party: "PowerParts Uganda", notes: "" },
  { id: "MOV-0807", itemId: "STK-004", type: "OUT", date: "2026-08-22", qty: 6, unitCost: 320000, reference: "ISS-0465", issuedTo: "David Mugisha", approvedBy: "Robert Okello (HOD)", party: "David Mugisha", notes: "Shell Nakawa maintenance" },
  { id: "MOV-0808", itemId: "STK-006", type: "IN", date: "2026-08-25", qty: 20, unitCost: 55000, reference: "GRN-0817", party: "ElectroMart", notes: "" },
  { id: "MOV-0901", itemId: "STK-001", type: "IN", date: "2026-09-01", qty: 500, unitCost: 6600, reference: "GRN-0901", party: "Kampala Cables Ltd", notes: "" },
  { id: "MOV-0902", itemId: "STK-001", type: "OUT", date: "2026-09-02", qty: 250, unitCost: 6600, reference: "ISS-0470", issuedTo: "Isaac Tumwine", approvedBy: "Mary Nabirye (Stores)", party: "Isaac Tumwine", notes: "Namanve site" },
  { id: "MOV-0903", itemId: "STK-007", type: "OUT", date: "2026-09-02", qty: 8, unitCost: 35000, reference: "ISS-0471", issuedTo: "Field crew", approvedBy: "Mary Nabirye (Stores)", party: "Field crew", notes: "" },
  { id: "MOV-0904", itemId: "STK-005", type: "IN", date: "2026-09-03", qty: 5, unitCost: 180000, reference: "GRN-0903", party: "ToolHub", notes: "" },
  { id: "MOV-0905", itemId: "STK-003", type: "OUT", date: "2026-09-03", qty: 15, unitCost: 45000, reference: "ISS-0473", issuedTo: "Joseph Ssekandi", approvedBy: "Sarah Nakato (Admin)", party: "Joseph Ssekandi", notes: "" },
  { id: "MOV-0907", itemId: "STK-004", type: "OUT", date: "2026-09-08", qty: 5, unitCost: 320000, reference: "ISS-0478", issuedTo: "David Mugisha", approvedBy: "Robert Okello (HOD)", party: "David Mugisha", notes: "TotalEnergies Kireka dispenser overhaul" },
  // Stock take (physical count variance): Compressor Oil counted 23 vs system 25 → −2.
  // qty holds the signed adjustment delta; `counted` and `reason` document the count.
  { id: "MOV-0906", itemId: "STK-010", type: "ADJUST", date: "2026-09-03", qty: -2, counted: 23, unitCost: 38000, reference: "STK-CT-0901", approvedBy: "Mary Nabirye (Stores)", party: "Physical stock take", reason: "Physical count variance — 2 litres unaccounted", notes: "" },
];

// August 2026 already balanced & closed — closing rolls into September's opening.
data.stockClosings = [
  { id: "CLS-2026-08-STK-001", month: "2026-08", itemId: "STK-001", opening: 500, in: 1000, out: 400, closing: 1100, closedAt: "2026-09-01" },
  { id: "CLS-2026-08-STK-002", month: "2026-08", itemId: "STK-002", opening: 12, in: 0, out: 0, closing: 12, closedAt: "2026-09-01" },
  { id: "CLS-2026-08-STK-003", month: "2026-08", itemId: "STK-003", opening: 60, in: 40, out: 25, closing: 75, closedAt: "2026-09-01" },
  { id: "CLS-2026-08-STK-004", month: "2026-08", itemId: "STK-004", opening: 15, in: 0, out: 6, closing: 9, closedAt: "2026-09-01" },
  { id: "CLS-2026-08-STK-005", month: "2026-08", itemId: "STK-005", opening: 8, in: 0, out: 0, closing: 8, closedAt: "2026-09-01" },
  { id: "CLS-2026-08-STK-006", month: "2026-08", itemId: "STK-006", opening: 40, in: 20, out: 0, closing: 60, closedAt: "2026-09-01" },
  { id: "CLS-2026-08-STK-007", month: "2026-08", itemId: "STK-007", opening: 50, in: 0, out: 10, closing: 40, closedAt: "2026-09-01" },
  { id: "CLS-2026-08-STK-008", month: "2026-08", itemId: "STK-008", opening: 35, in: 0, out: 0, closing: 35, closedAt: "2026-09-01" },
  { id: "CLS-2026-08-STK-009", month: "2026-08", itemId: "STK-009", opening: 18, in: 10, out: 0, closing: 28, closedAt: "2026-09-01" },
  { id: "CLS-2026-08-STK-010", month: "2026-08", itemId: "STK-010", opening: 25, in: 0, out: 0, closing: 25, closedAt: "2026-09-01" },
];

/* ------------------------------- stock helpers ---------------------------- */
export const monthKeyOf = (dateStr) => (dateStr || "").slice(0, 7);
export const CURRENT_MONTH = monthKeyOf(TODAY);
export function addMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export const prevMonthKey = (key) => addMonth(key, -1);
export const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

// Signed effect of a movement on the balance. IN adds, OUT subtracts, and an
// ADJUST (stock take) carries an already-signed delta (counted − system).
export function movementDelta(m) {
  const q = Number(m.qty) || 0;
  return m.type === "IN" ? q : m.type === "OUT" ? -q : q;
}
// Chronological order for a running stock ledger / bin card.
export function sortedMovements(movements) {
  return [...(movements || [])].sort((a, b) => (a.date + (a.id || "")).localeCompare(b.date + (b.id || "")));
}
// Live balance = opening baseline + every movement's signed effect.
export function itemBalance(item, movements) {
  return (movements || []).filter((m) => m.itemId === item.id)
    .reduce((b, m) => b + movementDelta(m), Number(item.openingStock) || 0);
}
// Moving weighted-average cost (WAC) — the standard perpetual-inventory valuation.
// Opening stock is valued at the item's cost; each receipt re-averages the cost;
// issues and negative adjustments leave the average unchanged. Returns the current
// quantity, average unit cost and total value.
export function itemValuation(item, movements) {
  let qty = Number(item.openingStock) || 0;
  let value = qty * (Number(item.unitCost) || 0);
  let wac = qty > 0 ? value / qty : (Number(item.unitCost) || 0);
  for (const m of sortedMovements((movements || []).filter((x) => x.itemId === item.id))) {
    const q = Number(m.qty) || 0;
    const cost = m.unitCost != null && m.unitCost !== "" ? Number(m.unitCost) : wac;
    if (m.type === "IN") { qty += q; value += q * cost; }
    else if (m.type === "OUT") { qty -= q; value -= q * wac; }
    else { // ADJUST: signed delta; a positive delta enters at its stated cost
      if (q >= 0) { qty += q; value += q * cost; }
      else { qty += q; value += q * wac; }
    }
    if (qty <= 0) { qty = Math.max(0, qty); value = qty * wac; }
    else { wac = value / qty; }
  }
  return { qty, avgCost: wac, value: Math.max(0, Math.round(value)) };
}
export const avgCost = (item, movements) => itemValuation(item, movements).avgCost;
export function totalStockValue(items, movements) {
  return (items || []).reduce((s, it) => s + itemValuation(it, movements).value, 0);
}
// Four-tier status against the reorder level (2× reorder is treated as a healthy max).
export function stockStatus(bal, reorder) {
  const r = Number(reorder) || 0;
  if (bal <= 0) return "Out of stock";
  if (bal <= r) return "Low";
  if (bal <= r * 2 || r === 0) return "OK";
  return "Healthy";
}
// Average daily usage from issues over a trailing window (default 60 days) and the
// resulting days-of-cover at the current balance.
export function avgDailyUsage(item, movements, days = 60) {
  const cutoff = new Date(TODAY); cutoff.setDate(cutoff.getDate() - days);
  const out = (movements || []).filter((m) => m.itemId === item.id && m.type === "OUT" && new Date(m.date) >= cutoff)
    .reduce((s, m) => s + (Number(m.qty) || 0), 0);
  return out / days;
}
export function daysOfCover(item, movements) {
  const u = avgDailyUsage(item, movements);
  if (u <= 0) return Infinity;
  return itemBalance(item, movements) / u;
}
// Suggested replenishment quantity: bring stock back up to a target max (2× reorder)
// when at or below the reorder level. Zero when comfortably in stock.
export function suggestedOrderQty(item, movements) {
  const bal = itemBalance(item, movements);
  const r = Number(item.reorderLevel) || 0;
  if (r <= 0 || bal > r) return 0;
  return Math.max(0, r * 2 - bal);
}

function netBeforeMonth(itemId, monthKey, movements) {
  return movements.filter((m) => m.itemId === itemId && monthKeyOf(m.date) < monthKey)
    .reduce((b, m) => b + movementDelta(m), 0);
}
// One item's balanced ledger for a month: opening carried from the previous
// month's closing (auto-balance), plus this month's in/out → closing. Stock-take
// adjustments fold into in (positive delta) or out (negative delta) so the identity
// Closing = Opening + In − Out always holds.
export function monthLedgerRow(item, monthKey, movements, closings) {
  const snap = (closings || []).find((c) => c.month === prevMonthKey(monthKey) && c.itemId === item.id);
  const opening = snap ? Number(snap.closing) : (Number(item.openingStock) || 0) + netBeforeMonth(item.id, monthKey, movements);
  let inQty = 0, outQty = 0, adjQty = 0;
  movements.filter((m) => m.itemId === item.id && monthKeyOf(m.date) === monthKey).forEach((m) => {
    const d = movementDelta(m);
    if (m.type === "ADJUST") adjQty += d;
    if (d >= 0) inQty += d; else outQty += -d;
  });
  return { opening, inQty, outQty, adjQty, closing: opening + inQty - outQty };
}
export const monthIsClosed = (monthKey, closings) => (closings || []).some((c) => c.month === monthKey);

/* =========================================================================
   Geo-fencing for attendance clock-in.
   Each site has a centre (lat/lng) and a radius in metres. A phone clock-in
   is "verified" when the captured GPS point falls inside a site's radius.
   ========================================================================= */
// Default / seed geofence sites. At runtime the app replaces this list with the
// sites saved in Settings (settings.geofences) when present — see setGeofences.
export const GEOFENCES = [
  { id: "GF-HO", name: "Global Link Associates — Head Office", area: "Kampala", lat: 0.29977, lng: 32.59656, radius: 150 },
  // Shell, TotalEnergies & Rubis service stations across Uganda (proximity clock-in sites).
  { id: "ST-0001", name: "Shell Arua (Pakwach Road)", brand: "Shell", area: "Arua", lat: 3.008484, lng: 30.911121, radius: 150 },
  { id: "ST-0002", name: "Shell Atiak (Adjumani road) (Atiak-Laropi Rd)", brand: "Shell", area: "Atiak (Adjumani road)", lat: 3.37885, lng: 31.791809, radius: 150 },
  { id: "ST-0003", name: "Shell Bulenga", brand: "Shell", area: "Bulenga", lat: 0.318181, lng: 32.510833, radius: 150 },
  { id: "ST-0004", name: "Shell Buloba", brand: "Shell", area: "Bulenga", lat: 0.330991, lng: 32.496148, radius: 150 },
  { id: "ST-0005", name: "Shell Buloba (A109 Mityana Rd)", brand: "Shell", area: "Buloba", lat: 0.325, lng: 32.457222, radius: 150 },
  { id: "ST-0006", name: "Shell Buloba (A109 Mityana Rd)", brand: "Shell", area: "Buloba", lat: 0.32813, lng: 32.47611, radius: 150 },
  { id: "ST-0007", name: "Shell Buyala", brand: "Shell", area: "Buloba", lat: 0.324182, lng: 32.43396, radius: 150 },
  { id: "ST-0008", name: "Shell Bushenyi (Mbarara-Kasese Rd)", brand: "Shell", area: "Bushenyi", lat: -0.540823, lng: 30.187884, radius: 150 },
  { id: "ST-0009", name: "Shell Busia (Busia-Tororo Rd)", brand: "Shell", area: "Busia", lat: 0.470669, lng: 34.09198, radius: 150 },
  { id: "ST-0010", name: "Shell Bwebajja (Kampala-Entebbe Rd)", brand: "Shell", area: "Bwebajja", lat: 0.167785, lng: 32.543194, radius: 150 },
  { id: "ST-0011", name: "Shell Entebbe (Airport Road)", brand: "Shell", area: "Entebbe", lat: 0.056146, lng: 32.465431, radius: 150 },
  { id: "ST-0012", name: "Shell Entebbe (Gowers Road)", brand: "Shell", area: "Entebbe", lat: 0.051184, lng: 32.463708, radius: 150 },
  { id: "ST-0013", name: "Shell Entebbe (Kampala-Entebbe Expy)", brand: "Shell", area: "Entebbe", lat: 0.069809, lng: 32.475991, radius: 150 },
  { id: "ST-0014", name: "Shell Entebbe Expressway", brand: "Shell", area: "Entebbe", lat: 0.080697, lng: 32.48184, radius: 150 },
  { id: "ST-0015", name: "Shell Fort Portal (Fort Portal-Mpondwe Rd)", brand: "Shell", area: "Fort Portal", lat: 0.651342, lng: 30.27307, radius: 150 },
  { id: "ST-0016", name: "Shell Fort Portal (Lugard Rd)", brand: "Shell", area: "Fort Portal", lat: 0.657737, lng: 30.278715, radius: 150 },
  { id: "ST-0017", name: "Shell Fort Portal - Kampala Highway", brand: "Shell", area: "Fort Portal", lat: 0.657899, lng: 30.286437, radius: 150 },
  { id: "ST-0018", name: "Shell Gayaza", brand: "Shell", area: "Gayaza", lat: 0.44923, lng: 32.611674, radius: 150 },
  { id: "ST-0019", name: "Shell Gayaza (FJ25+R7M)", brand: "Shell", area: "Gayaza", lat: 0.452087, lng: 32.608182, radius: 150 },
  { id: "ST-0020", name: "Shell Gulu (Kampala-Gulu Hwy)", brand: "Shell", area: "Gulu", lat: 2.771021, lng: 32.298165, radius: 150 },
  { id: "ST-0021", name: "Shell Hima", brand: "Shell", area: "Hima (Kasese)", lat: 0.289167, lng: 30.179167, radius: 150 },
  { id: "ST-0022", name: "Shell Hoima (C9C7+R53)", brand: "Shell", area: "Hoima", lat: 1.422017, lng: 31.362934, radius: 150 },
  { id: "ST-0023", name: "Shell Hoima (Hoima)", brand: "Shell", area: "Hoima", lat: 1.431289, lng: 31.352024, radius: 150 },
  { id: "ST-0024", name: "Shell Hoima (Kiryatete Loop)", brand: "Shell", area: "Hoima", lat: 1.427355, lng: 31.348445, radius: 150 },
  { id: "ST-0025", name: "Shell Ibanda (Ibanda Main St)", brand: "Shell", area: "Ibanda", lat: -0.134666, lng: 30.491576, radius: 150 },
  { id: "ST-0026", name: "Shell Iganga", brand: "Shell", area: "Iganga", lat: 0.613843, lng: 33.47325, radius: 150 },
  { id: "ST-0027", name: "Shell Iganga (A109 Jinja-Iganga Hwy)", brand: "Shell", area: "Iganga", lat: 0.610203, lng: 33.469376, radius: 150 },
  { id: "ST-0028", name: "Shell Isingiro (Kabingo)", brand: "Shell", area: "Isingiro", lat: -0.781651, lng: 30.809656, radius: 150 },
  { id: "ST-0029", name: "Shell Bugembe", brand: "Shell", area: "Jinja", lat: 0.450074, lng: 33.21883, radius: 150 },
  { id: "ST-0030", name: "Shell Jinja (Eng. Zikusoka Rd)", brand: "Shell", area: "Jinja", lat: 0.432082, lng: 33.214698, radius: 150 },
  { id: "ST-0031", name: "Shell Jinja (Kampala-Jinja Hwy)", brand: "Shell", area: "Jinja", lat: 0.444729, lng: 33.198503, radius: 150 },
  { id: "ST-0032", name: "Shell Jinja (Nalufenya Rd)", brand: "Shell", area: "Jinja", lat: 0.443678, lng: 33.19833, radius: 150 },
  { id: "ST-0033", name: "Shell Jinja (Napier Rd)", brand: "Shell", area: "Jinja", lat: 0.430261, lng: 33.213315, radius: 150 },
  { id: "ST-0034", name: "Shell Kabale (Kisoro-Kabale Rd)", brand: "Shell", area: "Kabale", lat: -1.248802, lng: 29.984994, radius: 150 },
  { id: "ST-0035", name: "Shell Kabale (Mbarara Rd)", brand: "Shell", area: "Kabale", lat: -1.25846, lng: 30.01527, radius: 150 },
  { id: "ST-0036", name: "Shell Kabwohe", brand: "Shell", area: "Kabwohe", lat: -0.579512, lng: 30.386129, radius: 150 },
  { id: "ST-0037", name: "Shell Kajjansi", brand: "Shell", area: "Kajjansi", lat: 0.213987, lng: 32.542242, radius: 150 },
  { id: "ST-0038", name: "Shell Kakumiro (Mubende-Kakumiro-Kibaale-Kagadi Rd)", brand: "Shell", area: "Kakumiro", lat: 0.780804, lng: 31.324139, radius: 150 },
  { id: "ST-0039", name: "Shell Banda", brand: "Shell", area: "Banda", lat: 0.345047, lng: 32.642514, radius: 150 },
  { id: "ST-0040", name: "Shell Ben Kiwanuka", brand: "Shell", area: "City centre (downtown)", lat: 0.310441, lng: 32.577352, radius: 150 },
  { id: "ST-0041", name: "Shell Bugolobi (Village Mall)", brand: "Shell", area: "Bugolobi", lat: 0.320353, lng: 32.617402, radius: 150 },
  { id: "ST-0042", name: "Shell Bukoto", brand: "Shell", area: "Kampala", lat: 0.366025, lng: 32.597962, radius: 150 },
  { id: "ST-0043", name: "Shell Bukoto (Kisaasi Rd south)", brand: "Shell", area: "Bukoto", lat: 0.353194, lng: 32.598353, radius: 150 },
  { id: "ST-0044", name: "Shell Bunamwaya", brand: "Shell", area: "Kampala", lat: 0.273134, lng: 32.546906, radius: 150 },
  { id: "ST-0045", name: "Shell Busega (Masaka Rd roundabout)", brand: "Shell", area: "Busega", lat: 0.306152, lng: 32.517142, radius: 150 },
  { id: "ST-0046", name: "Shell Bwaise", brand: "Shell", area: "Bwaise", lat: 0.352357, lng: 32.562972, radius: 150 },
  { id: "ST-0047", name: "Shell Bweyogerere", brand: "Shell", area: "Kampala", lat: 0.353591, lng: 32.671926, radius: 150 },
  { id: "ST-0048", name: "Shell Clock Tower", brand: "Shell", area: "Kampala", lat: 0.309385, lng: 32.578391, radius: 150 },
  { id: "ST-0049", name: "Shell Fort Road (Old Kampala)", brand: "Shell", area: "Kampala", lat: 0.314635, lng: 32.56595, radius: 150 },
  { id: "ST-0050", name: "Shell Ggaba Road (Kansanga–Bunga)", brand: "Shell", area: "Kampala", lat: 0.272048, lng: 32.617755, radius: 150 },
  { id: "ST-0051", name: "Shell Jinja Road (City)", brand: "Shell", area: "City centre / Industrial Area", lat: 0.315958, lng: 32.59278, radius: 150 },
  { id: "ST-0052", name: "Shell Kabaka Road", brand: "Shell", area: "Kireka / Banda", lat: 0.335453, lng: 32.6447, radius: 150 },
  { id: "ST-0053", name: "Shell Kabalagala", brand: "Shell", area: "Kabalagala", lat: 0.301036, lng: 32.59277, radius: 150 },
  { id: "ST-0054", name: "Shell Kabuusu–Nateete (Masaka Rd)", brand: "Shell", area: "Nateete / Kabuusu", lat: 0.298011, lng: 32.535949, radius: 150 },
  { id: "ST-0055", name: "Shell Kampala Road", brand: "Shell", area: "City centre", lat: 0.315828, lng: 32.577377, radius: 150 },
  { id: "ST-0056", name: "Shell Kamwokya (Kira Rd)", brand: "Shell", area: "Kamwokya", lat: 0.34503, lng: 32.596261, radius: 150 },
  { id: "ST-0057", name: "Shell Kansanga", brand: "Shell", area: "Kampala", lat: 0.286978, lng: 32.607198, radius: 150 },
  { id: "ST-0058", name: "Shell Kanyanya", brand: "Shell", area: "Kanyanya", lat: 0.372264, lng: 32.577279, radius: 150 },
  { id: "ST-0059", name: "Shell Kavule (Bombo Rd)", brand: "Shell", area: "Kavule / Makerere", lat: 0.340627, lng: 32.571652, radius: 150 },
  { id: "ST-0060", name: "Shell Kawempe", brand: "Shell", area: "Kampala", lat: 0.354912, lng: 32.562522, radius: 150 },
  { id: "ST-0061", name: "Shell Kawempe North (Bombo Rd)", brand: "Shell", area: "Kampala", lat: 0.380767, lng: 32.55656, radius: 150 },
  { id: "ST-0062", name: "Shell Kibuli", brand: "Shell", area: "Kibuli", lat: 0.306841, lng: 32.599057, radius: 150 },
  { id: "ST-0063", name: "Shell Kibuye (Shell Kazi)", brand: "Shell", area: "Kibuye", lat: 0.293297, lng: 32.572236, radius: 150 },
  { id: "ST-0064", name: "Shell Kikoni (Sir Apollo Kaggwa Rd)", brand: "Shell", area: "Kikoni / Makerere", lat: 0.33872, lng: 32.563478, radius: 150 },
  { id: "ST-0065", name: "Shell Kira - Najjera", brand: "Shell", area: "Kampala", lat: 0.394738, lng: 32.633887, radius: 150 },
  { id: "ST-0066", name: "Shell Kireka", brand: "Shell", area: "Kireka", lat: 0.346971, lng: 32.64944, radius: 150 },
  { id: "ST-0067", name: "Shell Kireka-Bbira (Sentema Rd)", brand: "Shell", area: "Kampala", lat: 0.337204, lng: 32.514539, radius: 150 },
  { id: "ST-0068", name: "Shell Kironde Road (Muyenga)", brand: "Shell", area: "Muyenga", lat: 0.296898, lng: 32.615028, radius: 150 },
  { id: "ST-0069", name: "Shell Kiwatule", brand: "Shell", area: "Kampala", lat: 0.362826, lng: 32.625216, radius: 150 },
  { id: "ST-0070", name: "Shell Komamboga (Waliggo Rd)", brand: "Shell", area: "Komamboga", lat: 0.3783, lng: 32.587, radius: 150 },
  { id: "ST-0071", name: "Shell Kulambiro (Mbogo Rd)", brand: "Shell", area: "Kulambiro / Najjera", lat: 0.382794, lng: 32.626509, radius: 150 },
  { id: "ST-0072", name: "Shell Kyambogo", brand: "Shell", area: "Kampala", lat: 0.339063, lng: 32.62729, radius: 150 },
  { id: "ST-0073", name: "Shell Kyanja", brand: "Shell", area: "Kampala", lat: 0.385959, lng: 32.593001, radius: 150 },
  { id: "ST-0074", name: "Shell Kyanja (Kisaasi–Kyanja Rd)", brand: "Shell", area: "Kyanja", lat: 0.3959, lng: 32.5937, radius: 150 },
  { id: "ST-0075", name: "Shell Lugogo", brand: "Shell", area: "Lugogo", lat: 0.327019, lng: 32.604396, radius: 150 },
  { id: "ST-0076", name: "Shell Makindye", brand: "Shell", area: "Makindye", lat: 0.288922, lng: 32.577791, radius: 150 },
  { id: "ST-0077", name: "Shell Mawanda Road", brand: "Shell", area: "Kampala", lat: 0.342353, lng: 32.583051, radius: 150 },
  { id: "ST-0078", name: "Shell Mbuya (Kireka Rd)", brand: "Shell", area: "Mbuya", lat: 0.318175, lng: 32.631872, radius: 150 },
  { id: "ST-0079", name: "Shell Mengo", brand: "Shell", area: "Kampala", lat: 0.309023, lng: 32.556497, radius: 150 },
  { id: "ST-0080", name: "Shell Mobutu Road (Kibuye side)", brand: "Shell", area: "Kibuye / Makindye", lat: 0.290506, lng: 32.575245, radius: 150 },
  { id: "ST-0081", name: "Shell Mpererwe (Gayaza Rd)", brand: "Shell", area: "Mpererwe", lat: 0.377689, lng: 32.576797, radius: 150 },
  { id: "ST-0082", name: "Shell Mulago", brand: "Shell", area: "Kampala", lat: 0.334559, lng: 32.576684, radius: 150 },
  { id: "ST-0083", name: "Shell Munyonyo", brand: "Shell", area: "Kampala", lat: 0.250556, lng: 32.626179, radius: 150 },
  { id: "ST-0084", name: "Shell Muyenga", brand: "Shell", area: "Kampala", lat: 0.301366, lng: 32.601811, radius: 150 },
  { id: "ST-0085", name: "Shell Nabweru", brand: "Shell", area: "Kampala", lat: 0.35834, lng: 32.547287, radius: 150 },
  { id: "ST-0086", name: "Shell Nakawa", brand: "Shell", area: "Kampala", lat: 0.328999, lng: 32.612413, radius: 150 },
  { id: "ST-0087", name: "Shell Nakawa–Kyambogo (Jinja Rd)", brand: "Shell", area: "Nakawa / Kyambogo", lat: 0.3365, lng: 32.6292, radius: 150 },
  { id: "ST-0088", name: "Shell Nateete (Wakaliga Rd)", brand: "Shell", area: "Nateete", lat: 0.302437, lng: 32.540426, radius: 150 },
  { id: "ST-0089", name: "Shell Ndagire Road", brand: "Shell", area: "Kampala", lat: 0.360662, lng: 32.637109, radius: 150 },
  { id: "ST-0090", name: "Shell Ndeeba (Masaka Rd)", brand: "Shell", area: "Ndeeba", lat: 0.292832, lng: 32.570427, radius: 150 },
  { id: "ST-0091", name: "Shell Ntinda (Bukoto–Ntinda Rd)", brand: "Shell", area: "Ntinda", lat: 0.352813, lng: 32.61012, radius: 150 },
  { id: "ST-0092", name: "Shell Ntinda Road (Naguru end)", brand: "Shell", area: "Naguru / Ntinda", lat: 0.341884, lng: 32.615477, radius: 150 },
  { id: "ST-0093", name: "Shell Seguku Katale", brand: "Shell", area: "Kampala", lat: 0.228974, lng: 32.546619, radius: 150 },
  { id: "ST-0094", name: "Shell Sentema Road", brand: "Shell", area: "Kampala", lat: 0.325373, lng: 32.538438, radius: 150 },
  { id: "ST-0095", name: "Shell Tula", brand: "Shell", area: "Kampala", lat: 0.378951, lng: 32.565373, radius: 150 },
  { id: "ST-0096", name: "Shell Wandegeya", brand: "Shell", area: "Kampala", lat: 0.333344, lng: 32.573189, radius: 150 },
  { id: "ST-0097", name: "Shell Zana", brand: "Shell", area: "Kampala", lat: 0.251435, lng: 32.561263, radius: 150 },
  { id: "ST-0098", name: "Shell Kamuli (Kamuli Rd)", brand: "Shell", area: "Kamuli", lat: 0.945368, lng: 33.123869, radius: 150 },
  { id: "ST-0099", name: "Shell Kangulumira (Kangulumira)", brand: "Shell", area: "Kangulumira", lat: 0.581445, lng: 33.027109, radius: 150 },
  { id: "ST-0100", name: "Shell Kasese (Kilembe Rd)", brand: "Shell", area: "Kasese", lat: 0.17743, lng: 30.079882, radius: 150 },
  { id: "ST-0101", name: "Shell Kayunga (Kayunga town)", brand: "Shell", area: "Kayunga", lat: 0.698597, lng: 32.905709, radius: 150 },
  { id: "ST-0102", name: "Shell Kiboga (Kampala-Hoima Rd)", brand: "Shell", area: "Kiboga", lat: 0.912814, lng: 31.771584, radius: 150 },
  { id: "ST-0103", name: "Shell Bulindo", brand: "Shell", area: "Kira", lat: 0.429817, lng: 32.647121, radius: 150 },
  { id: "ST-0104", name: "Shell Buwaate", brand: "Shell", area: "Kira", lat: 0.424444, lng: 32.621628, radius: 150 },
  { id: "ST-0105", name: "Shell Buwate Road", brand: "Shell", area: "Kira", lat: 0.412248, lng: 32.623334, radius: 150 },
  { id: "ST-0106", name: "Shell Janda", brand: "Shell", area: "Kira", lat: 0.390974, lng: 32.6588, radius: 150 },
  { id: "ST-0107", name: "Shell Kira (Mbogo Road 1)", brand: "Shell", area: "Kira", lat: 0.400465, lng: 32.641236, radius: 150 },
  { id: "ST-0108", name: "Shell Kira (Namugongo Road)", brand: "Shell", area: "Kira", lat: 0.3806, lng: 32.6468, radius: 150 },
  { id: "ST-0109", name: "Shell Kira (Old Kiira Road)", brand: "Shell", area: "Kira", lat: 0.396752, lng: 32.638408, radius: 150 },
  { id: "ST-0110", name: "Shell Kyaliwajjala", brand: "Shell", area: "Kira", lat: 0.388524, lng: 32.643124, radius: 150 },
  { id: "ST-0111", name: "Shell Rushere", brand: "Shell", area: "Kiruhura", lat: -0.21107, lng: 30.952297, radius: 150 },
  { id: "ST-0112", name: "Shell Kisoro (Kisoro-Kabale Rd)", brand: "Shell", area: "Kisoro", lat: -1.282628, lng: 29.701411, radius: 150 },
  { id: "ST-0113", name: "Shell Kisubi (Kampala-Entebbe Rd)", brand: "Shell", area: "Kisubi", lat: 0.112289, lng: 32.527307, radius: 150 },
  { id: "ST-0114", name: "Shell Kitende", brand: "Shell", area: "Kitende", lat: 0.199997, lng: 32.539511, radius: 150 },
  { id: "ST-0115", name: "Shell Kitgum (Gulu-Kitgum Rd)", brand: "Shell", area: "Kitgum", lat: 3.288485, lng: 32.87895, radius: 150 },
  { id: "ST-0116", name: "Shell Koboko (Kaya Hwy)", brand: "Shell", area: "Koboko", lat: 3.401599, lng: 30.958219, radius: 150 },
  { id: "ST-0117", name: "Shell Kumi", brand: "Shell", area: "Kumi", lat: 1.489262, lng: 33.936366, radius: 150 },
  { id: "ST-0118", name: "Shell Kumi Road (CXQ9+HQF)", brand: "Shell", area: "Kumi", lat: 1.438935, lng: 33.969428, radius: 150 },
  { id: "ST-0119", name: "Shell Kyegegwa (Mubende-Fort Portal Rd)", brand: "Shell", area: "Kyegegwa", lat: 0.481415, lng: 31.054212, radius: 150 },
  { id: "ST-0120", name: "Shell Kyengera", brand: "Shell", area: "Kyengera", lat: 0.29056, lng: 32.498671, radius: 150 },
  { id: "ST-0121", name: "Shell Kyenjojo (Kyenjojo-Hoima Rd)", brand: "Shell", area: "Kyenjojo", lat: 0.612046, lng: 30.64332, radius: 150 },
  { id: "ST-0122", name: "Shell Kyotera", brand: "Shell", area: "Kyotera", lat: -0.631731, lng: 31.546502, radius: 150 },
  { id: "ST-0123", name: "Shell Lira (Juba Road)", brand: "Shell", area: "Lira", lat: 2.249163, lng: 32.882855, radius: 150 },
  { id: "ST-0124", name: "Shell Lira (Juba Road)", brand: "Shell", area: "Lira", lat: 2.243991, lng: 32.886742, radius: 150 },
  { id: "ST-0125", name: "Shell Lira (Obote Ave)", brand: "Shell", area: "Lira", lat: 2.244839, lng: 32.898679, radius: 150 },
  { id: "ST-0126", name: "Shell Lugazi (A109 Kampala-Jinja Hwy)", brand: "Shell", area: "Lugazi", lat: 0.369179, lng: 32.938161, radius: 150 },
  { id: "ST-0127", name: "Shell Lukaya", brand: "Shell", area: "Lukaya", lat: -0.143801, lng: 31.87857, radius: 150 },
  { id: "ST-0128", name: "Shell Luwero", brand: "Shell", area: "Luweero", lat: 0.84417, lng: 32.492142, radius: 150 },
  { id: "ST-0129", name: "Shell Lyantonde", brand: "Shell", area: "Lyantonde", lat: -0.405289, lng: 31.155939, radius: 150 },
  { id: "ST-0130", name: "Shell Buddu", brand: "Shell", area: "Masaka", lat: -0.344243, lng: 31.736407, radius: 150 },
  { id: "ST-0131", name: "Shell Masaka (Masaka Hwy)", brand: "Shell", area: "Masaka", lat: -0.30685, lng: 31.770691, radius: 150 },
  { id: "ST-0132", name: "Shell Masindi (Kampala-Masindi Rd)", brand: "Shell", area: "Masindi", lat: 1.682275, lng: 31.723507, radius: 150 },
  { id: "ST-0133", name: "Shell Masindi (Masindi-Hoima Rd)", brand: "Shell", area: "Masindi", lat: 1.690021, lng: 31.714483, radius: 150 },
  { id: "ST-0134", name: "Shell Kawanda-Matugga", brand: "Shell", area: "Matugga", lat: 0.444435, lng: 32.528489, radius: 150 },
  { id: "ST-0135", name: "Shell Mayuge", brand: "Shell", area: "Mayuge", lat: 0.478283, lng: 33.42714, radius: 150 },
  { id: "ST-0136", name: "Shell Cathedral Avenue", brand: "Shell", area: "Mbale", lat: 1.06939, lng: 34.181766, radius: 150 },
  { id: "ST-0137", name: "Shell Mbale (Kumi Rd)", brand: "Shell", area: "Mbale", lat: 1.077718, lng: 34.178731, radius: 150 },
  { id: "ST-0138", name: "Shell Mbale (Mbale-Soroti Rd)", brand: "Shell", area: "Mbale", lat: 1.090665, lng: 34.176915, radius: 150 },
  { id: "ST-0139", name: "Shell Mbale (Mbale-Tirinyi Rd)", brand: "Shell", area: "Mbale", lat: 1.071074, lng: 34.179297, radius: 150 },
  { id: "ST-0140", name: "Shell Ankole", brand: "Shell", area: "Mbarara", lat: -0.607319, lng: 30.661614, radius: 150 },
  { id: "ST-0141", name: "Shell Biharwe", brand: "Shell", area: "Mbarara", lat: -0.566182, lng: 30.701375, radius: 150 },
  { id: "ST-0142", name: "Shell Makenke", brand: "Shell", area: "Mbarara", lat: -0.584936, lng: 30.678527, radius: 150 },
  { id: "ST-0143", name: "Shell Mbarara (9MX7+JFX near Mbarara roundabout)", brand: "Shell", area: "Mbarara", lat: -0.600876, lng: 30.663719, radius: 150 },
  { id: "ST-0144", name: "Shell Mbarara ByPass", brand: "Shell", area: "Mbarara", lat: -0.582821, lng: 30.654401, radius: 150 },
  { id: "ST-0145", name: "Shell Mityana", brand: "Shell", area: "Mityana", lat: 0.3997, lng: 32.045107, radius: 150 },
  { id: "ST-0146", name: "Shell Mityana (A109 Kampala-Mityana Rd)", brand: "Shell", area: "Mityana", lat: 0.391934, lng: 32.067989, radius: 150 },
  { id: "ST-0147", name: "Shell Wabigalo", brand: "Shell", area: "Mityana", lat: 0.401827, lng: 32.043776, radius: 150 },
  { id: "ST-0148", name: "Shell Moroto", brand: "Shell", area: "Moroto", lat: 2.532766, lng: 34.657336, radius: 150 },
  { id: "ST-0149", name: "Shell Mpigi (Masaka Hwy)", brand: "Shell", area: "Mpigi", lat: 0.035474, lng: 32.076663, radius: 150 },
  { id: "ST-0150", name: "Shell Kakumiro Road", brand: "Shell", area: "Mubende", lat: 0.564719, lng: 31.389499, radius: 150 },
  { id: "ST-0151", name: "Shell Katosi Rd Wantone", brand: "Shell", area: "Mukono", lat: 0.354866, lng: 32.752014, radius: 150 },
  { id: "ST-0152", name: "Shell Mbalala", brand: "Shell", area: "Mukono", lat: 0.351717, lng: 32.777544, radius: 150 },
  { id: "ST-0153", name: "Shell Mukono (Kyagwe Rd / Kampala-Jinja Hwy)", brand: "Shell", area: "Mukono", lat: 0.356081, lng: 32.754808, radius: 150 },
  { id: "ST-0154", name: "Shell Nasuuti", brand: "Shell", area: "Mukono", lat: 0.371486, lng: 32.755367, radius: 150 },
  { id: "ST-0155", name: "Shell Nakasongola (Valley Rd)", brand: "Shell", area: "Nakasongola", lat: 1.311898, lng: 32.463708, radius: 150 },
  { id: "ST-0156", name: "Shell Nansana (9G4M+4VC near Kibuloka)", brand: "Shell", area: "Nansana", lat: 0.355302, lng: 32.534638, radius: 150 },
  { id: "ST-0157", name: "Shell Nansana West I (Hoima Rd)", brand: "Shell", area: "Nansana", lat: 0.367916, lng: 32.521311, radius: 150 },
  { id: "ST-0158", name: "Shell Nansana West II (Hoima Rd)", brand: "Shell", area: "Nansana", lat: 0.36787, lng: 32.523498, radius: 150 },
  { id: "ST-0159", name: "Shell Nsangi (Masaka Hwy)", brand: "Shell", area: "Nsangi", lat: 0.282082, lng: 32.45173, radius: 150 },
  { id: "ST-0160", name: "Shell Ntungamo", brand: "Shell", area: "Ntungamo", lat: -0.864198, lng: 30.270397, radius: 150 },
  { id: "ST-0161", name: "Shell Rukungiri (6W5G+JF5)", brand: "Shell", area: "Rukungiri", lat: -0.790685, lng: 29.926564, radius: 150 },
  { id: "ST-0162", name: "Shell Ssonde", brand: "Shell", area: "Seeta", lat: 0.396038, lng: 32.700377, radius: 150 },
  { id: "ST-0163", name: "Shell Ssembabule", brand: "Shell", area: "Sembabule", lat: -0.087241, lng: 31.471498, radius: 150 },
  { id: "ST-0164", name: "Shell Soroti (Mbale-Soroti Rd)", brand: "Shell", area: "Soroti", lat: 1.715599, lng: 33.616101, radius: 150 },
  { id: "ST-0165", name: "Shell Soroti (opposite Public Gardens)", brand: "Shell", area: "Soroti", lat: 1.715558, lng: 33.622519, radius: 150 },
  { id: "ST-0166", name: "Shell Tirinyi", brand: "Shell", area: "Tirinyi", lat: 1.000147, lng: 33.761789, radius: 150 },
  { id: "ST-0167", name: "Shell Tororo (Mbale Rd)", brand: "Shell", area: "Tororo", lat: 0.696055, lng: 34.181507, radius: 150 },
  { id: "ST-0168", name: "Shell Bugema", brand: "Shell", area: "Wakiso", lat: 0.571649, lng: 32.64434, radius: 150 },
  { id: "ST-0169", name: "Shell Naluvule", brand: "Shell", area: "Wakiso", lat: 0.391597, lng: 32.504479, radius: 150 },
  { id: "ST-0170", name: "Shell Namanve", brand: "Shell", area: "Wakiso", lat: 0.359553, lng: 32.690005, radius: 150 },
  { id: "ST-0171", name: "Shell Namusera", brand: "Shell", area: "Wakiso", lat: 0.411721, lng: 32.460873, radius: 150 },
  { id: "ST-0172", name: "Shell Wakiso (Gayaza-Kampala Rd)", brand: "Shell", area: "Wakiso", lat: 0.436693, lng: 32.602223, radius: 150 },
  { id: "ST-0173", name: "Shell Wobulenzi (Kampala-Masindi Rd)", brand: "Shell", area: "Wobulenzi", lat: 0.718489, lng: 32.528059, radius: 150 },
  { id: "ST-0174", name: "TotalEnergies Adjumani Service Station", brand: "TotalEnergies", area: "Adjumani", lat: 3.380107, lng: 31.791207, radius: 150 },
  { id: "ST-0175", name: "TotalEnergies Arua Nile Service Station", brand: "TotalEnergies", area: "Arua", lat: 3.020385, lng: 30.911195, radius: 150 },
  { id: "ST-0176", name: "TotalEnergies Arua Service Station", brand: "TotalEnergies", area: "Arua", lat: 3.015282, lng: 30.914501, radius: 150 },
  { id: "ST-0177", name: "TotalEnergies Bombo Service Station", brand: "TotalEnergies", area: "Bombo", lat: 0.589006, lng: 32.532564, radius: 150 },
  { id: "ST-0178", name: "TotalEnergies Bugiri Service Station", brand: "TotalEnergies", area: "Bugiri", lat: 0.565733, lng: 33.753237, radius: 150 },
  { id: "ST-0179", name: "TotalEnergies Bukedea Service Station", brand: "TotalEnergies", area: "Bukedea", lat: 1.343333, lng: 34.049413, radius: 150 },
  { id: "ST-0180", name: "TotalEnergies Bulenga Service Station", brand: "TotalEnergies", area: "Buloba", lat: 0.329168, lng: 32.477954, radius: 150 },
  { id: "ST-0181", name: "Total Busia", brand: "TotalEnergies", area: "Busia", lat: 0.441355, lng: 34.057042, radius: 150 },
  { id: "ST-0182", name: "Total Bweyale", brand: "TotalEnergies", area: "Bweyale", lat: 1.957763, lng: 32.145138, radius: 150 },
  { id: "ST-0183", name: "TotalEnergies Entebbe Service Station", brand: "TotalEnergies", area: "Entebbe", lat: 0.069086, lng: 32.475869, radius: 150 },
  { id: "ST-0184", name: "TotalEnergies Katabi Service Station", brand: "TotalEnergies", area: "Entebbe", lat: 0.077533, lng: 32.47956, radius: 150 },
  { id: "ST-0185", name: "TotalEnergies Kitooro Service Station", brand: "TotalEnergies", area: "Entebbe", lat: 0.054726, lng: 32.461651, radius: 150 },
  { id: "ST-0186", name: "TotalEnergies Kabarole Service Station", brand: "TotalEnergies", area: "Fort Portal", lat: 0.652165, lng: 30.274447, radius: 150 },
  { id: "ST-0187", name: "TotalEnergies Acholi Road Service Station", brand: "TotalEnergies", area: "Gulu", lat: 2.769943, lng: 32.298268, radius: 150 },
  { id: "ST-0188", name: "TotalEnergies Hoima Main Street Service Station", brand: "TotalEnergies", area: "Hoima", lat: 1.429808, lng: 31.353763, radius: 150 },
  { id: "ST-0189", name: "TotalEnergies Hoima Service Station", brand: "TotalEnergies", area: "Hoima", lat: 1.42742, lng: 31.344716, radius: 150 },
  { id: "ST-0190", name: "TotalEnergies Ibanda Service Station", brand: "TotalEnergies", area: "Ibanda", lat: -0.138023, lng: 30.489646, radius: 150 },
  { id: "ST-0191", name: "TotalEnergies Iganga Service Station", brand: "TotalEnergies", area: "Iganga", lat: 0.615946, lng: 33.480524, radius: 150 },
  { id: "ST-0192", name: "TotalEnergies Nakavule Service Station", brand: "TotalEnergies", area: "Iganga", lat: 0.615639, lng: 33.481202, radius: 150 },
  { id: "ST-0193", name: "Total Service Station Ishaka", brand: "TotalEnergies", area: "Ishaka", lat: -0.540573, lng: 30.143903, radius: 150 },
  { id: "ST-0194", name: "TotalEnergies Bugembe Service Station", brand: "TotalEnergies", area: "Jinja", lat: 0.466977, lng: 33.239342, radius: 150 },
  { id: "ST-0195", name: "TotalEnergies Gokhale Service Station", brand: "TotalEnergies", area: "Jinja", lat: 0.432671, lng: 33.213724, radius: 150 },
  { id: "ST-0196", name: "TotalEnergies Jinja Highway Service Station", brand: "TotalEnergies", area: "Jinja", lat: 0.440877, lng: 33.212381, radius: 150 },
  { id: "ST-0197", name: "TotalEnergies Jinja Lake View Service Station", brand: "TotalEnergies", area: "Jinja", lat: 0.453031, lng: 33.21896, radius: 150 },
  { id: "ST-0198", name: "TotalEnergies Jinja Main Street Service Station", brand: "TotalEnergies", area: "Jinja", lat: 0.431965, lng: 33.210888, radius: 150 },
  { id: "ST-0199", name: "TotalEnergies Nalufenya Service Station", brand: "TotalEnergies", area: "Jinja", lat: 0.432078, lng: 33.208789, radius: 150 },
  { id: "ST-0200", name: "TotalEnergies Bunyonyi Service Station", brand: "TotalEnergies", area: "Kabale", lat: -1.254985, lng: 30.001279, radius: 150 },
  { id: "ST-0201", name: "TotalEnergies Kabale Service Station", brand: "TotalEnergies", area: "Kabale", lat: -1.256577, lng: 29.989879, radius: 150 },
  { id: "ST-0202", name: "TotalEnergies Kagadi Filling Station", brand: "TotalEnergies", area: "Kagadi", lat: 0.938141, lng: 30.809677, radius: 150 },
  { id: "ST-0203", name: "TotalEnergies Kajjansi Service Station", brand: "TotalEnergies", area: "Kajjansi", lat: 0.21133, lng: 32.542001, radius: 150 },
  { id: "ST-0204", name: "TotalEnergies Kakiri", brand: "TotalEnergies", area: "Kakiri", lat: 0.42005, lng: 32.396223, radius: 150 },
  { id: "ST-0205", name: "TOTAL ENERGIES NAJJERA 2", brand: "TotalEnergies", area: "Kampala", lat: 0.394472, lng: 32.632386, radius: 150 },
  { id: "ST-0206", name: "Total Bunga Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.265693, lng: 32.624397, radius: 150 },
  { id: "ST-0207", name: "Total Fuel Station (Bwaise)", brand: "TotalEnergies", area: "Kampala", lat: 0.353561, lng: 32.562987, radius: 150 },
  { id: "ST-0208", name: "TotalEnergies Acacia Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.338998, lng: 32.586429, radius: 150 },
  { id: "ST-0209", name: "TotalEnergies Bakuli Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.314384, lng: 32.564537, radius: 150 },
  { id: "ST-0210", name: "TotalEnergies Ben Kiwanuka Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.309551, lng: 32.577143, radius: 150 },
  { id: "ST-0211", name: "TotalEnergies Bukesa Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.319792, lng: 32.563293, radius: 150 },
  { id: "ST-0212", name: "TotalEnergies Bukoto Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.345356, lng: 32.597028, radius: 150 },
  { id: "ST-0213", name: "TotalEnergies Bunamwaya Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.267005, lng: 32.546107, radius: 150 },
  { id: "ST-0214", name: "TotalEnergies Bwaise-Kikoni Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.348404, lng: 32.563004, radius: 150 },
  { id: "ST-0215", name: "TotalEnergies City Center Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.312801, lng: 32.584368, radius: 150 },
  { id: "ST-0216", name: "TotalEnergies Clock Tower Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.306897, lng: 32.579914, radius: 150 },
  { id: "ST-0217", name: "TotalEnergies Gayaza Road Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.343871, lng: 32.571159, radius: 150 },
  { id: "ST-0218", name: "TotalEnergies Hoima Rd Nansana Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.335162, lng: 32.548343, radius: 150 },
  { id: "ST-0219", name: "TotalEnergies Horizon Ndeeba Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.292768, lng: 32.565239, radius: 150 },
  { id: "ST-0220", name: "TotalEnergies Jinja Road Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.314538, lng: 32.590686, radius: 150 },
  { id: "ST-0221", name: "TotalEnergies Kabuusu Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.29466, lng: 32.552776, radius: 150 },
  { id: "ST-0222", name: "TotalEnergies Kalerwe Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.348072, lng: 32.571113, radius: 150 },
  { id: "ST-0223", name: "TotalEnergies Katwe Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.299941, lng: 32.576351, radius: 150 },
  { id: "ST-0224", name: "TotalEnergies Kavule Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.343754, lng: 32.569561, radius: 150 },
  { id: "ST-0225", name: "TotalEnergies Kawempe Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.366822, lng: 32.559448, radius: 150 },
  { id: "ST-0226", name: "TotalEnergies Kibuli Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.306509, lng: 32.600713, radius: 150 },
  { id: "ST-0227", name: "TotalEnergies Kibuye Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.291022, lng: 32.571483, radius: 150 },
  { id: "ST-0228", name: "TotalEnergies Kikaaya", brand: "TotalEnergies", area: "Kampala", lat: 0.364796, lng: 32.584753, radius: 150 },
  { id: "ST-0229", name: "TotalEnergies Kireka Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.346432, lng: 32.64762, radius: 150 },
  { id: "ST-0230", name: "TotalEnergies Kitintale Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.303581, lng: 32.644186, radius: 150 },
  { id: "ST-0231", name: "TotalEnergies Kiwatule Road Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.356397, lng: 32.615227, radius: 150 },
  { id: "ST-0232", name: "TotalEnergies Komamboga", brand: "TotalEnergies", area: "Kampala", lat: 0.381617, lng: 32.5876, radius: 150 },
  { id: "ST-0233", name: "TotalEnergies Kyanja Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.395082, lng: 32.593651, radius: 150 },
  { id: "ST-0234", name: "TotalEnergies Kyebando Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.357558, lng: 32.573782, radius: 150 },
  { id: "ST-0235", name: "TotalEnergies Kyengera Ward Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.296547, lng: 32.505297, radius: 150 },
  { id: "ST-0236", name: "TotalEnergies Lubiri Hill Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.303941, lng: 32.574329, radius: 150 },
  { id: "ST-0237", name: "TotalEnergies Luzira Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.301079, lng: 32.647583, radius: 150 },
  { id: "ST-0238", name: "TotalEnergies Maganjo Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.387522, lng: 32.551747, radius: 150 },
  { id: "ST-0239", name: "TotalEnergies Makerere Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.329828, lng: 32.572968, radius: 150 },
  { id: "ST-0240", name: "TotalEnergies Mengo Star Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.31159, lng: 32.559609, radius: 150 },
  { id: "ST-0241", name: "TotalEnergies Munyonyo Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.240933, lng: 32.619758, radius: 150 },
  { id: "ST-0242", name: "TotalEnergies Nabweru Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.360758, lng: 32.531157, radius: 150 },
  { id: "ST-0243", name: "TotalEnergies Najjanankumbi Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.289447, lng: 32.570449, radius: 150 },
  { id: "ST-0244", name: "TotalEnergies Nakawa Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.326814, lng: 32.611048, radius: 150 },
  { id: "ST-0245", name: "TotalEnergies Nakulabye Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.325123, lng: 32.559851, radius: 150 },
  { id: "ST-0246", name: "TotalEnergies Nakwero Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.460273, lng: 32.637485, radius: 150 },
  { id: "ST-0247", name: "TotalEnergies Namasuba II Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.267864, lng: 32.565941, radius: 150 },
  { id: "ST-0248", name: "TotalEnergies Nansana Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.372448, lng: 32.521861, radius: 150 },
  { id: "ST-0249", name: "TotalEnergies Nateete Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.301237, lng: 32.528005, radius: 150 },
  { id: "ST-0250", name: "TotalEnergies Ndeeba Mbawo Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.293264, lng: 32.570343, radius: 150 },
  { id: "ST-0251", name: "TotalEnergies Nsambya Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.303135, lng: 32.585919, radius: 150 },
  { id: "ST-0252", name: "TotalEnergies Ntinda Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.353636, lng: 32.611214, radius: 150 },
  { id: "ST-0253", name: "TotalEnergies Old Port Bell Road Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.318337, lng: 32.597953, radius: 150 },
  { id: "ST-0254", name: "TotalEnergies Salama Road Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.256486, lng: 32.604703, radius: 150 },
  { id: "ST-0255", name: "TotalEnergies Seeta Highway Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.368302, lng: 32.711643, radius: 150 },
  { id: "ST-0256", name: "TotalEnergies Seguku Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.234806, lng: 32.553153, radius: 150 },
  { id: "ST-0257", name: "TotalEnergies Wakaliga Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.300757, lng: 32.536998, radius: 150 },
  { id: "ST-0258", name: "TotalEnergies Wampewo Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.319755, lng: 32.595382, radius: 150 },
  { id: "ST-0259", name: "TotalEnergies Wandegeya Service Station", brand: "TotalEnergies", area: "Kampala", lat: 0.334755, lng: 32.572995, radius: 150 },
  { id: "ST-0260", name: "TotalEnergies Bugabula Service Station", brand: "TotalEnergies", area: "Kamuli", lat: 0.942698, lng: 33.122499, radius: 150 },
  { id: "ST-0261", name: "TotalEnergies Kamuli Service Station", brand: "TotalEnergies", area: "Kamuli", lat: 0.944167, lng: 33.12388, radius: 150 },
  { id: "ST-0262", name: "TotalEnergies Bulamu Service Station", brand: "TotalEnergies", area: "Kasangati", lat: 0.44112, lng: 32.606403, radius: 150 },
  { id: "ST-0263", name: "TotalEnergies Kasangati Service Station", brand: "TotalEnergies", area: "Kasangati", lat: 0.437576, lng: 32.602016, radius: 150 },
  { id: "ST-0264", name: "Total Kasese Star", brand: "TotalEnergies", area: "Kasese", lat: 0.174036, lng: 30.086738, radius: 150 },
  { id: "ST-0265", name: "TotalEnergies Mpondwe Road Service Station", brand: "TotalEnergies", area: "Kasese", lat: 0.171458, lng: 30.084982, radius: 150 },
  { id: "ST-0266", name: "TotalEnergies Rwenzori Service Station", brand: "TotalEnergies", area: "Kasese", lat: 0.172446, lng: 30.081004, radius: 150 },
  { id: "ST-0267", name: "Total Petrol Station", brand: "TotalEnergies", area: "Kasese district", lat: 0.296142, lng: 30.17982, radius: 150 },
  { id: "ST-0268", name: "TotalEnergies Kayunga Service Station", brand: "TotalEnergies", area: "Kayunga", lat: 0.699032, lng: 32.904513, radius: 150 },
  { id: "ST-0269", name: "TotalEnergies Kiboga Service Station", brand: "TotalEnergies", area: "Kiboga", lat: 0.909125, lng: 31.77883, radius: 150 },
  { id: "ST-0270", name: "TotalEnergies Bulindo Service Station", brand: "TotalEnergies", area: "Kira", lat: 0.408489, lng: 32.64231, radius: 150 },
  { id: "ST-0271", name: "TotalEnergies Buwate 2 Service Station", brand: "TotalEnergies", area: "Kira", lat: 0.40844, lng: 32.619864, radius: 150 },
  { id: "ST-0272", name: "TotalEnergies Bweyogerere Service Station", brand: "TotalEnergies", area: "Kira", lat: 0.35241, lng: 32.660815, radius: 150 },
  { id: "ST-0273", name: "TotalEnergies Kiwologoma Service Station", brand: "TotalEnergies", area: "Kira", lat: 0.433258, lng: 32.652046, radius: 150 },
  { id: "ST-0274", name: "TotalEnergies Kyaliwajjala Service Station", brand: "TotalEnergies", area: "Kira", lat: 0.385415, lng: 32.644016, radius: 150 },
  { id: "ST-0275", name: "TotalEnergies Naalya Service Station", brand: "TotalEnergies", area: "Kira", lat: 0.374783, lng: 32.643752, radius: 150 },
  { id: "ST-0276", name: "TotalEnergies Namanve Service Station", brand: "TotalEnergies", area: "Kira", lat: 0.353858, lng: 32.671366, radius: 150 },
  { id: "ST-0277", name: "TotalEnergies Nsasa", brand: "TotalEnergies", area: "Kira", lat: 0.417571, lng: 32.659279, radius: 150 },
  { id: "ST-0278", name: "TotalEnergies Buwate Service Station", brand: "TotalEnergies", area: "Kira Town", lat: 0.409063, lng: 32.629055, radius: 150 },
  { id: "ST-0279", name: "TotalEnergies Kitgum I Service Station", brand: "TotalEnergies", area: "Kitgum", lat: 3.299799, lng: 32.877267, radius: 150 },
  { id: "ST-0280", name: "TotalEnergies Kitgum II Service Station", brand: "TotalEnergies", area: "Kitgum", lat: 3.296854, lng: 32.882482, radius: 150 },
  { id: "ST-0281", name: "TotalEnergies Kotido Service Station", brand: "TotalEnergies", area: "Kotido", lat: 3.006898, lng: 34.114568, radius: 150 },
  { id: "ST-0282", name: "Total Kyazanga Service Station", brand: "TotalEnergies", area: "Kyazanga", lat: -0.391425, lng: 31.325092, radius: 150 },
  { id: "ST-0283", name: "TotalEnergies Kyengera Service Station", brand: "TotalEnergies", area: "Kyengera", lat: 0.292045, lng: 32.500815, radius: 150 },
  { id: "ST-0284", name: "Total Kyenjojo", brand: "TotalEnergies", area: "Kyenjojo", lat: 0.611721, lng: 30.646083, radius: 150 },
  { id: "ST-0285", name: "TotalEnergies Kyotera Service Station", brand: "TotalEnergies", area: "Kyotera", lat: -0.634254, lng: 31.54145, radius: 150 },
  { id: "ST-0286", name: "Total Lira Service Station", brand: "TotalEnergies", area: "Lira", lat: 2.234533, lng: 32.892883, radius: 150 },
  { id: "ST-0287", name: "TotalEnergies Lugazi Service Station", brand: "TotalEnergies", area: "Lugazi", lat: 0.368966, lng: 32.937499, radius: 150 },
  { id: "ST-0288", name: "TotalEnergies Luweero Service Station", brand: "TotalEnergies", area: "Luweero", lat: 0.849833, lng: 32.487577, radius: 150 },
  { id: "ST-0289", name: "TotalEnergies Lyantonde Service Station", brand: "TotalEnergies", area: "Lyantonde", lat: -0.404199, lng: 31.158247, radius: 150 },
  { id: "ST-0290", name: "Kyotera Total Service Station (Masaka)", brand: "TotalEnergies", area: "Masaka", lat: -0.365293, lng: 31.717321, radius: 150 },
  { id: "ST-0291", name: "TotalEnergies Masaka Center Service Station", brand: "TotalEnergies", area: "Masaka", lat: -0.340213, lng: 31.738084, radius: 150 },
  { id: "ST-0292", name: "TotalEnergies Masaka Service Station", brand: "TotalEnergies", area: "Masaka", lat: -0.34414, lng: 31.734918, radius: 150 },
  { id: "ST-0293", name: "TotalEnergies Nyendo Broadway Service Station", brand: "TotalEnergies", area: "Masaka", lat: -0.320017, lng: 31.758211, radius: 150 },
  { id: "ST-0294", name: "TotalEnergies Nyendo Highway Service Station", brand: "TotalEnergies", area: "Masaka", lat: -0.308951, lng: 31.763455, radius: 150 },
  { id: "ST-0295", name: "TotalEnergies Masindi Centre Service Station", brand: "TotalEnergies", area: "Masindi", lat: 1.681357, lng: 31.702885, radius: 150 },
  { id: "ST-0296", name: "TotalEnergies Matugga", brand: "TotalEnergies", area: "Matugga", lat: 0.474895, lng: 32.518032, radius: 150 },
  { id: "ST-0297", name: "TotalEnergies Mayuge Service Station", brand: "TotalEnergies", area: "Mayuge", lat: 0.457795, lng: 33.484867, radius: 150 },
  { id: "ST-0298", name: "TotalEnergies Bugisu Service Station", brand: "TotalEnergies", area: "Mbale", lat: 1.065812, lng: 34.180651, radius: 150 },
  { id: "ST-0299", name: "TotalEnergies Masaba Service Station", brand: "TotalEnergies", area: "Mbale", lat: 1.079264, lng: 34.154409, radius: 150 },
  { id: "ST-0300", name: "TotalEnergies Mbale Republic Service Station", brand: "TotalEnergies", area: "Mbale", lat: 1.072172, lng: 34.181412, radius: 150 },
  { id: "ST-0301", name: "TotalEnergies Mbale Sanyu Service Station", brand: "TotalEnergies", area: "Mbale", lat: 1.084377, lng: 34.178992, radius: 150 },
  { id: "ST-0302", name: "TotalEnergies Nabuyonga Service Station", brand: "TotalEnergies", area: "Mbale", lat: 1.07625, lng: 34.175006, radius: 150 },
  { id: "ST-0303", name: "TotalEnergies Mbarara High Street Service Station", brand: "TotalEnergies", area: "Mbarara", lat: -0.603136, lng: 30.663256, radius: 150 },
  { id: "ST-0304", name: "TotalEnergies Mbarara Lake View Service Station", brand: "TotalEnergies", area: "Mbarara", lat: -0.611867, lng: 30.635948, radius: 150 },
  { id: "ST-0305", name: "TotalEnergies Mbarara Service Station", brand: "TotalEnergies", area: "Mbarara", lat: -0.616101, lng: 30.64622, radius: 150 },
  { id: "ST-0306", name: "TotalEnergies Rwizi Service Station", brand: "TotalEnergies", area: "Mbarara", lat: -0.61669, lng: 30.650741, radius: 150 },
  { id: "ST-0307", name: "TotalEnergies Service Station (Mbarara south)", brand: "TotalEnergies", area: "Mbarara", lat: -0.625101, lng: 30.633114, radius: 150 },
  { id: "ST-0308", name: "TotalEnergies Mityana High Way Service Station", brand: "TotalEnergies", area: "Mityana", lat: 0.398076, lng: 32.053774, radius: 150 },
  { id: "ST-0309", name: "TotalEnergies Moroto Service Station", brand: "TotalEnergies", area: "Moroto", lat: 2.537347, lng: 34.659275, radius: 150 },
  { id: "ST-0310", name: "Total Mpigi", brand: "TotalEnergies", area: "Mpigi", lat: 0.221233, lng: 32.335015, radius: 150 },
  { id: "ST-0311", name: "TotalEnergies Mubende Service Station", brand: "TotalEnergies", area: "Mubende", lat: 0.55523, lng: 31.393304, radius: 150 },
  { id: "ST-0312", name: "TotalEnergies Mukono Highway Service Station", brand: "TotalEnergies", area: "Mukono", lat: 0.359489, lng: 32.748234, radius: 150 },
  { id: "ST-0313", name: "TotalEnergies Mukono Service Station", brand: "TotalEnergies", area: "Mukono", lat: 0.360817, lng: 32.752707, radius: 150 },
  { id: "ST-0314", name: "TotalEnergies Nagalama Service Station", brand: "TotalEnergies", area: "Nagalama", lat: 0.51313, lng: 32.76619, radius: 150 },
  { id: "ST-0315", name: "TotalEnergies Najjera Service Station", brand: "TotalEnergies", area: "Najjera", lat: 0.385531, lng: 32.625984, radius: 150 },
  { id: "ST-0316", name: "TotalEnergies Namayingo Service Station", brand: "TotalEnergies", area: "Namayingo", lat: 0.347561, lng: 33.871064, radius: 150 },
  { id: "ST-0317", name: "TotalEnergies Nangabo Service Station", brand: "TotalEnergies", area: "Nangabo", lat: 0.442037, lng: 32.586777, radius: 150 },
  { id: "ST-0318", name: "Total Energies, Nansana Kibulooka Service Station", brand: "TotalEnergies", area: "Nansana", lat: 0.353978, lng: 32.535668, radius: 150 },
  { id: "ST-0319", name: "TotalEnergies Ntungamo Highway Service Station", brand: "TotalEnergies", area: "Ntungamo", lat: -0.867127, lng: 30.269174, radius: 150 },
  { id: "ST-0320", name: "TotalEnergies Ntungamo Service Station", brand: "TotalEnergies", area: "Ntungamo", lat: -0.877419, lng: 30.266006, radius: 150 },
  { id: "ST-0321", name: "TotalEnergies Pakwach Service Station", brand: "TotalEnergies", area: "Pakwach", lat: 2.46078, lng: 31.491368, radius: 150 },
  { id: "ST-0322", name: "TotalEnergies Rukungiri Service Station", brand: "TotalEnergies", area: "Rukungiri", lat: -0.790911, lng: 29.923751, radius: 150 },
  { id: "ST-0323", name: "TotalEnergies Misindye Service Station", brand: "TotalEnergies", area: "Seeta", lat: 0.375729, lng: 32.709664, radius: 150 },
  { id: "ST-0324", name: "TotalEnergies Soroti Service Station", brand: "TotalEnergies", area: "Soroti", lat: 1.715606, lng: 33.625145, radius: 150 },
  { id: "ST-0325", name: "TotalEnergies Rock View Tororo Service Station", brand: "TotalEnergies", area: "Tororo", lat: 0.688561, lng: 34.180094, radius: 150 },
  { id: "ST-0326", name: "TotalEnergies Tororo Service Station", brand: "TotalEnergies", area: "Tororo", lat: 0.668689, lng: 34.18873, radius: 150 },
  { id: "ST-0327", name: "TotalEnergies Kitetika Service Station", brand: "TotalEnergies", area: "Wakiso", lat: 0.405929, lng: 32.590134, radius: 150 },
  { id: "ST-0328", name: "TotalEnergies Naluvule Service Station", brand: "TotalEnergies", area: "Wakiso", lat: 0.394123, lng: 32.500005, radius: 150 },
  { id: "ST-0329", name: "Rubis Bugiri Petrol Station", brand: "Rubis", area: "Bugiri", lat: 0.572578, lng: 33.745671, radius: 150 },
  { id: "ST-0330", name: "Rubis Bulenga", brand: "Rubis", area: "Bulenga", lat: 0.314997, lng: 32.512534, radius: 150 },
  { id: "ST-0331", name: "Rubis Bushenyi Service Station", brand: "Rubis", area: "Bushenyi", lat: -0.541211, lng: 30.191789, radius: 150 },
  { id: "ST-0332", name: "Rubis Buwama 1 Service Station", brand: "Rubis", area: "Buwama", lat: 0.061722, lng: 32.104357, radius: 150 },
  { id: "ST-0333", name: "Rubis Buwenge Service Station", brand: "Rubis", area: "Buwenge", lat: 0.653685, lng: 33.16735, radius: 150 },
  { id: "ST-0334", name: "Rubis Bwebajja", brand: "Rubis", area: "Bwebajja", lat: 0.17248, lng: 32.540114, radius: 150 },
  { id: "ST-0335", name: "Rubis Kazinga", brand: "Rubis", area: "Bweyogerere", lat: 0.31545, lng: 32.591739, radius: 150 },
  { id: "ST-0336", name: "Rubis Kabarole Service Station", brand: "Rubis", area: "Fort Portal", lat: 0.650505, lng: 30.272797, radius: 150 },
  { id: "ST-0337", name: "Rubis Gulu (formerly Kobil)", brand: "Rubis", area: "Gulu", lat: 2.76603, lng: 32.29918, radius: 150 },
  { id: "ST-0338", name: "Rubis Iganga 1 Service Station", brand: "Rubis", area: "Iganga", lat: 0.601904, lng: 33.460073, radius: 150 },
  { id: "ST-0339", name: "Rubis Iganga 2 Service Station", brand: "Rubis", area: "Iganga", lat: 0.612417, lng: 33.471764, radius: 150 },
  { id: "ST-0340", name: "Rubis Jinja", brand: "Rubis", area: "Jinja", lat: 0.43161, lng: 33.208972, radius: 150 },
  { id: "ST-0341", name: "Rubis Jinja Highway Service Station", brand: "Rubis", area: "Jinja", lat: 0.45104, lng: 33.21889, radius: 150 },
  { id: "ST-0342", name: "Rubis Kabale 2 Service Station", brand: "Rubis", area: "Kabale", lat: -1.258222, lng: 30.012595, radius: 150 },
  { id: "ST-0343", name: "Rubis Bombo Road", brand: "Rubis", area: "Kampala", lat: 0.32184, lng: 32.573768, radius: 150 },
  { id: "ST-0344", name: "Rubis Gayaza Road", brand: "Rubis", area: "Kampala", lat: 0.356205, lng: 32.572969, radius: 150 },
  { id: "ST-0345", name: "Rubis Kamwokya (listed on maps as Namugongo)", brand: "Rubis", area: "Kampala", lat: 0.3456, lng: 32.585347, radius: 150 },
  { id: "ST-0346", name: "Rubis Kansanga", brand: "Rubis", area: "Kampala", lat: 0.291152, lng: 32.605721, radius: 150 },
  { id: "ST-0347", name: "Rubis Kasubi", brand: "Rubis", area: "Kampala", lat: 0.332193, lng: 32.556447, radius: 150 },
  { id: "ST-0348", name: "Rubis Kawempe", brand: "Rubis", area: "Kampala", lat: 0.380141, lng: 32.556831, radius: 150 },
  { id: "ST-0349", name: "Rubis Kibuye Service Station", brand: "Rubis", area: "Kampala", lat: 0.291619, lng: 32.571961, radius: 150 },
  { id: "ST-0350", name: "Rubis Kisenyi Service Station", brand: "Rubis", area: "Kampala", lat: 0.308589, lng: 32.570103, radius: 150 },
  { id: "ST-0351", name: "Rubis Maganjo Service Station", brand: "Rubis", area: "Kampala", lat: 0.401046, lng: 32.545562, radius: 150 },
  { id: "ST-0352", name: "Rubis Makerere", brand: "Rubis", area: "Kampala", lat: 0.327614, lng: 32.568117, radius: 150 },
  { id: "ST-0353", name: "Rubis Mpererwe Service Station", brand: "Rubis", area: "Kampala", lat: 0.382132, lng: 32.576824, radius: 150 },
  { id: "ST-0354", name: "Rubis Nalukolongo Service Station", brand: "Rubis", area: "Kampala", lat: 0.291705, lng: 32.549851, radius: 150 },
  { id: "ST-0355", name: "Rubis Namirembe Road Service Station", brand: "Rubis", area: "Kampala", lat: 0.31323, lng: 32.567764, radius: 150 },
  { id: "ST-0356", name: "Rubis Ntinda", brand: "Rubis", area: "Kampala", lat: 0.359061, lng: 32.617412, radius: 150 },
  { id: "ST-0357", name: "Rubis Kasese Service Station", brand: "Rubis", area: "Kasese", lat: 0.176312, lng: 30.087398, radius: 150 },
  { id: "ST-0358", name: "Rubis Kigumba Service Station", brand: "Rubis", area: "Kigumba", lat: 1.803201, lng: 32.009502, radius: 150 },
  { id: "ST-0359", name: "Rubis Namugongo - Agenda Service Station", brand: "Rubis", area: "Kira", lat: 0.362614, lng: 32.64798, radius: 150 },
  { id: "ST-0360", name: "Rubis Kyengera Service Station", brand: "Rubis", area: "Kyengera", lat: 0.298532, lng: 32.507586, radius: 150 },
  { id: "ST-0361", name: "Rubis Lira Service Station", brand: "Rubis", area: "Lira", lat: 2.245709, lng: 32.8986, radius: 150 },
  { id: "ST-0362", name: "Rubis Masaka 1 (formerly Kobil)", brand: "Rubis", area: "Masaka", lat: -0.342661, lng: 31.736881, radius: 150 },
  { id: "ST-0363", name: "Rubis Nyendo Service Station", brand: "Rubis", area: "Masaka", lat: -0.319112, lng: 31.760061, radius: 150 },
  { id: "ST-0364", name: "Rubis Masindi Service Station", brand: "Rubis", area: "Masindi", lat: 1.681817, lng: 31.720688, radius: 150 },
  { id: "ST-0365", name: "Rubis Matugga Service Station", brand: "Rubis", area: "Matugga", lat: 0.460732, lng: 32.528686, radius: 150 },
  { id: "ST-0366", name: "Rubis Mbale", brand: "Rubis", area: "Mbale", lat: 1.073168, lng: 34.179702, radius: 150 },
  { id: "ST-0367", name: "Rubis Namunsi Service Station", brand: "Rubis", area: "Mbale", lat: 1.124255, lng: 34.168324, radius: 150 },
  { id: "ST-0368", name: "Rubis Mbarara (Northern Bypass)", brand: "Rubis", area: "Mbarara", lat: -0.5902, lng: 30.630235, radius: 150 },
  { id: "ST-0369", name: "Rubis Mbarara 1 Service Station", brand: "Rubis", area: "Mbarara", lat: -0.59832, lng: 30.663829, radius: 150 },
  { id: "ST-0370", name: "Rubis Mityana 1 Service Station", brand: "Rubis", area: "Mityana", lat: 0.4057, lng: 32.044364, radius: 150 },
  { id: "ST-0371", name: "Rubis Mityana 2 Service Station", brand: "Rubis", area: "Mityana", lat: 0.404286, lng: 32.043811, radius: 150 },
  { id: "ST-0372", name: "Rubis Mukono Service Station", brand: "Rubis", area: "Mukono", lat: 0.36299, lng: 32.753393, radius: 150 },
  { id: "ST-0373", name: "Rubis Nabbingo", brand: "Rubis", area: "Nabbingo", lat: 0.278419, lng: 32.479863, radius: 150 },
  { id: "ST-0374", name: "Rubis Nansana (Yesu Amala)", brand: "Rubis", area: "Nansana", lat: 0.366036, lng: 32.525442, radius: 150 },
  { id: "ST-0375", name: "Rubis Petro Station Nansana (9GP7+8VC)", brand: "Rubis", area: "Nansana", lat: 0.385823, lng: 32.514633, radius: 150 },
  { id: "ST-0376", name: "Rubis Seeta Highway", brand: "Rubis", area: "Seeta", lat: 0.368501, lng: 32.712632, radius: 150 },
  { id: "ST-0377", name: "Rubis Tororo (listed as Rubis Bugiri)", brand: "Rubis", area: "Tororo", lat: 0.678227, lng: 34.186567, radius: 150 },
];

// Great-circle distance in metres between two lat/lng points (Haversine).
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// The live geofence list the app matches against. Defaults to the seed list
// above, and is replaced by the sites saved in Settings (settings.geofences)
// once they load — so HR can add/edit/remove sites without a code change.
let _geofences = GEOFENCES;
export function setGeofences(list) {
  _geofences = Array.isArray(list) && list.length ? list.filter((g) => g && g.lat != null && g.lng != null) : GEOFENCES;
}
export function getGeofences() { return _geofences; }

// Nearest geofence to a point, with distance and whether it's inside the radius.
export function matchGeofence(lat, lng) {
  let best = null;
  for (const g of _geofences) {
    const radius = Number(g.radius) || 150;
    const d = distanceMeters(lat, lng, Number(g.lat), Number(g.lng));
    if (!best || d < best.distanceM) best = { fence: { ...g, radius }, distanceM: d, within: d <= radius };
  }
  return best;
}
export const formatDistance = (m) => (m == null ? "—" : m >= 1000 ? (m / 1000).toFixed(2) + " km" : Math.round(m) + " m");

/* =========================================================================
   Seed ~2 weeks of attendance history (weekdays 18 Aug – 2 Sep 2026) so the
   HR attendance reports have real trends. Deterministic pseudo-random so the
   dataset is stable across reloads. The 3 Sep records above are kept as-is.
   ========================================================================= */
(function seedAttendanceHistory() {
  const rng = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fieldStaff = new Set(["GLA-004", "GLA-005", "GLA-006", "GLA-008"]);
  const start = new Date("2026-08-18T00:00:00"), end = new Date("2026-09-02T00:00:00");
  let counter = 8000;
  for (const e of data.employees) {
    const r = rng([...e.id].reduce((a, c) => a + c.charCodeAt(0), 0) + 7);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const wd = d.getDay(); if (wd === 0 || wd === 6) continue;
      const date = fmt(d);
      const roll = r();
      if (e.status === "On Leave" && r() < 0.5) continue;
      if (roll < 0.06) { // absent day
        if (r() < 0.5) continue;
        data.attendance.push({ id: `AT-${counter++}`, empId: e.id, date, clockIn: "", clockOut: "", site: "—", status: "Absent", overtime: 0, lat: null, lng: null, accuracy: null, geoSite: null, withinFence: false, distanceM: null, method: "" });
        continue;
      }
      const field = fieldStaff.has(e.id);
      const inMin = Math.round((field ? 460 : 480) + (r() * 40 - 8));
      const outMin = Math.round(field ? 1020 + r() * 120 : 1020 + r() * 30);
      const ot = field ? Math.max(0, Math.round(((outMin - 1020) / 60) * 2) / 2) : 0;
      const fence = field ? GEOFENCES[1 + Math.floor(r() * (GEOFENCES.length - 1))] : GEOFENCES[0];
      const g = r();
      let lat = null, lng = null, accuracy = null, within = false, dist = null, method = "GPS", geoSite = null;
      if (g < 0.05) { method = "Manual"; }
      else {
        const outside = g < 0.13, jit = () => (r() - 0.5) * 0.0009;
        lat = fence.lat + (outside ? 0.02 : jit());
        lng = fence.lng + (outside ? 0.02 : jit());
        const m = matchGeofence(lat, lng);
        within = m.within; dist = Math.round(m.distanceM); geoSite = m.fence.name; accuracy = 8 + Math.round(r() * 22);
      }
      data.attendance.push({
        id: `AT-${counter++}`, empId: e.id, date,
        clockIn: `${pad(Math.floor(inMin / 60))}:${pad(inMin % 60)}`,
        clockOut: `${pad(Math.floor(outMin / 60))}:${pad(outMin % 60)}`,
        site: fence.name, status: field ? "Field" : "Present", overtime: ot,
        lat, lng, accuracy, geoSite, withinFence: within, distanceM: dist, method,
      });
    }
  }
})();

// Attendance analytics helpers ------------------------------------------------
export const timeToMinutes = (hhmm) => { if (!hhmm) return null; const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const minutesToTime = (mins) => { if (mins == null || isNaN(mins)) return "—"; const h = Math.floor(mins / 60), m = Math.round(mins % 60); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; };
export const LATE_THRESHOLD_MIN = 8 * 60 + 30; // 08:30
