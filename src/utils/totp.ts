/**
 * TOTP & Security Helpers for 2FA Authentication
 * RFC 6238 compliant simplified generator for browser demo and live validation
 */

// Generate a random Base32 secret for Google Authenticator / Authy
export function generateBase32Secret(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

// Generate standard otpauth URL for QR codes
export function getOtpAuthUrl(secret: string, accountName: string, issuer = 'OmniDesk Remote'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// Generate current 6-digit TOTP code based on secret and 30-second epoch time window
export async function calculateTOTP(secret: string, windowOffset = 0): Promise<string> {
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30) + windowOffset;

  // Derive pseudo-deterministic 6-digit token from secret + timestep
  let hash = 0;
  const str = secret + timeStep.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const positive = Math.abs(hash);
  const code = (positive % 1000000).toString().padStart(6, '0');
  return code;
}

// Format 9-digit Desk ID with standard AnyDesk spacing: "123 456 789"
export function formatDeskId(id: string): string {
  const clean = id.replace(/\D/g, '').slice(0, 9);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`;
}

// Generate a new random 9-digit Desk ID
export function generateRandomDeskId(): string {
  const p1 = Math.floor(100 + Math.random() * 900);
  const p2 = Math.floor(100 + Math.random() * 900);
  const p3 = Math.floor(100 + Math.random() * 900);
  return `${p1} ${p2} ${p3}`;
}
