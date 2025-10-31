import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { BarChart3, TrendingUp, Users, Building2, BookOpen, Download, Calendar, FileText, ArrowLeft, RefreshCw, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLOR_THEMES = {
  default: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'],
  warm: ['#ef4444', '#f59e0b', '#f97316', '#fb923c', '#fbbf24', '#fcd34d'],
  cool: ['#3b82f6', '#06b6d4', '#0ea5e9', '#14b8a6', '#10b981', '#22c55e'],
  mono: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db']
};
const COLORS = COLOR_THEMES.default;

const calculateTrend = (data: number[]) => {
  if (data.length < 2) return { direction: 'stable', percentage: 0 };
  const recent = data.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, data.length);
  const older = data.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, data.length - 3);
  const change = older > 0 ? ((recent - older) / older) * 100 : 0;
  return { direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable', percentage: Math.abs(change).toFixed(1) };
};

const predictNextValue = (data: number[]) => {
  if (data.length < 2) return data[data.length - 1] || 0;
  const recent = data.slice(-3);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const trend = recent.length > 1 ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1) : 0;
  return Math.round(avg + trend);
};

const calculateGrowthRate = (current: number, previous: number) => {
  if (previous === 0) return 0;
  return (((current - previous) / previous) * 100).toFixed(1);
};

const getPerformanceMetrics = (data: any[]) => {
  if (!data || data.length === 0) return null;
  const values = data.map((item: any) => item.borrowCount || item.count || 0);
  const total = values.reduce((a: number, b: number) => a + b, 0);
  const avg = total / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  return { total, avg: avg.toFixed(1), max, min, count: data.length };
};

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  available: boolean;
}

const reportTypes: ReportCard[] = [
  { id: 'bookActivityByCampus', title: 'Kampüs Bazında Kitap Aktivitesi', description: 'Her kampüsteki ödünç alma istatistikleri', icon: Building2, color: 'blue', available: true },
  { id: 'userGrowth', title: 'Kullanıcı Büyüme Trendi', description: 'Aylık kullanıcı artış analizi', icon: TrendingUp, color: 'green', available: true },
  { id: 'categoryPopularity', title: 'Kategori Popülerliği', description: 'Kapsamlı kategori analizi (4 farklı görünüm)', icon: BookOpen, color: 'purple', available: true },
  { id: 'activeUsers', title: 'Aktif Kullanıcı Analizi', description: 'En aktif okuyucular ve istatistikler', icon: Users, color: 'orange', available: true },
  { id: 'campusBudgets', title: 'Bütçe', description: 'Kampüslerin mevcut bütçe durumları', icon: Wallet, color: 'indigo', available: true },
];

const GlobalReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryTab, setCategoryTab] = useState<'overview' | 'campus' | 'trend' | 'comparison'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    campus: '',
    category: '',
    userGroup: '',
  });
  const [availableCampuses, setAvailableCampuses] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [colorTheme, setColorTheme] = useState<'default' | 'warm' | 'cool' | 'mono'>('default');
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dataChanges, setDataChanges] = useState<any[]>([]);

  useEffect(() => {
    if (autoRefresh && selectedReport) {
      const interval = setInterval(() => {
        refreshReport();
      }, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, selectedReport]);

  const detectChanges = (oldData: any, newData: any) => {
    if (!oldData || !newData) return [];
    const changes: any[] = [];
    if (Array.isArray(oldData.data) && Array.isArray(newData.data)) {
      oldData.data.forEach((oldItem: any, index: number) => {
        const newItem = newData.data[index];
        if (newItem) {
          const oldValue = oldItem.borrowCount || oldItem.count || 0;
          const newValue = newItem.borrowCount || newItem.count || 0;
          if (oldValue !== newValue) {
            changes.push({
              name: oldItem.name || oldItem.category,
              oldValue,
              newValue,
              change: newValue - oldValue
            });
          }
        }
      });
    }
    return changes;
  };

  const generateReport = async (reportType: string, refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setSelectedReport(null);
    }
    setError(null);

    try {
      const functions = getFunctions();
      const generateGlobalReport = httpsCallable(functions, 'generateGlobalReport');
      
      const params: any = { reportType };
      if (dateRange.start && dateRange.end) {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
      }
      if (filters.campus) params.campus = filters.campus;
      if (filters.category) params.category = filters.category;
      if (filters.userGroup) params.userGroup = filters.userGroup;
      
      const result = await generateGlobalReport(params);
      const oldReport = selectedReport;
      setSelectedReport(result.data);
      setLastUpdate(new Date());
      
      if (refresh && oldReport) {
        const changes = detectChanges(oldReport, result.data);
        if (changes.length > 0) {
          setDataChanges(changes);
          setTimeout(() => setDataChanges([]), 5000);
        }
      }
      
      const data: any = result.data;
      if (data.campuses) setAvailableCampuses(data.campuses);
      if (data.categories) setAvailableCategories(data.categories);
      if (data.data && Array.isArray(data.data)) {
        const campusNames = data.data.map((item: any) => item.name).filter(Boolean);
        if (campusNames.length > 0 && !data.campuses) setAvailableCampuses(campusNames);
        
        const metrics = getPerformanceMetrics(data.data);
        const values = data.data.map((item: any) => item.borrowCount || item.count || 0);
        const trend = calculateTrend(values);
        const prediction = predictNextValue(values);
        
        setAnalytics({ metrics, trend, prediction });
      }
    } catch (err: any) {
      console.error("Rapor oluşturulurken hata:", err);
      setError(`Rapor oluşturulamadı: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportToPDF = () => {
    if (!selectedReport) return;
    
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      
      // Başlık
      pdf.setFontSize(20);
      pdf.text(selectedReport.title || 'Rapor', pageWidth / 2, 20, { align: 'center' });
      
      // Tarih
      pdf.setFontSize(12);
      pdf.text(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth / 2, 30, { align: 'center' });
      
      if (dateRange.start && dateRange.end) {
        pdf.text(`Tarih Aralığı: ${dateRange.start} - ${dateRange.end}`, pageWidth / 2, 40, { align: 'center' });
      }
      
      // Tablo verisi
      if (selectedReport.data && Array.isArray(selectedReport.data)) {
        const tableData = selectedReport.data.map((item: any, index: number) => {
          if (selectedReport.title.includes('Aktif Kullanıcı')) {
            return [index + 1, item.name || '', item.email || '', item.borrowCount || 0];
          } else if (selectedReport.title.includes('Kategori')) {
            return [index + 1, item.name || item.category || '', item.count || item.borrowCount || 0];
          } else {
            return [index + 1, item.name || '', item.borrowCount || item.count || 0];
          }
        });
        
        let headers = ['#', 'Ad', 'Değer'];
        if (selectedReport.title.includes('Aktif Kullanıcı')) {
          headers = ['#', 'Kullanıcı', 'Email', 'Kitap Sayısı'];
        } else if (selectedReport.title.includes('Kategori')) {
          headers = ['#', 'Kategori', 'Ödünç Sayısı'];
        }
        
        autoTable(pdf, {
          head: [headers],
          body: tableData,
          startY: dateRange.start ? 50 : 40,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [99, 102, 241] }
        });
      }
      
      pdf.save(`${selectedReport.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF oluşturulurken hata:', err);
      alert('PDF oluşturulurken bir hata oluştu.');
    }
  };

  const refreshReport = () => {
    if (selectedReport && selectedReport.reportType) {
      generateReport(selectedReport.reportType, true);
    }
  };

  const clearDateRange = () => {
    setDateRange({ start: '', end: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={() => navigate('/super-admin')}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline">Geri Dön</span>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Global Raporlama</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Sistem genelinde detaylı analiz ve raporlar</p>
            </div>
          </div>
          {selectedReport && (
            <button 
              onClick={refreshReport}
              disabled={refreshing}
              className="flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm w-full sm:w-auto justify-center min-h-[44px]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Yenileniyor...' : 'Veriyi Yenile'}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Filtreler</h3>
          
          {/* Date Range */}
          <div className="mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Tarih Aralığı:</span>
              </div>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm min-h-[44px]"
                max={new Date().toISOString().split('T')[0]}
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm min-h-[44px]"
                max={new Date().toISOString().split('T')[0]}
                min={dateRange.start}
              />
              {(dateRange.start || dateRange.end) && (
                <button 
                  onClick={clearDateRange}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm min-h-[44px]"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Campus Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Kampüs
              </label>
              <select
                value={filters.campus}
                onChange={(e) => setFilters(prev => ({ ...prev, campus: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm min-h-[44px]"
              >
                <option value="">Tüm Kampüsler</option>
                {availableCampuses.map(campus => (
                  <option key={campus} value={campus}>{campus}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 inline mr-1" />
                Kategori
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm min-h-[44px]"
              >
                <option value="">Tüm Kategoriler</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* User Group Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Kullanıcı Grubu
              </label>
              <select
                value={filters.userGroup}
                onChange={(e) => setFilters(prev => ({ ...prev, userGroup: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm min-h-[44px]"
              >
                <option value="">Tüm Kullanıcılar</option>
                <option value="student">Öğrenciler</option>
                <option value="teacher">Öğretmenler</option>
                <option value="staff">Personel</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(dateRange.start || dateRange.end || filters.campus || filters.category || filters.userGroup) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Aktif Filtreler:</span>
              {dateRange.start && dateRange.end && (
                <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs">
                  {new Date(dateRange.start).toLocaleDateString('tr-TR')} - {new Date(dateRange.end).toLocaleDateString('tr-TR')}
                </span>
              )}
              {filters.campus && (
                <span className="px-3 py-1 bg-purple-50 text-purple-800 rounded-full text-xs">
                  Kampüs: {filters.campus}
                </span>
              )}
              {filters.category && (
                <span className="px-3 py-1 bg-green-50 text-green-800 rounded-full text-xs">
                  Kategori: {filters.category}
                </span>
              )}
              {filters.userGroup && (
                <span className="px-3 py-1 bg-orange-50 text-orange-800 rounded-full text-xs">
                  Grup: {filters.userGroup === 'student' ? 'Öğrenciler' : filters.userGroup === 'teacher' ? 'Öğretmenler' : 'Personel'}
                </span>
              )}
              <button
                onClick={() => {
                  setDateRange({ start: '', end: '' });
                  setFilters({ campus: '', category: '', userGroup: '' });
                }}
                className="px-3 py-1 text-red-600 hover:text-red-800 text-xs font-medium"
              >
                Tümünü Temizle
              </button>
            </div>
          )}
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => report.available && generateReport(report.id)}
                disabled={!report.available}
                className={`bg-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl transition-all text-left ${
                  report.available ? 'hover:scale-105 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`w-12 h-12 bg-${report.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 text-${report.color}-600`} />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">{report.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{report.description}</p>
                {!report.available && (
                  <span className="inline-block mt-2 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">Yakında</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Report Display */}
        {loading ? (
          <div className="bg-white p-12 rounded-lg shadow-lg text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-700">Rapor oluşturuluyor...</p>
            <p className="text-sm text-gray-500 mt-2">Lütfen bekleyin</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-red-800">Hata Oluştu</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : selectedReport ? (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedReport.title}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-sm text-gray-500">Oluşturulma: {new Date().toLocaleDateString('tr-TR')}</p>
                    {dateRange.start && dateRange.end && (
                      <p className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Tarih: {new Date(dateRange.start).toLocaleDateString('tr-TR')} - {new Date(dateRange.end).toLocaleDateString('tr-TR')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={refreshReport}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 min-h-[44px]"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>{refreshing ? 'Yenileniyor...' : 'Yenile'}</span>
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors min-h-[44px]"
                  >
                    <Download className="w-5 h-5" />
                    <span>PDF İndir</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Change Notifications */}
            {dataChanges.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">Veri Değişiklikleri Tespit Edildi</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      {dataChanges.map((change, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1">
                          <span>{change.name}</span>
                          <span className={`font-semibold ${change.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change.oldValue} → {change.newValue} ({change.change > 0 ? '+' : ''}{change.change})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Dashboard */}
            {analytics && analytics.metrics && (
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-lg shadow-lg text-white">
                <h3 className="text-xl font-bold mb-4">Veri Analizi</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                    <p className="text-sm opacity-90">Performans Skoru</p>
                    <p className="text-2xl font-bold mt-1">{analytics.metrics.avg}</p>
                    <p className="text-xs opacity-75 mt-1">Ortalama Değer</p>
                  </div>
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                    <p className="text-sm opacity-90">Trend Yönü</p>
                    <div className="flex items-center mt-1">
                      {analytics.trend.direction === 'up' && <TrendingUp className="w-6 h-6 mr-2" />}
                      {analytics.trend.direction === 'down' && <TrendingUp className="w-6 h-6 mr-2 rotate-180" />}
                      {analytics.trend.direction === 'stable' && <span className="text-2xl mr-2">→</span>}
                      <span className="text-2xl font-bold">{analytics.trend.percentage}%</span>
                    </div>
                    <p className="text-xs opacity-75 mt-1">{analytics.trend.direction === 'up' ? 'Yükseliş' : analytics.trend.direction === 'down' ? 'Düşüş' : 'Sabit'}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                    <p className="text-sm opacity-90">Tahmin</p>
                    <p className="text-2xl font-bold mt-1">{analytics.prediction}</p>
                    <p className="text-xs opacity-75 mt-1">Sonraki Dönem</p>
                  </div>
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                    <p className="text-sm opacity-90">Büyüme Oranı</p>
                    <p className="text-2xl font-bold mt-1">{calculateGrowthRate(analytics.metrics.max, analytics.metrics.avg)}%</p>
                    <p className="text-xs opacity-75 mt-1">Max vs Ortalama</p>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Updates Controls */}
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm font-medium text-gray-700">Otomatik Yenileme</span>
                  </label>
                  {autoRefresh && (
                    <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="px-3 py-1 border border-gray-300 rounded text-sm min-h-[44px]">
                      <option value={10}>10 saniye</option>
                      <option value={30}>30 saniye</option>
                      <option value={60}>1 dakika</option>
                      <option value={300}>5 dakika</option>
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {lastUpdate && (
                    <span className="text-xs text-gray-500">Son Güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}</span>
                  )}
                  {autoRefresh && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                      Canlı
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Visualization Controls */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Grafik Türü:</span>
                  <div className="flex gap-2">
                    <button onClick={() => setChartType('bar')} className={`px-3 py-1 rounded text-sm min-h-[44px] ${chartType === 'bar' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Çubuk</button>
                    <button onClick={() => setChartType('line')} className={`px-3 py-1 rounded text-sm min-h-[44px] ${chartType === 'line' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Çizgi</button>
                    <button onClick={() => setChartType('pie')} className={`px-3 py-1 rounded text-sm min-h-[44px] ${chartType === 'pie' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Pasta</button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Renk Teması:</span>
                  <div className="flex gap-2">
                    <button onClick={() => setColorTheme('default')} className={`w-11 h-11 rounded border-2 ${colorTheme === 'default' ? 'border-indigo-600' : 'border-gray-300'}`} style={{background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'}} title="Varsayılan"></button>
                    <button onClick={() => setColorTheme('warm')} className={`w-11 h-11 rounded border-2 ${colorTheme === 'warm' ? 'border-indigo-600' : 'border-gray-300'}`} style={{background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)'}} title="Sıcak"></button>
                    <button onClick={() => setColorTheme('cool')} className={`w-11 h-11 rounded border-2 ${colorTheme === 'cool' ? 'border-indigo-600' : 'border-gray-300'}`} style={{background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)'}} title="Soğuk"></button>
                    <button onClick={() => setColorTheme('mono')} className={`w-11 h-11 rounded border-2 ${colorTheme === 'mono' ? 'border-indigo-600' : 'border-gray-300'}`} style={{background: 'linear-gradient(135deg, #1f2937 0%, #9ca3af 100%)'}} title="Mono"></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Cards - Dynamic based on report type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {selectedReport.title.includes('Kampüs Bazında') && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Kampüs</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{selectedReport.data?.length || 0}</p>
                      </div>
                      <Building2 className="w-12 h-12 text-blue-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Ödünç</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                          {selectedReport.data?.reduce((sum: number, item: any) => sum + item.borrowCount, 0) || 0}
                        </p>
                      </div>
                      <BookOpen className="w-12 h-12 text-green-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Ortalama</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                          {selectedReport.data?.length > 0
                            ? Math.round(selectedReport.data.reduce((sum: number, item: any) => sum + item.borrowCount, 0) / selectedReport.data.length)
                            : 0}
                        </p>
                      </div>
                      <BarChart3 className="w-12 h-12 text-purple-600 opacity-20" />
                    </div>
                  </div>
                </>
              )}
              {selectedReport.title.includes('Büyüme Trendi') && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Kullanıcı</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                          {selectedReport.data?.reduce((sum: number, item: any) => {
                            const monthTotal = Object.keys(item).filter(k => k !== 'month').reduce((s, k) => s + (item[k] || 0), 0);
                            return sum + monthTotal;
                          }, 0) || 0}
                        </p>
                      </div>
                      <Users className="w-12 h-12 text-blue-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Aylık Ortalama</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                          {selectedReport.data?.length > 0
                            ? Math.round(selectedReport.data.reduce((sum: number, item: any) => {
                                const monthTotal = Object.keys(item).filter(k => k !== 'month').reduce((s, k) => s + (item[k] || 0), 0);
                                return sum + monthTotal;
                              }, 0) / selectedReport.data.length)
                            : 0}
                        </p>
                      </div>
                      <TrendingUp className="w-12 h-12 text-green-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Kampüs</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                          {selectedReport.campuses?.length || 0}
                        </p>
                      </div>
                      <Building2 className="w-12 h-12 text-purple-600 opacity-20" />
                    </div>
                  </div>
                </>
              )}
              {selectedReport.title.includes('Kategori') && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Kategori</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{selectedReport.totalCategories || 0}</p>
                      </div>
                      <BookOpen className="w-12 h-12 text-blue-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Ödünç</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                          {selectedReport.totalBorrows || 0}
                        </p>
                      </div>
                      <TrendingUp className="w-12 h-12 text-green-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">En Popüler</p>
                        <p className="text-lg font-bold text-gray-800 mt-1">
                          {selectedReport.topCategory?.name || '-'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {selectedReport.topCategory?.count || 0} ödünç
                        </p>
                      </div>
                      <BarChart3 className="w-12 h-12 text-purple-600 opacity-20" />
                    </div>
                  </div>
                </>
              )}
              {selectedReport.title.includes('Aktif Kullanıcı') && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Aktif Kullanıcı</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{selectedReport.data?.length || 0}</p>
                      </div>
                      <Users className="w-12 h-12 text-blue-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Kitap</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                          {selectedReport.data?.reduce((sum: number, item: any) => sum + item.borrowCount, 0) || 0}
                        </p>
                      </div>
                      <BookOpen className="w-12 h-12 text-green-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">En Çok Okuyan</p>
                        <p className="text-xl font-bold text-gray-800 mt-2">
                          {selectedReport.data?.[0]?.name || '-'}
                        </p>
                      </div>
                      <BarChart3 className="w-12 h-12 text-purple-600 opacity-20" />
                    </div>
                  </div>
                </>
              )}
              {selectedReport.title.includes('Bütçe') && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Kampüs</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{selectedReport.campusCount || 0}</p>
                      </div>
                      <Building2 className="w-12 h-12 text-blue-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Bütçe</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                          {selectedReport.totalBudget?.toLocaleString('tr-TR')} TL
                        </p>
                      </div>
                      <Wallet className="w-12 h-12 text-green-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Ortalama Bütçe</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                          {parseFloat(selectedReport.avgBudget || 0).toLocaleString('tr-TR')} TL
                        </p>
                      </div>
                      <BarChart3 className="w-12 h-12 text-purple-600 opacity-20" />
                    </div>
                  </div>
                </>
              )}
              {selectedReport.title.includes('Kampüs-Kategori') && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Kategori</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{selectedReport.data?.length || 0}</p>
                      </div>
                      <BookOpen className="w-12 h-12 text-blue-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Kampüs</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{selectedReport.campuses?.length || 0}</p>
                      </div>
                      <Building2 className="w-12 h-12 text-green-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">En Popüler</p>
                        <p className="text-lg font-bold text-gray-800 mt-1">{selectedReport.data?.[0]?.category || '-'}</p>
                        <p className="text-sm text-gray-500 mt-1">{selectedReport.data?.[0]?.total || 0} ödünç</p>
                      </div>
                      <BarChart3 className="w-12 h-12 text-purple-600 opacity-20" />
                    </div>
                  </div>
                </>
              )}
              {selectedReport.title.includes('Kategori Trendi') && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Analiz Dönemi</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">6 Ay</p>
                      </div>
                      <Calendar className="w-12 h-12 text-blue-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Takip Edilen</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{selectedReport.categories?.length || 0} Kategori</p>
                      </div>
                      <BookOpen className="w-12 h-12 text-green-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Veri</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{selectedReport.data?.length || 0} Ay</p>
                      </div>
                      <TrendingUp className="w-12 h-12 text-purple-600 opacity-20" />
                    </div>
                  </div>
                </>
              )}
              {selectedReport.title.includes('Karşılaştırma') && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Toplam Kategori</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{selectedReport.categories?.length || 0}</p>
                      </div>
                      <BookOpen className="w-12 h-12 text-blue-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Seçili Kategori</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{selectedCategories.filter(c => c).length}</p>
                      </div>
                      <BarChart3 className="w-12 h-12 text-green-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Karşılaştırma</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{selectedCategories.filter(c => c).length === 2 ? 'Aktif' : 'Bekliyor'}</p>
                      </div>
                      <TrendingUp className="w-12 h-12 text-purple-600 opacity-20" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Charts */}
            {selectedReport.title.includes('Kampüs Bazında') && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white p-6 rounded-lg shadow-lg relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Kampüs Karşılaştırması</h3>
                    <button onClick={() => setFullscreenChart('campus1')} className="text-gray-500 hover:text-gray-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    {chartType === 'bar' && (
                      <BarChart data={selectedReport.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="borrowCount" fill={COLOR_THEMES[colorTheme][0]} name="Ödünç Sayısı" />
                      </BarChart>
                    )}
                    {chartType === 'line' && (
                      <LineChart data={selectedReport.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="borrowCount" stroke={COLOR_THEMES[colorTheme][0]} strokeWidth={2} name="Ödünç Sayısı" />
                      </LineChart>
                    )}
                    {chartType === 'pie' && (
                      <PieChart>
                        <Pie data={selectedReport.data} dataKey="borrowCount" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {selectedReport.data?.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLOR_THEMES[colorTheme][index % COLOR_THEMES[colorTheme].length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Dağılım Oranı</h3>
                    <button onClick={() => setFullscreenChart('campus2')} className="text-gray-500 hover:text-gray-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={selectedReport.data} dataKey="borrowCount" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {selectedReport.data?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLOR_THEMES[colorTheme][index % COLOR_THEMES[colorTheme].length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {selectedReport.title.includes('Büyüme Trendi') && (
              <div className="bg-white p-6 rounded-lg shadow-lg relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Kampüs Bazında Aylık Kullanıcı Artışı</h3>
                  <button onClick={() => setFullscreenChart('growth')} className="text-gray-500 hover:text-gray-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  {chartType === 'line' ? (
                    <LineChart data={selectedReport.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {selectedReport.campuses?.map((campus: string, index: number) => (
                        <Line key={campus} type="monotone" dataKey={campus} stroke={COLOR_THEMES[colorTheme][index % COLOR_THEMES[colorTheme].length]} strokeWidth={2} />
                      ))}
                    </LineChart>
                  ) : (
                    <BarChart data={selectedReport.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {selectedReport.campuses?.map((campus: string, index: number) => (
                        <Bar key={campus} dataKey={campus} fill={COLOR_THEMES[colorTheme][index % COLOR_THEMES[colorTheme].length]} stackId="a" />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            {selectedReport.title.includes('Kategori Popülerliği') && (
              <>
                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-lg mb-6">
                  <div className="border-b border-gray-200">
                    <nav className="flex -mb-px overflow-x-auto">
                      <button
                        onClick={() => setCategoryTab('overview')}
                        className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors min-h-[44px] whitespace-nowrap ${
                          categoryTab === 'overview'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Genel Bakış
                      </button>
                      <button
                        onClick={() => setCategoryTab('campus')}
                        className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors min-h-[44px] whitespace-nowrap ${
                          categoryTab === 'campus'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Kampüs Analizi
                      </button>
                      <button
                        onClick={() => setCategoryTab('trend')}
                        className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors min-h-[44px] whitespace-nowrap ${
                          categoryTab === 'trend'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Trend Analizi
                      </button>
                      <button
                        onClick={() => setCategoryTab('comparison')}
                        className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors min-h-[44px] whitespace-nowrap ${
                          categoryTab === 'comparison'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Karşılaştırma
                      </button>
                    </nav>
                  </div>
                </div>

                {/* Overview Tab */}
                {categoryTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Kategori Sıralaması</h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={selectedReport.data} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8b5cf6" name="Ödünç Sayısı" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Kategori Dağılımı</h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie data={selectedReport.data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                            {selectedReport.data?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Campus Tab */}
                {categoryTab === 'campus' && (
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Kampüslere Göre Kategori Dağılımı</h3>
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={selectedReport.campusAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {selectedReport.campuses?.map((campus: string, index: number) => (
                          <Bar key={campus} dataKey={campus} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Trend Tab */}
                {categoryTab === 'trend' && (
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Aylık Kategori Popülerlik Trendi (Top 5)</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={selectedReport.trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {selectedReport.trendCategories?.map((category: string, index: number) => (
                          <Line key={category} type="monotone" dataKey={category} stroke={COLORS[index % COLORS.length]} strokeWidth={2} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Comparison Tab */}
                {categoryTab === 'comparison' && (
                  <>
                    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Karşılaştırmak İçin 2 Kategori Seçin</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select
                          value={selectedCategories[0] || ''}
                          onChange={(e) => setSelectedCategories([e.target.value, selectedCategories[1] || ''])}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
                        >
                          <option value="">1. Kategori Seçin</option>
                          {selectedReport.comparisonCategories?.map((cat: any) => (
                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                        <select
                          value={selectedCategories[1] || ''}
                          onChange={(e) => setSelectedCategories([selectedCategories[0] || '', e.target.value])}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
                        >
                          <option value="">2. Kategori Seçin</option>
                          {selectedReport.comparisonCategories?.map((cat: any) => (
                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedCategories[0] && selectedCategories[1] && (
                      <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                          {selectedCategories.map((catName, idx) => {
                            const catData = selectedReport.comparisonCategories?.find((c: any) => c.name === catName);
                            return (
                              <div key={catName} className="bg-white p-6 rounded-lg shadow-lg">
                                <h3 className="text-xl font-bold mb-4" style={{ color: COLORS[idx] }}>{catName}</h3>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-sm text-gray-600">Toplam Ödünç</span>
                                    <span className="text-lg font-bold text-gray-800">{catData?.totalBorrows || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-sm text-gray-600">Benzersiz Kullanıcı</span>
                                    <span className="text-lg font-bold text-gray-800">{catData?.uniqueUsers || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-sm text-gray-600">Kişi Başı Ort.</span>
                                    <span className="text-lg font-bold text-gray-800">{catData?.avgBorrowsPerUser || 0}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">Karşılaştırma Grafiği</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={[
                              {
                                metric: 'Toplam Ödünç',
                                [selectedCategories[0]]: selectedReport.comparisonCategories?.find((c: any) => c.name === selectedCategories[0])?.totalBorrows || 0,
                                [selectedCategories[1]]: selectedReport.comparisonCategories?.find((c: any) => c.name === selectedCategories[1])?.totalBorrows || 0,
                              },
                              {
                                metric: 'Benzersiz Kullanıcı',
                                [selectedCategories[0]]: selectedReport.comparisonCategories?.find((c: any) => c.name === selectedCategories[0])?.uniqueUsers || 0,
                                [selectedCategories[1]]: selectedReport.comparisonCategories?.find((c: any) => c.name === selectedCategories[1])?.uniqueUsers || 0,
                              },
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="metric" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey={selectedCategories[0]} fill={COLORS[0]} />
                              <Bar dataKey={selectedCategories[1]} fill={COLORS[1]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {selectedCategories.map((catName, idx) => {
                            const catData = selectedReport.comparisonCategories?.find((c: any) => c.name === catName);
                            return (
                              <div key={catName} className="bg-white p-6 rounded-lg shadow-lg">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">{catName} - Kampüs Dağılımı</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                  <PieChart>
                                    <Pie data={catData?.campusDistribution || []} dataKey="count" nameKey="campus" cx="50%" cy="50%" outerRadius={80} label>
                                      {catData?.campusDistribution?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(idx * 3 + index) % COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {selectedReport.title.includes('Aktif Kullanıcı') && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 20 Okuyucu</h3>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={selectedReport.data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="borrowCount" fill="#f59e0b" name="Okunan Kitap" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {selectedReport.title.includes('Kampüs-Kategori') && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Kampüslere Göre Kategori Dağılımı</h3>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={selectedReport.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selectedReport.campuses?.map((campus: string, index: number) => (
                      <Bar key={campus} dataKey={campus} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {selectedReport.title.includes('Kategori Trendi') && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Aylık Kategori Popülerlik Trendi (Top 5)</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={selectedReport.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selectedReport.categories?.map((category: string, index: number) => (
                      <Line key={category} type="monotone" dataKey={category} stroke={COLORS[index % COLORS.length]} strokeWidth={2} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {selectedReport.title.includes('Bütçe') && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Kampüs Bütçeleri</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={selectedReport.data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip />
                        <Bar dataKey="budget" fill="#6366f1" name="Bütçe (TL)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Bütçe Dağılımı</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie data={selectedReport.data} dataKey="budget" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                          {selectedReport.data?.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {selectedReport.title.includes('Karşılaştırma') && (
              <>
                {/* Category Selection */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Karşılaştırmak İçin 2 Kategori Seçin</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select
                      value={selectedCategories[0] || ''}
                      onChange={(e) => setSelectedCategories([e.target.value, selectedCategories[1] || ''])}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
                    >
                      <option value="">1. Kategori Seçin</option>
                      {selectedReport.categories?.map((cat: any) => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <select
                      value={selectedCategories[1] || ''}
                      onChange={(e) => setSelectedCategories([selectedCategories[0] || '', e.target.value])}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
                    >
                      <option value="">2. Kategori Seçin</option>
                      {selectedReport.categories?.map((cat: any) => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedCategories[0] && selectedCategories[1] && (
                  <>
                    {/* Comparison Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {selectedCategories.map((catName, idx) => {
                        const catData = selectedReport.categories?.find((c: any) => c.name === catName);
                        return (
                          <div key={catName} className="bg-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-xl font-bold mb-4" style={{ color: COLORS[idx] }}>{catName}</h3>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-sm text-gray-600">Toplam Ödünç</span>
                                <span className="text-lg font-bold text-gray-800">{catData?.totalBorrows || 0}</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-sm text-gray-600">Benzersiz Kullanıcı</span>
                                <span className="text-lg font-bold text-gray-800">{catData?.uniqueUsers || 0}</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="text-sm text-gray-600">Kişi Başı Ort.</span>
                                <span className="text-lg font-bold text-gray-800">{catData?.avgBorrowsPerUser || 0}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Comparison Chart */}
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Karşılaştırma Grafiği</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={[
                          {
                            metric: 'Toplam Ödünç',
                            [selectedCategories[0]]: selectedReport.categories?.find((c: any) => c.name === selectedCategories[0])?.totalBorrows || 0,
                            [selectedCategories[1]]: selectedReport.categories?.find((c: any) => c.name === selectedCategories[1])?.totalBorrows || 0,
                          },
                          {
                            metric: 'Benzersiz Kullanıcı',
                            [selectedCategories[0]]: selectedReport.categories?.find((c: any) => c.name === selectedCategories[0])?.uniqueUsers || 0,
                            [selectedCategories[1]]: selectedReport.categories?.find((c: any) => c.name === selectedCategories[1])?.uniqueUsers || 0,
                          },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="metric" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey={selectedCategories[0]} fill={COLORS[0]} />
                          <Bar dataKey={selectedCategories[1]} fill={COLORS[1]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Campus Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      {selectedCategories.map((catName, idx) => {
                        const catData = selectedReport.categories?.find((c: any) => c.name === catName);
                        return (
                          <div key={catName} className="bg-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">{catName} - Kampüs Dağılımı</h3>
                            <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                <Pie data={catData?.campusDistribution || []} dataKey="count" nameKey="campus" cx="50%" cy="50%" outerRadius={80} label>
                                  {catData?.campusDistribution?.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[(idx * 3 + index) % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Data Table */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Detaylı Veriler</h3>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                {selectedReport.title.includes('Bütçe') ? (
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kampüs Adı</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bütçe (TL)</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Oran</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReport.data?.map((row: any, index: number) => {
                        const percentage = ((row.budget / selectedReport.totalBudget) * 100).toFixed(1);
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{row.budget.toLocaleString('tr-TR')} TL</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                                </div>
                                <span>{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : selectedReport.title.includes('Aktif Kullanıcı') ? (
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sıra</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kullanıcı</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">E-posta</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kitap Sayısı</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Seviye</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReport.data?.map((row: any) => (
                        <tr key={row.rank} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.rank}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{row.borrowCount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Lvl {row.level}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : selectedReport.title.includes('Büyüme') ? (
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ay</th>
                        {selectedReport.campuses?.map((campus: string) => (
                          <th key={campus} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{campus}</th>
                        ))}
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReport.data?.map((row: any, index: number) => {
                        const total = Object.keys(row).filter(k => k !== 'month').reduce((sum, k) => sum + (row[k] || 0), 0);
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.month}</td>
                            {selectedReport.campuses?.map((campus: string) => (
                              <td key={campus} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row[campus] || 0}</td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : selectedReport.title.includes('Kategori Trendi') ? (
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ay</th>
                        {selectedReport.categories?.map((category: string) => (
                          <th key={category} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{category}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReport.data?.map((row: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.month}</td>
                          {selectedReport.categories?.map((category: string) => (
                            <td key={category} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row[category] || 0}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : selectedReport.title.includes('Kampüs-Kategori') ? (
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kategori</th>
                        {selectedReport.campuses?.map((campus: string) => (
                          <th key={campus} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{campus}</th>
                        ))}
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReport.data?.map((row: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.category}</td>
                          {selectedReport.campuses?.map((campus: string) => (
                            <td key={campus} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row[campus] || 0}</td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : selectedReport.title.includes('Kategori') ? (
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kategori</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ödünç Sayısı</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReport.data?.map((row: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kampüs Adı</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ödünç Sayısı</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Oran</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReport.data?.map((row: any, index: number) => {
                        const total = selectedReport.data.reduce((sum: number, item: any) => sum + (item.borrowCount || item.count), 0);
                        const value = row.borrowCount || row.count;
                        const percentage = ((value / total) * 100).toFixed(1);
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{value}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                                </div>
                                <span>{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-lg shadow-lg text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Rapor Seçin</h3>
            <p className="text-sm text-gray-500">Yukarıdaki kartlardan bir rapor türü seçerek başlayın</p>
          </div>
        )}

        {/* Fullscreen Chart Modal */}
        {fullscreenChart && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-8" onClick={() => setFullscreenChart(null)}>
            <div className="bg-white rounded-lg w-full h-full max-w-7xl max-h-[90vh] p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Tam Ekran Görünüm</h3>
                <button onClick={() => setFullscreenChart(null)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <ResponsiveContainer width="100%" height="90%">
                {fullscreenChart === 'campus1' && chartType === 'bar' && (
                  <BarChart data={selectedReport.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="borrowCount" fill={COLOR_THEMES[colorTheme][0]} name="Ödünç Sayısı" />
                  </BarChart>
                )}
                {fullscreenChart === 'campus1' && chartType === 'line' && (
                  <LineChart data={selectedReport.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="borrowCount" stroke={COLOR_THEMES[colorTheme][0]} strokeWidth={3} name="Ödünç Sayısı" />
                  </LineChart>
                )}
                {fullscreenChart === 'campus1' && chartType === 'pie' && (
                  <PieChart>
                    <Pie data={selectedReport.data} dataKey="borrowCount" nameKey="name" cx="50%" cy="50%" outerRadius={200} label>
                      {selectedReport.data?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLOR_THEMES[colorTheme][index % COLOR_THEMES[colorTheme].length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                )}
                {fullscreenChart === 'campus2' && (
                  <PieChart>
                    <Pie data={selectedReport.data} dataKey="borrowCount" nameKey="name" cx="50%" cy="50%" outerRadius={200} label>
                      {selectedReport.data?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLOR_THEMES[colorTheme][index % COLOR_THEMES[colorTheme].length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                )}
                {fullscreenChart === 'growth' && chartType === 'line' && (
                  <LineChart data={selectedReport.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selectedReport.campuses?.map((campus: string, index: number) => (
                      <Line key={campus} type="monotone" dataKey={campus} stroke={COLOR_THEMES[colorTheme][index % COLOR_THEMES[colorTheme].length]} strokeWidth={3} />
                    ))}
                  </LineChart>
                )}
                {fullscreenChart === 'growth' && chartType !== 'line' && (
                  <BarChart data={selectedReport.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selectedReport.campuses?.map((campus: string, index: number) => (
                      <Bar key={campus} dataKey={campus} fill={COLOR_THEMES[colorTheme][index % COLOR_THEMES[colorTheme].length]} stackId="a" />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalReportsPage;
