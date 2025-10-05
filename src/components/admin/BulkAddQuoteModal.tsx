import React, { useState } from 'react';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Toplu Alıntı Ekle (CSV)</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Lütfen alıntıları içeren bir CSV dosyası yükleyin. Dosya formatı şu şekilde olmalıdır:
            <code className="block bg-gray-100 p-2 rounded mt-2">"Alıntı Metni","Yazar Adı","Kitap Adı"</code>
            Her satır bir alıntı olmalı ve alanlar virgülle ayrılmalıdır. Metin içinde virgül varsa çift tırnak içine alınmalıdır.
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleUpload}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              disabled={!csvFile || loading}
            >
              {loading ? 'Yükleniyor...' : 'Alıntıları Ekle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAddQuoteModal;