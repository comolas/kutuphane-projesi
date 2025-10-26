import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import { handleError, logError } from '../utils/errorHandler';

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
  const fullTitle = ' Kütüphanemize Hoş Geldiniz';

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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user role from Firestore
      const userDoc = await import('firebase/firestore').then(m => m.getDoc(m.doc(db, 'users', user.uid)));
      const userData = userDoc.data();
      const userRole = userData?.role || 'user';
      
      // Navigate based on role
      if (userRole === 'superadmin') {
        navigate('/super-admin');
      } else if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      logError(error, 'Login');
      const errorResponse = handleError(error);
      setError(errorResponse.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegisterSubmit = async (
    name: string,
    email: string,
    password: string,
    studentClass: string,
    studentNumber: string,
    campusId: string
  ) => {
    setIsLoading(true);
    setError('');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: name
      });
      
      // Create user document in Firestore
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: name,
        studentClass: studentClass || '',
        studentNumber: studentNumber || '',
        campusId: campusId,
        role: 'user',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        totalXP: 0,
        level: 1
      };
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, userData);
      
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
      
      for (const task of defaultTasks) {
        const taskRef = doc(db, 'userTasks', `${user.uid}_${task.id}`);
        await setDoc(taskRef, task);
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      logError(error, 'Registration');
      const errorResponse = handleError(error);
      setError(errorResponse.message);
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
      await sendPasswordResetEmail(auth, resetEmail);
      await Swal.fire({
        icon: 'success',
        title: 'Başarılı!',
        text: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
        confirmButtonColor: '#6366f1'
      });
      setShowForgotPasswordModal(false);
      setResetEmail('');
    } catch (error: any) {
      logError(error, 'Password Reset');
      const errorResponse = handleError(error);
      setError(errorResponse.message);
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Form Section */}
        <div className="flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 animate-fade-in relative overflow-hidden min-h-screen lg:min-h-0">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl animate-blob -top-20 -left-20"></div>
            <div className="absolute w-72 h-72 bg-purple-200/30 rounded-full blur-3xl animate-blob animation-delay-2000 top-40 -right-20"></div>
            <div className="absolute w-72 h-72 bg-pink-200/30 rounded-full blur-3xl animate-blob animation-delay-4000 -bottom-20 left-40"></div>
          </div>
          <div className="relative z-10 w-full max-w-md px-2 sm:px-0">
          {error && (
            <div className="w-full mb-4 p-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg text-sm shadow-lg animate-fade-in">
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
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full border border-white/20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDelay: '150ms', animationDirection: 'reverse' }}></div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">İşlem Gerçekleştiriliyor</h3>
                    <p className="text-sm text-gray-600">Lütfen bekleyin...</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
        
        {/* Info Section - Hidden on mobile */}
        <div className="hidden lg:flex flex-col justify-center p-12 xl:p-16 bg-indigo-900 text-white relative overflow-hidden animate-slide-in-right">
          {/* Animated Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-blob top-0 -left-20"></div>
            <div className="absolute w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-blob animation-delay-2000 top-20 right-0"></div>
            <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-blob animation-delay-4000 bottom-0 left-20"></div>
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl xl:text-4xl font-bold mb-6 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
              {animatedTitle}<span className="animate-pulse text-white">|</span>
            </h2>
            <p className="text-indigo-100 mb-8 max-w-md text-base xl:text-lg leading-relaxed">
              Dijital kütüphanemizde binlerce kitaba erişim sağlayın. 
              Keşfedin, ödünç alın ve bilgi dünyasını keşfedin. 📚
            </p>
            
            <div className="space-y-4 mb-8">
              {[
                'Binlerce kitaba çevrimiçi erişin',
                'Okuma ilerleyişinizi takip edin',
                'Kişiselleştirilmiş öneriler alın',
                'Okuma topluluklarına katılın'
              ].map((feature, index) => (
                <div key={index} className="flex items-center text-sm xl:text-base bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 hover:scale-105 transition-all duration-300 animate-stagger border border-white/20" style={{ animationDelay: `${index * 150}ms` }}>
                  <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span className="font-medium">{feature}</span>
                </div>
              ))}
            </div>
            
            
          </div>
        </div>
      </div>
      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl max-w-md w-full p-6 border border-white/20 animate-fade-in">
            <h3 className="text-lg font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">Şifremi Sıfırla</h3>
            {error && (
              <div className="w-full mb-4 p-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg text-sm shadow-lg">
                {error}
              </div>
            )}
            <input
              type="email"
              placeholder="E-posta adresiniz"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 focus:scale-105"
              disabled={isLoading}
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowForgotPasswordModal(false);
                  setError('');
                  setResetEmail('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-105"
                disabled={isLoading}
              >
                İptal
              </button>
              <button
                onClick={handlePasswordReset}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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