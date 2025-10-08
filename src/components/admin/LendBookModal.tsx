import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Book } from '../../types';

interface UserData {
  uid: string;
  displayName: string;
  studentClass: string;
  studentNumber: string;
  role: string;
}

interface LendBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLend: (userId: string) => void;
  users: UserData[];
  book: Book | null;
}

const LendBookModal: React.FC<LendBookModalProps> = ({ isOpen, onClose, onLend, users, book }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 6;

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.studentNumber.includes(searchTerm)
  );

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleLend = () => {
    if (selectedUser) {
      onLend(selectedUser);
      onClose(); // Close the modal after lending
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-8xl w-full border border-white/20">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Kullanıcı Seç</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        {book && (
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <img 
                src={book.coverImage} 
                alt={book.title} 
                className="w-16 h-24 object-cover rounded-lg shadow-md"
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/64x96'; }}
              />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{book.title}</h4>
                <p className="text-sm text-gray-600">{book.author}</p>
                <p className="text-xs text-gray-500 mt-1">Kod: {book.id}</p>
              </div>
            </div>
          </div>
        )}
        <div className="p-6">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numara</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.map((user) => (
                  <tr key={user.uid} onClick={() => setSelectedUser(user.uid)} className={`cursor-pointer ${selectedUser === user.uid ? 'bg-indigo-100' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="radio" name="selectedUser" checked={selectedUser === user.uid} readOnly />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.displayName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.studentClass}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.studentNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{filteredUsers.length}</span> kullanıcıdan <span className="font-medium">{indexOfFirstUser + 1}</span> - <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> arası gösteriliyor.
              </p>
            </div>
            <div className="flex items-center">
              {Array.from({ length: Math.ceil(filteredUsers.length / usersPerPage) }, (_, i) => (
                <button key={i} onClick={() => paginate(i + 1)} className={`px-3 py-1 mx-1 rounded-md text-sm font-medium ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button onClick={handleLend} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50" disabled={!selectedUser}>
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

export default LendBookModal;