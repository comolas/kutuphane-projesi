import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  isDarkMode: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ isDarkMode }) => {
  const [isLogin, setIsLogin] = React.useState(true);
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [animatedTitle, setAnimatedTitle] = React.useState('');
  const fullTitle = 'Kütüphanemize Hoş Geldiniz';

  React.useEffect(() => {
    let i = 0;
    setAnimatedTitle('');
    const interval = setInterval(() => {
      if (i < fullTitle.length) {
        setAnimatedTitle(prev => prev + fullTitle.charAt(i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);
  
  const handleLoginSubmit = async (email: string, password: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Attempting login with email:', email);
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful');
      if (email === 'datakolejikutuphane@gmail.com') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Giriş yapılırken bir hata oluştu. Lütfen bilgilerinizi kontrol edin.';
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Şifre hatalı. Lütfen tekrar deneyin.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegisterSubmit = async (
    name: string,
    email: string,
    password: string,
    studentClass: string,
    studentNumber: string
  ) => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Starting registration process...');
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('User created successfully:', user.uid);
      
      // Update user profile with display name
      await updateProfile(user, {
        displayName: name
      });
      
      console.log('Profile updated successfully');
      
      // Create user document in Firestore
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: name,
        studentClass: studentClass || '',
        studentNumber: studentNumber || '',
        role: 'user',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        totalXP: 0,
        level: 1
      };
      
      console.log('Creating user document with data:', userData);
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, userData);
      
      console.log('User document created successfully');
      
      // Create initial tasks for the user
      const defaultTasks = [
        {
          id: 'daily-reading',
          title: 'Günlük Okuma',
          description: 'En az 30 dakika kitap okuyun',
          type: 'daily',
          xpReward: 50,
          completed: false,
          userId: user.uid,
          createdAt: serverTimestamp(),
          lastReset: serverTimestamp()
        },
        {
          id: 'daily-catalog-browse',
          title: 'Katalog İncelemesi',
          description: 'Kütüphane kataloğunu inceleyin ve yeni kitaplar keşfedin',
          type: 'daily',
          xpReward: 25,
          completed: false,
          userId: user.uid,
          createdAt: serverTimestamp(),
          lastReset: serverTimestamp()
        },
        {
          id: 'weekly-book-finish',
          title: 'Kitap Bitirme',
          description: 'Bir kitabı tamamlayın',
          type: 'weekly',
          xpReward: 200,
          completed: false,
          userId: user.uid,
          createdAt: serverTimestamp(),
          lastReset: serverTimestamp()
        },
        {
          id: 'weekly-event-attend',
          title: 'Etkinlik Katılımı',
          description: 'Bir kütüphane etkinliğine katılın',
          type: 'weekly',
          xpReward: 150,
          completed: false,
          userId: user.uid,
          createdAt: serverTimestamp(),
          lastReset: serverTimestamp()
        }
      ];
      
      console.log('Creating initial tasks...');
      
      // Create tasks one by one to avoid batch issues
      for (const task of defaultTasks) {
        const taskRef = doc(db, 'userTasks', `${user.uid}_${task.id}`);
        await setDoc(taskRef, task);
      }
      
      console.log('Initial tasks created successfully');
      console.log('Registration completed successfully, navigating to dashboard...');
      
      navigate('/dashboard');
    } catch (error: any) {
      // Consolidate error logging to reduce console noise
      if (error.code === 'auth/email-already-in-use') {
        console.warn('Registration failed: Email already in use');
      } else if (error.code === 'permission-denied') {
        console.warn('Registration failed: Permission denied');
      } else {
        console.error('Registration failed:', error.code || error.message);
      }
      
      let errorMessage = 'Kayıt olurken bir hata oluştu. Lütfen tekrar deneyin.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanımda.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Kayıt işlemi için yetkiniz bulunmuyor. Lütfen yönetici ile iletişime geçin.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (!resetEmail) {
      setError('Lütfen e-posta adresinizi girin.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await auth.sendPasswordResetEmail(resetEmail);
      alert('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
      setShowForgotPasswordModal(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      let errorMessage = 'Şifre sıfırlama e-postası gönderilirken bir hata oluştu.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi.';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setError('');
  };
  
  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Form Section */}
        <div className="flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 lg:p-12">
          {error && (
            <div className="w-full max-w-md mb-4 p-4 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {isLogin ? (
            <LoginForm
              onSubmit={handleLoginSubmit}
              onRegisterClick={toggleForm}
              onForgotPasswordClick={() => setShowForgotPasswordModal(true)}
            />
          ) : (
            <RegisterForm
              onSubmit={handleRegisterSubmit}
              onLoginClick={toggleForm}
            />
          )}
          {isLoading && (
            <div className="w-full max-w-md mt-4 p-4 bg-blue-100 text-blue-700 rounded-lg text-sm text-center">
              İşlem gerçekleştiriliyor, lütfen bekleyin...
            </div>
          )}
        </div>
        
        {/* Info Section - Hidden on mobile */}
        <div className="hidden lg:flex flex-col justify-center p-12 xl:p-16 bg-indigo-900 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl xl:text-3xl font-bold mb-6">{animatedTitle}<span className="animate-pulse">|</span></h2>
            <p className="text-indigo-200 mb-8 max-w-md text-sm xl:text-base">
              Dijital kütüphanemizde binlerce kitaba erişim sağlayın. 
              Keşfedin, ödünç alın ve bilgi dünyasını keşfedin.
            </p>
            
            <div className="space-y-4 mb-8">
              {[
                'Binlerce kitaba çevrimiçi erişin',
                'Okuma ilerleyişinizi takip edin',
                'Kişiselleştirilmiş öneriler alın',
                'Okuma topluluklarına katılın'
              ].map((feature, index) => (
                <div key={index} className="flex items-center text-sm xl:text-base">
                  <ChevronRight className="text-indigo-300 mr-2 flex-shrink-0" size={20} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            
            
          </div>
        </div>
      </div>
      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-xl shadow-lg max-w-md w-full p-6 ${isDarkMode ? 'bg-gray-800 text-white' : ''}`}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Şifremi Sıfırla</h3>
            {error && (
              <div className="w-full mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            <input
              type="email"
              placeholder="E-posta adresiniz"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              disabled={isLoading}
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowForgotPasswordModal(false);
                  setError('');
                  setResetEmail('');
                }}
                className={`px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : ''}`}
                disabled={isLoading}
              >
                İptal
              </button>
              <button
                onClick={handlePasswordReset}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                Sıfırlama Bağlantısı Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;