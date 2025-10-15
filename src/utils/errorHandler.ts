// Güvenli error handling utility

interface ErrorResponse {
  message: string;
  code?: string;
  shouldRetry?: boolean;
}

// Kullanıcıya gösterilecek genel hata mesajları
const GENERIC_ERRORS: Record<string, string> = {
  'auth/user-not-found': 'Kullanıcı bulunamadı',
  'auth/wrong-password': 'Hatalı şifre',
  'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanımda',
  'auth/weak-password': 'Şifre çok zayıf',
  'auth/invalid-email': 'Geçersiz e-posta adresi',
  'auth/user-disabled': 'Hesabınız devre dışı bırakılmış',
  'auth/too-many-requests': 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin',
  'permission-denied': 'Bu işlem için yetkiniz yok',
  'not-found': 'İstenen kaynak bulunamadı',
  'already-exists': 'Bu kayıt zaten mevcut',
  'resource-exhausted': 'Limit aşıldı. Lütfen daha sonra tekrar deneyin',
  'unauthenticated': 'Giriş yapmanız gerekiyor',
  'unavailable': 'Servis şu anda kullanılamıyor',
  'deadline-exceeded': 'İşlem zaman aşımına uğradı',
  'invalid-argument': 'Geçersiz veri girişi',
  'network-request-failed': 'Bağlantı hatası. İnternet bağlantınızı kontrol edin'
};

// Genel hata mesajı
const DEFAULT_ERROR = 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin';

// Error'u kullanıcı dostu mesaja çevir
export const handleError = (error: any): ErrorResponse => {
  // Firebase Auth hataları
  if (error?.code?.startsWith('auth/')) {
    return {
      message: GENERIC_ERRORS[error.code] || DEFAULT_ERROR,
      code: error.code,
      shouldRetry: error.code === 'auth/network-request-failed'
    };
  }

  // Firebase Functions hataları
  if (error?.code) {
    return {
      message: GENERIC_ERRORS[error.code] || error.message || DEFAULT_ERROR,
      code: error.code,
      shouldRetry: ['unavailable', 'deadline-exceeded', 'resource-exhausted'].includes(error.code)
    };
  }

  // Network hataları
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return {
      message: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin',
      shouldRetry: true
    };
  }

  // Genel hata
  return {
    message: DEFAULT_ERROR,
    shouldRetry: false
  };
};

// Error'u loglama (development'ta detaylı, production'da minimal)
export const logError = (error: any, context?: string) => {
  if (import.meta.env.DEV) {
    console.error(`[Error${context ? ` - ${context}` : ''}]:`, error);
  } else {
    // Production'da sadece error code
    console.error(`[Error${context ? ` - ${context}` : ''}]:`, error?.code || 'unknown');
  }
};

// Async fonksiyonlar için error wrapper
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: ErrorResponse }> => {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    logError(error, context);
    return { error: handleError(error) };
  }
};
