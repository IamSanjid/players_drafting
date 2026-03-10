import { compare, hash } from 'bcryptjs';

const BCRYPT_PREFIX = '$2';
const SALT_ROUNDS = 10;

export function looksHashedPassword(value: string): boolean {
  return value.startsWith(BCRYPT_PREFIX);
}

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return hash(plainTextPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  candidatePassword: string,
  storedPassword: string
): Promise<boolean> {
  if (looksHashedPassword(storedPassword)) {
    return compare(candidatePassword, storedPassword);
  }

  // Backward compatibility for legacy plaintext rows.
  return candidatePassword === storedPassword;
}

export async function verifyAdminPassword(
  candidatePassword: string
): Promise<boolean> {
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  if (adminPasswordHash) {
    return compare(candidatePassword, adminPasswordHash);
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  return candidatePassword === adminPassword;
}
