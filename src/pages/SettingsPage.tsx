import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Trophy, Calendar, Star, CheckCircle2, Save, Palette, Type, Layout, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TaskContext';
import { useTheme } from '../contexts/ThemeContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { tasks, achievements, userProgress, completeTask } = useTasks();
  const { setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: userData?.displayName || '',
    email: user?.email || '',
    studentClass: userData?.studentClass || '',
    studentNumber: userData?.studentNumber || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const [customSettings, setCustomSettings] = useState(() => {
    const initialSettings = {
      theme: 'light',
      fontSize: 'medium',
      language: 'tr',
      notifications: {
        email: true,
        reminders: true,
        events: true,
        news: true
      },
      privacy: {
        showProfile: true,
        showActivity: false,
        showReadingList: true
      }
    };
    return userData?.customSettings ? { ...initialSettings, ...userData.customSettings } : initialSettings;
  });

  useEffect(() => {
    if (userData?.customSettings) {
      setCustomSettings(prev => ({ ...prev, ...userData.customSettings }));
    }
  }, [userData]);

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'tasks', label: 'Görevler', icon: Calendar },
    { id: 'achievements', label: 'Başarımlar', icon: Trophy },
    
    
  ];

  const dailyTasks = tasks.filter(task => task.type === 'daily');
  const weeklyTasks = tasks.filter(task => task.type === 'weekly');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        studentClass: formData.studentClass,
        studentNumber: formData.studentNumber,
      });

      setSuccess('Profil bilgileriniz başarıyla güncellendi.');
      setIsEditing(false);
      setHasChanges(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Profil güncellenirken bir hata oluştu.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSettingChange = (value: any, keys: string[]) => {
    if (keys.length === 1 && keys[0] === 'theme') {
      setTheme(value as 'light' | 'dark');
    }

    setCustomSettings(prev => {
      const newSettings = JSON.parse(JSON.stringify(prev));
      let current: any = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
    setHasChanges(true);
  };

  const handleSaveAllChanges = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        customSettings: customSettings
      });
      setSuccess('Ayarlarınız başarıyla kaydedildi.');
      setHasChanges(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Ayarlar kaydedilirken bir hata oluştu.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDiscardChanges = () => {
    if (userData?.customSettings) {
      setCustomSettings(userData.customSettings);
      if (userData.customSettings.theme) {
        setTheme(userData.customSettings.theme);
      }
    }
    setHasChanges(false);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
    } catch (error) {
      console.error('Error completing task:', error);
      setError('Görev tamamlanırken bir hata oluştu.');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24"> 
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Geri Dön
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ayarlar</h1>
          <p className="mt-2 text-gray-600">
            Hesap ayarlarınızı ve tercihlerinizi buradan yönetebilirsiniz.
          </p>
        </div>

        {/* Level Progress Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Seviye {userProgress.level}</h2>
              <p className="text-sm text-gray-600">
                Bir sonraki seviyeye {userProgress.nextLevelXP - userProgress.currentXP} XP kaldı
              </p>
            </div>
            <div className="flex items-center">
              <Star className="w-6 h-6 text-yellow-500 mr-2" />
              <span className="text-lg font-semibold">{userProgress.totalXP} XP</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${(userProgress.currentXP / userProgress.nextLevelXP) * 100}%`
              }}
            ></div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Not:</strong> Profil bilgileriniz sistem yöneticisi tarafından yönetilmektedir. 
                    Değişiklik yapmak için kütüphane personeli ile iletişime geçiniz.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    E-posta
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sınıf
                  </label>
                  <input
                    type="text"
                    name="studentClass"
                    value={formData.studentClass}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Öğrenci Numarası
                  </label>
                  <input
                    type="text"
                    name="studentNumber"
                    value={formData.studentNumber}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Kayıt Tarihi
                  </label>
                  <input
                    type="text"
                    value={userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : ''}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Son Giriş
                  </label>
                  <input
                    type="text"
                    value={userData?.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : ''}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                  />
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-8">
                {/* Daily Tasks */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Günlük Görevler
                  </h3>
                  <div className="space-y-4">
                    {dailyTasks.map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <button
                            onClick={() => !task.completed && handleCompleteTask(task.id)}
                            disabled={task.completed}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 transition-colors ${
                              task.completed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-indigo-500 cursor-pointer'
                            }`}
                          >
                            {task.completed && <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <div>
                            <h4 className="font-medium text-gray-900">{task.title}</h4>
                            <p className="text-sm text-gray-500">{task.description}</p>
                            {task.completed && task.completedAt && (
                              <p className="text-xs text-green-600 mt-1">
                                Tamamlandı: {task.completedAt.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-5 h-5 text-yellow-500 mr-1" />
                          <span className="font-medium">{task.xpReward} XP</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly Tasks */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Haftalık Görevler
                  </h3>
                  <div className="space-y-4">
                    {weeklyTasks.map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <button
                            onClick={() => !task.completed && handleCompleteTask(task.id)}
                            disabled={task.completed}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 transition-colors ${
                              task.completed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-indigo-500 cursor-pointer'
                            }`}
                          >
                            {task.completed && <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <div>
                            <h4 className="font-medium text-gray-900">{task.title}</h4>
                            <p className="text-sm text-gray-500">{task.description}</p>
                            {task.completed && task.completedAt && (
                              <p className="text-xs text-green-600 mt-1">
                                Tamamlandı: {task.completedAt.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-5 h-5 text-yellow-500 mr-1" />
                          <span className="font-medium">{task.xpReward} XP</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Başarımlarınız</h3>
                  <p className="text-gray-600">Her 5 seviyede bir yeni başarım kazanırsınız!</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {achievements.map(achievement => (
                    <div
                      key={achievement.id}
                      className="p-6 rounded-lg border bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"
                    >
                      <div className="flex items-start mb-4">
                        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mr-4 text-2xl">
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg">{achievement.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                          {achievement.completedAt && (
                            <p className="text-xs text-indigo-600 mt-2 font-medium">
                              Kazanıldı: {achievement.completedAt.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Award className="w-5 h-5 text-indigo-600 mr-2" />
                          <span className="text-sm font-medium text-indigo-600">
                            Seviye {achievement.level} Başarımı
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-5 h-5 text-yellow-500 mr-1" />
                          <span className="font-medium text-gray-900">{achievement.xpReward} XP</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {achievements.length === 0 && (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz başarım kazanmadınız</h3>
                    <p className="text-gray-600">
                      Görevleri tamamlayarak XP kazanın ve seviye atlayarak başarımlar elde edin!
                    </p>
                  </div>
                )}
              </div>
            )}

            

            
          </div>
        </div>

        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 animate-fade-in-up">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
              <p className="text-sm font-medium text-gray-700">Kaydedilmemiş değişiklikleriniz var.</p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDiscardChanges}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleSaveAllChanges}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Değişiklikleri Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;