import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Comment } from '../../types';
import { useAlert } from '../../contexts/AlertContext';

interface CommentSectionProps {
  postId: string;
  areCommentsEnabled: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, areCommentsEnabled }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const commentsData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Comment))
        .filter(comment => comment.status !== 'hidden');
      setComments(commentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      await addDoc(commentsRef, {
        text: newComment,
        authorId: user.uid,
        authorName: user.displayName || 'Anonim',
        authorPhotoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        status: 'visible',
      });
      setNewComment('');
      showAlert('Başarılı', 'Yorumunuz başarıyla eklendi.', 'success');
    } catch (error) {
      console.error("Error adding comment: ", error);
      showAlert('Hata', 'Yorum eklenirken bir hata oluştu.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportComment = async (commentId: string) => {
    if (!user) {
      showAlert('Uyarı', 'Yorumu bildirmek için giriş yapmalısınız.', 'warning');
      return;
    }
    if (window.confirm('Bu yorumu uygunsuz olarak bildirmek istediğinizden emin misiniz?')) {
      try {
        const commentRef = doc(db, 'posts', postId, 'comments', commentId);
        await updateDoc(commentRef, { status: 'reported' });
        showAlert('Başarılı', 'Yorum başarıyla yöneticiye bildirildi.', 'success');
      } catch (error) {
        console.error("Error reporting comment: ", error);
        showAlert('Hata', 'Yorum bildirilirken bir hata oluştu.', 'error');
      }
    }
  };

  const visibleComments = comments.filter(c => c.status !== 'hidden');

  return (
    <div className="mt-10 pt-6 border-t dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-4">Yorumlar ({visibleComments.length})</h2>
      {areCommentsEnabled && user && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Yorumunuzu yazın..."
            className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600"
            rows={3}
          />
          <button type="submit" disabled={submitting} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md disabled:bg-indigo-400">
            {submitting ? 'Gönderiliyor...' : 'Yorum Yap'}
          </button>
        </form>
      )}
      {!areCommentsEnabled && <p className="text-gray-500 mb-6">Bu yazı için yorum yapma özelliği devre dışı bırakılmıştır.</p>}
      {!user && areCommentsEnabled && <p className="text-gray-500 mb-6">Yorum yapmak için lütfen <a href="#/login" className="text-indigo-500">giriş yapın</a>.</p>}

      {loading ? (
        <p>Yorumlar yükleniyor...</p>
      ) : (
        <div className="space-y-4">
          {visibleComments.map(comment => (
            <div key={comment.id} className="flex items-start space-x-3 group">
              <img src={comment.authorPhotoURL} alt={comment.authorName} className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-semibold">{comment.authorName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{new Date(comment.createdAt?.toDate()).toLocaleString('tr-TR')}</p>
                    </div>
                    {user && user.uid !== comment.authorId && (
                        <div>
                            {comment.status === 'reported' ? (
                                <span className="text-xs text-yellow-500">Bildirildi</span>
                            ) : (
                                <button 
                                    onClick={() => handleReportComment(comment.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-500 hover:text-red-700"
                                >
                                    Bildir
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <p className="mt-1">{comment.text}</p>
                {user && user.uid !== comment.authorId && comment.status !== 'reported' && (
                  <button
                    onClick={() => handleReportComment(comment.id)}
                    className="mt-2 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600"
                  >
                    Bildir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
