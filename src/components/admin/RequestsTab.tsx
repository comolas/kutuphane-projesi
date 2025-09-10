import React, { useState } from 'react';
import { useRequests } from '../../contexts/RequestContext';
import { MessageSquare } from 'lucide-react';

const RequestsTab: React.FC = () => {
  const { requests, loading, sendResponse, updateRequestStatus } = useRequests();
  const [requestSortBy, setRequestSortBy] = useState<'createdAt' | 'priority'>('createdAt');
  const [requestSortOrder, setRequestSortOrder] = useState<'asc' | 'desc'>('desc');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const [requestPriorityFilter, setRequestPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [responseText, setResponseText] = useState('');

  const handleSendResponse = async () => {
    if (!selectedRequest || !responseText.trim()) return;
    await sendResponse(selectedRequest.id, responseText);
    setSelectedRequest(null);
    setResponseText('');
  };

  const filteredRequests = requests
    .filter(request => {
      const matchesSearch = 
        request.title.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        request.content.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        request.userData?.displayName?.toLowerCase().includes(requestSearchQuery.toLowerCase());

      const matchesStatus = requestStatusFilter === 'all' || request.status === requestStatusFilter;
      const matchesPriority = requestPriorityFilter === 'all' || request.priority === requestPriorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      if (requestSortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityA = priorityOrder[a.priority];
        const priorityB = priorityOrder[b.priority];
        return requestSortOrder === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      } else {
        return requestSortOrder === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <MessageSquare className="w-6 h-6 mr-2 text-indigo-600" />
          Gönderilen Talepler
        </h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Talep, içerik veya kullanıcı ara..."
              value={requestSearchQuery}
              onChange={(e) => setRequestSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={requestStatusFilter}
            onChange={(e) => setRequestStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="pending">Bekliyor</option>
            <option value="in-progress">İşleniyor</option>
            <option value="completed">Tamamlandı</option>
          </select>
          <select
            value={requestPriorityFilter}
            onChange={(e) => setRequestPriorityFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">Tüm Öncelikler</option>
            <option value="low">Düşük</option>
            <option value="medium">Orta</option>
            <option value="high">Yüksek</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talep</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gönderen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => { setRequestSortBy('createdAt'); setRequestSortOrder(requestSortOrder === 'asc' ? 'desc' : 'asc'); }}>Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => { setRequestSortBy('priority'); setRequestSortOrder(requestSortOrder === 'asc' ? 'desc' : 'asc'); }}>Öncelik</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <React.Fragment key={request.id}>
                  <tr onClick={() => setExpandedRequestId(expandedRequestId === request.id ? null : request.id)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.userData?.displayName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.createdAt.toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.priority === 'high' ? 'bg-red-100 text-red-800' : 
                        request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {request.priority === 'high' ? 'Yüksek' : request.priority === 'medium' ? 'Orta' : 'Düşük'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        request.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status === 'completed' ? 'Tamamlandı' : request.status === 'in-progress' ? 'İşleniyor' : 'Bekliyor'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); }}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Yanıtla
                      </button>
                      {request.status === 'pending' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateRequestStatus(request.id, 'in-progress'); }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          İşleme Al
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedRequestId === request.id && (
                    <tr>
                      <td colSpan={6} className="p-6 bg-gray-50">
                        <div className="text-sm text-gray-700 mb-4">{request.content}</div>
                        {request.response && (
                          <div className="mt-4 bg-white rounded-lg p-4 border">
                            <div className="font-medium text-gray-900">Yanıt:</div>
                            <div className="mt-2 text-gray-700">{request.response}</div>
                            <div className="mt-2 text-sm text-gray-500">{request.responseDate?.toLocaleDateString()}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Talebi Yanıtla</h3>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <div className="font-medium text-gray-900">{selectedRequest.title}</div>
                <div className="mt-2 text-gray-700">{selectedRequest.content}</div>
              </div>
              
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Yanıtınızı yazın..."
                className="w-full h-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setResponseText('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                onClick={handleSendResponse}
                disabled={!responseText.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Yanıtı Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsTab;