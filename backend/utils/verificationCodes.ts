type CodeEntry = { code: string; expiresAt: number };

const codes = new Map<string, CodeEntry>();

const CODE_TTL_MS = 10 * 60 * 1000;

export function storeVerificationCode(email: string, code: string) {
  codes.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
}

export function verifyCode(email: string, code: string): boolean {
  const entry = codes.get(email.toLowerCase());
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    codes.delete(email.toLowerCase());
    return false;
  }
  if (entry.code !== code.trim()) return false;
  codes.delete(email.toLowerCase());
  return true;
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
