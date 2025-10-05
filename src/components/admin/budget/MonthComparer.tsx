import React, { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Transaction } from '../../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface MonthComparerProps {
  transactions: Transaction[];
}

const MonthComparer: React.FC<MonthComparerProps> = ({ transactions }) => {
  const [month1, setMonth1] = useState<string>('');
  const [month2, setMonth2] = useState<string>('');

  const availableMonths = useMemo(() => {
    const months = new Set(transactions.map(tx => new Date(tx.date.seconds * 1000).toISOString().slice(0, 7)));
    return Array.from(months);
  }, [transactions]);

  const comparisonData = useMemo(() => {
    if (!month1 || !month2) return null;

    const getExpensesByMonth = (month: string) => {
      return transactions
        .filter(tx => tx.type === 'expense' && new Date(tx.date.seconds * 1000).toISOString().startsWith(month))
        .reduce((acc, tx) => {
          acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
          return acc;
        }, {} as { [key: string]: number });
    };

    const expenses1 = getExpensesByMonth(month1);
    const expenses2 = getExpensesByMonth(month2);

    const categories = Array.from(new Set([...Object.keys(expenses1), ...Object.keys(expenses2)]));

    const data = {
      labels: categories,
      datasets: [
        {
          label: month1,
          data: categories.map(cat => expenses1[cat] || 0),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        },
        {
          label: month2,
          data: categories.map(cat => expenses2[cat] || 0),
          backgroundColor: 'rgba(255, 206, 86, 0.5)',
        },
      ],
    };

    return data;
  }, [transactions, month1, month2]);

  return (
    <div>
      <div className="flex space-x-4 mb-4">
        <select value={month1} onChange={e => setMonth1(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
          <option value="">Birinci Ayı Seçin</option>
          {availableMonths.map(month => <option key={month} value={month}>{month}</option>)}
        </select>
        <select value={month2} onChange={e => setMonth2(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
          <option value="">İkinci Ayı Seçin</option>
          {availableMonths.map(month => <option key={month} value={month}>{month}</option>)}
        </select>
      </div>
      {comparisonData && <Bar data={comparisonData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Aylık Gider Karşılaştırması' } } }} />}
    </div>
  );
};

export default MonthComparer;
