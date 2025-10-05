import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Transaction } from '../../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyBarChartProps {
  transactions: Transaction[];
}

const MonthlyBarChart: React.FC<MonthlyBarChartProps> = ({ transactions }) => {
  const monthlyData = transactions.reduce((acc, tx) => {
    const month = new Date(tx.date.seconds * 1000).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = { income: 0, expense: 0 };
    }
    if (tx.type === 'income') {
      acc[month].income += tx.amount;
    } else {
      acc[month].expense += tx.amount;
    }
    return acc;
  }, {} as { [key: string]: { income: number; expense: number } });

  const labels = Object.keys(monthlyData);

  const data = {
    labels,
    datasets: [
      {
        label: 'Gelir',
        data: labels.map(label => monthlyData[label].income),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
      {
        label: 'Gider',
        data: labels.map(label => monthlyData[label].expense),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Aylık Gelir ve Gider',
      },
    },
  };

  return <Bar options={options} data={data} />;
};

export default MonthlyBarChart;
