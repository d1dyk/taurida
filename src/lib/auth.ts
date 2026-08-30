import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const JWT_SECRET = process.env.JWT_SECRET || 'taurida_crimea_luxury_furniture_secret_key_2026_x894jk';
export const COOKIE_NAME = 'admin_token';

// Default pre-computed bcrypt hash for password "haven2026"
const DEFAULT_ADMIN_PASSWORD_HASH = '$2a$10$F65bLgG4N0e1bBsnxR5kO.dD15WbI5n5iT0x6t2r4a6w4o9e7y1qG';

export interface AdminUser {
  login: string;
  passwordHash?: string;
  password?: string;
}

export function getAdminUsers(): AdminUser[] {
  try {
    const raw = process.env.ADMIN_CREDENTIALS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error parsing ADMIN_CREDENTIALS env:', e);
  }

  // Fallback default admin
  return [
    {
      login: 'admin',
      password: 'haven2026',
      passwordHash: bcrypt.hashSync('haven2026', 10),
    },
  ];
}

export async function verifyCredentials(login: string, password: string): Promise<boolean> {
  const users = getAdminUsers();
  const user = users.find((u) => u.login === login);
  if (!user) {
    // Artificial delay to mitigate timing attacks
    await new Promise((r) => setTimeout(r, 400));
    return false;
  }

  // Check bcrypt hash if present
  if (user.passwordHash) {
    try {
      return await bcrypt.compare(password, user.passwordHash);
    } catch {
      // If error during compare, fallback check
    }
  }

  // Plain text fallback if provided in env
  if (user.password) {
    return user.password === password;
  }

  return false;
}

export function signAdminToken(login: string): string {
  return jwt.sign({ login, role: 'admin' }, JWT_SECRET, {
    expiresIn: '24h',
    algorithm: 'HS256',
  });
}

export function verifyAdminToken(token?: string | null): { login: string; role: string } | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { login: string; role: string };
    if (decoded && decoded.role === 'admin') {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}
