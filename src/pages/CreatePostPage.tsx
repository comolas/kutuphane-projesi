import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Swal from 'sweetalert2';
import { Image, Type, FileText, Clock } from 'lucide-react';

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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [titleCharCount, setTitleCharCount] = useState(0);
  const [contentWordCount, setContentWordCount] = useState(0);
  const [contentCharCount, setContentCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);

  // Update image preview
  useEffect(() => {
    if (coverImageURL.trim()) {
      setImagePreview(coverImageURL);
      setImageError(false);
    } else {
      setImagePreview(null);
      setImageError(false);
    }
  }, [coverImageURL]);

  // Update title character count
  useEffect(() => {
    setTitleCharCount(title.length);
  }, [title]);

  // Update content stats
  useEffect(() => {
    const plainText = content.replace(/<[^>]*>/g, '');
    const words = plainText.trim().split(/\s+/).filter(word => word.length > 0);
    setContentWordCount(words.length);
    setContentCharCount(plainText.length);
    setReadingTime(Math.ceil(words.length / 200));
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      Swal.fire({
        icon: 'error',
        title: 'Giriş Gerekli',
        text: 'Yazı göndermek için giriş yapmalısınız.',
        confirmButtonColor: '#4F46E5'
      });
      return;
    }
    if (!title.trim() || !content.trim() || !coverImageURL.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Eksik Bilgi',
        text: 'Başlık, içerik ve kapak resmi URL\'si alanları zorunludur.',
        confirmButtonColor: '#4F46E5'
      });
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
        status: 'pending',
        category,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        sources: sources,
        areCommentsEnabled,
        likes: [],
      };

      await addDoc(collection(db, 'posts'), postData);
      
      setIsSubmitting(false);
      
      Swal.fire({
        icon: 'success',
        title: 'Başarılı!',
        text: 'Yazınız onay için gönderildi. Admin onayından sonra yayınlanacaktır.',
        confirmButtonColor: '#4F46E5',
        timer: 3000
      }).then(() => {
        navigate('/blog');
      });

    } catch (err) {
      console.error("Error submitting post:", err);
      setIsSubmitting(false);
      Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: 'Yazı gönderilirken bir hata oluştu. Lütfen tekrar deneyin.',
        confirmButtonColor: '#4F46E5'
      });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Yeni Yazı Oluştur</h1>
        <p className="text-gray-600 dark:text-gray-400">Yazınızı oluşturun ve onay için gönderin</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-4 rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <Type size={18} />
            <span className="text-sm opacity-90">Başlık</span>
          </div>
          <p className="text-2xl font-bold">{titleCharCount}</p>
          <p className="text-xs opacity-75">karakter</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={18} />
            <span className="text-sm opacity-90">Kelime</span>
          </div>
          <p className="text-2xl font-bold">{contentWordCount}</p>
          <p className="text-xs opacity-75">kelime</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white p-4 rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={18} />
            <span className="text-sm opacity-90">Karakter</span>
          </div>
          <p className="text-2xl font-bold">{contentCharCount}</p>
          <p className="text-xs opacity-75">karakter</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={18} />
            <span className="text-sm opacity-90">Okuma</span>
          </div>
          <p className="text-2xl font-bold">{readingTime}</p>
          <p className="text-xs opacity-75">dakika</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Başlık
            <span className="ml-2 text-xs text-gray-500">({titleCharCount} karakter)</span>
          </label>
          <input 
            type="text" 
            id="title" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Yazınızın başlığını girin..."
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 p-3 transition-all" 
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            İçerik
            <span className="ml-2 text-xs text-gray-500">({contentWordCount} kelime, {contentCharCount} karakter)</span>
          </label>
          <ReactQuill 
            theme="snow" 
            value={content} 
            onChange={setContent}
            modules={{
              toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'font': ['serif', 'times-new-roman', 'garamond', 'sans-serif', 'monospace'] }],
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
          <label htmlFor="coverImageURL" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Kapak Resmi URL'si
          </label>
          <input 
            type="url" 
            id="coverImageURL" 
            value={coverImageURL} 
            onChange={(e) => setCoverImageURL(e.target.value)} 
            placeholder="https://example.com/image.jpg"
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 p-3 transition-all" 
          />
          
          {/* Image Preview */}
          {imagePreview && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Image size={16} />
                Önizleme
              </p>
              <div className="relative rounded-lg overflow-hidden shadow-lg border-2 border-gray-200 dark:border-gray-700">
                {!imageError ? (
                  <img 
                    src={imagePreview} 
                    alt="Kapak resmi önizleme" 
                    className="w-full h-64 object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <div className="text-center">
                      <Image size={48} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">Resim yüklenemedi</p>
                      <p className="text-xs text-gray-400">URL'yi kontrol edin</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategori</label>
            <select 
              id="category" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 p-3 transition-all"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Etiketler (Virgülle ayırın)</label>
            <input 
              type="text" 
              id="tags" 
              value={tags} 
              onChange={(e) => setTags(e.target.value)} 
              placeholder="örnek: kitap, roman, edebiyat"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 p-3 transition-all" 
            />
          </div>
        </div>

        <div>
          <label htmlFor="sources" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kaynaklar</label>
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

        <div>
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-transparent rounded-lg shadow-lg text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02]"
          >
            {isSubmitting ? (
              <>
                <div className="relative w-5 h-5">
                  <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <span>Gönderiliyor...</span>
              </>
            ) : (
              'Onaya Gönder'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;
