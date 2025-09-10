import React, { useState, useEffect } from 'react';

interface Survey {
  id?: string;
  coverImage: string;
  date: string;
  description: string;
  status: 'active' | 'inactive';
  surveyUrl: string;
  title: string;
  type: 'survey';
}

interface SurveyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: Survey | null;
  onSubmit: (surveyData: Survey) => void;
}

const SurveyFormModal: React.FC<SurveyFormModalProps> = ({ isOpen, onClose, survey, onSubmit }) => {
  const [formData, setFormData] = useState<Survey>({
    coverImage: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    status: 'active',
    surveyUrl: '',
    title: '',
    type: 'survey',
  });

  useEffect(() => {
    if (survey) {
      setFormData(survey);
    } else {
      setFormData({
        coverImage: '',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        status: 'active',
        surveyUrl: '',
        title: '',
        type: 'survey',
      });
    }
  }, [survey]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
        <h2 className="text-2xl font-bold mb-6">{survey?.id ? 'Anketi Düzenle' : 'Yeni Anket Ekle'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Anket Başlığı" className="w-full p-2 border rounded" required />
          <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Anket Açıklaması" className="w-full p-2 border rounded"></textarea>
          <input type="text" name="coverImage" value={formData.coverImage} onChange={handleChange} placeholder="Kapak Resmi URL" className="w-full p-2 border rounded" />
          <input type="text" name="surveyUrl" value={formData.surveyUrl} onChange={handleChange} placeholder="Anket URL" className="w-full p-2 border rounded" required />
          <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" />
          <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded">
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">İptal</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyFormModal;