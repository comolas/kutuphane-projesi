import React, { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Swal from 'sweetalert2';

interface BulkAddQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuotesAdded: () => void;
}

const BulkAddQuoteModal: React.FC<BulkAddQuoteModalProps> = ({ isOpen, onClose, onQuotesAdded }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCsvFile(event.target.files[0]);
    } else {
      setCsvFile(null);
    }
  };

  const handleUpload = async () => {
    if (!csvFile) {
      Swal.fire('Hata!', 'Lütfen bir CSV dosyası seçin.', 'error');
      return;
    }

    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines
      const quotesToAdd = [];

      // Assuming CSV format: "text","author","book"
      // Skip header row if present, or adjust logic based on actual CSV structure
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.match(/(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^,\\"]*))/g); // Regex to handle quoted commas

        if (!parts || parts.length < 3) {
          Swal.fire('Hata!', `Satır ${i + 1} geçersiz formatta. Her satırda en az 3 alan (metin, yazar, kitap) olmalıdır.`, 'error');
          setLoading(false);
          return;
        }

        const text = parts[0] ? parts[0].replace(/^\"|\"$/g, '').replace(/\"\"/g, '"').trim() : '';
        const author = parts[1] ? parts[1].replace(/^\"|\"$/g, '').replace(/\"\"/g, '"').trim() : '';
        const book = parts[2] ? parts[2].replace(/^\"|\"$/g, '').replace(/\"\"/g, '"').trim() : '';

        if (!text || !author || !book) {
          Swal.fire('Hata!', `Satır ${i + 1} eksik bilgi içeriyor (metin, yazar veya kitap boş).`, 'error');
          setLoading(false);
          return;
        }
        quotesToAdd.push({ text, author, book });
      }

      try {
        const quotesCollectionRef = collection(db, 'quotes');
        for (const quote of quotesToAdd) {
          await addDoc(quotesCollectionRef, quote);
        }
        Swal.fire('Başarılı!', `${quotesToAdd.length} alıntı başarıyla eklendi!`, 'success');
        setCsvFile(null);
        onQuotesAdded(); // Notify parent to refetch quotes
        onClose();
      } catch (err) {
        console.error('Alıntıları toplu eklerken hata:', err);
        Swal.fire('Hata!', 'Alıntıları eklerken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      Swal.fire('Hata!', 'Dosya okunamadı.', 'error');
      setLoading(false);
    };

    reader.readAsText(csvFile);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Toplu Alıntı Ekle</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-xl mb-4">
            <p className="text-xs sm:text-sm text-gray-700 font-medium mb-2">
              Lütfen alıntıları içeren bir CSV dosyası yükleyin. Dosya formatı:
            </p>
            <code className="block bg-white/80 p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-mono border border-indigo-200">"Alıntı Metni","Yazar Adı","Kitap Adı"</code>
            <p className="text-xs text-gray-600 mt-2">
              Her satır bir alıntı olmalı. Metin içinde virgül varsa çift tırnak kullanın.
            </p>
          </div>
          <div className="border-2 border-dashed border-indigo-300 rounded-xl p-4 sm:p-6 bg-gradient-to-br from-indigo-50 to-purple-50 hover:border-indigo-400 transition-all">
            <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-500 mx-auto mb-3" />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-xs sm:text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-gradient-to-r file:from-indigo-600 file:to-purple-600 file:text-white hover:file:from-indigo-700 hover:file:to-purple-700 file:transition-all file:cursor-pointer"
            />
            {csvFile && (
              <p className="text-xs sm:text-sm text-green-700 font-semibold mt-2 text-center">✓ {csvFile.name}</p>
            )}
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-gradient-to-t from-white to-transparent">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm sm:text-base min-h-[44px]"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleUpload}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg disabled:opacity-50 text-sm sm:text-base min-h-[44px]"
              disabled={!csvFile || loading}
            >
              {loading ? 'Yükleniyor...' : 'Alıntıları Ekle'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default BulkAddQuoteModal;