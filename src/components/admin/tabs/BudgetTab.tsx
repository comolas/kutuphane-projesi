import React, { useState, useMemo } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import Button from '../../common/Button';
import BudgetTransactionModal from '../BudgetTransactionModal';
import { Transaction } from '../../../types';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
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
      />
      <div className="p-4 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Bütçe Yönetimi</h2>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <ExpensePieChart transactions={transactions} />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <MonthlyBarChart transactions={transactions} />
          </div>
          <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
            <MonthComparer transactions={transactions} />
          </div>
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">TOPLAM BÜTÇE</h3>
            <p className="text-2xl font-semibold text-gray-800">{summary.totalBudget.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">TOPLAM HARCAMA</h3>
            <p className="text-2xl font-semibold text-red-600">{summary.totalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">KALAN BÜTÇE</h3>
            <p className="text-2xl font-semibold text-green-600">{summary.remainingBudget.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
          </div>
        </div>

        {/* Filter and Actions */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                {/* Category Filter */}
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">Kategori</label>
                    <select id="category" name="category" value={filters.category} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat === '' ? 'Tümü' : cat}</option>)}
                    </select>
                </div>
                {/* Type Filter */}
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">İşlem Tipi</label>
                    <select id="type" name="type" value={filters.type} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="">Tümü</option>
                        <option value="income">Gelir</option>
                        <option value="expense">Gider</option>
                    </select>
                </div>
                {/* Start Date */}
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
                    <input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" />
                </div>
                {/* End Date */}
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
                    <input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" />
                </div>
                {/* Add New Button */}
                <div className="flex justify-end">
                    <Button onClick={handleAddNewClick} className="bg-blue-500 hover:bg-blue-600 text-white">
                        Yeni İşlem Ekle
                    </Button>
                </div>
            </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Son İşlemler</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th onClick={() => requestSort('date')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                    <div className="flex items-center">Tarih <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th onClick={() => requestSort('amount')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                    <div className="flex items-center justify-end">Tutar <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Eylemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(tx.date.seconds * 1000).toLocaleDateString('tr-TR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tx.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.category}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleEditClick(tx)} className="text-indigo-600 hover:text-indigo-900 mr-3">Düzenle</button>
                        <button onClick={() => handleDeleteClick(tx.id)} className="text-red-600 hover:text-red-900">Sil</button>
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
