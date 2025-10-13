import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, PieChart, BarChart as BarChartIcon, Loader, HelpCircle, X } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { useBooks } from '../contexts/BookContext';
import { Book } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const chartColors = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
  '#FF63C4', '#36A28B', '#FFCE96', '#4BC080', '#9966BF', '#FF9F80'
];

const CollectionDistributionPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeChart, setActiveChart] = useState<'pie' | 'bar'>('pie');
  const { allBooks: books } = useBooks();
  const [showInfoModal, setShowInfoModal] = useState(false);

  const loading = useMemo(() => books.length === 0, [books]);
  const totalBooks = books.length;

  const collections = useMemo(() => {
    if (loading) return [];
    const categoryMap = new Map<string, Book[]>();
    books.forEach(book => {
      if (!categoryMap.has(book.category)) {
        categoryMap.set(book.category, []);
      }
      categoryMap.get(book.category)!.push(book);
    });
    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, data }))
      .sort((a, b) => b.data.length - a.data.length);
  }, [books, loading]);

  const chartData = useMemo(() => ({
    labels: collections.map(c => c.name),
    datasets: [
      {
        label: 'Kitap Sayısı',
        data: collections.map(c => c.data.length),
        backgroundColor: collections.map((_, index) => chartColors[index % chartColors.length]),
        borderColor: collections.map((_, index) => chartColors[index % chartColors.length]),
        borderWidth: 1,
        hoverOffset: 4
      }
    ]
  }), [collections]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We have a custom legend on the right
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.raw as number;
            const percentage = totalBooks > 0 ? ((value / totalBooks) * 100).toFixed(1) : 0;
            return `${label}: ${value} eser (${percentage}%)`;
          },
        },
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      },
    },
  };
  
  const pieChartOptions = {
    ...chartOptions,
    plugins: {
        ...chartOptions.plugins,
        legend: {
            display: true,
            position: 'bottom' as const,
        },
    }
  };

  const categoryInfo = {
    'D-HK': 'Dünya Hikaye: Farklı kültürlerden ve coğrafyalardan sürükleyici hikayeler.',
    'D-RMN': 'Dünya Roman: Dünya edebiyatının klasik ve modern romanları.',
    'D-TY': 'Dünya Tiyatro: Dünya sahnelerinden unutulmaz tiyatro eserleri.',
    'D-DĞ': 'Dünya Diğer: Dünya edebiyatından diğer türlerdeki eserler.',
    'DRG': 'Dergi: Çeşitli konularda güncel ve bilgilendirici dergiler.',
    'MNG': 'Manga: Japon çizgi roman sanatının en güzel örnekleri.',
    'TR-DĞ': 'Türk Diğer: Türk edebiyatından diğer türlerdeki eserler.',
    'TR-HK': 'Türk Hikaye: Türk edebiyatının zengin hikaye geleneğinden seçmeler.',
    'TR-RMN': 'Türk Roman: Türk edebiyatının köklü roman geleneğinden eserler.',
    'TR-TY': 'Türk Tiyatro: Türk tiyatrosunun klasik ve modern oyunları.',
    'TR-ŞR': 'Türk Şiir: Türk şiirinin duygu yüklü ve anlamlı dizeleri.',
    'Ç-RMN': 'Çizgi Roman: Görsel ve metinsel anlatımın birleştiği macera dolu dünyalar.',
    'İNG': 'İngilizce: İngilizce dilindeki edebi eserler ve okuma parçaları.'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-gray-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-8xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-indigo-600"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Geri Dön
          </button>
        </div>

        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Eser Dağılım Analizi</h1>
          <p className="mt-2 text-lg text-gray-600">
            Kütüphane koleksiyonunun kategorilere göre detaylı dökümünü inceleyin.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-96 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
            <Loader className="w-16 h-16 text-indigo-600 animate-spin" />
            <p className="ml-4 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Veriler yükleniyor...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
            <p className="text-xl font-bold text-gray-500">Görüntülenecek eser bulunamadı.</p>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Total Books */}
              <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-4 sm:p-6 overflow-hidden group hover:shadow-2xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative">
                  <p className="text-white/80 text-xs sm:text-sm font-medium mb-1">Toplam Eser</p>
                  <p className="text-2xl sm:text-4xl font-bold text-white mb-2">{totalBooks}</p>
                  <p className="text-white/70 text-xs">Kütüphane koleksiyonu</p>
                </div>
              </div>

              {/* Most Popular Category */}
              <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-4 sm:p-6 overflow-hidden group hover:shadow-2xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative">
                  <p className="text-white/80 text-xs sm:text-sm font-medium mb-1">En Popüler</p>
                  <p className="text-xl sm:text-2xl font-bold text-white mb-1 truncate" title={collections[0]?.name}>{collections[0]?.name || '-'}</p>
                  <p className="text-white/70 text-xs">{collections[0]?.data.length || 0} eser</p>
                </div>
              </div>

              {/* Least Popular Category */}
              <div className="relative bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg p-4 sm:p-6 overflow-hidden group hover:shadow-2xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative">
                  <p className="text-white/80 text-xs sm:text-sm font-medium mb-1">En Az Eser</p>
                  <p className="text-xl sm:text-2xl font-bold text-white mb-1 truncate" title={collections[collections.length - 1]?.name}>{collections[collections.length - 1]?.name || '-'}</p>
                  <p className="text-white/70 text-xs">{collections[collections.length - 1]?.data.length || 0} eser</p>
                </div>
              </div>

              {/* Category Diversity */}
              <div className="relative bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl shadow-lg p-4 sm:p-6 overflow-hidden group hover:shadow-2xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative">
                  <p className="text-white/80 text-xs sm:text-sm font-medium mb-1">Kategori Çeşitliliği</p>
                  <p className="text-2xl sm:text-4xl font-bold text-white mb-2">{collections.length}</p>
                  <p className="text-white/70 text-xs">Farklı kategori</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left Column: Chart */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-white/20">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Kategori Görselleştirmesi</h2>
                <div className="flex items-center gap-2 p-1.5 bg-white/60 backdrop-blur-xl rounded-xl border border-white/20 shadow-md w-full sm:w-auto">
                  <button
                    onClick={() => setActiveChart('pie')}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${activeChart === 'pie' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105' : 'text-gray-600 hover:bg-white/50'}`}
                  >
                    <PieChart className="w-4 h-4 sm:w-5 sm:h-5 inline-block mr-1" />
                    <span className="hidden sm:inline">Pasta</span>
                  </button>
                  <button
                    onClick={() => setActiveChart('bar')}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${activeChart === 'bar' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105' : 'text-gray-600 hover:bg-white/50'}`}
                  >
                    <BarChartIcon className="w-4 h-4 sm:w-5 sm:h-5 inline-block mr-1" />
                    <span className="hidden sm:inline">Çubuk Grafik</span>
                  </button>
                </div>
              </div>
              <div className="relative h-[32rem]">
                {activeChart === 'pie' ? (
                  <Pie data={chartData} options={pieChartOptions} />
                ) : (
                  <Bar data={chartData} options={barChartOptions} />
                )}
              </div>
            </div>

            {/* Right Column: Category Details */}
            <div className="lg:col-span-1 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Kategori Detayları</h2>
                <span className="px-3 py-1.5 text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-md">{totalBooks} Toplam</span>
              </div>
              <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-2">
                {collections.map((collection, index) => {
                  const percentage = totalBooks > 0 ? (collection.data.length / totalBooks) * 100 : 0;
                  const color = chartColors[index % chartColors.length];
                  return (
                    <div key={`${collection.name}-${index}`} className="group p-4 rounded-xl bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl border border-white/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-base truncate" title={collection.name}>{collection.name}</span>
                        <span className="px-2.5 py-1 font-bold text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md">{collection.data.length}</span>
                      </div>
                      <div className="w-full bg-gray-200/50 rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                          className="h-3 rounded-full transition-all duration-500 group-hover:scale-105"
                          style={{ 
                            width: `${percentage}%`, 
                            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                            boxShadow: `0 0 10px ${color}66`
                          }}
                        ></div>
                      </div>
                      <div className="text-right text-xs font-bold text-gray-600 mt-1.5">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
               <button
                onClick={() => setShowInfoModal(true)}
                className="w-full mt-4 flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:scale-105 transition-all font-semibold"
              >
                <HelpCircle className="w-5 h-5 mr-2" />
                Kategori Kodlarını Öğren
              </button>
            </div>
          </div>
          </>
        )}
      </div>

      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full transform transition-all border border-white/20">
             <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Kategori Açıklamaları</h3>
              <button onClick={() => setShowInfoModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-7 h-7" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-h-[70vh] overflow-y-auto">
              {Object.entries(categoryInfo).map(([code, description]) => (
                <div key={code} className="p-4 bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl rounded-xl border border-white/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
                  <p className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{code}</p>
                  <p className="text-gray-700 mt-1 font-medium">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionDistributionPage;
