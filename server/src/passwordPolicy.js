// Password policy shared by sign-in (detect weak passwords), change-password,
// reset-password and admin set-password.
const COMMON = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "p@ssword", "p@ssw0rd", "pass1234",
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000", "abcd1234", "abc12345",
  "qwerty123", "qwertyui", "iloveyou", "welcome1", "welcome123", "letmein1", "changeme", "admin123",
  "glassociates", "globallink", "ihrsm123", "uganda123", "kampala123",
]);

// Returns a reason string when the password is too weak, or null when it's OK.
export function passwordProblem(pw, email = "") {
  const p = String(pw || "");
  const low = p.toLowerCase();
  if (p.length < 8) return "Use at least 8 characters.";
  if (!/[a-z]/i.test(p) || !/\d/.test(p)) return "Use a mix of letters and numbers.";
  if (COMMON.has(low) || /^(.)\1+$/.test(p)) return "That password is too common — choose something harder to guess.";
  const local = String(email || "").toLowerCase().split("@")[0];
  const parts = local.split(/[^a-z]+/).filter((x) => x.length >= 3);
  if (local && (low.includes(local) || parts.some((x) => low.includes(x)))) return "Don't use your name or email in your password.";
  return null;
}
export const isWeakPassword = (pw, email) => !!passwordProblem(pw, email);
