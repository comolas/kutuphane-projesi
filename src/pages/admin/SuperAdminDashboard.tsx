
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { Building2, Users, GraduationCap, UserCog, Menu, X, LogOut, BarChart, Settings, Search, ChevronDown, ChevronRight, TrendingUp, BookOpen, Clock, Activity, UserCheck } from 'lucide-react';
import AllowedUsersTab from '../../components/superadmin/AllowedUsersTab';

interface Stats {
  totalCampuses: number;
  totalAdmins: number;
  totalTeachers: number;
  totalUsers: number;
  totalBooks: number;
  activeBorrows: number;
}

interface CampusStats {
  name: string;
  userCount: number;
  bookCount: number;
}

interface PerformanceMetric {
  label: string;
  value: number;
  change: number;
  color: string;
}

type TabType = 'dashboard' | 'campuses' | 'users' | 'reports' | 'settings' | 'allowedUsers';

const StatCard = ({ title, value, icon: Icon, loading, gradient }: { title: string; value: number; icon: any; loading?: boolean; gradient: string }) => (
  <div className={`bg-gradient-to-br ${gradient} p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs sm:text-sm font-medium text-white/90">{title}</p>
        {loading ? (
          <div className="mt-2 h-8 w-16 bg-white/20 rounded animate-pulse"></div>
        ) : (
          <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{value}</p>
        )}
      </div>
      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
        <Icon className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
      </div>
    </div>
  </div>
);

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalCampuses: 0, totalAdmins: 0, totalTeachers: 0, totalUsers: 0, totalBooks: 0, activeBorrows: 0 });
  const [campusStats, setCampusStats] = useState<CampusStats[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({ overview: true, management: true, system: true });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const campusesCol = collection(db, 'campuses');
        const usersCol = collection(db, 'users');
        const booksCol = collection(db, 'books');
        const borrowsCol = collection(db, 'borrows');
        
        const adminQuery = query(usersCol, where('role', '==', 'admin'));
        const teacherQuery = query(usersCol, where('role', '==', 'teacher'));
        const userQuery = query(usersCol, where('role', '==', 'user'));
        const activeBorrowsQuery = query(borrowsCol, where('status', '==', 'active'));

        const [campusesSnapshot, adminsSnapshot, teachersSnapshot, usersSnapshot, booksSnapshot, borrowsSnapshot] = await Promise.all([
          getCountFromServer(campusesCol),
          getCountFromServer(adminQuery),
          getCountFromServer(teacherQuery),
          getCountFromServer(userQuery),
          getCountFromServer(booksCol),
          getCountFromServer(activeBorrowsQuery)
        ]);

        setStats({
          totalCampuses: campusesSnapshot.data().count,
          totalAdmins: adminsSnapshot.data().count,
          totalTeachers: teachersSnapshot.data().count,
          totalUsers: usersSnapshot.data().count,
          totalBooks: booksSnapshot.data().count,
          activeBorrows: borrowsSnapshot.data().count,
        });

        // Kampüs istatistikleri
        const campusesData = await getDocs(campusesCol);
        const campusStatsData = await Promise.all(
          campusesData.docs.map(async (campusDoc) => {
            const campusId = campusDoc.id;
            const campusUsers = query(usersCol, where('campusId', '==', campusId));
            const campusBooks = query(booksCol, where('campusId', '==', campusId));
            
            const [userCount, bookCount] = await Promise.all([
              getCountFromServer(campusUsers),
              getCountFromServer(campusBooks)
            ]);
            
            return {
              name: campusDoc.data().name,
              userCount: userCount.data().count,
              bookCount: bookCount.data().count
            };
          })
        );
        setCampusStats(campusStatsData);

        // Performans metrikleri
        setPerformanceMetrics([
          { label: 'Aktif Ödünç', value: borrowsSnapshot.data().count, change: 12, color: 'text-blue-600' },
          { label: 'Toplam Kitap', value: booksSnapshot.data().count, change: 8, color: 'text-green-600' },
          { label: 'Kullanıcı Artışı', value: usersSnapshot.data().count, change: 15, color: 'text-purple-600' },
          { label: 'Kampüs Sayısı', value: campusesSnapshot.data().count, change: 5, color: 'text-orange-600' }
        ]);
      } catch (error) {
        console.error("İstatistikler çekilirken hata oluştu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  const handleNavigation = (tab: TabType, path?: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    if (path) navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-full sm:w-80 lg:w-96 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out z-50 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 mr-2" />
              <span className="text-xl font-bold">Süper Admin</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-indigo-800 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Menüde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-indigo-800 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
          
          <nav className="space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            {/* Genel Bakış */}
            <div>
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, overview: !prev.overview }))}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
              >
                <span>Genel Bakış</span>
                {expandedCategories.overview ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedCategories.overview && (
                <div className="mt-1 space-y-1">
                  <button
                    onClick={() => handleNavigation('dashboard')}
                    className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-all ${
                      activeTab === 'dashboard' ? 'bg-indigo-800' : ''
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    <span>Dashboard</span>
                  </button>
                </div>
              )}
            </div>

            {/* Yönetim */}
            <div className="pt-2">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, management: !prev.management }))}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
              >
                <span>Yönetim</span>
                {expandedCategories.management ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedCategories.management && (
                <div className="mt-1 space-y-1">
                  <button
                    onClick={() => handleNavigation('campuses', '/super-admin/campuses')}
                    className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-all ${
                      activeTab === 'campuses' ? 'bg-indigo-800' : ''
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                    <span>Kampüsler</span>
                  </button>
                  <button
                    onClick={() => handleNavigation('users', '/super-admin/users')}
                    className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-all ${
                      activeTab === 'users' ? 'bg-indigo-800' : ''
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    <span>Kullanıcılar</span>
                  </button>
                  <button
                    onClick={() => handleNavigation('allowedUsers')}
                    className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-all ${
                      activeTab === 'allowedUsers' ? 'bg-indigo-800' : ''
                    }`}
                  >
                    <UserCheck className="w-5 h-5" />
                    <span>İzin Verilen Kullanıcılar</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sistem */}
            <div className="pt-2">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, system: !prev.system }))}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
              >
                <span>Sistem</span>
                {expandedCategories.system ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedCategories.system && (
                <div className="mt-1 space-y-1">
                  <button
                    onClick={() => handleNavigation('reports', '/super-admin/reports')}
                    className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-all ${
                      activeTab === 'reports' ? 'bg-indigo-800' : ''
                    }`}
                  >
                    <BarChart className="w-5 h-5" />
                    <span>Raporlar</span>
                  </button>
                  <button
                    onClick={() => navigate('/super-admin/page-management')}
                    className="flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-all"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Sayfa Yönetimi</span>
                  </button>
                  <button
                    onClick={() => handleNavigation('settings', '/super-admin/settings')}
                    className={`flex items-center w-full space-x-3 p-2 rounded-lg hover:bg-indigo-800 transition-all ${
                      activeTab === 'settings' ? 'bg-indigo-800' : ''
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Genel Ayarlar</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 w-full rounded-lg hover:bg-indigo-800 transition-colors text-red-300 hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Header */}
      <div className="bg-indigo-900 text-white pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center flex-wrap gap-2">
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-indigo-800 rounded-lg transition-colors">
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold">Süper Admin Paneli</h1>
              <span className="px-2 sm:px-3 py-1 bg-purple-500 text-white text-xs sm:text-sm font-semibold rounded-full">
                Tüm Kampüsler
              </span>
            </div>
            <button onClick={handleLogout} className="flex items-center px-3 sm:px-4 py-2 bg-indigo-800 rounded-lg hover:bg-indigo-700 transition-colors text-sm">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'allowedUsers' && <AllowedUsersTab />}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-6 mb-6 sm:mb-8 animate-fadeIn">
              <StatCard title="Toplam Kampüs" value={stats.totalCampuses} icon={Building2} loading={loading} gradient="from-indigo-500 to-purple-600" />
              <StatCard title="Toplam Admin" value={stats.totalAdmins} icon={UserCog} loading={loading} gradient="from-blue-500 to-cyan-600" />
              <StatCard title="Toplam Öğretmen" value={stats.totalTeachers} icon={GraduationCap} loading={loading} gradient="from-green-500 to-emerald-600" />
              <StatCard title="Toplam Kullanıcı" value={stats.totalUsers} icon={Users} loading={loading} gradient="from-yellow-500 to-orange-600" />
              <StatCard title="Toplam Kitap" value={stats.totalBooks} icon={BookOpen} loading={loading} gradient="from-purple-500 to-pink-600" />
              <StatCard title="Aktif Ödünç" value={stats.activeBorrows} icon={Clock} loading={loading} gradient="from-rose-500 to-red-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Performans Metrikleri */}
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Performans Metrikleri</h2>
                  <Activity className="w-5 h-5 text-gray-500" />
                </div>
                <div className="space-y-4">
                  {performanceMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{metric.label}</p>
                        <p className={`text-lg font-bold ${metric.color}`}>{metric.value}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          metric.change > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {metric.change > 0 ? '+' : ''}{metric.change}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kampüs Dağılımı */}
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Kampüs Dağılımı</h2>
                <div className="space-y-3">
                  {campusStats.slice(0, 5).map((campus, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{campus.name}</p>
                        <p className="text-sm text-gray-600">{campus.userCount} kullanıcı</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-indigo-600">{campus.bookCount}</p>
                        <p className="text-xs text-gray-500">kitap</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hızlı Erişim */}
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Hızlı Erişim</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleNavigation('campuses', '/super-admin/campuses')} className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left">
                    <Building2 className="w-6 h-6 text-blue-600 mb-1" />
                    <h3 className="text-sm font-semibold text-gray-800">Kampüsler</h3>
                  </button>
                  <button onClick={() => handleNavigation('users', '/super-admin/users')} className="p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left">
                    <Users className="w-6 h-6 text-green-600 mb-1" />
                    <h3 className="text-sm font-semibold text-gray-800">Kullanıcılar</h3>
                  </button>
                  <button onClick={() => handleNavigation('reports', '/super-admin/reports')} className="p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left">
                    <BarChart className="w-6 h-6 text-purple-600 mb-1" />
                    <h3 className="text-sm font-semibold text-gray-800">Raporlar</h3>
                  </button>
                  <button onClick={() => handleNavigation('settings', '/super-admin/settings')} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
                    <Settings className="w-6 h-6 text-gray-600 mb-1" />
                    <h3 className="text-sm font-semibold text-gray-800">Ayarlar</h3>
                  </button>
                </div>
              </div>
            </div>

            {/* Sistem Durumu ve Gerçek Zamanlı Veriler */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Sistem Durumu</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Sistem</span>
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">Aktif</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Veritabanı</span>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">Bağlı</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Son Güncelleme</span>
                    <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                      {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Özet İstatistikler</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalUsers + stats.totalAdmins + stats.totalTeachers}</p>
                    <p className="text-sm text-gray-600">Toplam Aktif Kullanıcı</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats.totalBooks}</p>
                    <p className="text-sm text-gray-600">Toplam Kitap</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{stats.activeBorrows}</p>
                    <p className="text-sm text-gray-600">Aktif Ödünç</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-amber-100 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{stats.totalCampuses}</p>
                    <p className="text-sm text-gray-600">Aktif Kampüs</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
