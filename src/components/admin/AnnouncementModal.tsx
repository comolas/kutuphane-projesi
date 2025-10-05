import React, { useState, useEffect } from 'react';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">{announcement?.id ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Ekle'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Duyuru Başlığı" className="w-full p-2 border rounded" required />
          <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Duyuru Açıklaması" className="w-full p-2 border rounded"></textarea>
          <input type="text" name="coverImage" value={formData.coverImage} onChange={handleChange} placeholder="Kapak Resmi URL" className="w-full p-2 border rounded" />
          <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" />
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">İptal</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementModal;