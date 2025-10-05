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
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-6 lg:p-8">
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

        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Eser Dağılım Analizi</h1>
          <p className="mt-2 text-lg text-gray-600">
            Kütüphane koleksiyonunun kategorilere göre detaylı dökümünü inceleyin.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader className="w-16 h-16 text-indigo-600 animate-spin" />
            <p className="ml-4 text-lg font-medium">Veriler yükleniyor...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-500">Görüntülenecek eser bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Kategori Görselleştirmesi</h2>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setActiveChart('pie')}
                    className={`px-3 py-1 text-sm font-semibold rounded-md ${activeChart === 'pie' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    <PieChart className="w-5 h-5 inline-block mr-1" />
                    Pasta
                  </button>
                  <button
                    onClick={() => setActiveChart('bar')}
                    className={`px-3 py-1 text-sm font-semibold rounded-md ${activeChart === 'bar' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    <BarChartIcon className="w-5 h-5 inline-block mr-1" />
                    Çubuk
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
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Kategori Detayları</h2>
                <span className="text-sm font-bold text-gray-500">{totalBooks} Toplam Eser</span>
              </div>
              <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-2">
                {collections.map((collection, index) => {
                  const percentage = totalBooks > 0 ? (collection.data.length / totalBooks) * 100 : 0;
                  const color = chartColors[index % chartColors.length];
                  return (
                    <div key={`${collection.name}-${index}`} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-base truncate" title={collection.name}>{collection.name}</span>
                        <span className="font-bold text-base">{collection.data.length}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full"
                          style={{ width: `${percentage}%`, backgroundColor: color }}
                        ></div>
                      </div>
                      <div className="text-right text-xs font-medium text-gray-500 mt-1">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
               <button
                onClick={() => setShowInfoModal(true)}
                className="w-full mt-4 flex items-center justify-center px-4 py-2 rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <HelpCircle className="w-5 h-5 mr-2" />
                Kategori Kodlarını Öğren
              </button>
            </div>
          </div>
        )}
      </div>

      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full transform transition-all">
             <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-2xl font-semibold text-gray-900">Kategori Açıklamaları</h3>
              <button onClick={() => setShowInfoModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-7 h-7" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-h-[70vh] overflow-y-auto">
              {Object.entries(categoryInfo).map(([code, description]) => (
                <div key={code} className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-bold text-lg text-indigo-700">{code}</p>
                  <p className="text-gray-700 mt-1">{description}</p>
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
