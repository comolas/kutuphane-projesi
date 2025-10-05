import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBooks } from '../../../contexts/BookContext';
import { Mail, Search } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { ReturnMessage } from '../../../types';
import Swal from 'sweetalert2';

const MessagesTab: React.FC = () => {
  const { borrowMessages, approveBorrow, rejectBorrow, approveReturn } = useBooks();
  const [returnMessages, setReturnMessages] = useState<ReturnMessage[]>([]);
  const [messagesSearchQuery, setMessagesSearchQuery] = useState('');
  const [messageTypeFilter, setMessageTypeFilter] = useState<'all' | 'borrow' | 'return'>('all');
  const [messagesCurrentPage, setMessagesCurrentPage] = useState(1);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const messagesPerPage = 10;

  const fetchReturnMessages = useCallback(async () => {
    try {
      const messagesRef = collection(db, 'returnMessages');
      const q = query(messagesRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const messages: ReturnMessage[] = [];
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          bookData: {
            ...data.bookData,
            borrowedAt: data.bookData.borrowedAt.toDate(),
            dueDate: data.bookData.dueDate.toDate()
          }
        } as ReturnMessage);
      });
      
      setReturnMessages(messages);
    } catch (error) {
      console.error('Error fetching return messages:', error);
      Swal.fire('Hata!', 'İade mesajları getirilirken bir hata oluştu.', 'error');
    }
  }, []);

  useEffect(() => {
    fetchReturnMessages();
  }, [fetchReturnMessages]);

  useEffect(() => {
    setMessagesCurrentPage(1);
    setSelectedMessages([]);
  }, [messagesSearchQuery, messageTypeFilter]);

  const handleApproveReturn = async (message: ReturnMessage) => {
    const bookTitle = message.bookData.title;
    const userName = message.userData.displayName;
    Swal.fire({
      title: 'Emin misiniz?',
      text: `"${userName}" adlı kullanıcının "${bookTitle}" adlı kitabını iade olarak işaretlemek istediğinizden emin misiniz?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet, onayla!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await approveReturn(message.bookId, message.userId);
          fetchReturnMessages();
          Swal.fire('Başarılı!', 'İade başarıyla onaylandı.', 'success');
        } catch (error) {
          console.error('Error approving return:', error);
          Swal.fire('Hata!', 'İade onayı sırasında bir hata oluştu.', 'error');
        }
      }
    });
  };

  const handleApproveBorrow = async (bookId: string, userId: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu ödünç alma talebini onaylamak istediğinizden emin misiniz?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet, onayla!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await approveBorrow(bookId, userId);
          Swal.fire('Başarılı!', 'Ödünç alma talebi başarıyla onaylandı.', 'success');
        } catch (error) {
          console.error('Error approving borrow:', error);
          Swal.fire('Hata!', 'Ödünç alma onayı sırasında bir hata oluştu.', 'error');
        }
      }
    });
  };

  const handleRejectBorrow = async (bookId: string, userId: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu ödünç alma talebini reddetmek istediğinizden emin misiniz?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet, reddet!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await rejectBorrow(bookId, userId);
          Swal.fire('Başarılı!', 'Ödünç alma talebi başarıyla reddedildi.', 'success');
        } catch (error) {
          console.error('Error rejecting borrow:', error);
          Swal.fire('Hata!', 'Ödünç alma reddi sırasında bir hata oluştu.', 'error');
        }
      }
    });
  };

  const allMessages = useMemo(() => [
    ...borrowMessages.map(m => ({ ...m, type: 'borrow' as const })),
    ...returnMessages.map(m => ({ ...m, type: 'return' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [borrowMessages, returnMessages]);

  const filteredMessages = useMemo(() => allMessages.filter(message => {
    const searchLower = messagesSearchQuery.toLowerCase();
    const matchesSearch = 
      (message.userData?.displayName?.toLowerCase().includes(searchLower) ||
      message.userData?.studentNumber?.toLowerCase().includes(searchLower) ||
      message.bookData?.title?.toLowerCase().includes(searchLower));

    const matchesType = messageTypeFilter === 'all' || message.type === messageTypeFilter;

    return matchesSearch && matchesType;
  }), [allMessages, messagesSearchQuery, messageTypeFilter]);

  const messagesTotalPages = Math.ceil(filteredMessages.length / messagesPerPage);
  const paginatedMessages = useMemo(() => filteredMessages.slice(
    (messagesCurrentPage - 1) * messagesPerPage,
    messagesCurrentPage * messagesPerPage
  ), [filteredMessages, messagesCurrentPage]);

  const currentReturnableMessages = useMemo(() => 
    paginatedMessages.filter(m => m.type === 'return').map(m => m.id)
  , [paginatedMessages]);

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) ? prev.filter(id => id !== messageId) : [...prev, messageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === currentReturnableMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(currentReturnableMessages);
    }
  };

  const handleBulkApproveReturn = async () => {
    if (selectedMessages.length === 0) return;

    Swal.fire({
      title: 'Emin misiniz?',
      text: `${selectedMessages.length} adet iade talebini onaylamak istediğinizden emin misiniz?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet, onayla!',
      cancelButtonText: 'Vazgeç'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsBulkProcessing(true);
        try {
          const promises = selectedMessages.map(messageId => {
            const message = returnMessages.find(m => m.id === messageId);
            if (message) {
              return approveReturn(message.bookId, message.userId);
            }
            return Promise.resolve();
          });
          await Promise.all(promises);
          Swal.fire('Başarılı!', `${selectedMessages.length} iade talebi başarıyla onaylandı.`, 'success');
          setSelectedMessages([]);
          fetchReturnMessages();
        } catch (error) {
          console.error("Error bulk approving returns:", error);
          Swal.fire('Hata!', "Toplu iade onayı sırasında bir hata oluştu.", 'error');
        } finally {
          setIsBulkProcessing(false);
        }
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Mail className="w-6 h-6 mr-2 text-indigo-600" />
            Mesajlar
          </h2>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Kullanıcı, kitap adı..."
                value={messagesSearchQuery}
                onChange={(e) => setMessagesSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
            <select
              value={messageTypeFilter}
              onChange={(e) => setMessageTypeFilter(e.target.value as 'all' | 'borrow' | 'return')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">Tüm Talepler</option>
              <option value="borrow">Ödünç Alma</option>
              <option value="return">İade</option>
            </select>
          </div>
        </div>
        {selectedMessages.length > 0 && (
          <div className="p-4 bg-indigo-50 border-t border-b border-indigo-200 flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-700">
              {selectedMessages.length} iade talebi seçildi.
            </span>
            <button
              onClick={handleBulkApproveReturn}
              disabled={isBulkProcessing}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              {isBulkProcessing ? 'İşleniyor...' : 'Seçilenleri Onayla'}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                {messageTypeFilter !== 'borrow' && currentReturnableMessages.length > 0 && (
                  <input 
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    checked={selectedMessages.length === currentReturnableMessages.length && currentReturnableMessages.length > 0}
                    onChange={handleSelectAll}
                  />
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Bilgileri</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talep Türü</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Bilgileri</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talep Tarihi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedMessages.length > 0 ? (
              paginatedMessages.map(message => (
                <tr key={`${message.type}-${message.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {message.type === 'return' && (
                      <input 
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        checked={selectedMessages.includes(message.id)}
                        onChange={() => handleSelectMessage(message.id)}
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{message.userData.displayName}</div>
                    <div className="text-sm text-gray-500">{message.userData.studentClass} - {message.userData.studentNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {message.type === 'borrow' ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Ödünç Alma Talebi</span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">İade Talebi</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{message.bookData.title}</div>
                    <div className="text-sm text-gray-500">Kod: {message.bookId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(message.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {message.type === 'borrow' ? (
                      <>
                        <button
                          onClick={() => handleApproveBorrow(message.bookId, message.userId)}
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => handleRejectBorrow(message.bookId, message.userId)}
                          className="px-3 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-xs"
                        >
                          Reddet
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleApproveReturn(message as ReturnMessage)}
                        disabled={selectedMessages.length > 0}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-xs disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        İade Al
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Aranan kriterlere uygun mesaj bulunamadı.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {messagesTotalPages > 1 && (
        <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-600">Sayfa {messagesCurrentPage} / {messagesTotalPages} ({filteredMessages.length} sonuç)</p>
          <div className="flex space-x-2">
            <button
              onClick={() => setMessagesCurrentPage(p => Math.max(p - 1, 1))}
              disabled={messagesCurrentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Önceki
            </button>
            <button
              onClick={() => setMessagesCurrentPage(p => Math.min(p + 1, messagesTotalPages))}
              disabled={messagesCurrentPage === messagesTotalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesTab;
