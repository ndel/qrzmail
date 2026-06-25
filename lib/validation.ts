export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

export function isValidDomain(value: string) {
  return /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidLocalPart(value: string) {
  return /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(value);
}

export function isStrongPassword(value: string) {
  return value.length >= 10 && /[a-zA-Z]/.test(value) && /\d/.test(value);
}
