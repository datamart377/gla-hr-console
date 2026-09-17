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
  Compassionate: { entitlement: 0, paid: true },
  Unpaid: { entitlement: 0, paid: false },
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
  ],
  attendance: [
    { id: "AT-9001", empId: "GLA-001", date: "2026-09-03", clockIn: "08:02", clockOut: "17:14", site: "Head Office — Gaba Rd", status: "Present", overtime: 0 },
    { id: "AT-9002", empId: "GLA-006", date: "2026-09-03", clockIn: "07:41", clockOut: "18:35", site: "Umeme Substation, Lugogo", status: "Field", overtime: 1.5 },
    { id: "AT-9003", empId: "GLA-005", date: "2026-09-03", clockIn: "08:20", clockOut: "17:05", site: "Client Site — Namanve", status: "Field", overtime: 0 },
    { id: "AT-9004", empId: "GLA-003", date: "2026-09-03", clockIn: "08:00", clockOut: "17:00", site: "Head Office — Gaba Rd", status: "Present", overtime: 0 },
    { id: "AT-9005", empId: "GLA-008", date: "2026-09-03", clockIn: "07:30", clockOut: "16:20", site: "Client Site — Namanve", status: "Field", overtime: 0 },
    { id: "AT-9006", empId: "GLA-007", date: "2026-09-03", clockIn: "08:34", clockOut: "", site: "Head Office — Gaba Rd", status: "Half-day", overtime: 0 },
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
  if (!m.position) m.position = e.jobTitle ? `${e.jobTitle}, ${e.department}` : "";
  if (!m.fileNumber) m.fileNumber = e.id;
  if (!m.contact.email) m.contact.email = e.email || "";
  if (!m.contact.telephone) m.contact.telephone = e.phone || "";
  return m;
}

data.employees = data.employees.map(normalizeEmployee);

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

export const deriveNssfEmployee = (g) => Math.round((Number(g) || 0) * 0.05);
export const deriveNssfEmployer = (g) => Math.round((Number(g) || 0) * 0.1);

export function derivePayslip(emp) {
  const gross = Number(emp.grossSalary) || 0;
  const paye = derivePAYE(gross);
  const nssfEmp = deriveNssfEmployee(gross);
  const nssfEr = deriveNssfEmployer(gross);
  return { gross, paye, nssfEmp, nssfEr, net: gross - paye - nssfEmp, costToCompany: gross + nssfEr };
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
