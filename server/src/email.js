// Outbound email for system notifications (SMTP via nodemailer).
//
// Design notes:
//  - If SMTP is not configured, every send is a no-op that returns
//    { sent:false, reason:"email_not_configured" } — the app keeps working and
//    notifications are simply skipped. Email must never break a core action.
//  - Recipients are resolved from the employee record server-side (by empId), so
//    this is NOT an open relay: callers cannot send to arbitrary addresses.
import nodemailer from "nodemailer";
import { config } from "./config.js";
import { query } from "./db.js";

let transporter = null;

export function mailReady() {
  return !!(config.mail.host && config.mail.user && config.mail.pass);
}

function getTransport() {
  if (!mailReady()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: { user: config.mail.user, pass: config.mail.pass },
    });
  }
  return transporter;
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ugx = (n) => "UGX " + (Math.round(Number(n) || 0)).toLocaleString("en-US");

// Branded HTML shell (navy + orange, matching the app).
function shell(eyebrow, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#eef2f4;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2a33">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e8ec;border-radius:12px;overflow:hidden">
    <tr><td style="background:#002b3d;padding:18px 24px">
      <div style="color:#ffffff;font-size:16px;font-weight:700">Global Link Associates Ltd</div>
      <div style="color:#f0601f;font-size:11px;letter-spacing:.09em;text-transform:uppercase;margin-top:2px">IHRSM · ${esc(eyebrow)}</div>
    </td></tr>
    <tr><td style="padding:24px;font-size:14px;line-height:1.6">${bodyHtml}</td></tr>
    <tr><td style="padding:14px 24px;border-top:1px solid #eef2f4;color:#8c949d;font-size:11px">
      Automated message from the Global Link Associates HR system. Please do not reply to this email.
    </td></tr>
  </table></body></html>`;
}

function portalButton() {
  const url = config.mail.appUrl;
  if (!url) return "";
  return `<p style="margin:18px 0 0"><a href="${esc(url)}" style="background:#f0601f;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block;font-weight:600">Open the HR portal</a></p>`;
}

// Build { subject, html, text } for a notification type.
function template(type, emp, data = {}) {
  const name = emp && emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : (data.name || "Team member");
  const url = config.mail.appUrl;
  const portalText = url ? `\n\nOpen the HR portal: ${url}` : "";

  switch (type) {
    case "leave_decision": {
      const approved = String(data.decision).toLowerCase() === "approved";
      const detail = `${esc(data.type || "Leave")} · ${esc(data.startDate || "")} → ${esc(data.endDate || "")}` +
        (data.days ? ` (${esc(data.days)} day${Number(data.days) === 1 ? "" : "s"})` : "");
      const detailText = `${data.type || "Leave"} · ${data.startDate || ""} -> ${data.endDate || ""}` +
        (data.days ? ` (${data.days} day${Number(data.days) === 1 ? "" : "s"})` : "");
      const html = shell("Leave decision",
        `<p>Dear ${esc(name)},</p>
         <p>Your leave request has been <b style="color:${approved ? "#12894e" : "#c23a29"}">${approved ? "approved" : "not approved"}</b>.</p>
         <div style="background:#f4f7f9;border-radius:8px;padding:12px 14px;margin:14px 0">${detail}</div>
         ${data.decidedBy ? `<p style="color:#6b747d;font-size:13px;margin:0">Decision by: ${esc(data.decidedBy)}</p>` : ""}
         ${portalButton()}`);
      const text = `Dear ${name},\n\nYour leave request has been ${approved ? "approved" : "not approved"}.\n${detailText}` +
        (data.decidedBy ? `\nDecision by: ${data.decidedBy}` : "") + portalText;
      return { subject: `Your leave request was ${approved ? "approved" : "not approved"}`, html, text };
    }

    case "advance_decision": {
      const approved = String(data.decision).toLowerCase() === "approved";
      let detail = "", detailText = "";
      if (approved) {
        detail = `<div style="background:#f4f7f9;border-radius:8px;padding:12px 14px;margin:14px 0">
          Approved amount: <b>${ugx(data.approvedAmount)}</b><br>
          Repayment: ${esc(data.approvedMonths || "")} month${Number(data.approvedMonths) === 1 ? "" : "s"}${data.startMonth ? `, from ${esc(data.startMonth)}` : ""}<br>
          Recovered automatically from your monthly net pay.</div>`;
        detailText = `Approved amount: ${ugx(data.approvedAmount)}\nRepayment: ${data.approvedMonths || ""} month(s)${data.startMonth ? `, from ${data.startMonth}` : ""}\nRecovered automatically from your monthly net pay.`;
      }
      const note = data.note ? `<p style="color:#6b747d;font-size:13px;margin:8px 0 0">Note: ${esc(data.note)}</p>` : "";
      const html = shell("Salary advance decision",
        `<p>Dear ${esc(name)},</p>
         <p>Your salary advance request has been <b style="color:${approved ? "#12894e" : "#c23a29"}">${approved ? "approved" : "not approved"}</b>.</p>
         ${detail}${note}
         ${data.decidedBy ? `<p style="color:#6b747d;font-size:13px;margin:8px 0 0">Decision by: ${esc(data.decidedBy)}</p>` : ""}
         ${portalButton()}`);
      const text = `Dear ${name},\n\nYour salary advance request has been ${approved ? "approved" : "not approved"}.\n${detailText}` +
        (data.note ? `\nNote: ${data.note}` : "") + (data.decidedBy ? `\nDecision by: ${data.decidedBy}` : "") + portalText;
      return { subject: `Your salary advance was ${approved ? "approved" : "not approved"}`, html, text };
    }

    case "profile_decision": {
      const approved = String(data.decision).toLowerCase() === "approved";
      const html = shell("Profile update",
        `<p>Dear ${esc(name)},</p>
         <p>The changes you submitted to your staff profile have been
         <b style="color:${approved ? "#12894e" : "#c23a29"}">${approved ? "approved and applied" : "not approved"}</b>.</p>
         <p>${approved
            ? "Your official record now reflects the update."
            : "Your official record is unchanged. Please review your details and resubmit, or contact HR if you need help."}</p>
         ${portalButton()}`);
      const text = `Dear ${name},\n\nThe changes you submitted to your staff profile have been ${approved ? "approved and applied" : "not approved"}.\n` +
        (approved ? "Your official record now reflects the update." : "Your official record is unchanged. Please review your details and resubmit, or contact HR.") + portalText;
      return { subject: `Your profile update was ${approved ? "approved" : "not approved"}`, html, text };
    }

    case "staff_welcome": {
      const loginEmail = (emp && emp.email) || data.email || "";
      const html = shell("Welcome",
        `<p>Dear ${esc(name)},</p>
         <p>A staff account has been created for you in the Global Link Associates HR system (IHRSM).</p>
         <div style="background:#f4f7f9;border-radius:8px;padding:12px 14px;margin:14px 0">
           Sign-in email: <b>${esc(loginEmail)}</b><br>
           Your HR office will share your initial password separately. You can change it after your first sign-in.
         </div>
         <p>From the portal you can view your payslips, request leave and salary advances, and keep your personal details up to date.</p>
         ${portalButton()}`);
      const text = `Dear ${name},\n\nA staff account has been created for you in the Global Link Associates HR system (IHRSM).\n\nSign-in email: ${loginEmail}\nYour HR office will share your initial password separately.\n\nFrom the portal you can view payslips, request leave and advances, and update your details.${portalText}`;
      return { subject: "Welcome to the Global Link Associates HR portal", html, text };
    }

    default:
      return { subject: "Notification", html: shell("Notification", `<p>Dear ${esc(name)},</p><p>You have a new notification from the HR system.</p>${portalButton()}`), text: `Dear ${name},\n\nYou have a new notification from the HR system.${portalText}` };
  }
}

// Password-reset email. The caller (auth route) supplies the recipient and a
// one-time link, so this does not resolve from the employee table.
export async function sendResetMail({ to, name, link }) {
  const t = getTransport();
  if (!t) return { sent: false, reason: "email_not_configured" };
  if (!to) return { sent: false, reason: "no_recipient_email" };
  const safeName = name || "there";
  const html = shell("Password reset",
    `<p>Dear ${esc(safeName)},</p>
     <p>We received a request to reset your password for the Global Link Associates HR portal.</p>
     <p>Choose a new password using the button below. This link expires in <b>1 hour</b> and can be used once.</p>
     <p style="margin:18px 0"><a href="${esc(link)}" style="background:#f0601f;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;display:inline-block;font-weight:600">Reset my password</a></p>
     <p style="color:#6b747d;font-size:12px;margin:0">If the button doesn't work, paste this link into your browser:<br><span style="word-break:break-all">${esc(link)}</span></p>
     <p style="color:#6b747d;font-size:12px;margin:14px 0 0">If you didn't request this, you can ignore this email — your password will not change.</p>`);
  const text = `Dear ${safeName},\n\nWe received a request to reset your password for the Global Link Associates HR portal.\n\nReset your password (expires in 1 hour, one-time use):\n${link}\n\nIf you didn't request this, ignore this email — your password will not change.`;
  await t.sendMail({ from: config.mail.from, to, subject: "Reset your HR portal password", html, text });
  return { sent: true, to };
}

// Resolve the recipient from the employee record and send. Never throws for a
// configuration/recipient problem — returns a soft { sent:false, reason }.
export async function sendEventMail({ type, empId, data = {} }) {
  const t = getTransport();
  if (!t) return { sent: false, reason: "email_not_configured" };

  let emp = {};
  if (empId) {
    const { rows } = await query(`SELECT doc FROM employees WHERE id = $1`, [empId]);
    if (rows.length) emp = rows[0].doc || {};
  }
  const recipient = emp.email || "";
  if (!recipient) return { sent: false, reason: "no_recipient_email" };

  const { subject, html, text } = template(type, emp, data);
  await t.sendMail({ from: config.mail.from, to: recipient, subject, html, text });
  return { sent: true, to: recipient };
}
