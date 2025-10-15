import React, { useState, useEffect } from 'react';
import { Magazine } from '../../types';
import { useMagazines } from '../../contexts/MagazineContext';
import { X, BookOpen, Image, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

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
        Swal.fire('Başarılı!', 'Dergi başarıyla güncellendi.', 'success');
      } else {
        // Add new magazine
        if (coverImageUrl && pdfUrl) {
          await addMagazine(magazineData);
          Swal.fire('Başarılı!', 'Dergi başarıyla eklendi.', 'success');
        } else {
          Swal.fire('Hata!', 'Lütfen kapak resmi ve PDF dosyası için URL girin.', 'error');
        }
      }
      onClose();
    } catch (error) {
      console.error('Error saving magazine:', error);
      Swal.fire('Hata!', 'Dergi kaydedilirken bir hata oluştu.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">{magazine ? 'Dergi Düzenle' : 'Yeni Dergi Ekle'}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Başlık</label>
              <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all" />
            </div>
            <div>
              <label htmlFor="issue" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Sayı</label>
              <input type="text" id="issue" value={issue} onChange={e => setIssue(e.target.value)} required className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all" />
            </div>
            <div>
              <label htmlFor="tags" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Etiketler (virgülle ayırın)</label>
              <input type="text" id="tags" value={tags} onChange={e => setTags(e.target.value)} className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all" />
            </div>
            <div>
              <label htmlFor="coverImage" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Image className="w-4 h-4 text-indigo-600" />Kapak Resmi URL</label>
              <input type="url" id="coverImage" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} required className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all" placeholder="https://example.com/image.png" />
            </div>
            <div>
              <label htmlFor="pdfFile" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-600" />PDF Dosyası URL</label>
              <input type="url" id="pdfFile" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} required className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all" placeholder="https://example.com/document.pdf" />
            </div>
        </form>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-gradient-to-t from-white to-transparent">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm sm:text-base min-h-[44px]">İptal</button>
            <button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg disabled:opacity-50 text-sm sm:text-base min-h-[44px]">
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default MagazineModal;