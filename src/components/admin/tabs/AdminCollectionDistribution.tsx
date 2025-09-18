import React, { useState, useMemo } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Book } from '../../../types';
import { PieChart, BarChart } from 'lucide-react';

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

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <PieChart className="w-6 h-6 mr-2 text-indigo-600" />
          Eser Dağılımı
        </h2>
        <div className="flex items-center space-x-4">
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
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'pie' | 'bar')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="pie">Pasta Grafik</option>
            <option value="bar">Çubuk Grafik</option>
          </select>
        </div>
      </div>
      <div className="h-96">
        {chartType === 'pie' ? (
          <Pie data={distributionChartData} options={distributionChartOptions} />
        ) : (
          <Bar data={distributionChartData} options={distributionChartOptions} />
        )}
      </div>
    </div>
  );
};

export default AdminCollectionDistribution;
