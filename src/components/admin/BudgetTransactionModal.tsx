import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../../types';
import Button from '../common/Button';
import FormInput from '../common/FormInput';

interface BudgetTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  transactionToEdit?: Transaction | null;
}

const BudgetTransactionModal: React.FC<BudgetTransactionModalProps> = ({ isOpen, onClose, onSave, transactionToEdit }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{transactionToEdit ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormInput
              label="Açıklama"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <FormInput
              label="Tutar (TL)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <FormInput
              label="Tarih"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700">İşlem Tipi</label>
              <div className="mt-2 flex space-x-4">
                <label className="flex items-center">
                  <input type="radio" value="expense" checked={type === 'expense'} onChange={() => setType('expense')} className="form-radio h-4 w-4 text-indigo-600"/>
                  <span className="ml-2 text-sm text-gray-700">Gider</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" value="income" checked={type === 'income'} onChange={() => setType('income')} className="form-radio h-4 w-4 text-indigo-600"/>
                  <span className="ml-2 text-sm text-gray-700">Gelir</span>
                </label>
              </div>
            </div>
            <FormInput
              label="Kategori"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Örn: Kitap Alımı, Bağış, Fatura"
              required
            />
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800">
              İptal
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {transactionToEdit ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetTransactionModal;
