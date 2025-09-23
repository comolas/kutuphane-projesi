import React, { useState, useMemo } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Book } from '../../../types';
import { PieChart, BarChart, HelpCircle, X } from 'lucide-react';

interface AdminCollectionDistributionProps {
  catalogBooks: Book[];
  getBookStatus: (bookId: string) => 'available' | 'borrowed' | 'lost';
}

const colors = [
  'rgba(255, 99, 132, 0.8)',
  'rgba(54, 162, 235, 0.8)',
  'rgba(255, 206, 86, 0.8)',
  'rgba(75, 192, 192, 0.8)',
  'rgba(153, 102, 255, 0.8)',
  'rgba(255, 159, 64, 0.8)',
  'rgba(255, 99, 255, 0.8)',
  'rgba(54, 162, 64, 0.8)',
  'rgba(255, 206, 192, 0.8)'
];

const AdminCollectionDistribution: React.FC<AdminCollectionDistributionProps> = ({ catalogBooks, getBookStatus }) => {
  const [distributionCriterion, setDistributionCriterion] = useState<'category' | 'publisher' | 'status' | 'tags'>('category');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [showInfoModal, setShowInfoModal] = useState(false);

  const distributionData = useMemo(() => {
    const counts = new Map<string, number>();
    if (distributionCriterion === 'tags') {
      catalogBooks.forEach(book => {
        if (book.tags) {
          const tags = Array.isArray(book.tags) 
            ? book.tags 
            : String(book.tags).split(',').map(tag => tag.trim()).filter(tag => tag);
          
          tags.forEach(tag => {
            if(tag) counts.set(tag, (counts.get(tag) || 0) + 1);
          });
        }
      });
    } else {
      catalogBooks.forEach(book => {
        let key;
        if (distributionCriterion === 'publisher') {
          key = book.publisher || 'Bilinmeyen';
        } else if (distributionCriterion === 'status') {
          key = getBookStatus(book.id) || 'Bilinmeyen';
        } else { // 'category'
          key = book.category || 'Bilinmeyen';
        }
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [catalogBooks, distributionCriterion, getBookStatus]);

  const distributionChartData = {
    labels: distributionData.map(d => d.name),
    datasets: [
      {
        label: 'Kitap Sayısı',
        data: distributionData.map(d => d.count),
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.8', '1')),
        borderWidth: 1
      }
    ]
  };

  const distributionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        display: chartType === 'pie',
      },
      title: {
        display: true,
        text: `Eser Dağılımı - ${distributionCriterion.charAt(0).toUpperCase() + distributionCriterion.slice(1)}`
      }
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

  const totalBooks = catalogBooks.length;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <PieChart className="w-6 h-6 mr-2 text-indigo-600"
  )
} />
          Eser Dağılım Analizi
        </h2>
        <p className="text-gray-600">
          Kütüphane koleksiyonunun kategorilere göre detaylı dökümünü inceleyin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Kategori Görselleştirmesi</h2>
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setChartType('pie')}
                className={`px-3 py-1 text-sm font-semibold rounded-md ${chartType === 'pie' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <PieChart className="w-5 h-5 inline-block mr-1" />
                Pasta
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-sm font-semibold rounded-md ${chartType === 'bar' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <BarChart className="w-5 h-5 inline-block mr-1" />
                Çubuk
              </button>
            </div>
          </div>
          <div className="mb-4">
            <select
              value={distributionCriterion}
              onChange={(e) => setDistributionCriterion(e.target.value as 'category' | 'publisher' | 'status' | 'tags')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="category">Kategoriye Göre</option>
              <option value="publisher">Yayınevine Göre</option>
              <option value="status">Duruma Göre</option>
              <option value="tags">Etiketlere Göre</option>
            </select>
          </div>
          <div className="relative h-[32rem]">
            {chartType === 'pie' ? (
              <Pie data={distributionChartData} options={distributionChartOptions} />
            ) : (
              <Bar data={distributionChartData} options={distributionChartOptions} />
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
            {distributionData.map((item, index) => {
              const percentage = totalBooks > 0 ? (item.count / totalBooks) * 100 : 0;
              const color = colors[index % colors.length];
              return (
                <div key={`${item.name}-${index}`} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-base truncate" title={item.name}>{item.name}</span>
                    <span className="font-bold text-base">{item.count}</span>
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
          {distributionCriterion === 'category' && (
            <button
              onClick={() => setShowInfoModal(true)}
              className="w-full mt-4 flex items-center justify-center px-4 py-2 rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              Kategori Kodlarını Öğren
            </button>
          )}
        </div>
      </div>

      {/* Category Info Modal */}
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
    </>
  );
};

export default AdminCollectionDistribution;
      </div>
    </div>
  );
};

export default AdminCollectionDistribution;
