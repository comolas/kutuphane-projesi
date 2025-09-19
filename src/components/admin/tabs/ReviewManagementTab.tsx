import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from "../../../firebase/config";
import { Review } from '../../types';
import { Check, X, Trash2, AlertCircle } from 'lucide-react';

const ReviewManagementTab: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'reviews'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const fetchedReviews = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setReviews(fetchedReviews);
    } catch (err) {
      console.error("Error fetching reviews: ", err);
      setError("Yorumlar yüklenirken bir hata oluştu.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleUpdateStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
    const reviewRef = doc(db, 'reviews', reviewId);
    try {
      if (status === 'rejected') {
        await deleteDoc(reviewRef);
        setReviews(prev => prev.filter(r => r.id !== reviewId));
      } else {
        await updateDoc(reviewRef, { status });
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status } : r));
      }
    } catch (err) {
      console.error("Error updating review status: ", err);
      alert("Yorum durumu güncellenirken bir hata oluştu.");
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm("Bu yorumu kalıcı olarak silmek istediğinizden emin misiniz?")) return;
    const reviewRef = doc(db, 'reviews', reviewId);
    try {
      await deleteDoc(reviewRef);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (err) {
      console.error("Error deleting review: ", err);
      alert("Yorum silinirken bir hata oluştu.");
    }
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => r.status === activeTab);
  }, [reviews, activeTab]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Yorum Yönetimi</h2>

      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'pending'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Onay Bekleyenler
            <span className="ml-2 bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs">
              {reviews.filter(r => r.status === 'pending').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'approved'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Onaylanmış Yorumlar
          </button>
        </nav>
      </div>

      {loading && <p>Yorumlar yükleniyor...</p>}
      {error && <p className="text-red-500">{error}</p>}
      
      {!loading && !error && (
        <div className="overflow-x-auto">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {activeTab === 'pending' ? 'Onay bekleyen yorum bulunmuyor' : 'Onaylanmış yorum bulunmuyor'}
                </h3>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yorum</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puan</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eylemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReviews.map(review => (
                  <tr key={review.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{review.userDisplayName}</td>
                    <td className="px-6 py-4 max-w-sm">
                        <p className="text-sm text-gray-700 truncate hover:whitespace-normal">{review.reviewText}</p>
                        <p className="text-xs text-gray-500 mt-1">Kitap ID: {review.bookId}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.rating} / 5</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.createdAt?.toDate().toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {activeTab === 'pending' && (
                        <>
                          <button onClick={() => handleUpdateStatus(review.id, 'approved')} className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-100">
                            <Check className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleUpdateStatus(review.id, 'rejected')} className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100">
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {activeTab === 'approved' && (
                        <button onClick={() => handleDelete(review.id)} className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewManagementTab;
