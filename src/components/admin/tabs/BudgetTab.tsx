import React, { useState, useMemo } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import Button from '../../common/Button';
import BudgetTransactionModal from '../BudgetTransactionModal';
import { Transaction } from '../../../types';
import { ChevronLeft, ChevronRight, ArrowUpDown, Wallet, TrendingDown, TrendingUp, Plus, Edit2, Trash2, Filter, BarChart3, PieChart, Calendar } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import ExpensePieChart from '../budget/ExpensePieChart';
import MonthlyBarChart from '../budget/MonthlyBarChart';
import MonthComparer from '../budget/MonthComparer';

const ITEMS_PER_PAGE = 10;

const BudgetTab: React.FC = () => {
  const { summary, transactions, addTransaction, updateTransaction, deleteTransaction } = useBudget();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  const [filters, setFilters] = useState({ category: '', type: '', startDate: '', endDate: '' });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | null; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [visualizationType, setVisualizationType] = useState<'line' | 'area' | 'stacked'>('line');

  const handleSaveTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      if (transactionToEdit) {
        await updateTransaction(transactionToEdit.id, transactionData);
        alert('İşlem başarıyla güncellendi.');
      } else {
        await addTransaction(transactionData);
        alert('İşlem başarıyla eklendi.');
      }
      setIsModalOpen(false);
      setTransactionToEdit(null);
    } catch (error) {
      console.error("Failed to save transaction:", error);
      alert("İşlem kaydedilirken bir hata oluştu.");
    }
  };

  const handleAddNewClick = () => {
    setTransactionToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (transactionId: string) => {
    if (window.confirm('Bu işlemi kalıcı olarak silmek istediğinizden emin misiniz?')) {
      try {
        await deleteTransaction(transactionId);
        alert('İşlem başarıyla silindi.');
      } catch (error) {
        console.error("Failed to delete transaction:", error);
        alert("İşlem silinirken bir hata oluştu.");
      }
    }
  };

  const uniqueCategories = useMemo(() => {
    const categories = new Set(transactions.map(tx => tx.category));
    return ['', ...Array.from(categories)];
  }, [transactions]);

  const existingCategories = useMemo(() => {
    const categories = new Set(transactions.map(tx => tx.category));
    return Array.from(categories);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (filters.type) {
      filtered = filtered.filter(tx => tx.type === filters.type);
    }
    if (filters.category) {
      filtered = filtered.filter(tx => tx.category === filters.category);
    }
    if (filters.startDate) {
      filtered = filtered.filter(tx => new Date(tx.date.seconds * 1000) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      filtered = filtered.filter(tx => new Date(tx.date.seconds * 1000) <= new Date(filters.endDate));
    }

    return filtered;
  }, [transactions, filters]);

  const sortedTransactions = useMemo(() => {
    let sortableItems = [...filteredTransactions];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'date') {
            const dateA = a.date.seconds;
            const dateB = b.date.seconds;
            if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        } else if (sortConfig.key === 'amount') {
            if (a.amount < b.amount) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a.amount > b.amount) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTransactions, sortConfig]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedTransactions, currentPage]);

  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);

  // Gelişmiş Analiz Verileri
  const analyticsData = useMemo(() => {
    const now = new Date();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        monthIndex: date.getMonth(),
        year: date.getFullYear()
      });
    }

    const monthlyData = last6Months.map(({ monthIndex, year }) => {
      const income = transactions
        .filter(tx => {
          const txDate = new Date(tx.date.seconds * 1000);
          return tx.type === 'income' && txDate.getMonth() === monthIndex && txDate.getFullYear() === year;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

      const expense = transactions
        .filter(tx => {
          const txDate = new Date(tx.date.seconds * 1000);
          return tx.type === 'expense' && txDate.getMonth() === monthIndex && txDate.getFullYear() === year;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

      return { income, expense, net: income - expense };
    });

    // Kategori bazlı analiz
    const categoryAnalysis = transactions
      .filter(tx => tx.type === 'expense')
      .reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
      }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryAnalysis)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Bu ay vs geçen ay
    const thisMonth = new Date();
    const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);

    const thisMonthIncome = transactions
      .filter(tx => {
        const txDate = new Date(tx.date.seconds * 1000);
        return tx.type === 'income' && txDate.getMonth() === thisMonth.getMonth() && txDate.getFullYear() === thisMonth.getFullYear();
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const lastMonthIncome = transactions
      .filter(tx => {
        const txDate = new Date(tx.date.seconds * 1000);
        return tx.type === 'income' && txDate.getMonth() === lastMonth.getMonth() && txDate.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const thisMonthExpense = transactions
      .filter(tx => {
        const txDate = new Date(tx.date.seconds * 1000);
        return tx.type === 'expense' && txDate.getMonth() === thisMonth.getMonth() && txDate.getFullYear() === thisMonth.getFullYear();
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const lastMonthExpense = transactions
      .filter(tx => {
        const txDate = new Date(tx.date.seconds * 1000);
        return tx.type === 'expense' && txDate.getMonth() === lastMonth.getMonth() && txDate.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Yıllık özet
    const currentYear = new Date().getFullYear();
    const yearlyIncome = transactions
      .filter(tx => {
        const txDate = new Date(tx.date.seconds * 1000);
        return tx.type === 'income' && txDate.getFullYear() === currentYear;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const yearlyExpense = transactions
      .filter(tx => {
        const txDate = new Date(tx.date.seconds * 1000);
        return tx.type === 'expense' && txDate.getFullYear() === currentYear;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      labels: last6Months.map(m => m.month),
      monthlyData,
      categoryData,
      comparison: {
        thisMonthIncome,
        lastMonthIncome,
        thisMonthExpense,
        lastMonthExpense,
        incomeChange: lastMonthIncome > 0 ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0,
        expenseChange: lastMonthExpense > 0 ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100 : 0
      },
      yearly: {
        income: yearlyIncome,
        expense: yearlyExpense,
        net: yearlyIncome - yearlyExpense,
        avgMonthlyIncome: yearlyIncome / 12,
        avgMonthlyExpense: yearlyExpense / 12
      }
    };
  }, [transactions]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const requestSort = (key: keyof Transaction) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <>
      <BudgetTransactionModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTransactionToEdit(null);
        }}
        onSave={handleSaveTransaction}
        transactionToEdit={transactionToEdit ?? undefined}
        existingCategories={existingCategories}
      />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="mb-8 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl mr-3">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              Bütçe Yönetimi
            </h2>
            <p className="text-gray-600 text-lg">
              Kütüphane gelir ve giderlerini takip edin, analiz edin.
            </p>
          </div>
        </div>

        {/* Analytics Toggle Button */}
        <div className="mb-8 animate-fadeIn">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="w-full bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-gray-900">Gelişmiş Analiz ve Raporlama</h3>
                <p className="text-sm text-gray-600">Detaylı trend analizi, kategori dağılımı ve karşılaştırmalı raporlar</p>
              </div>
            </div>
            <div className={`transform transition-transform ${showAnalytics ? 'rotate-180' : ''}`}>
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Advanced Analytics Section */}
        {showAnalytics && (
          <div className="space-y-8 mb-8 animate-fadeIn">
            {/* Budget Usage Gauge */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Bütçe Kullanım Oranı</h3>
              <div className="flex items-center justify-center h-64">
                <div className="relative w-64 h-64">
                  <svg className="transform -rotate-90 w-64 h-64">
                    <circle
                      cx="128"
                      cy="128"
                      r="100"
                      stroke="#e5e7eb"
                      strokeWidth="20"
                      fill="none"
                    />
                    <circle
                      cx="128"
                      cy="128"
                      r="100"
                      stroke="url(#gradient)"
                      strokeWidth="20"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 100}`}
                      strokeDashoffset={`${2 * Math.PI * 100 * (1 - (summary.totalExpense / summary.totalBudget))}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {((summary.totalExpense / summary.totalBudget) * 100).toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-600 mt-2">Kullanıldı</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-purple-50 rounded-xl">
                  <p className="text-xs text-gray-600">Harcanan</p>
                  <p className="text-lg font-bold text-purple-700">{summary.totalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                </div>
                <div className="text-center p-3 bg-pink-50 rounded-xl">
                  <p className="text-xs text-gray-600">Kalan</p>
                  <p className="text-lg font-bold text-pink-700">{summary.remainingBudget.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                </div>
              </div>
            </div>

            {/* Trend Analysis */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Gelir/Gider Trend Analizi (Son 6 Ay)</h3>
                <select
                  value={visualizationType}
                  onChange={(e) => setVisualizationType(e.target.value as 'line' | 'area' | 'stacked')}
                  className="px-3 py-2 text-sm font-semibold bg-white border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                >
                  <option value="line">Line Chart</option>
                  <option value="area">Area Chart</option>
                  <option value="stacked">Stacked Bar</option>
                </select>
              </div>
              <div className="h-80">
                {visualizationType === 'stacked' ? (
                  <Bar
                    data={{
                      labels: analyticsData.labels,
                      datasets: [
                        {
                          label: 'Gelir',
                          data: analyticsData.monthlyData.map(d => d.income),
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          borderColor: 'rgba(34, 197, 94, 1)',
                          borderWidth: 2
                        },
                        {
                          label: 'Gider',
                          data: analyticsData.monthlyData.map(d => d.expense),
                          backgroundColor: 'rgba(239, 68, 68, 0.8)',
                          borderColor: 'rgba(239, 68, 68, 1)',
                          borderWidth: 2
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                          labels: { boxWidth: 12, padding: 15, font: { size: 12 } }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: 12,
                          cornerRadius: 8,
                          callbacks: {
                            label: (context: any) => {
                              return `${context.dataset.label}: ${context.parsed.y.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true }
                      }
                    }}
                  />
                ) : (
                  <Line
                    data={{
                      labels: analyticsData.labels,
                      datasets: [
                        {
                          label: 'Gelir',
                          data: analyticsData.monthlyData.map(d => d.income),
                          borderColor: 'rgba(34, 197, 94, 1)',
                          backgroundColor: visualizationType === 'area' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.1)',
                          borderWidth: 3,
                          tension: 0.4,
                          fill: visualizationType === 'area'
                        },
                        {
                          label: 'Gider',
                          data: analyticsData.monthlyData.map(d => d.expense),
                          borderColor: 'rgba(239, 68, 68, 1)',
                          backgroundColor: visualizationType === 'area' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)',
                          borderWidth: 3,
                          tension: 0.4,
                          fill: visualizationType === 'area'
                        },
                        {
                          label: 'Net',
                          data: analyticsData.monthlyData.map(d => d.net),
                          borderColor: 'rgba(99, 102, 241, 1)',
                          backgroundColor: visualizationType === 'area' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)',
                          borderWidth: 3,
                          tension: 0.4,
                          fill: visualizationType === 'area'
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                          labels: { boxWidth: 12, padding: 15, font: { size: 12 } }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: 12,
                          cornerRadius: 8,
                          callbacks: {
                            label: (context: any) => {
                              return `${context.dataset.label}: ${context.parsed.y.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: { beginAtZero: true }
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {/* Category Analysis & Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Analysis */}
              <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Kategori Bazlı Harcama Analizi</h3>
                <div className="h-80">
                  <Bar
                    data={{
                      labels: analyticsData.categoryData.map(d => d.category),
                      datasets: [
                        {
                          label: 'Harcama',
                          data: analyticsData.categoryData.map(d => d.amount),
                          backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(249, 115, 22, 0.8)',
                            'rgba(234, 179, 8, 0.8)',
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(139, 92, 246, 0.8)',
                            'rgba(236, 72, 153, 0.8)'
                          ],
                          borderRadius: 8,
                          borderWidth: 2
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: 12,
                          cornerRadius: 8,
                          callbacks: {
                            label: (context: any) => {
                              const total = analyticsData.categoryData.reduce((sum, d) => sum + d.amount, 0);
                              const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                              return `${context.parsed.y.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} (${percentage}%)`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: { beginAtZero: true }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Monthly Comparison */}
              <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Bu Ay vs Geçen Ay</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Gelir</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${analyticsData.comparison.incomeChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {analyticsData.comparison.incomeChange >= 0 ? '+' : ''}{analyticsData.comparison.incomeChange.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Bu Ay</p>
                        <p className="text-lg font-bold text-green-700">{analyticsData.comparison.thisMonthIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Geçen Ay</p>
                        <p className="text-lg font-bold text-gray-600">{analyticsData.comparison.lastMonthIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Gider</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${analyticsData.comparison.expenseChange <= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {analyticsData.comparison.expenseChange >= 0 ? '+' : ''}{analyticsData.comparison.expenseChange.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Bu Ay</p>
                        <p className="text-lg font-bold text-red-700">{analyticsData.comparison.thisMonthExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Geçen Ay</p>
                        <p className="text-lg font-bold text-gray-600">{analyticsData.comparison.lastMonthExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Yearly Summary */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-8 h-8" />
                <h3 className="text-2xl font-bold">Yıllık Özet ({new Date().getFullYear()})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm opacity-90">Toplam Gelir</p>
                  <p className="text-2xl font-bold mt-1">{analyticsData.yearly.income.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm opacity-90">Toplam Gider</p>
                  <p className="text-2xl font-bold mt-1">{analyticsData.yearly.expense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm opacity-90">Net</p>
                  <p className="text-2xl font-bold mt-1">{analyticsData.yearly.net.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm opacity-90">Aylık Ort. Gelir</p>
                  <p className="text-2xl font-bold mt-1">{analyticsData.yearly.avgMonthlyIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
            <ExpensePieChart transactions={transactions} />
          </div>
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6">
            <MonthlyBarChart transactions={transactions} />
          </div>
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 lg:col-span-2">
            <MonthComparer transactions={transactions} />
          </div>
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fadeIn">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Toplam Bütçe</p>
                <p className="text-3xl font-bold text-white mt-2">{summary.totalBudget.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <Wallet className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-pink-600 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Toplam Harcama</p>
                <p className="text-3xl font-bold text-white mt-2">{summary.totalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <TrendingDown className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Kalan Bütçe</p>
                <p className="text-3xl font-bold text-white mt-2">{summary.remainingBudget.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Actions */}
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6 mb-8 animate-fadeIn">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900">Filtreler</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                {/* Category Filter */}
                <div>
                    <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label>
                    <select id="category" name="category" value={filters.category} onChange={handleFilterChange} className="block w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium">
                        {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat === '' ? 'Tümü' : cat}</option>)}
                    </select>
                </div>
                {/* Type Filter */}
                <div>
                    <label htmlFor="type" className="block text-sm font-semibold text-gray-700 mb-2">İşlem Tipi</label>
                    <select id="type" name="type" value={filters.type} onChange={handleFilterChange} className="block w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium">
                        <option value="">Tümü</option>
                        <option value="income">Gelir</option>
                        <option value="expense">Gider</option>
                    </select>
                </div>
                {/* Start Date */}
                <div>
                    <label htmlFor="startDate" className="block text-sm font-semibold text-gray-700 mb-2">Başlangıç Tarihi</label>
                    <input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="block w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium" />
                </div>
                {/* End Date */}
                <div>
                    <label htmlFor="endDate" className="block text-sm font-semibold text-gray-700 mb-2">Bitiş Tarihi</label>
                    <input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="block w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium" />
                </div>
                {/* Add New Button */}
                <div className="flex justify-end">
                    <button onClick={handleAddNewClick} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-2 font-semibold">
                        <Plus className="w-5 h-5" />
                        Yeni İşlem
                    </button>
                </div>
            </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6 animate-fadeIn">
          <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">Son İşlemler</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <tr>
                  <th onClick={() => requestSort('date')} className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider cursor-pointer hover:bg-indigo-100 transition-colors">
                    <div className="flex items-center">Tarih <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Açıklama</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Kategori</th>
                  <th onClick={() => requestSort('amount')} className="px-6 py-4 text-right text-xs font-bold text-indigo-700 uppercase tracking-wider cursor-pointer hover:bg-indigo-100 transition-colors">
                    <div className="flex items-center justify-end">Tutar <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-indigo-700 uppercase tracking-wider">Eylemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((tx, index) => (
                    <tr key={tx.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{new Date(tx.date.seconds * 1000).toLocaleDateString('tr-TR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{tx.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">{tx.category}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${tx.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleEditClick(tx)} className="text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg transition-colors mr-2">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteClick(tx.id)} className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Filtre ile eşleşen işlem bulunmuyor.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Önceki
                </Button>
                <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Sonraki
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{sortedTransactions.length}</span> sonuçtan <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, sortedTransactions.length)}</span> arası gösteriliyor
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                      <span className="sr-only">Önceki</span>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    {/* Page numbers could be added here if needed */}
                    <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                      <span className="sr-only">Sonraki</span>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BudgetTab;
