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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Günlük Ceza Tutarı
            </h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-xl mb-4">
            <p className="text-xs sm:text-sm text-gray-700 font-medium">
              Kitapların geç iade edilmesi durumunda uygulanacak olan günlük ceza tutarını buradan belirleyebilirsiniz.
            </p>
          </div>
          <div className="relative">
            <label htmlFor="fineRate" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              Günlük Ceza (TL)
            </label>
            <input
              type="number"
              id="fineRate"
              value={newRate}
              onChange={(e) => setNewRate(parseFloat(e.target.value))}
              className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 pl-3 sm:pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
              min="0"
              step="0.25"
            />
            <div className="absolute inset-y-0 right-0 top-7 pr-3 sm:pr-4 flex items-center pointer-events-none">
              <span className="text-gray-500 text-sm sm:text-base font-semibold">TL</span>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-gradient-to-t from-white to-transparent">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm sm:text-base min-h-[44px]"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg disabled:opacity-50 text-sm sm:text-base min-h-[44px]"
          >
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetFineModal;