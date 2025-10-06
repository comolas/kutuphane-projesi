import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const categories = [
  'Kitap İncelemesi',
  'Film İncelemesi',
  'Şiir İncelemesi',
  'Resim İncelemesi',
  'Hikâye',
  'Deneme',
  'Şiir',
];

const CreatePostPage: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [tags, setTags] = useState('');
  const [sources, setSources] = useState('');
  const [coverImageURL, setCoverImageURL] = useState('');
  const [areCommentsEnabled, setAreCommentsEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Yazı göndermek için giriş yapmalısınız.');
      return;
    }
    if (!title.trim() || !content.trim() || !coverImageURL.trim()) {
      setError('Başlık, içerik ve kapak resmi URL\'si alanları zorunludur.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const postData = {
        title,
        content,
        excerpt: content.replace(/<[^>]*>/g, '').substring(0, 150) + '...',
        coverImageURL,
        authorId: user.uid,
        authorName: userData?.displayName || user.displayName || user.email?.split('@')[0] || 'Anonim',
        authorPhotoURL: user.photoURL || 'https://via.placeholder.com/150',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending', // Default status
        category,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        sources: sources,
        areCommentsEnabled,
        likes: [],
      };

      await addDoc(collection(db, 'posts'), postData);
      
      setIsSubmitting(false);
      navigate('/blog'); // Redirect to blog page after submission

    } catch (err) {
      console.error("Error submitting post:", err);
      setError('Yazı gönderilirken bir hata oluştu.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Yeni Yazı Oluştur</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Başlık</label>
          <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600" />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">İçerik</label>
          <ReactQuill 
            theme="snow" 
            value={content} 
            onChange={setContent}
            modules={{
              toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'font': [] }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image'],
                ['clean']
              ]
            }}
            className="bg-white dark:bg-gray-700 rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">Zengin metin editörü ile yazınızı biçimlendirebilirsiniz.</p>
        </div>

        <div>
          <label htmlFor="coverImageURL" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kapak Resmi URL'si</label>
          <input 
            type="url" 
            id="coverImageURL" 
            value={coverImageURL} 
            onChange={(e) => setCoverImageURL(e.target.value)} 
            placeholder="https://example.com/image.jpg"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kategori</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Etiketler (Virgülle ayırın)</label>
            <input type="text" id="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600" />
          </div>
        </div>

        <div>
          <label htmlFor="sources" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kaynaklar</label>
          <ReactQuill 
            theme="snow" 
            value={sources} 
            onChange={setSources}
            modules={{
              toolbar: [
                ['bold', 'italic', 'underline'],
                ['link'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
              ]
            }}
            className="bg-white dark:bg-gray-700 rounded-md"
          />
        </div>

        <div className="flex items-center">
          <input type="checkbox" id="areCommentsEnabled" checked={areCommentsEnabled} onChange={(e) => setAreCommentsEnabled(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          <label htmlFor="areCommentsEnabled" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Yorumlara izin ver</label>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div>
          <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
            {isSubmitting ? 'Gönderiliyor...' : 'Onaya Gönder'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;
