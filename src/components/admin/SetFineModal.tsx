import React, { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2';

interface SetFineModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRate: number;
  onSave: (newRate: number) => Promise<void>;
}

const SetFineModal: React.FC<SetFineModalProps> = ({ isOpen, onClose, currentRate, onSave }) => {
  const [newRate, setNewRate] = useState(currentRate);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNewRate(currentRate);
  }, [currentRate, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (newRate === null || isNaN(newRate) || newRate < 0) {
      Swal.fire('Hata!', 'Lütfen geçerli bir pozitif sayı girin.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(newRate);
      Swal.fire('Başarılı!', 'Yeni ceza oranı başarıyla kaydedildi.', 'success');
      onClose();
    } catch (err) {
      Swal.fire('Hata!', 'Ayarlar kaydedilirken bir hata oluştu.', 'error');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="w-6 h-6 mr-2 text-indigo-600" />
            Günlük Ceza Tutarını Belirle
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Kitapların geç iade edilmesi durumunda uygulanacak olan günlük ceza tutarını buradan belirleyebilirsiniz.
          </p>
          <div className="relative">
            <label htmlFor="fineRate" className="block text-sm font-medium text-gray-700 mb-1">
              Günlük Ceza (TL)
            </label>
            <input
              type="number"
              id="fineRate"
              value={newRate}
              onChange={(e) => setNewRate(parseFloat(e.target.value))}
              className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              min="0"
              step="0.25"
            />
            <div className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">TL</span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetFineModal;