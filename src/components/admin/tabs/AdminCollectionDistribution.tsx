import React, { useState, useMemo, useRef } from 'react';
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2';
import { Book } from '../../../types';
import { PieChart, BarChart, HelpCircle, X, BookOpen, TrendingUp, Package, Tag, TrendingDown, Minus, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [comparisonMode, setComparisonMode] = useState(false);
  const [firstCategory, setFirstCategory] = useState<string>('');
  const [secondCategory, setSecondCategory] = useState<string>('');
  const [showTrendAnalysis, setShowTrendAnalysis] = useState(false);
  const [visualizationType, setVisualizationType] = useState<'standard' | 'stacked' | 'heatmap'>('standard');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const getDistributionData = (criterion: 'category' | 'publisher' | 'status' | 'tags') => {
    const counts = new Map<string, number>();
    if (criterion === 'tags') {
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
        if (criterion === 'publisher') {
          key = book.publisher || 'Bilinmeyen';
        } else if (criterion === 'status') {
          key = getBookStatus(book.id) || 'Bilinmeyen';
        } else { // 'category'
          key = book.category || 'Bilinmeyen';
        }
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  };

  const distributionData = useMemo(() => getDistributionData(distributionCriterion), [catalogBooks, distributionCriterion, getBookStatus]);
  
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    catalogBooks.forEach(book => {
      if (book.category) cats.add(book.category);
    });
    return Array.from(cats).sort();
  }, [catalogBooks]);

  const getCategoryCount = (category: string) => {
    return catalogBooks.filter(book => book.category === category).length;
  };

  const getTrendData = useMemo(() => {
    const last6Months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last6Months.push({
        month: date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        date: date
      });
    }

    const categoryTrends = new Map<string, number[]>();
    
    allCategories.forEach(category => {
      const monthlyCounts = last6Months.map(({ date }) => {
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        return catalogBooks.filter(book => {
          if (book.category !== category || !book.addedDate) return false;
          const addedDate = typeof book.addedDate.toDate === 'function' 
            ? book.addedDate.toDate() 
            : new Date(book.addedDate);
          return addedDate <= nextMonth;
        }).length;
      });
      categoryTrends.set(category, monthlyCounts);
    });

    const trends = allCategories.map(category => {
      const counts = categoryTrends.get(category) || [];
      const firstCount = counts[0] || 0;
      const lastCount = counts[counts.length - 1] || 0;
      const change = lastCount - firstCount;
      const percentChange = firstCount > 0 ? ((change / firstCount) * 100) : 0;
      
      return {
        category,
        change,
        percentChange,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        counts
      };
    }).sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));

    return { labels: last6Months.map(m => m.month), trends };
  }, [catalogBooks, allCategories]);

  const distributionChartData = comparisonMode && firstCategory && secondCategory ? {
    labels: ['Kitap Sayısı'],
    datasets: [
      {
        label: firstCategory,
        data: [getCategoryCount(firstCategory)],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2,
        borderRadius: 8
      },
      {
        label: secondCategory,
        data: [getCategoryCount(secondCategory)],
        backgroundColor: 'rgba(236, 72, 153, 0.8)',
        borderColor: 'rgba(236, 72, 153, 1)',
        borderWidth: 2,
        borderRadius: 8
      }
    ]
  } : {
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
  const largestCategory = distributionData.length > 0 ? distributionData.reduce((max, item) => item.count > max.count ? item : max) : null;
  const smallestCategory = distributionData.length > 0 ? distributionData.reduce((min, item) => item.count < min.count ? item : min) : null;
  const avgBooksPerCategory = distributionData.length > 0 ? totalBooks / distributionData.length : 0;

  const smartRecommendations = useMemo(() => {
    const recommendations = [];

    if (distributionCriterion !== 'category') return recommendations;

    // Dengesizlik kontrolü
    if (largestCategory && smallestCategory && distributionData.length > 3) {
      const ratio = largestCategory.count / (smallestCategory.count || 1);
      if (ratio > 5) {
        recommendations.push({
          type: 'warning',
          title: 'Kategori Dengesizliği',
          message: `${largestCategory.name} kategorisi (${largestCategory.count} kitap), ${smallestCategory.name} kategorisinden ${ratio.toFixed(1)}x daha büyük. Küçük kategorileri güçlendirmeyi düşünün.`,
          icon: '⚠️'
        });
      }
    }

    // Düşük stok uyarısı
    const lowStockCategories = distributionData.filter(d => d.count < avgBooksPerCategory * 0.5 && d.count > 0);
    if (lowStockCategories.length > 0) {
      recommendations.push({
        type: 'info',
        title: 'Düşük Stok Kategorileri',
        message: `${lowStockCategories.map(c => c.name).join(', ')} kategorilerinde kitap sayısı ortalamanın altında. Bu kategorilerden kitap eklemeyi düşünün.`,
        icon: '📦'
      });
    }

    // Boş kategori uyarısı
    const emptyCategories = Object.keys(categoryInfo).filter(cat => 
      !distributionData.some(d => d.name === cat)
    );
    if (emptyCategories.length > 0 && emptyCategories.length <= 3) {
      recommendations.push({
        type: 'suggestion',
        title: 'Boş Kategoriler',
        message: `${emptyCategories.join(', ')} kategorilerinde hiç kitap yok. Bu kategorilerden eser eklemeyi düşünün.`,
        icon: '💡'
      });
    }

    // Büyüme trendi önerisi
    if (getTrendData.trends.length > 0) {
      const growingCategories = getTrendData.trends.filter(t => t.trend === 'up').slice(0, 3);
      if (growingCategories.length > 0) {
        recommendations.push({
          type: 'success',
          title: 'Büyüyen Kategoriler',
          message: `${growingCategories.map(c => c.category).join(', ')} kategorileri büyüme trendinde. Bu kategorilere yatırım yapmaya devam edin.`,
          icon: '📈'
        });
      }
    }

    return recommendations;
  }, [distributionData, largestCategory, smallestCategory, avgBooksPerCategory, getTrendData, categoryInfo, distributionCriterion]);

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const isMobile = window.innerWidth < 768;
      const canvasElements = reportRef.current.querySelectorAll('canvas');
      let retries = 0;
      const maxRetries = 10;
      
      while (retries < maxRetries) {
        const allReady = Array.from(canvasElements).every(
          (canvas: any) => canvas.width > 0 && canvas.height > 0
        );
        
        if (allReady || canvasElements.length === 0) break;
        
        await new Promise(resolve => setTimeout(resolve, isMobile ? 500 : 300));
        retries++;
      }
      
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: isMobile ? 1.5 : 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8f9fa',
        windowWidth: isMobile ? 1200 : element.scrollWidth,
        windowHeight: element.scrollHeight,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const clonedCanvases = clonedDoc.querySelectorAll('canvas');
          clonedCanvases.forEach((canvas: any) => {
            if (canvas.width === 0 || canvas.height === 0) {
              canvas.style.display = 'none';
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
        heightLeft -= pdfHeight;
      }

      const criterionName = distributionCriterion === 'category' ? 'kategori' :
                           distributionCriterion === 'publisher' ? 'yayinevi' :
                           distributionCriterion === 'status' ? 'durum' : 'etiket';
      pdf.save(`eser-dagilimi-${criterionName}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error: any) {
      console.error('PDF oluşturma hatası:', error);
      console.error('Hata detayı:', error.message, error.stack);
      alert(`PDF oluşturulurken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="mb-4 md:mb-8 animate-fadeIn">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 md:mb-3 flex items-center">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 md:p-3 rounded-xl mr-2 md:mr-3">
                  <PieChart className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>
                Eser Dağılım Analizi
              </h2>
              <p className="text-gray-600 text-sm md:text-lg">
                Kütüphane koleksiyonunun kategorilere göre detaylı dökümünü inceleyin.
              </p>
            </div>
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="w-full lg:w-auto lg:ml-4 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold text-sm md:text-base flex-shrink-0"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">PDF İndir</span>
                  <span className="sm:hidden">PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div ref={reportRef}>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8 animate-fadeIn">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-white/90">Toplam Eser</p>
              <p className="text-xl md:text-3xl font-bold text-white mt-1 md:mt-2">{totalBooks}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 md:p-4">
              <BookOpen className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-white/90">Kategori Sayısı</p>
              <p className="text-xl md:text-3xl font-bold text-white mt-1 md:mt-2">{distributionData.length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 md:p-4">
              <Package className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-white/90">En Büyük Kategori</p>
              <p className="text-sm md:text-xl font-bold text-white mt-1 md:mt-2 truncate">{largestCategory?.name || '-'}</p>
              <p className="text-xs md:text-sm text-white/80">{largestCategory?.count || 0} kitap</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 md:p-4">
              <TrendingUp className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-white/90">Ortalama</p>
              <p className="text-xl md:text-3xl font-bold text-white mt-1 md:mt-2">{avgBooksPerCategory.toFixed(0)}</p>
              <p className="text-xs md:text-sm text-white/80">kitap/kategori</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 md:p-4">
              <Tag className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Smart Recommendations */}
      {smartRecommendations.length > 0 && !comparisonMode && !showTrendAnalysis && (
        <div className="mb-8 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              Akıllı Öneriler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {smartRecommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                    rec.type === 'warning' ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-400' :
                    rec.type === 'info' ? 'bg-blue-50 border-blue-300 hover:border-blue-400' :
                    rec.type === 'success' ? 'bg-green-50 border-green-300 hover:border-green-400' :
                    'bg-purple-50 border-purple-300 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{rec.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">{rec.title}</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{rec.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trend Analysis Button */}
      {distributionCriterion === 'category' && !comparisonMode && (
        <div className="mb-8 animate-fadeIn">
          <button
            onClick={() => setShowTrendAnalysis(!showTrendAnalysis)}
            className="w-full bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-gray-900">Trend Analizi</h3>
                <p className="text-sm text-gray-600">Kategorilerin son 6 aylık büyüme/küçülme trendini görüntüleyin</p>
              </div>
            </div>
            <div className={`transform transition-transform ${showTrendAnalysis ? 'rotate-180' : ''}`}>
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Trend Analysis Content */}
      {showTrendAnalysis && distributionCriterion === 'category' && (
        <div className="mb-4 md:mb-8 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Trend Chart */}
            <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">Kategori Büyüme Trendi (Son 6 Ay)</h3>
              <div className="h-80">
                <Line
                  data={{
                    labels: getTrendData.labels,
                    datasets: getTrendData.trends.slice(0, 5).map((trend, index) => ({
                      label: trend.category,
                      data: trend.counts,
                      borderColor: colors[index],
                      backgroundColor: colors[index].replace('0.8', '0.2'),
                      borderWidth: 2,
                      tension: 0.4,
                      pointRadius: 4,
                      pointHoverRadius: 6
                    }))
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                      duration: 1000,
                      easing: 'easeInOutQuart'
                    },
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: {
                          boxWidth: 12,
                          padding: 10,
                          font: { size: 11 }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Trend List */}
            <div className="lg:col-span-1 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">Trend Sıralaması</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                {getTrendData.trends.map((trend, index) => (
                  <div key={trend.category} className="p-3 rounded-xl bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100 hover:border-green-300 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-800 truncate" title={trend.category}>{trend.category}</span>
                      <div className="flex items-center gap-1">
                        {trend.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : trend.trend === 'down' ? (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ) : (
                          <Minus className="w-4 h-4 text-gray-600" />
                        )}
                        <span className={`text-xs font-bold ${
                          trend.trend === 'up' ? 'text-green-600' : 
                          trend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {trend.change > 0 ? '+' : ''}{trend.change}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Değişim</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        trend.trend === 'up' ? 'bg-green-100 text-green-700' : 
                        trend.trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {trend.percentChange > 0 ? '+' : ''}{trend.percentChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!showTrendAnalysis && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 animate-fadeIn">
        {/* Left Column: Chart */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 mb-4 md:mb-6">
            <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Kategori Görselleştirmesi</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 md:gap-2 p-1 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl">
                <button
                  onClick={() => setChartType('pie')}
                  className={`flex-1 sm:flex-none px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${chartType === 'pie' ? 'bg-white shadow-md text-indigo-600 scale-105' : 'text-gray-600 hover:bg-white/50'}`}
                >
                  <PieChart className="w-4 h-4 md:w-5 md:h-5 inline-block mr-1" />
                  <span className="hidden sm:inline">Pasta</span>
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`flex-1 sm:flex-none px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${chartType === 'bar' ? 'bg-white shadow-md text-indigo-600 scale-105' : 'text-gray-600 hover:bg-white/50'}`}
                >
                  <BarChart className="w-4 h-4 md:w-5 md:h-5 inline-block mr-1" />
                  <span className="hidden sm:inline">Çubuk</span>
                </button>
              </div>
              {distributionCriterion === 'category' && !comparisonMode && (
                <select
                  value={visualizationType}
                  onChange={(e) => setVisualizationType(e.target.value as 'standard' | 'stacked' | 'heatmap')}
                  className="px-3 py-2 text-sm font-semibold bg-white border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                >
                  <option value="standard">Standart</option>
                  <option value="stacked">Durum Bazlı</option>
                  <option value="heatmap">Isı Haritası</option>
                </select>
              )}
            </div>
          </div>
          <div className="mb-6 space-y-4">
            {!comparisonMode ? (
              <>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700">Dağılım Kriteri</label>
                  {distributionCriterion === 'category' && (
                    <button
                      onClick={() => setComparisonMode(true)}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-200"
                    >
                      Kategori Karşılaştır
                    </button>
                  )}
                </div>
                <select
                  value={distributionCriterion}
                  onChange={(e) => setDistributionCriterion(e.target.value as 'category' | 'publisher' | 'status' | 'tags')}
                  className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium"
                >
                  <option value="category">📚 Kategoriye Göre</option>
                  <option value="publisher">🏢 Yayınevine Göre</option>
                  <option value="status">📊 Duruma Göre</option>
                  <option value="tags">🏷️ Etiketlere Göre</option>
                </select>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">Kategori Karşılaştırma</h3>
                  <button
                    onClick={() => setComparisonMode(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    × Kapat
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-indigo-600 mb-1">Birinci Kategori</label>
                    <select
                      value={firstCategory}
                      onChange={(e) => setFirstCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium"
                    >
                      <option value="">Kategori Seçin</option>
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-pink-600 mb-1">İkinci Kategori</label>
                    <select
                      value={secondCategory}
                      onChange={(e) => setSecondCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 shadow-sm font-medium"
                    >
                      <option value="">Kategori Seçin</option>
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="relative h-64 md:h-96 lg:h-[32rem] bg-gradient-to-br from-gray-50 to-indigo-50 rounded-xl p-2 md:p-4">
            {visualizationType === 'stacked' && distributionCriterion === 'category' && !comparisonMode ? (
              <Bar
                data={{
                  labels: distributionData.map(d => d.name),
                  datasets: [
                    {
                      label: 'Mevcut',
                      data: distributionData.map(d => {
                        const available = catalogBooks.filter(b => b.category === d.name && getBookStatus(b.id) === 'available').length;
                        return available;
                      }),
                      backgroundColor: 'rgba(34, 197, 94, 0.8)',
                      borderColor: 'rgba(34, 197, 94, 1)',
                      borderWidth: 1
                    },
                    {
                      label: 'Ödünç Verilmiş',
                      data: distributionData.map(d => {
                        const borrowed = catalogBooks.filter(b => b.category === d.name && getBookStatus(b.id) === 'borrowed').length;
                        return borrowed;
                      }),
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      borderColor: 'rgba(59, 130, 246, 1)',
                      borderWidth: 1
                    },
                    {
                      label: 'Kayıp',
                      data: distributionData.map(d => {
                        const lost = catalogBooks.filter(b => b.category === d.name && getBookStatus(b.id) === 'lost').length;
                        return lost;
                      }),
                      backgroundColor: 'rgba(239, 68, 68, 0.8)',
                      borderColor: 'rgba(239, 68, 68, 1)',
                      borderWidth: 1
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 12 }
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      cornerRadius: 8,
                      titleFont: { size: 14, weight: 'bold' },
                      bodyFont: { size: 13 }
                    }
                  },
                  scales: {
                    x: {
                      stacked: true
                    },
                    y: {
                      stacked: true,
                      beginAtZero: true,
                      ticks: { precision: 0 }
                    }
                  }
                }}
              />
            ) : visualizationType === 'heatmap' && distributionCriterion === 'category' && !comparisonMode ? (
              <div className="h-full overflow-auto custom-scrollbar">
                <div className="grid grid-cols-3 gap-2 p-2">
                  {distributionData.map((item, index) => {
                    const percentage = totalBooks > 0 ? (item.count / totalBooks) * 100 : 0;
                    const intensity = Math.min(percentage / 20, 1);
                    return (
                      <div
                        key={item.name}
                        className="relative group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl"
                        style={{
                          backgroundColor: `rgba(99, 102, 241, ${0.2 + intensity * 0.6})`,
                          minHeight: '120px',
                          border: '2px solid rgba(99, 102, 241, 0.3)'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/10"></div>
                        <div className="relative p-4 h-full flex flex-col justify-between">
                          <div>
                            <p className="font-bold text-sm text-gray-800 mb-1 truncate" title={item.name}>{item.name}</p>
                            <p className="text-xs text-gray-600">Kitap Sayısı</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-indigo-700">{item.count}</p>
                            <p className="text-xs font-semibold text-indigo-600">{percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : comparisonMode && (!firstCategory || !secondCategory) ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p className="text-center">
                  <span className="text-4xl mb-2 block">🔍</span>
                  <span className="text-lg font-semibold">Karşılaştırmak için iki kategori seçin</span>
                </p>
              </div>
            ) : comparisonMode ? (
              <Bar data={distributionChartData} options={{
                ...distributionChartOptions,
                animation: {
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                plugins: {
                  ...distributionChartOptions.plugins,
                  legend: {
                    display: true,
                    position: 'top' as const
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 }
                  }
                }
              }} />
            ) : chartType === 'pie' ? (
              <Doughnut data={distributionChartData} options={{
                ...distributionChartOptions,
                animation: {
                  animateRotate: true,
                  animateScale: true,
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                plugins: {
                  ...distributionChartOptions.plugins,
                  legend: {
                    position: 'right' as const,
                    labels: {
                      boxWidth: 12,
                      padding: 15,
                      font: { size: 11 },
                      usePointStyle: true
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                      label: (context: any) => {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} kitap (${percentage}%)`;
                      }
                    }
                  }
                }
              }} />
            ) : (
              <Bar data={distributionChartData} options={{
                ...distributionChartOptions,
                animation: {
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                plugins: {
                  ...distributionChartOptions.plugins,
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 }
                  }
                }
              }} />
            )}
          </div>
        </div>

        {/* Right Column: Category Details */}
        <div className="lg:col-span-1 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Detaylar</h2>
            <span className="px-2 md:px-3 py-1 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-md">{totalBooks} Eser</span>
          </div>
          <div className="space-y-2 md:space-y-3 max-h-64 md:max-h-96 lg:max-h-[32rem] overflow-y-auto pr-2 custom-scrollbar">
            {distributionData.map((item, index) => {
              const percentage = totalBooks > 0 ? (item.count / totalBooks) * 100 : 0;
              const color = colors[index % colors.length];
              return (
                <div key={`${item.name}-${index}`} className="group p-4 rounded-xl bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-base text-gray-800 truncate group-hover:text-indigo-600 transition-colors" title={item.name}>{item.name}</span>
                    <span className="font-bold text-lg text-indigo-600 ml-2">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className="h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${percentage}%`, 
                        background: `linear-gradient(90deg, ${color}, ${color.replace('0.8', '0.5')})`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs font-medium text-gray-500">Toplam içinde</span>
                    <span className="text-sm font-bold text-indigo-600">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          {distributionCriterion === 'category' && (
            <button
              onClick={() => setShowInfoModal(true)}
              className="w-full mt-6 flex items-center justify-center px-4 py-3 rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              Kategori Kodlarını Öğren
            </button>
          )}
        </div>
      </div>
      )}

      {/* Category Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-white to-indigo-50 rounded-3xl shadow-2xl max-w-5xl w-full transform transition-all duration-300 animate-slideUp">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-3xl flex justify-between items-center">
              <h3 className="text-2xl font-bold text-white flex items-center">
                <HelpCircle className="w-7 h-7 mr-3" />
                Kategori Açıklamaları
              </h3>
              <button onClick={() => setShowInfoModal(false)} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {Object.entries(categoryInfo).map(([code, description], index) => (
                <div key={code} className="p-5 bg-white rounded-xl shadow-md border-2 border-indigo-100 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-3 py-1 rounded-lg text-sm shadow-md">
                      {code}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed group-hover:text-gray-900 transition-colors">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminCollectionDistribution;
