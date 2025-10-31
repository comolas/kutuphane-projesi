import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../../types';
import Button from '../common/Button';
import FormInput from '../common/FormInput';
import { X, TrendingUp, TrendingDown, Calendar, DollarSign, Tag, FileText, Plus } from 'lucide-react';

interface BudgetTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  transactionToEdit?: Transaction | null;
  existingCategories?: string[];
}

const BudgetTransactionModal: React.FC<BudgetTransactionModalProps> = ({ isOpen, onClose, onSave, transactionToEdit, existingCategories = [] }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isNewCategory, setIsNewCategory] = useState(false);

  useEffect(() => {
    if (transactionToEdit) {
      setDescription(transactionToEdit.description);
      setAmount(String(transactionToEdit.amount));
      setType(transactionToEdit.type);
      setCategory(transactionToEdit.category);
      setDate(new Date(transactionToEdit.date.seconds * 1000).toISOString().split('T')[0]);
    } else {
      // Reset form when opening for a new transaction
      setDescription('');
      setAmount('');
      setType('expense');
      setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [transactionToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category || !date) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    onSave({
      description,
      amount: parseFloat(amount),
      type,
      category,
      date: new Date(date),
    });
    onClose(); // Close modal after save
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex justify-center items-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col transform transition-all duration-300 animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 rounded-t-2xl sm:rounded-t-3xl flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3">
              {type === 'income' ? <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-white">{transactionToEdit ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}</h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto">
          <div className="space-y-4 sm:space-y-6">
            {/* Transaction Type Toggle */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">İşlem Tipi</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`px-4 py-2 rounded-xl border-2 transition-all flex items-center justify-center gap-1.5 sm:gap-2 font-semibold text-sm min-h-[44px] touch-manipulation ${
                    type === 'expense'
                      ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white border-red-500 shadow-md hover:shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-red-300 shadow-md hover:shadow-lg hover:scale-105'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  Gider
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`px-4 py-2 rounded-xl border-2 transition-all flex items-center justify-center gap-1.5 sm:gap-2 font-semibold text-sm min-h-[44px] touch-manipulation ${
                    type === 'income'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-500 shadow-md hover:shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 shadow-md hover:shadow-lg hover:scale-105'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  Gelir
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                Tutar
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 sm:px-4 py-3 sm:py-4 text-xl sm:text-2xl font-bold bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
                />
                <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-lg sm:text-xl font-bold text-gray-400">₺</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                Açıklama
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="İşlem açıklaması girin..."
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                Kategori
              </label>
              {!isNewCategory && existingCategories.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setIsNewCategory(true);
                        setCategory('');
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium"
                  >
                    <option value="">Kategori seçin...</option>
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__new__" className="font-bold text-indigo-600">+ Yeni Kategori Ekle</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    placeholder="Yeni kategori adı girin..."
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium"
                  />
                  {existingCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewCategory(false);
                        setCategory('');
                      }}
                      className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 min-h-[44px] touch-manipulation"
                    >
                      ← Mevcut kategorilerden seç
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                Tarih
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium"
              />
            </div>
          </div>
          {/* Footer */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-semibold min-h-[44px] flex items-center justify-center shadow-md touch-manipulation"
            >
              {transactionToEdit ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetTransactionModal;
