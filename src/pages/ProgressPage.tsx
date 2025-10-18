import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Trophy, Calendar, Star, CheckCircle2, Award, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TaskContext';

const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { tasks, achievements, userProgress, completeTask } = useTasks();
  const [activeTab, setActiveTab] = useState('level'); // Default to level progress

  const tabs = [
    { id: 'level', label: 'Seviye', icon: Star }, // Using Star for level
    { id: 'tasks', label: 'Görevler', icon: Calendar },
    { id: 'achievements', label: 'Başarımlar', icon: Trophy },
  ];

  const dailyTasks = tasks.filter(task => task.type === 'daily');
  const weeklyTasks = tasks.filter(task => task.type === 'weekly');

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
    } catch (error) {
      console.error('Error completing task:', error);
      // Optionally, add error state here if needed for UI feedback
    }
  };

  // Helper to determine achievement tier
  const getAchievementTier = (level: number) => {
    if (level <= 5) return 'bronze';
    if (level <= 10) return 'silver';
    return 'gold';
  };

  // Helper to get tier-specific styles
  const getTierStyles = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return {
          card: 'bg-amber-50 border-amber-200',
          iconBg: 'bg-amber-100',
          iconText: 'text-amber-600',
          levelText: 'text-amber-600',
        };
      case 'silver':
        return {
          card: 'bg-slate-50 border-slate-200',
          iconBg: 'bg-slate-100',
          iconText: 'text-slate-600',
          levelText: 'text-slate-600',
        };
      case 'gold':
        return {
          card: 'bg-yellow-50 border-yellow-200',
          iconBg: 'bg-yellow-100',
          iconText: 'text-yellow-600',
          levelText: 'text-yellow-600',
        };
      default:
        return {
          card: 'bg-gray-50 border-gray-200',
          iconBg: 'bg-gray-100',
          iconText: 'text-gray-600',
          levelText: 'text-gray-600',
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8">
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
          <h1 className="text-3xl font-bold text-gray-900">İlerleme ve Başarımlar</h1>
          <p className="mt-2 text-gray-600">
            Seviyenizi, görevlerinizi ve başarımlarınızı buradan takip edebilirsiniz.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden border border-white/20">
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
            {activeTab === 'level' && (
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg p-6 mb-6 border border-white/20">
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
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(userProgress.currentXP / userProgress.nextLevelXP) * 100}%`
                    }}
                  ></div>
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
                        <div className="flex items-center flex-grow">
                          {task.target !== undefined && task.currentProgress !== undefined ? (
                            // Progressive Task
                            <div className="flex-1 mr-3">
                              <h4 className="font-medium text-gray-900">{task.title}</h4>
                              <p className="text-sm text-gray-500">{task.description}</p>
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${(task.currentProgress / task.target) * 100}%`
                                    }}
                                  ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {task.currentProgress}/{task.target} {task.progressType === 'pages' ? 'sayfa' : 'adet'}
                                </p>
                              </div>
                              {task.completed && task.completedAt && (
                                <p className="text-xs text-green-600 mt-1">
                                  Tamamlandı: {new Date(task.completedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            // Regular Task
                            <>
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
                                    Tamamlandı: {new Date(task.completedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </>
                          )}
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
                        <div className="flex items-center flex-grow">
                          {task.target !== undefined && task.currentProgress !== undefined ? (
                            // Progressive Task
                            <div className="flex-1 mr-3">
                              <h4 className="font-medium text-gray-900">{task.title}</h4>
                              <p className="text-sm text-gray-500">{task.description}</p>
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${(task.currentProgress / task.target) * 100}%`
                                    }}
                                  ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {task.currentProgress}/{task.target} {task.progressType === 'pages' ? 'sayfa' : 'adet'}
                                </p>
                              </div>
                              {task.completed && task.completedAt && (
                                <p className="text-xs text-green-600 mt-1">
                                  Tamamlandı: {new Date(task.completedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            // Regular Task
                            <>
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
                                    Tamamlandı: {new Date(task.completedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </>
                          )}
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
                  {achievements.map(achievement => {
                    const isCompleted = !!achievement.completedAt;
                    const tier = getAchievementTier(achievement.level);
                    const tierStyles = getTierStyles(tier);

                    return (
                      <div
                        key={achievement.id}
                        className={`p-6 rounded-lg border ${tierStyles.card}`}
                      >
                        <div className="flex items-start mb-4">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mr-4 text-2xl ${tierStyles.iconBg} ${tierStyles.iconText}`}>
                            {isCompleted ? achievement.icon : <HelpCircle className="w-8 h-8" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 text-lg">
                              {isCompleted ? achievement.title : '??? Gizemli Başarım'}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {isCompleted ? achievement.description : 'Bu başarımı keşfetmek için görevleri tamamla!'}
                            </p>
                            {isCompleted && achievement.completedAt && (
                              <p className="text-xs text-gray-600 mt-2 font-medium">
                                Kazanıldı: {new Date(achievement.completedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Award className={`w-5 h-5 mr-2 ${tierStyles.levelText}`} />
                            <span className={`text-sm font-medium ${tierStyles.levelText}`}>
                              {isCompleted ? `Seviye ${achievement.level} Başarımı` : '??? Seviye Başarımı'}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Star className="w-5 h-5 text-yellow-500 mr-1" />
                            <span className="font-medium text-gray-900">
                              {isCompleted ? `${achievement.xpReward} XP` : '?? XP'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
      </div>
    </div>
  );
};

export default ProgressPage;