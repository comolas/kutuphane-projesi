import React, { useState, useEffect } from 'react';
import { Game } from '../../contexts/GameContext';
import { X, Gamepad2, Image as ImageIcon, FileText, Save, Upload } from 'lucide-react';
import { storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Swal from 'sweetalert2';

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
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Hata!', 'Lütfen sadece JPG veya PNG dosyası yükleyin.', 'error');
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      Swal.fire('Hata!', 'Dosya boyutu 1 MB\'dan küçük olmalıdır.', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `gameImages/${timestamp}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setImageUrl(downloadURL);
      Swal.fire('Başarılı!', 'Görsel başarıyla yüklendi.', 'success');
    } catch (error) {
      console.error('Görsel yükleme hatası:', error);
      Swal.fire('Hata!', 'Görsel yüklenirken bir hata oluştu.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 animate-fadeIn" onClick={onClose}>
      <div className="bg-gradient-to-br from-white to-indigo-50 w-full h-full overflow-y-auto transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 md:p-6 sticky top-0 z-10 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 md:p-3">
                <Gamepad2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-white">{gameToEdit ? 'Oyunu Düzenle' : 'Yeni Oyun Ekle'}</h2>
                <p className="text-xs md:text-sm text-white/80">Oyun bilgilerini girin</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
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

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              Oyun Görseli (İsteğe Bağlı)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 font-medium text-gray-700">
                <Upload className="w-5 h-5 text-indigo-600" />
                {uploadingImage ? 'Yükleniyor...' : 'Görsel Yükle (JPG/PNG, Max 1MB)'}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
              {imageUrl && (
                <img src={imageUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg border-2 border-indigo-200" />
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 p-4 md:p-6 rounded-b-2xl md:rounded-b-3xl border-t border-gray-200 sticky bottom-0">
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <button 
              onClick={onClose} 
              className="w-full sm:flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
            >
              İptal
            </button>
            <button 
              onClick={handleSave} 
              className="w-full sm:flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-semibold flex items-center justify-center gap-2 text-sm min-h-[44px] shadow-md touch-manipulation"
            >
              <Save className="w-4 h-4 md:w-5 md:h-5" />
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameModal;
