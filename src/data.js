/* -------------------------------------------------------------------------
   In-memory data store + derived helpers.

   Single source of truth for the front-end demo prototype. In production the
   API client would fetch these records from the Express backend; here the
   client (src/api/client.js) reads and writes this object directly so the
   prototype runs with no server.

   Reference: Global Link Associates Ltd — engineering services, Kampala.
   Statutory figures use Uganda URA monthly PAYE bands + NSSF (5% + 10%).
   ------------------------------------------------------------------------- */

export const TODAY = "2026-09-03";

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
    { id: "GLA-001", firstName: "Robert", lastName: "Okello", gender: "Male", dob: "1984-03-12", nationalId: "CM840121001AB", phone: "+256 772 413 501", email: "r.okello@glassociates.co.ug", address: "Ntinda, Kampala", department: "Power Systems", jobTitle: "Consulting Engineer (Electrical)", contractType: "Permanent", employmentDate: "2013-06-01", status: "Active", grossSalary: 4200000, nssfNumber: "NSSF-0113501", tin: "1000345678", bankName: "Stanbic Bank", bankAccount: "9030001234501", emergencyName: "Alice Okello", emergencyPhone: "+256 701 220 145", emergencyRelation: "Spouse", annualUsed: 6, sickUsed: 2,
      fileNumber: "RO.84.13.0112", position: "Consulting Engineer (Electrical), Directorate of Power Systems",
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
    { id: "GLA-002", firstName: "Sarah", lastName: "Nakato", gender: "Female", dob: "1988-11-02", nationalId: "CF881102045CD", phone: "+256 782 909 220", email: "s.nakato@glassociates.co.ug", address: "Muyenga, Kampala", department: "Administration", jobTitle: "HR & Admin Manager", contractType: "Permanent", employmentDate: "2015-02-16", status: "Active", grossSalary: 3600000, nssfNumber: "NSSF-0209220", tin: "1000456781", bankName: "Centenary Bank", bankAccount: "3100456789012", emergencyName: "John Nakato", emergencyPhone: "+256 772 118 900", emergencyRelation: "Brother", annualUsed: 9, sickUsed: 0,
      maritalStatus: "married", religion: "Muslim",
      academicQualifications: [{ title: "MBA Human Resource Management", institution: "Uganda Management Institute", awardDate: "2016-11-10", type: "MASTERS", highest: "Yes", status: "Approved" }],
      children: [{ name: "Amina Nakato", relationship: "DAUGHTER", dob: "2017-04-03", gender: "Female" }],
      nextOfKin: [{ surname: "Nakato", otherNames: "John", relationship: "BROTHER", contact: "+256 772 118 900", address: "Muyenga, Kampala" }] },
    { id: "GLA-003", firstName: "Grace", lastName: "Auma", gender: "Female", dob: "1990-07-19", nationalId: "CF900719077EF", phone: "+256 700 551 034", email: "g.auma@glassociates.co.ug", address: "Bukoto, Kampala", department: "Finance", jobTitle: "Accountant", contractType: "Permanent", employmentDate: "2017-09-04", status: "Active", grossSalary: 2900000, nssfNumber: "NSSF-0351034", tin: "1000567812", bankName: "Stanbic Bank", bankAccount: "9030007788110", emergencyName: "Peter Auma", emergencyPhone: "+256 758 300 221", emergencyRelation: "Father", annualUsed: 3, sickUsed: 5,
      maritalStatus: "single",
      academicQualifications: [{ title: "ACCA", institution: "ACCA Global", awardDate: "2019-03-12", type: "CERTIFICATE", highest: "Yes", status: "Approved" }] },
    { id: "GLA-004", firstName: "David", lastName: "Mugisha", gender: "Male", dob: "1986-01-28", nationalId: "CM860128033GH", phone: "+256 772 660 908", email: "d.mugisha@glassociates.co.ug", address: "Kireka, Wakiso", department: "Petroleum Equipment", jobTitle: "Service Supervisor", contractType: "Permanent", employmentDate: "2016-05-10", status: "On Leave", grossSalary: 2450000, nssfNumber: "NSSF-0460908", tin: "1000678123", bankName: "Absa Bank", bankAccount: "6009123400567", emergencyName: "Ruth Mugisha", emergencyPhone: "+256 703 880 552", emergencyRelation: "Spouse", annualUsed: 14, sickUsed: 1,
      maritalStatus: "married",
      nextOfKin: [{ surname: "Mugisha", otherNames: "Ruth", relationship: "SPOUSE", contact: "+256 703 880 552", address: "Kireka, Wakiso" }] },
    { id: "GLA-005", firstName: "Joseph", lastName: "Ssekandi", gender: "Male", dob: "1993-09-06", nationalId: "CM930906088IJ", phone: "+256 704 231 776", email: "j.ssekandi@glassociates.co.ug", address: "Nabweru, Wakiso", department: "HVAC & Refrigeration", jobTitle: "HVAC Technician", contractType: "Fixed-term", employmentDate: "2021-03-01", status: "Active", grossSalary: 1650000, nssfNumber: "NSSF-0531776", tin: "1000789234", bankName: "Equity Bank", bankAccount: "1001234567890", emergencyName: "Mary Ssekandi", emergencyPhone: "+256 772 445 019", emergencyRelation: "Mother", annualUsed: 5, sickUsed: 0, maritalStatus: "single" },
    { id: "GLA-006", firstName: "Peter", lastName: "Wanyama", gender: "Male", dob: "1995-12-15", nationalId: "CM951215099KL", phone: "+256 758 110 442", email: "p.wanyama@glassociates.co.ug", address: "Kyaliwajjala, Wakiso", department: "Electrical Installation", jobTitle: "Field Technician (Electrical)", contractType: "Permanent", employmentDate: "2019-07-22", status: "Active", grossSalary: 1350000, nssfNumber: "NSSF-0610442", tin: "1000890345", bankName: "Centenary Bank", bankAccount: "3100998877665", emergencyName: "Esther Wanyama", emergencyPhone: "+256 701 556 210", emergencyRelation: "Sister", annualUsed: 11, sickUsed: 3, maritalStatus: "married" },
    { id: "GLA-007", firstName: "Mary", lastName: "Nabirye", gender: "Female", dob: "1991-04-23", nationalId: "CF910423055MN", phone: "+256 772 004 118", email: "m.nabirye@glassociates.co.ug", address: "Najjera, Wakiso", department: "Administration", jobTitle: "Procurement Officer", contractType: "Permanent", employmentDate: "2018-11-05", status: "Active", grossSalary: 1950000, nssfNumber: "NSSF-0704118", tin: "1000901456", bankName: "DFCU Bank", bankAccount: "0104556677889", emergencyName: "Samuel Nabirye", emergencyPhone: "+256 704 991 300", emergencyRelation: "Spouse", annualUsed: 2, sickUsed: 1, maritalStatus: "married" },
    { id: "GLA-008", firstName: "Isaac", lastName: "Tumwine", gender: "Male", dob: "1992-08-30", nationalId: "CM920830066OP", phone: "+256 706 778 210", email: "i.tumwine@glassociates.co.ug", address: "Namanve, Mukono", department: "Civil & Construction", jobTitle: "Civil Works Foreman", contractType: "Casual", employmentDate: "2022-02-14", status: "Active", grossSalary: 1200000, nssfNumber: "NSSF-0788210", tin: "1001012567", bankName: "Equity Bank", bankAccount: "1009988776655", emergencyName: "Betty Tumwine", emergencyPhone: "+256 772 660 004", emergencyRelation: "Spouse", annualUsed: 8, sickUsed: 0, maritalStatus: "married" },
    // Fully-populated exemplar staff file (mirrors the reference Electronic Staff File layout).
    { id: "GLA-009", firstName: "Juma", lastName: "Katongole", gender: "Male", dob: "1986-11-25", nationalId: "CM86024101F9CK", phone: "+256 702 278 793", email: "juma.katongole@mak.ac.ug", address: "Kampala", department: "ICT", jobTitle: "Deputy Chief ICT Officer", contractType: "Fixed-term", employmentDate: "2012-06-01", status: "Active", grossSalary: 3800000, nssfNumber: "N/A", tin: "N/A", bankName: "", bankAccount: "", emergencyName: "Nandyose Linah", emergencyPhone: "0774557554", emergencyRelation: "Spouse", annualUsed: 4, sickUsed: 0,
      fileNumber: "KJ.86.12.0567",
      position: "DEPUTY CHIEF ICT OFFICER, DIRECTORATE OF INFORMATION COMMUNICATION TECHNOLOGY",
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

// Supplier payment schedule (procurement). Net = Sub total − 6% WHT + 18% VAT.
export const SUPPLIER_WHT_RATE = 0.06; // (−) 6% income withholding tax
export const SUPPLIER_VAT_RATE = 0.18; // (+) 18% VAT
export function deriveSupplier(s) {
  const subTotal = Number(s.subTotal) || 0;
  const applyWht = s.applyWht !== false; // 6% withholding — optional, on by default
  const applyVat = s.applyVat !== false; // 18% VAT — optional, on by default
  const wht = applyWht ? Math.round(subTotal * ((data.settings?.payroll?.wht ?? 6) / 100)) : 0;
  const vat = applyVat ? Math.round(subTotal * ((data.settings?.payroll?.vat ?? 18) / 100)) : 0;
  return { subTotal, applyWht, applyVat, wht, vat, net: subTotal - wht + vat };
}
data.suppliers = [
  { id: "SUP-001", name: "Kalyango Bashiri", bankAccount: "", bankName: "", bankBranch: "", subTotal: 1000000, applyWht: true, applyVat: true },
  { id: "SUP-002", name: "Nsubuga Technical Supplies Ltd", bankAccount: "3204598811023", bankName: "Stanbic Bank", bankBranch: "Garden City", subTotal: 4500000, applyWht: true, applyVat: true },
  { id: "SUP-003", name: "Kampala Hardware & Steel", bankAccount: "0102009887654", bankName: "Centenary Bank", bankBranch: "Kampala Road", subTotal: 2750000, applyWht: true, applyVat: false },
  { id: "SUP-004", name: "Victoria Fuels (U) Ltd", bankAccount: "6009345120088", bankName: "Absa Bank", bankBranch: "Kireka", subTotal: 3200000, applyWht: false, applyVat: false },
];

// Processed supplier payment schedules (locked history). Seed one past schedule.
data.supplierRuns = [
  { id: "SPR-2608", scheduleDate: "2026-08-20", processedBy: "Sarah Nakato (HR)", processedAt: "2026-08-20",
    rows: [
      { no: 1, name: "Nsubuga Technical Supplies Ltd", bankAccount: "3204598811023", bankName: "Stanbic Bank", bankBranch: "Garden City", subTotal: 3800000, applyWht: true, applyVat: true, wht: 228000, vat: 684000, net: 4256000 },
      { no: 2, name: "Kampala Hardware & Steel", bankAccount: "0102009887654", bankName: "Centenary Bank", bankBranch: "Kampala Road", subTotal: 1500000, applyWht: true, applyVat: false, wht: 90000, vat: 0, net: 1410000 },
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
  ["stock", "Stock"], ["appraisals", "Appraisals"], ["reports", "Reports"], ["settings", "Settings"],
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
  roles: [
    { id: "admin", name: "Administrator", system: true, description: "Full access to every module and action.", modules: allMods(true), actions: allActs(true) },
    { id: "hr", name: "HR Officer", description: "Runs day-to-day HR: staff, leave, attendance, payroll.", modules: { ...allMods(true), stock: false, settings: false }, actions: { ...allActs(true), manageSettings: false, manageStock: false } },
    { id: "finance", name: "Finance Officer", description: "Payroll, advances, supplier payments and reports.", modules: { dashboard: true, employees: true, leave: false, attendance: false, payroll: true, advances: true, stock: true, appraisals: false, reports: true, settings: false }, actions: { editEmployees: false, approveLeave: false, processPayroll: true, manageAdvances: true, manageStock: true, manageSettings: false } },
    { id: "staff", name: "Staff (self-service)", system: true, portalOnly: true, description: "Self-service portal only — clock-in, leave, payslip, advances.", modules: allMods(false), actions: allActs(false) },
  ],
  announcements: [
    { id: "ANN-001", title: "September payroll cut-off", body: "All timesheets and overtime for September must be submitted by the 25th. Payroll runs on the 28th.", date: "2026-09-05", active: true, audience: "all" },
    { id: "ANN-002", title: "Safety refresher — field teams", body: "Mandatory safety briefing for all field technicians on Friday at 8:00am, Head Office.", date: "2026-09-02", active: true, audience: "staff" },
    { id: "ANN-003", title: "Q3 appraisals window open", body: "Line managers: submit Q3 competency reviews before month-end.", date: "2026-08-28", active: false, audience: "admin" },
  ],
};

export const roleById = (id) => (data.settings.roles || []).find((r) => r.id === id);

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

// Seed August 2026 as a Paid run. Advance deductions are drawn from each record's
// manual deduction PLUS any approved-advance installment due that month, so the
// locked August snapshot is consistent with the auto-recovery schedule and the
// September ledger carries forward correctly.
(function seedAugustRun() {
  const month = "2026-08";
  const cols = data.ledgerColumns.map((c) => ({ ...c }));
  const emps = data.employees.filter((e) => e.status !== "Terminated");
  const rows = emps.map((e, i) => {
    const gross = Number(e.grossSalary) || 0, nssf5 = Math.round(gross * 0.05), paye = derivePAYE(gross);
    const advance = (Number(e.advanceDeductions) || 0) + advanceRepaymentForMonth(data.advances, e.id, month);
    const custom = {}; cols.forEach((c) => { custom[c.id] = (e.custom || {})[c.id] ?? (c.kind === "text" ? "" : 0); });
    let net = gross - nssf5 - paye - advance;
    cols.forEach((c) => { const v = Number(custom[c.id]) || 0; if (c.kind === "allowance") net += v; else if (c.kind === "deduction") net -= v; });
    return { no: i + 1, empId: e.id, name: `${e.firstName} ${e.lastName}`, department: e.department, bankAccount: e.bankAccount, bankName: e.bankName, bankBranch: e.bankBranch, tin: e.tin, nationalId: e.nationalId, nssfNumber: e.nssfNumber, gross, nssf5, paye, advance, custom, net, contribution: Math.round(gross * 0.1) };
  });
  const totals = rows.reduce((a, r) => ({ gross: a.gross + r.gross, nssf5: a.nssf5 + r.nssf5, paye: a.paye + r.paye, advance: a.advance + r.advance, net: a.net + r.net, contribution: a.contribution + r.contribution }), { gross: 0, nssf5: 0, paye: 0, advance: 0, net: 0, contribution: 0 });
  data.payrollRuns.push({ id: "PR-2026-08", month, status: "Paid", processedBy: "Sarah Nakato (HR)", processedAt: "2026-08-28", paidAt: "2026-08-30", columns: cols, rows, totals });
})();

/* ----------------------------- derived helpers ---------------------------- */

// Uganda URA monthly PAYE for resident individuals.
export function derivePAYE(gross) {
  const g = Number(gross) || 0;
  let t = 0;
  if (g <= 235000) t = 0;
  else if (g <= 335000) t = 0.1 * (g - 235000);
  else if (g <= 410000) t = 10000 + 0.2 * (g - 335000);
  else {
    t = 25000 + 0.3 * (g - 410000);
    if (g > 10000000) t += 0.1 * (g - 10000000);
  }
  return Math.round(t);
}

export const deriveNssfEmployee = (g) => Math.round((Number(g) || 0) * ((data.settings?.payroll?.nssfEmp ?? 5) / 100));
export const deriveNssfEmployer = (g) => Math.round((Number(g) || 0) * ((data.settings?.payroll?.nssfEr ?? 10) / 100));

export function derivePayslip(emp) {
  const gross = Number(emp.grossSalary) || 0;
  const paye = derivePAYE(gross);
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
export const GEOFENCES = [
  { id: "GF-HO", name: "Head Office — Gaba Rd", lat: 0.28030, lng: 32.61800, radius: 150 },
  { id: "GF-TK", name: "TotalEnergies Kireka", lat: 0.35390, lng: 32.66080, radius: 120 },
  { id: "GF-UL", name: "Umeme Substation, Lugogo", lat: 0.33010, lng: 32.60020, radius: 150 },
  { id: "GF-SN", name: "Shell Nakawa", lat: 0.33200, lng: 32.62050, radius: 120 },
  { id: "GF-NG", name: "NWSC Ggaba Works", lat: 0.25710, lng: 32.63600, radius: 200 },
  { id: "GF-CN", name: "Client Site — Namanve", lat: 0.36620, lng: 32.70020, radius: 250 },
];

// Great-circle distance in metres between two lat/lng points (Haversine).
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// Nearest geofence to a point, with distance and whether it's inside the radius.
export function matchGeofence(lat, lng) {
  let best = null;
  for (const g of GEOFENCES) {
    const d = distanceMeters(lat, lng, g.lat, g.lng);
    if (!best || d < best.distanceM) best = { fence: g, distanceM: d, within: d <= g.radius };
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
