import React, { useState } from 'react';
import Papa from 'papaparse';
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Toplu Yazar Ekle</h3>
        <div className="mt-2">
          <p className="text-sm text-gray-500 mb-4">
            Lütfen yazarları toplu olarak eklemek için bir CSV dosyası yükleyin.
            Dosya şu sütunları içermelidir: <code className="font-bold">name</code> (zorunlu), <code className="font-bold">biography</code> (zorunlu), <code className="font-bold">image</code> (zorunlu), <code className="font-bold">tags</code> (virgülle ayrılmış).
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            type="button"
            className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            disabled={loading}
          >
            İptal
          </button>
          <button
            onClick={handleUpload}
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
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