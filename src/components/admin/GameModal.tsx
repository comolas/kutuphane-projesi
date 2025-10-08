import React, { useState, useEffect } from 'react';
import { Game } from '../../contexts/GameContext';
import { X, Gamepad2, Image as ImageIcon, FileText, Save } from 'lucide-react';

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (game: Omit<Game, 'id'>) => void;
  gameToEdit?: Game;
}

const GameModal: React.FC<GameModalProps> = ({ isOpen, onClose, onSave, gameToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (gameToEdit) {
      setName(gameToEdit.name);
      setDescription(gameToEdit.description);
      setImageUrl(gameToEdit.imageUrl || '');
    } else {
      setName('');
      setDescription('');
      setImageUrl('');
    }
  }, [gameToEdit, isOpen]);

  const handleSave = () => {
    if (!name) {
      alert('Oyun adı zorunludur.');
      return;
    }
    onSave({ name, description, imageUrl });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-3xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 animate-slideUp" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{gameToEdit ? 'Oyunu Düzenle' : 'Yeni Oyun Ekle'}</h2>
                <p className="text-sm text-white/80">Oyun bilgilerini girin</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Game Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-indigo-600" />
              Oyun Adı *
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Örn: Catan, Monopoly, Uno"
              className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Açıklama
            </label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={4}
              placeholder="Oyun hakkında kısa bir açıklama yazın..."
              className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium resize-none"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              Resim URL (İsteğe Bağlı)
            </label>
            <input 
              type="text" 
              value={imageUrl} 
              onChange={(e) => setImageUrl(e.target.value)} 
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm font-medium"
            />
            {imageUrl && (
              <div className="mt-3 p-3 bg-indigo-50 rounded-xl border-2 border-indigo-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Önizleme:</p>
                <div className="w-full h-48 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg overflow-hidden">
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="text-gray-400 text-sm">Resim yüklenemedi</span></div>';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 p-6 rounded-b-3xl border-t border-gray-200">
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200 font-semibold"
            >
              İptal
            </button>
            <button 
              onClick={handleSave} 
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameModal;
