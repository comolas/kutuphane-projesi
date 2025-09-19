import React, { useState, useEffect } from 'react';
import { Magazine } from '../../types';
import { useMagazines } from '../../contexts/MagazineContext';
import { X } from 'lucide-react';

interface MagazineModalProps {
  isOpen: boolean;
  onClose: () => void;
  magazine: Magazine | null;
}

const MagazineModal: React.FC<MagazineModalProps> = ({ isOpen, onClose, magazine }) => {
  const { addMagazine, updateMagazine } = useMagazines();
  const [title, setTitle] = useState('');
  const [issue, setIssue] = useState('');
  const [tags, setTags] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (magazine) {
      setTitle(magazine.title);
      setIssue(magazine.issue);
      setTags(magazine.tags?.join(', ') || '');
      setCoverImageUrl(magazine.coverImageUrl || '');
      setPdfUrl(magazine.pdfUrl || '');
    } else {
      setTitle('');
      setIssue('');
      setTags('');
      setCoverImageUrl('');
      setPdfUrl('');
    }
  }, [magazine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const magazineData = { 
        title, 
        issue, 
        tags: tags.split(',').map(t => t.trim()),
        coverImageUrl,
        pdfUrl 
      };

      if (magazine) {
        // Update existing magazine
        await updateMagazine({ ...magazine, ...magazineData });
        alert('Dergi başarıyla güncellendi.');
      } else {
        // Add new magazine
        if (coverImageUrl && pdfUrl) {
          await addMagazine(magazineData);
          alert('Dergi başarıyla eklendi.');
        } else {
          alert('Lütfen kapak resmi ve PDF dosyası için URL girin.');
        }
      }
      onClose();
    } catch (error) {
      console.error('Error saving magazine:', error);
      alert('Dergi kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{magazine ? 'Dergi Düzenle' : 'Yeni Dergi Ekle'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Başlık</label>
              <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="issue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sayı</label>
              <input type="text" id="issue" value={issue} onChange={e => setIssue(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Etiketler (virgülle ayırın)</label>
              <input type="text" id="tags" value={tags} onChange={e => setTags(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kapak Resmi URL</label>
              <input type="url" id="coverImage" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} required className="mt-1 block w-full" placeholder="https://example.com/image.png" />
            </div>
            <div>
              <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">PDF Dosyası URL</label>
              <input type="url" id="pdfFile" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} required className="mt-1 block w-full" placeholder="https://example.com/document.pdf" />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">İptal</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MagazineModal;
