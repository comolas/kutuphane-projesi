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
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Okuma Hedeflerini Belirle</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label htmlFor="monthlyGoalValue" className="block text-sm font-medium text-gray-700 mb-1">
              Aylık Hedef (Kitap Sayısı)
            </label>
            <input 
              type="number"
              id="monthlyGoalValue"
              value={monthlyGoalValue}
              onChange={(e) => setMonthlyGoalValue(parseInt(e.target.value, 10))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="yearlyGoalValue" className="block text-sm font-medium text-gray-700 mb-1">
              Yıllık Hedef (Kitap Sayısı)
            </label>
            <input 
              type="number"
              id="yearlyGoalValue"
              value={yearlyGoalValue}
              onChange={(e) => setYearlyGoalValue(parseInt(e.target.value, 10))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button onClick={handleSaveGoals} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            Hedefleri Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadingGoalsModal;