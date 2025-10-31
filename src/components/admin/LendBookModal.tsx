import React, { useState, useEffect } from 'react';
import { X, Search, Users } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0">
      <div className="bg-gradient-to-br from-white to-indigo-50 w-full h-full overflow-y-auto flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Kullanıcı Seç</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        {book && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
            <div className="flex items-center gap-3 sm:gap-4">
              <img 
                src={book.coverImage} 
                alt={book.title} 
                className="w-14 h-20 sm:w-16 sm:h-24 object-cover rounded-xl shadow-lg ring-2 ring-white"
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/64x96'; }}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">{book.title}</h4>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{book.author}</p>
                <p className="text-xs text-gray-500 mt-1">Kod: {book.id}</p>
              </div>
            </div>
          </div>
        )}
        <div className="p-4 sm:p-6 overflow-y-auto">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
            />
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          </div>
          <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-indigo-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"></th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ad Soyad</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Sınıf</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Numara</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.map((user) => (
                  <tr key={user.uid} onClick={() => setSelectedUser(user.uid)} className={`cursor-pointer transition-colors ${selectedUser === user.uid ? 'bg-gradient-to-r from-indigo-100 to-purple-100' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <input type="radio" name="selectedUser" checked={selectedUser === user.uid} readOnly className="w-4 h-4 text-indigo-600" />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900">{user.displayName}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden sm:table-cell">{user.studentClass}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">{user.studentNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
            <div>
              <p className="text-xs sm:text-sm text-gray-700">
                <span className="font-bold">{filteredUsers.length}</span> kullanıcıdan <span className="font-bold">{indexOfFirstUser + 1}</span> - <span className="font-bold">{Math.min(indexOfLastUser, filteredUsers.length)}</span> arası gösteriliyor.
              </p>
            </div>
            <div className="flex items-center flex-wrap gap-1 sm:gap-2">
              {Array.from({ length: Math.ceil(filteredUsers.length / usersPerPage) }, (_, i) => (
                <button key={i} onClick={() => paginate(i + 1)} className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation ${currentPage === i + 1 ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg' : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-indigo-300 shadow-md hover:shadow-lg hover:scale-105'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end bg-gradient-to-t from-white to-transparent">
          <button onClick={handleLend} className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm shadow-md hover:shadow-lg min-h-[44px] flex items-center justify-center hover:scale-105 touch-manipulation" disabled={!selectedUser}>
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

export default LendBookModal;