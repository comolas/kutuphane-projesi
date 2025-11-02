import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, X } from 'lucide-react';
import Button from '../common/Button';
import FormInput from '../common/FormInput';
import { validateEmail } from '../../utils/validation';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  onRegisterClick: () => void;
  onForgotPasswordClick: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onRegisterClick,
  onForgotPasswordClick,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(() => localStorage.getItem('rememberedEmail') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('rememberedEmail') !== null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const validateField = (fieldName: string, value: string) => {
    let errorMessage = '';
    if (fieldName === 'email') {
      if (!value) {
        errorMessage = t('login.emailRequired');
      } else if (!/\S+@\S+\.\S+/.test(value)) {
        errorMessage = t('login.invalidEmail');
      }
    } else if (fieldName === 'password') {
      if (!value) {
        errorMessage = t('login.passwordRequired');
      }
    }
    setErrors(prevErrors => ({
      ...prevErrors,
      [fieldName]: errorMessage,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string; captcha?: string } = {};
    
    // Email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.error;
    }
    
    if (!password) {
      newErrors.password = t('login.passwordRequired');
    }
    

    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      onSubmit(email, password);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-8 mx-auto hover:shadow-3xl hover:scale-[1.02] transition-all duration-500 group">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <img src="https://r.resimlink.com/BJq8au6HpG.png" alt="Data Koleji Logo" className="w-20 h-20 rounded-2xl border-3 border-indigo-400/50 group-hover:border-indigo-500 transition-all duration-300 shadow-lg" />
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 tracking-tight">
            Data Koleji Kütüphanesi
          </h2>
          <p className="text-gray-600 font-medium">
            Bilgiye erişimin en kolay yolu ✨
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label={t('login.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            placeholder="ornek@datakolej.edu.tr"
            icon="mail"
          />
          
          <div className="relative">
            <FormInput
              label={t('login.password')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <EyeOff size={1} /> : <Eye size={1} />}
            </button>
          </div>



          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-800 transition-colors">{t('login.rememberMe')}</span>
            </label>
            <button
              type="button"
              onClick={onForgotPasswordClick}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
            >
              {t('login.forgotPassword')}
            </button>
          </div>

          <Button type="submit" fullWidth className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl">
            <span className="flex items-center justify-center gap-2">
              {t('login.loginButton')}
              <span className="text-lg">→</span>
            </span>
          </Button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            {t('login.noAccount')}{' '}
            <button
              type="button"
              onClick={onRegisterClick}
              className="text-indigo-600 hover:text-purple-600 font-semibold hover:underline transition-all duration-300"
            >
              {t('login.registerNow')}
            </button>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {t('login.byLoggingIn')}{' '}
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-blue-600 hover:text-blue-500"
            >
              {t('login.termsOfService')}
            </button>
            {' '}{t('login.and')}{' '}
            <button
              type="button"
              onClick={() => setShowPrivacyPolicy(true)}
              className="text-blue-600 hover:text-blue-500"
            >
              {t('login.privacyPolicy')}
            </button>
            {' '}{t('login.acceptTerms')}
          </p>
        </div>
      </div>

      {/* Privacy Policy Drawer */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowPrivacyPolicy(false)}>
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-2xl h-full shadow-2xl transform transition-transform duration-300 animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/20 flex justify-between items-center bg-gradient-to-r from-indigo-500 to-purple-600">
              <h2 className="text-2xl font-bold text-white">{t('login.privacyPolicy')}</h2>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto h-[calc(100%-88px)]">
              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold mb-4">1. Veri Toplama ve Kullanım</h3>
                <p className="mb-4">
                  Data Koleji Kütüphanesi olarak, kullanıcılarımızın gizliliğini korumayı taahhüt ediyoruz. Topladığımız veriler şunları içerir:
                  - Kişisel bilgiler (ad, soyad, öğrenci numarası)
                  - İletişim bilgileri (e-posta, telefon)
                  - Kütüphane kullanım verileri (ödünç alma geçmişi, rezervasyonlar)
                </p>

                <h3 className="text-xl font-semibold mb-4">2. Veri Güvenliği</h3>
                <p className="mb-4">
                  Verileriniz SSL şifreleme protokolleri kullanılarak korunmaktadır. Düzenli güvenlik denetimleri yapılmakta ve güncel güvenlik önlemleri uygulanmaktadır.
                </p>

                <h3 className="text-xl font-semibold mb-4">3. Veri Paylaşımı</h3>
                <p className="mb-4">
                  Kullanıcı verileri, yasal zorunluluklar dışında üçüncü taraflarla paylaşılmamaktadır. Veriler yalnızca kütüphane hizmetlerinin sağlanması amacıyla kullanılmaktadır.
                </p>

                <h3 className="text-xl font-semibold mb-4">4. Çerezler ve İzleme</h3>
                <p className="mb-4">
                  Sistemimiz, kullanıcı deneyimini iyileştirmek için çerezler kullanmaktadır. Bu çerezler oturum yönetimi ve güvenlik amacıyla kullanılmaktadır.
                </p>

                <h3 className="text-xl font-semibold mb-4">5. Kullanıcı Hakları</h3>
                <p>
                  Kullanıcılar kendi verilerine erişim, düzeltme ve silme haklarına sahiptir. Bu hakları kullanmak için kütüphane yönetimiyle iletişime geçebilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Drawer */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowTerms(false)}>
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-2xl h-full shadow-2xl transform transition-transform duration-300 animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/20 flex justify-between items-center bg-gradient-to-r from-indigo-500 to-purple-600">
              <h2 className="text-2xl font-bold text-white">{t('login.termsOfService')}</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto h-[calc(100%-88px)]">
              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold mb-4">1. Üyelik ve Hesap</h3>
                <p className="mb-4">
                  - Kütüphane üyeliği yalnızca Data Koleji öğrencileri ve personeline açıktır
                  - Her kullanıcı kendi hesabından sorumludur
                  - Hesap bilgilerinin paylaşılması yasaktır
                </p>

                <h3 className="text-xl font-semibold mb-4">2. Kütüphane Materyalleri</h3>
                <p className="mb-4">
                  - Bir kullanıcı aynı anda en fazla 5 kitap ödünç alabilir
                  - Ödünç alma süresi 14 gündür
                  - Materyallere zarar verilmesi durumunda tazmin edilmesi gerekir
                </p>

                <h3 className="text-xl font-semibold mb-4">3. Dijital Hizmetler</h3>
                <p className="mb-4">
                  - Online katalog ve dijital kaynaklar yalnızca eğitim amaçlı kullanılabilir
                  - İçeriklerin ticari amaçla kullanımı yasaktır
                  - Sistem üzerinde zararlı yazılım kullanımı yasaktır
                </p>

                <h3 className="text-xl font-semibold mb-4">4. Cezalar ve Yaptırımlar</h3>
                <p className="mb-4">
                  - Gecikme durumunda günlük ceza uygulanır
                  - Kural ihlalleri durumunda üyelik askıya alınabilir
                  - Kasıtlı zarar verme durumunda yasal işlem başlatılır
                </p>

                <h3 className="text-xl font-semibold mb-4">5. Değişiklik Hakkı</h3>
                <p>
                  Kütüphane yönetimi, bu koşullarda değişiklik yapma hakkını saklı tutar. Değişiklikler web sitesi üzerinden duyurulacaktır.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginForm;