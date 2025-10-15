export const MAX_MESSAGE_LENGTH = 500;
export const MIN_MESSAGE_LENGTH = 1;

const BLOCKED_PATTERNS = [
  /\b(script|javascript|eval|exec|system|cmd|onclick|onerror|onload)\b/gi,
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /[\x00-\x1F\x7F-\x9F]/g,
];

export function sanitizeInput(input: string): string {
  let sanitized = input.trim();
  
  // HTML tag'leri tamamen kaldır
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Tehlikeli pattern'leri kaldır
  BLOCKED_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, "");
  });
  
  // HTML entity'leri encode et
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
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

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "E-posta adresi gereklidir." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Geçersiz e-posta formatı." };
  }

  if (email.length > 254) {
    return { valid: false, error: "E-posta adresi çok uzun." };
  }

  return { valid: true };
}

export function validateString(value: string, minLength: number, maxLength: number, fieldName: string): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, error: `${fieldName} gereklidir.` };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} en az ${minLength} karakter olmalıdır.` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} en fazla ${maxLength} karakter olabilir.` };
  }

  return { valid: true };
}

export function validateNumber(value: any, min: number, max: number, fieldName: string): { valid: boolean; error?: string } {
  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} geçerli bir sayı olmalıdır.` };
  }

  if (num < min || num > max) {
    return { valid: false, error: `${fieldName} ${min} ile ${max} arasında olmalıdır.` };
  }

  return { valid: true };
}
