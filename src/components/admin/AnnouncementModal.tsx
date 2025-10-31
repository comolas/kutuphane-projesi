import React, { useState, useEffect } from 'react';
import { X, Megaphone, FileText, Image, Calendar } from 'lucide-react';

interface Announcement {
  id?: string;
  coverImage: string;
  date: string;
  description: string;
  title: string;
  type: 'announcement';
}

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
  onSubmit: (announcementData: Announcement) => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ isOpen, onClose, announcement, onSubmit }) => {
  const [formData, setFormData] = useState<Announcement>({
    coverImage: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    title: '',
    type: 'announcement',
  });

  useEffect(() => {
    if (announcement) {
      setFormData(announcement);
    } else {
      setFormData({
        coverImage: '',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        title: '',
        type: 'announcement',
      });
    }
  }, [announcement]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">{announcement?.id ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Ekle'}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-600" />Duyuru Başlığı</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Duyuru Başlığı" className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all" required />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Duyuru Açıklaması</label>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Duyuru Açıklaması" rows={4} className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all resize-none"></textarea>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Image className="w-4 h-4 text-indigo-600" />Kapak Resmi URL</label>
            <input type="text" name="coverImage" value={formData.coverImage} onChange={handleChange} placeholder="https://example.com/image.png" className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all" />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-600" />Tarih</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} className="block w-full border-2 border-gray-300 rounded-xl shadow-sm py-2 sm:py-2.5 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all" />
          </div>
        </form>
        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-gradient-to-t from-white to-transparent">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center hover:scale-105 shadow-md hover:shadow-lg touch-manipulation">İptal</button>
            <button type="submit" onClick={handleSubmit} className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-md hover:shadow-lg text-sm min-h-[44px] flex items-center justify-center hover:scale-105 touch-manipulation">Kaydet</button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;