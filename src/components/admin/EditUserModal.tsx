import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Hash, GraduationCap, Shield } from 'lucide-react';

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

  useEffect(() => {
    if (user) {
      setEditableUser({ ...user });
    }
  }, [user]);

  if (!isOpen || !editableUser) return null;

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
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col transform transition-all duration-300 animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 rounded-t-2xl sm:rounded-t-3xl flex-shrink-0">
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
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 flex-shrink-0">
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
                <label htmlFor="photoURL" className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-indigo-600" />
                  Fotoğraf URL
                </label>
                <input
                  type="text"
                  id="photoURL"
                  name="photoURL"
                  value={editableUser.photoURL || ''}
                  onChange={handleChange}
                  className="block w-full border-2 border-gray-200 rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                  placeholder="https://example.com/image.png"
                />
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
              className="px-4 sm:px-6 py-2 sm:py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold text-sm sm:text-base touch-manipulation min-h-[44px]"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-sm sm:text-base touch-manipulation min-h-[44px]"
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
