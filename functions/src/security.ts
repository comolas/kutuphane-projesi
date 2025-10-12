export const MAX_MESSAGE_LENGTH = 500;
export const MIN_MESSAGE_LENGTH = 1;

const BLOCKED_PATTERNS = [
  /\b(script|javascript|eval|exec|system|cmd)\b/gi,
  /<[^>]*>/g,
  /[\x00-\x1F\x7F-\x9F]/g,
];

export function sanitizeInput(input: string): string {
  let sanitized = input.trim();
  BLOCKED_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, "");
  });
  return sanitized;
}

export function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message || typeof message !== "string") {
    return { valid: false, error: "Mesaj geçersiz." };
  }

  const trimmed = message.trim();
  
  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    return { valid: false, error: "Mesaj çok kısa." };
  }
  
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Mesaj çok uzun. Maksimum ${MAX_MESSAGE_LENGTH} karakter.` };
  }

  const repeatingChars = /(.)\1{10,}/;
  if (repeatingChars.test(trimmed)) {
    return { valid: false, error: "Geçersiz mesaj formatı." };
  }

  return { valid: true };
}
