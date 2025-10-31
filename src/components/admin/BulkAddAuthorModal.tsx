import React, { useState } from 'react';
import Papa from 'papaparse';
import { X, Upload, Users } from 'lucide-react';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase/config'; // Adjust path as needed

interface BulkAddAuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CsvAuthor {
  name: string;
  biography: string;
  image: string;
  tags?: string;
}

const BulkAddAuthorModal: React.FC<BulkAddAuthorModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setMessage('');
      setError('');
    }
  };

  const handleUpload = () => {
    if (!file) {
      setError('Lütfen bir CSV dosyası seçin.');
      return;
    }

    setLoading(true);
    setMessage('CSV dosyası işleniyor...');
    setError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const authorsToAdd: Omit<CsvAuthor, 'tags'> & { tags?: string[] }[] = [];
        const existingAuthorNames: Set<string> = new Set();
        let processedRows = 0;
        let skippedRows = 0;

        setMessage('Yazarlar veritabanına ekleniyor...');

        // Fetch existing author names to prevent duplicates
        try {
          const authorsCollection = collection(db, 'authors');
          const authorSnapshot = await getDocs(authorsCollection);
          authorSnapshot.docs.forEach(doc => {
            existingAuthorNames.add(doc.data().name);
          });
        } catch (dbError) {
          console.error('Mevcut yazarlar çekilirken hata:', dbError);
          setError('Mevcut yazarlar kontrol edilirken bir hata oluştu.');
          setLoading(false);
          return;
        }

        const batch = writeBatch(db);
        const authorsCollectionRef = collection(db, 'authors');

        for (const row of results.data as CsvAuthor[]) {
          processedRows++;
          const { name, biography, image, tags } = row;

          if (!name || !biography || !image) {
            skippedRows++;
            console.warn(`Satır atlandı (eksik veri): ${JSON.stringify(row)}`);
            continue;
          }

          if (existingAuthorNames.has(name)) {
            skippedRows++;
            console.warn(`Satır atlandı (mevcut yazar): ${name}`);
            continue;
          }

          const newAuthor = {
            name,
            biography,
            image,
            featured: false, // Default to not featured
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          };
          authorsToAdd.push(newAuthor);

          // Create a new document reference with an auto-generated ID for the batch
          const newAuthorRef = doc(authorsCollectionRef);
          batch.set(newAuthorRef, newAuthor);
        }

        try {
          await batch.commit(); // Commit the batch
          setMessage(`${authorsToAdd.length} yazar başarıyla eklendi. ${skippedRows} satır atlandı.`);
          onSuccess(); // Refresh author list
          setFile(null);
        } catch (dbError) {
          console.error('Yazarlar toplu eklenirken hata:', dbError);
          setError('Yazarlar eklenirken bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setError(`CSV ayrıştırma hatası: ${err.message}`);
        setLoading(false);
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center p-2 sm:p-4">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Toplu Yazar Ekle</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-xl mb-4">
            <p className="text-xs sm:text-sm text-gray-700 font-medium mb-2">
              Lütfen yazarları toplu olarak eklemek için bir CSV dosyası yükleyin.
            </p>
            <p className="text-xs text-gray-600">
              Dosya sütunları: <code className="font-bold bg-white px-1 rounded">name</code>, <code className="font-bold bg-white px-1 rounded">biography</code>, <code className="font-bold bg-white px-1 rounded">image</code>, <code className="font-bold bg-white px-1 rounded">tags</code> (virgülle ayrılmış)
            </p>
          </div>
          <div className="border-2 border-dashed border-indigo-300 rounded-xl p-4 sm:p-6 bg-gradient-to-br from-indigo-50 to-purple-50 hover:border-indigo-400 transition-all">
            <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-500 mx-auto mb-3" />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-xs sm:text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-gradient-to-r file:from-indigo-600 file:to-purple-600 file:text-white hover:file:from-indigo-700 hover:file:to-purple-700 file:transition-all file:cursor-pointer"
            />
            {file && (
              <p className="text-xs sm:text-sm text-green-700 font-semibold mt-2 text-center">✓ {file.name}</p>
            )}
          </div>
          {message && <p className="mt-3 text-xs sm:text-sm text-green-700 font-semibold bg-green-50 p-2 rounded-lg">{message}</p>}
          {error && <p className="mt-3 text-xs sm:text-sm text-red-700 font-semibold bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-gradient-to-t from-white to-transparent">
          <button
            onClick={onClose}
            type="button"
            className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 touch-manipulation"
            disabled={loading}
          >
            İptal
          </button>
          <button
            onClick={handleUpload}
            type="button"
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 text-sm min-h-[44px] flex items-center justify-center hover:scale-105 touch-manipulation"
            disabled={loading || !file}
          >
            {loading ? 'Yükleniyor...' : 'Yükle'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkAddAuthorModal;