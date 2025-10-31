import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '../../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { CreditCard, Download, Loader, BookOpen, Settings, Palette, Search, Filter, CheckSquare, Square, Package, BarChart3, Plus, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';

interface User {
  id: string;
  displayName: string;
  studentNumber: string;
  studentClass: string;
  photoURL?: string;
  qrCode?: string;
  cardDelivered?: boolean;
  deliveredAt?: any;
}

interface DecorativeObject {
  id: string;
  type: 'book' | 'star' | 'heart' | 'circle' | 'books' | 'bookmark' | 'pen' | 'graduation' | 'trophy' | 'palette' | 'sparkle-star' | 'moon' | 'sun' | 'rainbow' | 'lightning' | 'sparkles' | 'balloon' | 'confetti' | 'medal' | 'diamond' | 'target';
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
}

interface CardTemplate {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  logoUrl: string;
  schoolName: string;
  showLogo: boolean;
  showPhoto: boolean;
  fontFamily: 'helvetica' | 'times' | 'courier';
  cardSize: 'standard' | 'large';
  decorativeObjects: DecorativeObject[];
}

const LibraryCardsTab: React.FC = () => {
  const { campusId } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState<CardTemplate>({
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    textColor: '#ffffff',
    logoUrl: 'https://r.resimlink.com/BJq8au6HpG.png',
    schoolName: 'Okul Kütüphanesi',
    showLogo: true,
    showPhoto: true,
    fontFamily: 'helvetica',
    cardSize: 'standard',
    decorativeObjects: []
  });
  const [draggedObject, setDraggedObject] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    loadTemplate();
  }, [campusId]);

  const loadTemplate = async () => {
    try {
      const templateDoc = await getDoc(doc(db, 'cardTemplates', campusId));
      if (templateDoc.exists()) {
        const data = templateDoc.data() as CardTemplate;
        setTemplate({ ...data, decorativeObjects: data.decorativeObjects || [] });
      }
    } catch (error) {
      console.log('Şablon yüklenemedi, varsayılan kullanılıyor');
    }
  };

  const saveTemplate = async () => {
    try {
      await setDoc(doc(db, 'cardTemplates', campusId), template);
      Swal.fire({
        icon: 'success',
        title: 'Başarılı!',
        text: 'Şablon kaydedildi!',
        timer: 2000,
        showConfirmButton: false
      });
      setShowSettings(false);
    } catch (error) {
      console.error('Şablon kaydedilemedi:', error);
      Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: 'Şablon kaydedilemedi'
      });
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('campusId', '==', campusId), where('role', '==', 'user'));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersData);
      setFilteredUsers(usersData);
      
      if (usersData.length > 0) {
        loadUserCard(usersData[0]);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserCard = async (user: User) => {
    try {
      const generateQR = httpsCallable(functions, 'generateLibraryCardQR');
      const result = await generateQR({ userId: user.id }) as any;
      
      const cardDoc = await getDoc(doc(db, 'libraryCards', user.id));
      const cardData = cardDoc.exists() ? cardDoc.data() : {};
      
      setSelectedUser({ 
        ...user, 
        qrCode: result.data.qrCode,
        cardDelivered: cardData.cardDelivered || false,
        deliveredAt: cardData.deliveredAt
      });
    } catch (error) {
      console.error('QR kod oluşturulamadı:', error);
    }
  };

  const toggleCardDelivery = async (userId: string) => {
    try {
      const cardRef = doc(db, 'libraryCards', userId);
      const cardDoc = await getDoc(cardRef);
      const currentStatus = cardDoc.exists() ? cardDoc.data()?.cardDelivered : false;
      
      await setDoc(cardRef, {
        userId,
        cardDelivered: !currentStatus,
        deliveredAt: !currentStatus ? serverTimestamp() : null,
        generatedAt: cardDoc.exists() ? cardDoc.data()?.generatedAt : serverTimestamp()
      }, { merge: true });
      
      setUsers(users.map(u => 
        u.id === userId ? { ...u, cardDelivered: !currentStatus } : u
      ));
      setFilteredUsers(filteredUsers.map(u => 
        u.id === userId ? { ...u, cardDelivered: !currentStatus } : u
      ));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, cardDelivered: !currentStatus });
      }
    } catch (error) {
      console.error('Kart durumu güncellenemedi:', error);
    }
  };

  useEffect(() => {
    let filtered = users;
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.studentNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedClass !== 'all') {
      filtered = filtered.filter(user => user.studentClass === selectedClass);
    }
    
    setFilteredUsers(filtered);
  }, [searchTerm, selectedClass, users]);

  const uniqueClasses = Array.from(new Set(users.map(u => u.studentClass))).sort();

  const toggleUserSelection = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const addDecorativeObject = (type: DecorativeObject['type']) => {
    const newObj: DecorativeObject = {
      id: Date.now().toString(),
      type,
      x: 50,
      y: 50,
      size: 30,
      color: '#ffffff',
      rotation: 0
    };
    setTemplate({ ...template, decorativeObjects: [...(template.decorativeObjects || []), newObj] });
  };

  const removeDecorativeObject = (id: string) => {
    setTemplate({ ...template, decorativeObjects: (template.decorativeObjects || []).filter(obj => obj.id !== id) });
  };

  const updateObjectPosition = (id: string, x: number, y: number) => {
    setTemplate({
      ...template,
      decorativeObjects: (template.decorativeObjects || []).map(obj =>
        obj.id === id ? { ...obj, x, y } : obj
      )
    });
  };

  const generatePNG = async () => {
    setGenerating(true);
    try {
      const usersToGenerate = selectedUserIds.size > 0 
        ? filteredUsers.filter(u => selectedUserIds.has(u.id))
        : filteredUsers;

      for (const user of usersToGenerate) {
        const cardElement = document.getElementById(`card-${user.id}`);
        if (cardElement) {
          const canvas = await html2canvas(cardElement, { scale: 2 });
          const link = document.createElement('a');
          link.download = `${user.displayName}-kutuphane-karti.png`;
          link.href = canvas.toDataURL();
          link.click();
        }
      }
    } catch (error) {
      console.error('PNG oluşturulamadı:', error);
      Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: 'PNG oluşturulurken hata oluştu'
      });
    } finally {
      setGenerating(false);
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const generateQR = httpsCallable(functions, 'generateLibraryCardQR');
      const pdf = new jsPDF();
      
      let logoData: string | null = null;
      if (template.showLogo && template.logoUrl) {
        try {
          const logoBlob = await fetch(template.logoUrl).then(r => r.blob());
          logoData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
          });
        } catch (e) {
          console.log('Logo yüklenemedi');
        }
      }
      
      const cardWidth = template.cardSize === 'standard' ? 85.6 : 90;
      const cardHeight = template.cardSize === 'standard' ? 54 : 60;
      const margin = 10;
      const cardsPerRow = 2;
      const cardsPerCol = 4;
      const cardsPerPage = cardsPerRow * cardsPerCol;

      const usersToGenerate = selectedUserIds.size > 0 
        ? filteredUsers.filter(u => selectedUserIds.has(u.id))
        : filteredUsers;

      for (let i = 0; i < usersToGenerate.length; i++) {
        const user = usersToGenerate[i];
        const result = await generateQR({ userId: user.id }) as any;
        const { qrCode, userName, studentNumber, studentClass } = result.data;

        if (i > 0 && i % cardsPerPage === 0) {
          pdf.addPage();
        }

        const cardIndex = i % cardsPerPage;
        const row = Math.floor(cardIndex / cardsPerRow);
        const col = cardIndex % cardsPerRow;
        const x = margin + col * (cardWidth + 5);
        const y = margin + row * (cardHeight + 5);

        const primaryRgb = hexToRgb(template.primaryColor);
        pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
        
        const secondaryRgb = hexToRgb(template.secondaryColor);
        pdf.setFillColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
        pdf.roundedRect(x, y, cardWidth, 12, 3, 3, 'F');

        pdf.setFont(template.fontFamily);

        if (logoData) {
          pdf.setFillColor(255, 255, 255);
          pdf.circle(x + 8, y + 6, 3, 'F');
          pdf.addImage(logoData, 'PNG', x + 5, y + 3, 6, 6);
        }

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.text('KUTUPHANE KARTI', x + cardWidth / 2, y + 8, { align: 'center' });

        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x + 5, y + 16, 32, 32, 2, 2, 'F');
        pdf.addImage(qrCode, 'PNG', x + 6, y + 17, 30, 30);

        if (template.showPhoto && user.photoURL) {
          try {
            const photoBlob = await fetch(user.photoURL).then(r => r.blob());
            const photoData = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(photoBlob);
            });
            pdf.setFillColor(255, 255, 255);
            pdf.circle(x + cardWidth - 10, y + 22, 6, 'F');
            pdf.addImage(photoData, 'JPEG', x + cardWidth - 16, y + 16, 12, 12);
            pdf.setDrawColor(255, 255, 255);
            pdf.setLineWidth(0.5);
            pdf.circle(x + cardWidth - 10, y + 22, 6, 'S');
          } catch (e) {
            console.log('Profil fotoğrafı yüklenemedi:', user.displayName);
          }
        }

        const turkishToAscii = (text: string) => {
          const map: { [key: string]: string } = {
            'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
            'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
          };
          return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => map[char] || char);
        };
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.text(turkishToAscii(userName), x + 42, y + 22);
        pdf.setFontSize(8);
        pdf.text(`No: ${studentNumber}`, x + 42, y + 30);
        pdf.text(`Sinif: ${turkishToAscii(studentClass)}`, x + 42, y + 36);
        
        pdf.setFontSize(6);
        pdf.text(turkishToAscii(template.schoolName), x + 42, y + 46);
      }

      pdf.save('kutuphane-kartlari.pdf');
    } catch (error) {
      console.error('PDF oluşturulamadı:', error);
      Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: 'PDF oluşturulurken hata oluştu'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <CreditCard className="w-6 h-6 text-indigo-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-800">Kütüphane Kartları</h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center px-4 py-3 bg-gray-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                <Settings className="w-5 h-5 mr-2" />
                Şablon Ayarları
              </button>
              <button
                onClick={() => {
                  if (template.decorativeObjects?.length > 0) {
                    generatePNG();
                  } else {
                    generatePDF();
                  }
                }}
                disabled={generating || users.length === 0}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 transition-all font-semibold"
              >
                {generating ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : template.decorativeObjects?.length > 0 ? <ImageIcon className="w-5 h-5 mr-2" /> : <Download className="w-5 h-5 mr-2" />}
                {generating ? 'Oluşturuluyor...' : selectedUserIds.size > 0 ? `Seçili ${selectedUserIds.size} Kartı İndir` : template.decorativeObjects?.length > 0 ? 'Kartları PNG İndir' : 'Tüm Kartları PDF İndir'}
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
              <div className="flex items-center mb-4">
                <Palette className="w-5 h-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-bold text-gray-800">Kart Şablonu Özelleştirme</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ana Renk</label>
                  <input
                    type="color"
                    value={template.primaryColor}
                    onChange={(e) => setTemplate({ ...template, primaryColor: e.target.value })}
                    className="w-full h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">İkincil Renk</label>
                  <input
                    type="color"
                    value={template.secondaryColor}
                    onChange={(e) => setTemplate({ ...template, secondaryColor: e.target.value })}
                    className="w-full h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Metin Rengi</label>
                  <input
                    type="color"
                    value={template.textColor}
                    onChange={(e) => setTemplate({ ...template, textColor: e.target.value })}
                    className="w-full h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Logo URL</label>
                  <input
                    type="url"
                    value={template.logoUrl}
                    onChange={(e) => setTemplate({ ...template, logoUrl: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Okul Adı</label>
                  <input
                    type="text"
                    value={template.schoolName}
                    onChange={(e) => setTemplate({ ...template, schoolName: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.showLogo}
                      onChange={(e) => setTemplate({ ...template, showLogo: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded mr-2"
                    />
                    <span className="text-sm font-semibold text-gray-700">Logo Göster</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.showPhoto}
                      onChange={(e) => setTemplate({ ...template, showPhoto: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded mr-2"
                    />
                    <span className="text-sm font-semibold text-gray-700">Profil Fotoğrafı Göster</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Font Stili</label>
                  <select
                    value={template.fontFamily}
                    onChange={(e) => setTemplate({ ...template, fontFamily: e.target.value as any })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="helvetica">Modern (Helvetica)</option>
                    <option value="times">Klasik (Times)</option>
                    <option value="courier">Teknik (Courier)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kart Boyutu</label>
                  <select
                    value={template.cardSize}
                    onChange={(e) => setTemplate({ ...template, cardSize: e.target.value as any })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="standard">Standart (85.6 x 54 mm)</option>
                    <option value="large">Büyük (90 x 60 mm)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 border-t-2 border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Sparkles className="w-5 h-5 text-indigo-600 mr-2" />
                    <h4 className="text-lg font-bold text-gray-800">3D Dekoratif Nesneler</h4>
                  </div>
                  {template.decorativeObjects?.length > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">
                      ⚠️ PNG/JPG olarak indirilecek
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-2">Kütüphane Temalı</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => addDecorativeObject('book')} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs font-semibold">📖 Kitap</button>
                      <button onClick={() => addDecorativeObject('books')} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs font-semibold">📚 Kitap Yığını</button>
                      <button onClick={() => addDecorativeObject('bookmark')} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs font-semibold">🔖 Ayraç</button>
                      <button onClick={() => addDecorativeObject('pen')} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs font-semibold">📝 Kalem</button>
                      <button onClick={() => addDecorativeObject('graduation')} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs font-semibold">🎓 Mezuniyet</button>
                      <button onClick={() => addDecorativeObject('trophy')} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs font-semibold">🏆 Kupa</button>
                      <button onClick={() => addDecorativeObject('palette')} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-xs font-semibold">🎨 Palet</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-2">Doğa & Şekiller</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => addDecorativeObject('star')} className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all text-xs font-semibold">⭐ Yıldız</button>
                      <button onClick={() => addDecorativeObject('sparkle-star')} className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all text-xs font-semibold">🌟 Parlayan Yıldız</button>
                      <button onClick={() => addDecorativeObject('moon')} className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all text-xs font-semibold">🌙 Ay</button>
                      <button onClick={() => addDecorativeObject('sun')} className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all text-xs font-semibold">☀️ Güneş</button>
                      <button onClick={() => addDecorativeObject('rainbow')} className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all text-xs font-semibold">🌈 Gökkuşağı</button>
                      <button onClick={() => addDecorativeObject('lightning')} className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all text-xs font-semibold">⚡ Şimşek</button>
                      <button onClick={() => addDecorativeObject('sparkles')} className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all text-xs font-semibold">✨ Parıltı</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-2">Eğlenceli</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => addDecorativeObject('heart')} className="px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-all text-xs font-semibold">❤️ Kalp</button>
                      <button onClick={() => addDecorativeObject('balloon')} className="px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-all text-xs font-semibold">🎈 Balon</button>
                      <button onClick={() => addDecorativeObject('confetti')} className="px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-all text-xs font-semibold">🎉 Konfeti</button>
                      <button onClick={() => addDecorativeObject('medal')} className="px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-all text-xs font-semibold">🏅 Madalya</button>
                      <button onClick={() => addDecorativeObject('diamond')} className="px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-all text-xs font-semibold">💎 Elmas</button>
                      <button onClick={() => addDecorativeObject('target')} className="px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-all text-xs font-semibold">🎯 Hedef</button>
                      <button onClick={() => addDecorativeObject('circle')} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all text-xs font-semibold">🔵 Daire</button>
                    </div>
                  </div>
                </div>
                {template.decorativeObjects?.length > 0 && (
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    {template.decorativeObjects.map(obj => (
                      <div key={obj.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm font-semibold text-gray-700 capitalize">{obj.type}</span>
                        <button onClick={() => removeDecorativeObject(obj.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={saveTemplate}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                >
                  Şablonu Kaydet
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Öğrenci adı veya numarası ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="pl-10 pr-8 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white cursor-pointer"
              >
                <option value="all">Tüm Sınıflar</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">{users.length}</span>
              </div>
              <p className="text-sm font-semibold text-blue-800">Toplam Öğrenci</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">{users.filter(u => u.cardDelivered).length}</span>
              </div>
              <p className="text-sm font-semibold text-green-800">Kart Teslim Edildi</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-orange-600" />
                <span className="text-2xl font-bold text-orange-600">{users.filter(u => !u.cardDelivered).length}</span>
              </div>
              <p className="text-sm font-semibold text-orange-800">Bekleyen Kart</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Filter className="w-5 h-5 text-purple-600" />
                <span className="text-2xl font-bold text-purple-600">{uniqueClasses.length}</span>
              </div>
              <p className="text-sm font-semibold text-purple-800">Toplam Sınıf</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-gray-600 mb-6">
            <div>
              <p className="mb-2">📊 {filteredUsers.length} / {users.length} öğrenci gösteriliyor</p>
              <p className="text-sm text-gray-500">PDF'de her sayfada 8 kart (2x4) düzeninde yazdırılacaktır.</p>
            </div>
            {filteredUsers.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all font-semibold"
              >
                {selectedUserIds.size === filteredUsers.length ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                {selectedUserIds.size === filteredUsers.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
              </button>
            )}
          </div>

          {uniqueClasses.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-indigo-600" />
                Sınıf Bazlı Durum
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {uniqueClasses.map(cls => {
                  const classUsers = users.filter(u => u.studentClass === cls);
                  const delivered = classUsers.filter(u => u.cardDelivered).length;
                  const total = classUsers.length;
                  const percentage = Math.round((delivered / total) * 100);
                  return (
                    <div key={cls} className="bg-white rounded-lg p-3 border-2 border-gray-200">
                      <p className="font-bold text-gray-800 text-sm mb-1">{cls}</p>
                      <p className="text-xs text-gray-600">{delivered}/{total}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div 
                          className={`h-1.5 rounded-full ${percentage === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 sticky top-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
                  Kart Önizleme
                </h3>
                {selectedUser ? (
                  <div className="perspective-1000">
                    <div className="relative w-full aspect-[1.6/1] transform hover:scale-105 transition-transform duration-300" style={{ transformStyle: 'preserve-3d' }}>
                      <div 
                        id={`card-${selectedUser.id}`}
                        className="absolute inset-0 rounded-2xl shadow-2xl p-4" 
                        style={{ background: `linear-gradient(to bottom right, ${template.primaryColor}, ${template.secondaryColor})` }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedObject) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            updateObjectPosition(draggedObject, x, y);
                            setDraggedObject(null);
                          }
                        }}
                      >
                        <div className="rounded-xl p-2 mb-3 flex items-center justify-center gap-2" style={{ background: `linear-gradient(to right, ${template.secondaryColor}, ${template.primaryColor})` }}>
                          {template.showLogo && template.logoUrl && (
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-0.5">
                              <img src={template.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                          )}
                          <h4 className="font-bold text-sm" style={{ color: template.textColor }}>KÜTÜPHANE KARTI</h4>
                        </div>
                        <div className="flex gap-3">
                          <div className="bg-white rounded-xl p-2 flex items-center justify-center">
                            {selectedUser.qrCode ? (
                              <img src={selectedUser.qrCode} alt="QR" className="w-20 h-20" />
                            ) : (
                              <Loader className="w-20 h-20 animate-spin text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1" style={{ color: template.textColor }}>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-sm flex-1">{selectedUser.displayName}</p>
                              {template.showPhoto && selectedUser.photoURL && (
                                <img 
                                  src={selectedUser.photoURL} 
                                  alt="Profil" 
                                  className="w-10 h-10 rounded-full border-2 object-cover"
                                  style={{ borderColor: template.textColor }}
                                />
                              )}
                            </div>
                            <p className="text-xs opacity-90">No: {selectedUser.studentNumber}</p>
                            <p className="text-xs opacity-90">Sınıf: {selectedUser.studentClass}</p>
                            <p className="text-xs opacity-75 mt-2">{template.schoolName}</p>
                          </div>
                        </div>
                        {template.decorativeObjects?.map(obj => {
                          const emojiMap: Record<string, string> = {
                            book: '📖', books: '📚', bookmark: '🔖', pen: '📝',
                            graduation: '🎓', trophy: '🏆', palette: '🎨',
                            star: '⭐', 'sparkle-star': '🌟', moon: '🌙', sun: '☀️',
                            rainbow: '🌈', lightning: '⚡', sparkles: '✨',
                            heart: '❤️', balloon: '🎈', confetti: '🎉',
                            medal: '🏅', diamond: '💎', target: '🎯', circle: '🔵'
                          };
                          return (
                            <div
                              key={obj.id}
                              draggable
                              onDragStart={() => setDraggedObject(obj.id)}
                              className="absolute cursor-move"
                              style={{
                                left: `${obj.x}%`,
                                top: `${obj.y}%`,
                                transform: `translate(-50%, -50%) rotate(${obj.rotation}deg)`,
                                fontSize: `${obj.size}px`,
                                color: obj.color
                              }}
                            >
                              {emojiMap[obj.type]}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">Kart seçin</div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Öğrenci Listesi</h3>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-semibold mb-2">Öğrenci bulunamadı</p>
                    <p className="text-sm">Arama veya filtre kriterlerinizi değiştirin</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                    {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className={`p-4 rounded-xl border-2 transition-all relative ${
                        selectedUser?.id === user.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 bg-white'
                      }`}
                    >
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button
                          onClick={() => toggleCardDelivery(user.id)}
                          className={`${user.cardDelivered ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
                          title={user.cardDelivered ? 'Kart teslim edildi' : 'Kart teslim edilmedi'}
                        >
                          <Package className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => toggleUserSelection(user.id)}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {selectedUserIds.has(user.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                      </div>
                      <button
                        onClick={() => loadUserCard(user)}
                        className="text-left w-full pr-16"
                      >
                        <p className="font-semibold text-gray-800">{user.displayName}</p>
                        <p className="text-sm text-gray-600">No: {user.studentNumber}</p>
                        <p className="text-sm text-gray-600">Sınıf: {user.studentClass}</p>
                        {user.cardDelivered && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Kart teslim edildi
                          </p>
                        )}
                      </button>
                    </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 99, g: 102, b: 241 };
};

export default LibraryCardsTab;
