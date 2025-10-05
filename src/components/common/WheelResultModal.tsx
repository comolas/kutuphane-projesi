import React from 'react';
import { categoryInfo } from '../../utils/categoryInfo';
import { Gift } from 'lucide-react';

interface WheelResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryKey: string;
  onNavigate: (categoryKey: string) => void;
}

const WheelResultModal: React.FC<WheelResultModalProps> = ({ isOpen, onClose, categoryKey, onNavigate }) => {
  if (!isOpen) {
    return null;
  }

  const fullCategoryName = categoryInfo[categoryKey as keyof typeof categoryInfo]?.split(':')[0] || 'Bilinmeyen Kategori';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
        <div className="flex justify-center mb-4">
            <Gift className="w-16 h-16 text-indigo-500" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gray-800">Tebrikler!</h2>
        <p className="text-gray-600 mb-6">
          Günün şanslı kategorisi olarak <span className="font-bold text-indigo-600">{fullCategoryName}</span> seçildi!
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
            <button 
                onClick={() => onNavigate(categoryKey)}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-transform transform hover:scale-105"
            >
                Kategoriyi Gör
            </button>
            <button 
                onClick={onClose} 
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300"
            >
                Kapat
            </button>
        </div>
      </div>
    </div>
  );
};

export default WheelResultModal;