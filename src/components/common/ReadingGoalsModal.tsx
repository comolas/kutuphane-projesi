import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useGoals } from '../../contexts/GoalsContext';

interface ReadingGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalSaved: () => void;
}

const ReadingGoalsModal: React.FC<ReadingGoalsModalProps> = ({ isOpen, onClose, onGoalSaved }) => {
  const { monthlyGoal, yearlyGoal, saveGoal } = useGoals();
  const [monthlyGoalValue, setMonthlyGoalValue] = useState(10);
  const [yearlyGoalValue, setYearlyGoalValue] = useState(100);

  useEffect(() => {
    if (isOpen) {
      setMonthlyGoalValue(monthlyGoal?.goal || 10);
      setYearlyGoalValue(yearlyGoal?.goal || 100);
    }
  }, [isOpen, monthlyGoal, yearlyGoal]);

  const handleSaveGoals = async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    try {
    const monthlyGoalData = {
      type: 'monthly' as const,
      year,
      month,
      goal: monthlyGoalValue,
    };

    const yearlyGoalData = {
      type: 'yearly' as const,
      year,
      goal: yearlyGoalValue,
    };

    await Promise.all([
      saveGoal(monthlyGoalData),
      saveGoal(yearlyGoalData)
    ]);
    
    onGoalSaved();
    onClose();
    } catch (error) {
      console.error('Error saving goals:', error);
      alert('Hedefler kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 pr-2">Okuma Hedeflerini Belirle</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 flex-shrink-0">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="monthlyGoalValue" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Aylık Hedef (Kitap Sayısı)
            </label>
            <input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              id="monthlyGoalValue"
              value={monthlyGoalValue}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value) setMonthlyGoalValue(parseInt(value, 10));
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="yearlyGoalValue" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Yıllık Hedef (Kitap Sayısı)
            </label>
            <input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              id="yearlyGoalValue"
              value={yearlyGoalValue}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value) setYearlyGoalValue(parseInt(value, 10));
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base min-h-[44px]"
            />
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end">
          <button onClick={handleSaveGoals} className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm sm:text-base touch-manipulation min-h-[44px]">
            Hedefleri Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadingGoalsModal;