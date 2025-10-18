import React from 'react';
import { Download, X } from 'lucide-react';

interface MobileUpdateModalProps {
  isOpen: boolean;
  version: string;
  downloadUrl: string;
  forceUpdate: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const MobileUpdateModal: React.FC<MobileUpdateModalProps> = ({
  isOpen,
  version,
  forceUpdate,
  onClose,
  onUpdate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Güncelleme Mevcut</h3>
            {!forceUpdate && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          <div className="mb-6">
            <p className="text-gray-600 mb-2">
              Yeni versiyon mevcut: <span className="font-semibold text-indigo-600">v{version}</span>
            </p>
            <p className="text-sm text-gray-500">
              {forceUpdate 
                ? 'Bu güncelleme zorunludur. Uygulamayı kullanmaya devam etmek için güncellemeniz gerekiyor.'
                : 'Yeni özellikler ve iyileştirmeler içeriyor.'}
            </p>
          </div>
          <div className="flex gap-3">
            {!forceUpdate && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Daha Sonra
              </button>
            )}
            <button
              onClick={onUpdate}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Güncelle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileUpdateModal;
