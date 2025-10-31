import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Hash, GraduationCap, Shield, Upload } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';
import Swal from 'sweetalert2';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  studentClass: string;
  studentNumber: string;
  role: 'user' | 'admin' | 'teacher';
  createdAt: Date;
  lastLogin: Date;
  photoURL?: string;
  teacherData?: {
    assignedClass: string;
    subject?: string;
  };
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
  onSave: (user: UserData) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSave }) => {
  const [editableUser, setEditableUser] = useState<UserData | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setEditableUser({ ...user });
    }
  }, [user]);

  if (!isOpen || !editableUser) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya tipi kontrolü
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      Swal.fire('Hata!', 'Sadece JPG ve PNG dosyaları yüklenebilir.', 'error');
      return;
    }

    // Dosya boyutu kontrolü (1MB)
    if (file.size > 1024 * 1024) {
      Swal.fire('Hata!', 'Dosya boyutu 1MB\'dan küçük olmalıdır.', 'error');
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `users/${editableUser.uid}/profile.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setEditableUser(prev => prev ? { ...prev, photoURL: downloadURL } : null);
      Swal.fire('Başarılı!', 'Fotoğraf yüklendi.', 'success');
    } catch (error) {
      console.error('Fotoğraf yükleme hatası:', error);
      Swal.fire('Hata!', 'Fotoğraf yüklenirken bir hata oluştu.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditableUser(prev => {
      if (!prev) return null;
      
      // Handle teacher data fields
      if (name === 'assignedClass' || name === 'subject') {
        return {
          ...prev,
          teacherData: {
            ...prev.teacherData,
            assignedClass: name === 'assignedClass' ? value : (prev.teacherData?.assignedClass || ''),
            subject: name === 'subject' ? value : prev.teacherData?.subject
          }
        };
      }
      
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editableUser) {
      onSave(editableUser);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 animate-fadeIn" onClick={onClose}>
      <div className="bg-gradient-to-br from-white to-indigo-50 w-full h-full overflow-y-auto flex flex-col transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3">
                <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-white">Kullanıcı Düzenle</h3>
                <p className="text-xs sm:text-sm text-white/80">Kullanıcı bilgilerini güncelleyin</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Photo Section */}
            <div className="md:col-span-1 flex flex-col items-center">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-3">Profil Fotoğrafı</label>
              <div className="relative group">
                {editableUser.photoURL ? (
                  <img src={editableUser.photoURL} alt="Profil" className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-indigo-100 shadow-lg group-hover:ring-indigo-200 transition-all" onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/128'}/>
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center ring-4 ring-indigo-100 shadow-lg">
                    <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Fields Section */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  Profil Fotoğrafı Yükle
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">JPG veya PNG, maksimum 1MB</p>
              </div>
              <div>
                <label htmlFor="displayName" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-indigo-600" />
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={editableUser.displayName || ''}
                  onChange={handleChange}
                  className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  E-posta
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={editableUser.email || ''}
                  onChange={handleChange}
                  className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 bg-gray-50 text-gray-500 cursor-not-allowed text-sm sm:text-base"
                  readOnly
                />
              </div>
              <div>
                <label htmlFor="studentClass" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Sınıf
                </label>
                <input
                  type="text"
                  id="studentClass"
                  name="studentClass"
                  value={editableUser.studentClass || ''}
                  onChange={handleChange}
                  className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                />
              </div>
              <div>
                <label htmlFor="studentNumber" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-indigo-600" />
                  Öğrenci No
                </label>
                <input
                  type="text"
                  id="studentNumber"
                  name="studentNumber"
                  value={editableUser.studentNumber || ''}
                  onChange={handleChange}
                  className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="role" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={editableUser.role || 'user'}
                  onChange={handleChange}
                  className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base font-medium"
                  required
                >
                  <option value="user">Kullanıcı</option>
                  <option value="teacher">Öğretmen</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              {/* Teacher-specific fields */}
              {editableUser.role === 'teacher' && (
                <>
                  <div>
                    <label htmlFor="assignedClass" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-orange-600" />
                      Sorumlu Sınıf <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="assignedClass"
                      name="assignedClass"
                      value={editableUser.teacherData?.assignedClass || ''}
                      onChange={handleChange}
                      className="block w-full border-2 border-orange-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-sm sm:text-base"
                      placeholder="Örn: 9A, 10B"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-orange-600" />
                      Branş (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={editableUser.teacherData?.subject || ''}
                      onChange={handleChange}
                      className="block w-full border-2 border-orange-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-sm sm:text-base"
                      placeholder="Örn: Edebiyat, Matematik"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Info Message for Teacher */}
          {editableUser.role === 'teacher' && (
            <div className="mt-4 p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-500 rounded-r-xl shadow-sm">
              <p className="text-xs sm:text-sm text-orange-800 font-medium">
                <strong>Not:</strong> Öğretmen rolü seçildiğinde, kullanıcı öğretmen paneline yönlendirilecek ve atanan sınıfın öğrencilerini görüntüleyebilecektir.
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 touch-manipulation"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-sm min-h-[44px] flex items-center justify-center shadow-md hover:scale-105 touch-manipulation"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
