import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBooks } from '../../../contexts/BookContext';
import { Mail, Search, Filter, BookOpen, User, Clock, Check, X, CheckSquare, Square, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesPerPage = 10;

  const fetchReturnMessages = useCallback(async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
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

  const stats = useMemo(() => {
    const totalPending = allMessages.length;
    const todayMessages = allMessages.filter(m => {
      const today = new Date();
      const msgDate = new Date(m.createdAt);
      return msgDate.toDateString() === today.toDateString();
    }).length;
    const borrowRequests = allMessages.filter(m => m.type === 'borrow').length;
    const returnRequests = allMessages.filter(m => m.type === 'return').length;
    return { totalPending, todayMessages, borrowRequests, returnRequests };
  }, [allMessages]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Talepler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="mb-8 animate-fadeIn">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl mr-3">
              <Mail className="w-7 h-7 text-white" />
            </div>
            Gönderilen Talepler
          </h2>
          <p className="text-gray-600 text-lg">Ödünç alma ve iade taleplerini yönetin.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8 animate-fadeIn">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Bekleyen</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.totalPending}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Mail className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Bugün Gelen</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.todayMessages}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Clock className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">Ödünç Talepleri</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.borrowRequests}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <BookOpen className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-white/90">İade Talepleri</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.returnRequests}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
              <Calendar className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Filter Button (Mobile) */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        <Filter className="w-6 h-6" />
      </button>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 animate-fadeIn">
        {/* Sidebar Filters */}
        <aside className={`fixed lg:sticky top-0 left-0 h-full lg:h-auto w-80 lg:w-80 bg-white/90 backdrop-blur-xl lg:rounded-xl sm:lg:rounded-2xl shadow-lg p-4 sm:p-6 z-50 transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } lg:flex-shrink-0 border border-white/20 lg:top-6`}>
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Filtreler</h3>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4 sm:space-y-6">
              {/* Search */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Arama</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Kullanıcı, kitap ara..."
                    value={messagesSearchQuery}
                    onChange={(e) => setMessagesSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">Talep Türü</label>
                <div className="space-y-1 sm:space-y-2">
                  {[{ value: 'all', label: 'Tümü', count: stats.totalPending }, 
                    { value: 'borrow', label: 'Ödünç Alma', count: stats.borrowRequests },
                    { value: 'return', label: 'İade', count: stats.returnRequests }].map(type => (
                    <label key={type.value} className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors touch-manipulation">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="type"
                          value={type.value}
                          checked={messageTypeFilter === type.value}
                          onChange={(e) => setMessageTypeFilter(e.target.value as any)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-xs sm:text-sm font-medium text-gray-700">{type.label}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500">{type.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Items Per Page */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">Sayfa Başına</label>
                <select
                  value={messagesPerPage}
                  onChange={(e) => { setMessagesCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium"
                >
                  <option value={10}>10 talep</option>
                  <option value={20}>20 talep</option>
                  <option value={50}>50 talep</option>
                </select>
              </div>
            </div>
        </aside>

        {/* Messages Content */}
        <div className="flex-1">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Talepler ({filteredMessages.length})
                </h3>
                {selectedMessages.length > 0 && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                    {selectedMessages.length} seçili
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Sayfa {messagesCurrentPage} / {messagesTotalPages || 1}
              </p>
            </div>

            {/* Bulk Actions */}
            {currentReturnableMessages.length > 0 && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-2 border-indigo-300 rounded-lg hover:bg-indigo-50 transition-all font-semibold text-xs sm:text-sm text-gray-700 min-h-[40px] touch-manipulation w-full sm:w-auto justify-center"
                    >
                      {selectedMessages.length === currentReturnableMessages.length ? (
                        <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      )}
                      {selectedMessages.length === currentReturnableMessages.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                    </button>
                    <span className="text-xs sm:text-sm text-gray-600">
                      {selectedMessages.length} / {currentReturnableMessages.length} iade talebi seçildi
                    </span>
                  </div>
                  
                  {selectedMessages.length > 0 && (
                    <button
                      onClick={handleBulkApproveReturn}
                      disabled={isBulkProcessing}
                      className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm disabled:opacity-50 min-h-[40px] touch-manipulation"
                    >
                      <Check className="w-4 h-4" />
                      {isBulkProcessing ? 'İşleniyor...' : 'Toplu Onayla'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {paginatedMessages.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Talep bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedMessages.map(message => (
                  <div key={`${message.type}-${message.id}`} className={`bg-gradient-to-r from-white to-indigo-50/30 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-2 ${
                    selectedMessages.includes(message.id) ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent hover:border-indigo-200'
                  }`}>
                    <div className="flex gap-6">
                      {/* Checkbox */}
                      {message.type === 'return' && (
                        <div className="flex items-start pt-2">
                          <button
                            onClick={() => handleSelectMessage(message.id)}
                            className="p-1 hover:bg-indigo-100 rounded transition-colors"
                          >
                            {selectedMessages.includes(message.id) ? (
                              <CheckSquare className="w-6 h-6 text-indigo-600" />
                            ) : (
                              <Square className="w-6 h-6 text-gray-400" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Book Cover */}
                      <div className="flex-shrink-0 hidden sm:block">
                        <img
                          src={message.bookData.coverImage || 'https://via.placeholder.com/96x128'}
                          alt={message.bookData.title}
                          className="w-20 h-28 sm:w-24 sm:h-32 object-cover rounded-lg shadow-md"
                          onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/96x128'; }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
                              <h4 className="text-base sm:text-lg font-bold text-gray-900 truncate">{message.userData.displayName}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                message.type === 'borrow' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {message.type === 'borrow' ? 'Ödünç Alma' : 'İade'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 mb-2 p-2 bg-indigo-50 rounded-lg">
                              <BookOpen className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-900 break-words">{message.bookData.title}</p>
                                <p className="text-xs text-gray-600 break-all">Kod: {message.bookId}</p>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600 flex-shrink-0" />
                                <span className="truncate">{message.userData.studentClass} - {message.userData.studentNumber}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600 flex-shrink-0" />
                                <span className="truncate">{new Date(message.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                              </div>
                              {message.type === 'return' && message.bookData.borrowedAt && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600 flex-shrink-0" />
                                  <span className="truncate">Ödünç: {new Date(message.bookData.borrowedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          {message.type === 'borrow' ? (
                            <>
                              <button
                                onClick={() => handleApproveBorrow(message.bookId, message.userId)}
                                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm min-h-[40px] touch-manipulation"
                              >
                                <Check className="w-4 h-4" />
                                Onayla
                              </button>
                              <button
                                onClick={() => handleRejectBorrow(message.bookId, message.userId)}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm min-h-[40px] touch-manipulation"
                              >
                                <X className="w-4 h-4" />
                                Reddet
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleApproveReturn(message as ReturnMessage)}
                              disabled={selectedMessages.length > 0}
                              className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] touch-manipulation"
                            >
                              <Check className="w-4 h-4" />
                              İade Al
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Pagination */}
            {messagesTotalPages > 1 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{filteredMessages.length}</span> sonuçtan <span className="font-medium">{(messagesCurrentPage - 1) * messagesPerPage + 1}</span> - <span className="font-medium">{Math.min(messagesCurrentPage * messagesPerPage, filteredMessages.length)}</span> arası gösteriliyor
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setMessagesCurrentPage(1)}
                    disabled={messagesCurrentPage === 1}
                    className="px-3 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm"
                  >
                    «İlk
                  </button>
                  <button
                    onClick={() => setMessagesCurrentPage(p => Math.max(1, p - 1))}
                    disabled={messagesCurrentPage === 1}
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Önceki
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, messagesTotalPages) }, (_, i) => {
                      let pageNum;
                      if (messagesTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (messagesCurrentPage <= 3) {
                        pageNum = i + 1;
                      } else if (messagesCurrentPage >= messagesTotalPages - 2) {
                        pageNum = messagesTotalPages - 4 + i;
                      } else {
                        pageNum = messagesCurrentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setMessagesCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${
                            messagesCurrentPage === pageNum
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                              : 'bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setMessagesCurrentPage(p => Math.min(messagesTotalPages, p + 1))}
                    disabled={messagesCurrentPage === messagesTotalPages}
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold"
                  >
                    Sonraki
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setMessagesCurrentPage(messagesTotalPages)}
                    disabled={messagesCurrentPage === messagesTotalPages}
                    className="px-3 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm"
                  >
                    Son»
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesTab;
