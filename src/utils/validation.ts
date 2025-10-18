// Input validation utility fonksiyonları

// Email validation
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'E-posta adresi gereklidir' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Geçersiz e-posta formatı' };
  }
  
  return { valid: true };
};

// Şifre validation
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Şifre gereklidir' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Şifre en az 8 karakter olmalıdır' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Şifre çok uzun' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir büyük harf içermelidir' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir küçük harf içermelidir' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir rakam içermelidir' };
  }
  
  return { valid: true };
};

// İsim validation
export const validateName = (name: string): { valid: boolean; error?: string } => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'İsim gereklidir' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'İsim en az 2 karakter olmalıdır' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'İsim çok uzun' };
  }
  
  if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(trimmed)) {
    return { valid: false, error: 'İsim sadece harf içerebilir' };
  }
  
  return { valid: true };
};

// Öğrenci numarası validation
export const validateStudentNumber = (number: string): { valid: boolean; error?: string } => {
  if (!number || typeof number !== 'string') {
    return { valid: false, error: 'Öğrenci numarası gereklidir' };
  }
  
  const trimmed = number.trim();
  if (trimmed.length < 3 || trimmed.length > 10) {
    return { valid: false, error: 'Öğrenci numarası 3-10 karakter olmalıdır' };
  }
  
  if (!/^[0-9]+$/.test(trimmed)) {
    return { valid: false, error: 'Öğrenci numarası sadece rakam içerebilir' };
  }
  
  return { valid: true };
};

// Sınıf validation
export const validateClass = (studentClass: string): { valid: boolean; error?: string } => {
  if (!studentClass || typeof studentClass !== 'string') {
    return { valid: false, error: 'Sınıf gereklidir' };
  }
  
  const validClasses = [
    "9-A", "9-B", "9-C", "9-D", "9-E", "9-F", "9-G", "9-I",
    "10-A", "10-B", "10-C", "10-D", "10-E", "10-F", "10-G", "10-H", "10-I", "10-J",
    "11-A", "11-B", "11-D", "11-E", "11-F", "11-G", "11-AB", "11-AC", "11-AD", "11-AE", "11-AF",
    "12-A", "12-B", "12-C", "12-D", "12-E", "12-F", "12-G", "12-H",
    "Öğretmen"
  ];
  
  if (!validClasses.includes(studentClass)) {
    return { valid: false, error: 'Geçersiz sınıf seçimi' };
  }
  
  return { valid: true };
};

// Dosya boyutu validation (bytes)
export const validateFileSize = (size: number, maxSizeMB: number = 5): { valid: boolean; error?: string } => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  
  if (size > maxBytes) {
    return { valid: false, error: `Dosya boyutu ${maxSizeMB}MB'dan küçük olmalıdır` };
  }
  
  return { valid: true };
};

// Dosya tipi validation
export const validateFileType = (fileName: string, allowedTypes: string[]): { valid: boolean; error?: string } => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (!extension || !allowedTypes.includes(extension)) {
    return { valid: false, error: `Sadece ${allowedTypes.join(', ')} dosyaları kabul edilir` };
  }
  
  return { valid: true };
};

// Metin uzunluğu validation
export const validateTextLength = (text: string, min: number, max: number): { valid: boolean; error?: string } => {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Metin gereklidir' };
  }
  
  const length = text.trim().length;
  
  if (length < min) {
    return { valid: false, error: `En az ${min} karakter olmalıdır` };
  }
  
  if (length > max) {
    return { valid: false, error: `En fazla ${max} karakter olabilir` };
  }
  
  return { valid: true };
};

// Sayı aralığı validation
export const validateNumberRange = (value: number, min: number, max: number): { valid: boolean; error?: string } => {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Geçerli bir sayı giriniz' };
  }
  
  if (value < min || value > max) {
    return { valid: false, error: `Değer ${min} ile ${max} arasında olmalıdır` };
  }
  
  return { valid: true };
};
