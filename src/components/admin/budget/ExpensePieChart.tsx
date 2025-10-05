import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Transaction } from '../../../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ExpensePieChartProps {
  transactions: Transaction[];
}

const ExpensePieChart: React.FC<ExpensePieChartProps> = ({ transactions }) => {
  const expenseTransactions = transactions.filter(tx => tx.type === 'expense');

  const data = {
    labels: Object.keys(
      expenseTransactions.reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
      }, {} as { [key: string]: number })
    ),
    datasets: [
      {
        data: Object.values(
          expenseTransactions.reduce((acc, tx) => {
            acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
            return acc;
          }, {} as { [key: string]: number })
        ),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
        hoverBackgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
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
        text: 'Giderlerin Kategorilere Göre Dağılımı',
      },
    },
  };

  return <Pie data={data} options={options} />;
};

export default ExpensePieChart;
