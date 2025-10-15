// Güvenli logging utility - hassas verileri loglamaz

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Production'da loglama yapılmaz (sadece error)
const isDevelopment = import.meta.env.DEV;

// Hassas alanlar - asla loglanmamalı
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'accessKey',
  'privateKey',
  'creditCard',
  'ssn',
  'email',
  'phone',
  'address'
];

// Hassas verileri maskele
const maskSensitiveData = (data: any): any => {
  if (typeof data === 'string') {
    return '***MASKED***';
  }
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const masked: any = {};
    for (const key in data) {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
        masked[key] = '***MASKED***';
      } else {
        masked[key] = maskSensitiveData(data[key]);
      }
    }
    return masked;
  }
  
  return data;
};

export const logger = {
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, data ? maskSensitiveData(data) : '');
    }
  },
  
  warn: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data ? maskSensitiveData(data) : '');
    }
  },
  
  error: (message: string, data?: any) => {
    // Error'lar her zaman loglanır ama hassas veriler maskelenir
    console.error(`[ERROR] ${message}`, data ? maskSensitiveData(data) : '');
  },
  
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data ? maskSensitiveData(data) : '');
    }
  }
};
