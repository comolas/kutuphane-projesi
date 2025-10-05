import React, { useState, useEffect } from 'react';
import { X, User as UserIcon } from 'lucide-react';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  studentClass: string;
  studentNumber: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLogin: Date;
  photoURL?: string;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Kullanıcı Düzenle</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Photo Section */}
            <div className="md:col-span-1 flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">Profil Fotoğrafı</label>
              <div className="relative">
                {editableUser.photoURL ? (
                  <img src={editableUser.photoURL} alt="Profil" className="w-32 h-32 rounded-full object-cover" onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/128'}/>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Fields Section */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                  <label htmlFor="photoURL" className="block text-sm font-medium text-gray-700">Fotoğraf URL</label>
                  <input
                  type="text"
                  id="photoURL"
                  name="photoURL"
                  value={editableUser.photoURL || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://example.com/image.png"
                  />
              </div>
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Ad Soyad</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={editableUser.displayName || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-posta</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={editableUser.email || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100"
                  readOnly
                />
              </div>
              <div>
                <label htmlFor="studentClass" className="block text-sm font-medium text-gray-700">Sınıf</label>
                <input
                  type="text"
                  id="studentClass"
                  name="studentClass"
                  value={editableUser.studentClass || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="studentNumber" className="block text-sm font-medium text-gray-700">Öğrenci No</label>
                <input
                  type="text"
                  id="studentNumber"
                  name="studentNumber"
                  value={editableUser.studentNumber || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Rol</label>
                <select
                  id="role"
                  name="role"
                  value={editableUser.role || 'user'}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="user">Kullanıcı</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
