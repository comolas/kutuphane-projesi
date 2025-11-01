import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions, storage } from '../../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { CreditCard, Download, Loader, BookOpen, Settings, Palette, Search, Filter, CheckSquare, Square, Package, BarChart3, Plus, Trash2, Image as ImageIcon, Sparkles, ChevronLeft, ChevronRight, ZoomIn, RotateCw, Undo, Redo, Save, Eye, TrendingUp, Users, Award } from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);
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
  role?: string;
}

interface QRCodeCache {
  qrCode: string;
  timestamp: number;
}

interface DecorativeObject {
  id: string;
  type: 'book' | 'star' | 'heart' | 'circle' | 'books' | 'bookmark' | 'pen' | 'graduation' | 'trophy' | 'palette' | 'sparkle-star' | 'moon' | 'sun' | 'rainbow' | 'lightning' | 'sparkles' | 'balloon' | 'confetti' | 'medal' | 'diamond' | 'target';
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  opacity: number;
  locked: boolean;
  zIndex: number;
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
  qrSize?: 'small' | 'medium' | 'large';
  qrPosition?: 'left' | 'center' | 'right';
  photoSize?: 'small' | 'medium' | 'large';
  photoPosition?: 'top-left' | 'top-right' | 'bottom-right';
  textAlign?: 'left' | 'center' | 'right';
  cardPadding?: number;
  backgroundImage?: string;
  backgroundOpacity?: number;
  fontSize?: number;
  fontWeight?: 'light' | 'normal' | 'bold' | 'extrabold';
  textShadow?: boolean;
  lineHeight?: number;
}

const LibraryCardsTab: React.FC = () => {
  const { campusId } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [qrCache, setQrCache] = useState<Map<string, QRCodeCache>>(new Map());
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
    decorativeObjects: [],
    qrSize: 'medium',
    qrPosition: 'left',
    photoSize: 'medium',
    photoPosition: 'top-right',
    textAlign: 'left',
    cardPadding: 4,
    backgroundImage: '',
    backgroundOpacity: 100,
    fontSize: 14,
    fontWeight: 'normal',
    textShadow: false,
    lineHeight: 1.5
  });
  const [draggedObject, setDraggedObject] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [templateHistory, setTemplateHistory] = useState<CardTemplate[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [useEncryption, setUseEncryption] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    paperSize: 'A4',
    margin: 10,
    showCutLines: true,
    cardsPerPage: 8
  });
  const [errors, setErrors] = useState<{id: string, message: string, userId?: string}[]>([]);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'colors' | 'layout' | 'decoration' | 'advanced'>('colors');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  const uploadImage = async (file: File, type: 'logo' | 'background') => {
    if (file.size > 1024 * 1024) {
      Swal.fire({ icon: 'error', title: 'Hata!', text: 'Dosya boyutu 1MB\'dan büyük olamaz' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', title: 'Hata!', text: 'Sadece resim dosyaları yüklenebilir' });
      return;
    }
    
    type === 'logo' ? setUploadingLogo(true) : setUploadingBackground(true);
    try {
      const fileName = `${type}_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `cardTemplates/${campusId}/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      if (type === 'logo') {
        updateTemplate({ ...template, logoUrl: url });
      } else {
        updateTemplate({ ...template, backgroundImage: url });
      }
      
      Swal.fire({ icon: 'success', title: 'Başarılı!', text: 'Resim yüklendi', timer: 2000, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Hata!', text: 'Resim yüklenemedi' });
    } finally {
      type === 'logo' ? setUploadingLogo(false) : setUploadingBackground(false);
    }
  };

  const presetTemplates: (CardTemplate & { name: string; description: string })[] = [
    {
      name: 'Modern',
      description: 'Canlı renkler ve modern tasarım',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      textColor: '#ffffff',
      logoUrl: 'https://r.resimlink.com/BJq8au6HpG.png',
      schoolName: template.schoolName,
      showLogo: true,
      showPhoto: true,
      fontFamily: 'helvetica',
      cardSize: 'standard',
      decorativeObjects: []
    },
    {
      name: 'Klasik',
      description: 'Zarif ve profesyonel görünüm',
      primaryColor: '#1e3a8a',
      secondaryColor: '#3b82f6',
      textColor: '#ffffff',
      logoUrl: 'https://r.resimlink.com/BJq8au6HpG.png',
      schoolName: template.schoolName,
      showLogo: true,
      showPhoto: true,
      fontFamily: 'times',
      cardSize: 'standard',
      decorativeObjects: []
    },
    {
      name: 'Minimalist',
      description: 'Sade ve şık tasarım',
      primaryColor: '#374151',
      secondaryColor: '#6b7280',
      textColor: '#ffffff',
      logoUrl: 'https://r.resimlink.com/BJq8au6HpG.png',
      schoolName: template.schoolName,
      showLogo: true,
      showPhoto: true,
      fontFamily: 'helvetica',
      cardSize: 'standard',
      decorativeObjects: []
    },
    {
      name: 'Renkli',
      description: 'Enerjik ve neşeli görünüm',
      primaryColor: '#ec4899',
      secondaryColor: '#f59e0b',
      textColor: '#ffffff',
      logoUrl: 'https://r.resimlink.com/BJq8au6HpG.png',
      schoolName: template.schoolName,
      showLogo: true,
      showPhoto: true,
      fontFamily: 'helvetica',
      cardSize: 'standard',
      decorativeObjects: [
        { id: '1', type: 'star', x: 15, y: 25, size: 25, color: '#fbbf24', rotation: 15, opacity: 100, locked: false, zIndex: 1 },
        { id: '2', type: 'heart', x: 85, y: 75, size: 20, color: '#f87171', rotation: -20, opacity: 100, locked: false, zIndex: 2 }
      ]
    },
    {
      name: 'Doğa',
      description: 'Doğal ve huzurlu tonlar',
      primaryColor: '#059669',
      secondaryColor: '#10b981',
      textColor: '#ffffff',
      logoUrl: 'https://r.resimlink.com/BJq8au6HpG.png',
      schoolName: template.schoolName,
      showLogo: true,
      showPhoto: true,
      fontFamily: 'helvetica',
      cardSize: 'standard',
      decorativeObjects: [
        { id: '1', type: 'books', x: 10, y: 80, size: 30, color: '#ffffff', rotation: 0, opacity: 100, locked: false, zIndex: 1 }
      ]
    },
    {
      name: 'Teknoloji',
      description: 'Futuristik ve dinamik',
      primaryColor: '#0891b2',
      secondaryColor: '#06b6d4',
      textColor: '#ffffff',
      logoUrl: 'https://r.resimlink.com/BJq8au6HpG.png',
      schoolName: template.schoolName,
      showLogo: true,
      showPhoto: true,
      fontFamily: 'courier',
      cardSize: 'standard',
      decorativeObjects: [
        { id: '1', type: 'lightning', x: 90, y: 20, size: 28, color: '#fbbf24', rotation: 0, opacity: 100, locked: false, zIndex: 1 },
        { id: '2', type: 'target', x: 12, y: 85, size: 22, color: '#ffffff', rotation: 0, opacity: 100, locked: false, zIndex: 2 }
      ]
    }
  ];

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

  const updateTemplate = (newTemplate: CardTemplate) => {
    const newHistory = templateHistory.slice(0, historyIndex + 1);
    newHistory.push(newTemplate);
    setTemplateHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setTemplate(newTemplate);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTemplate(templateHistory[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < templateHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTemplate(templateHistory[historyIndex + 1]);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('campusId', '==', campusId), where('role', 'in', ['user', 'teacher']));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersData);
      
      if (usersData.length > 0) {
        loadUserCard(usersData[0]);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserCard = useCallback(async (user: User) => {
    try {
      const cached = qrCache.get(user.id);
      const now = Date.now();
      const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 saat
      
      let qrCode: string;
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        qrCode = cached.qrCode;
      } else {
        const generateQR = httpsCallable(functions, 'generateLibraryCardQR');
        const result = await generateQR({ userId: user.id, encrypted: useEncryption }) as any;
        qrCode = result.data.qrCode;
        setQrCache(prev => new Map(prev).set(user.id, { qrCode, timestamp: now }));
      }
      
      const cardDoc = await getDoc(doc(db, 'libraryCards', user.id));
      const cardData = cardDoc.exists() ? cardDoc.data() : {};
      
      setSelectedUser({ 
        ...user, 
        qrCode,
        cardDelivered: cardData.cardDelivered || false,
        deliveredAt: cardData.deliveredAt
      });
    } catch (error: any) {
      const errorId = Date.now().toString();
      setErrors(prev => [...prev, { id: errorId, message: `QR kod oluşturulamadı: ${user.displayName}`, userId: user.id }]);
      setTimeout(() => setErrors(prev => prev.filter(e => e.id !== errorId)), 5000);
    }
  }, [qrCache, useEncryption]);

  const toggleCardDelivery = useCallback(async (userId: string) => {
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
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, cardDelivered: !currentStatus } : u
      ));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, cardDelivered: !currentStatus });
      }
    } catch (error: any) {
      const errorId = Date.now().toString();
      const user = users.find(u => u.id === userId);
      setErrors(prev => [...prev, { id: errorId, message: `Kart durumu güncellenemedi: ${user?.displayName || 'Bilinmeyen'}`, userId }]);
      setTimeout(() => setErrors(prev => prev.filter(e => e.id !== errorId)), 5000);
    }
  }, [selectedUser, users]);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.studentNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedClass !== 'all') {
      if (selectedClass === 'Öğretmen') {
        filtered = filtered.filter(user => user.role === 'teacher');
      } else {
        filtered = filtered.filter(user => user.studentClass === selectedClass);
      }
    }
    
    return filtered;
  }, [searchTerm, selectedClass, users]);

  const uniqueClasses = useMemo(() => {
    const classes = users.map(u => u.role === 'teacher' ? 'Öğretmen' : u.studentClass);
    return Array.from(new Set(classes)).sort((a, b) => {
      if (a === 'Öğretmen') return -1;
      if (b === 'Öğretmen') return 1;
      return a.localeCompare(b);
    });
  }, [users]);

  const analyticsData = useMemo(() => {
    const now = new Date();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: date.toLocaleDateString('tr-TR', { month: 'short' }),
        monthIndex: date.getMonth(),
        year: date.getFullYear()
      });
    }

    const monthlyDeliveries = last6Months.map(({ monthIndex, year }) => {
      return users.filter(u => {
        if (!u.deliveredAt) return false;
        const deliveryDate = u.deliveredAt.toDate();
        return deliveryDate.getMonth() === monthIndex && deliveryDate.getFullYear() === year;
      }).length;
    });

    const classDeliveryRates = uniqueClasses.map(cls => {
      const classUsers = cls === 'Öğretmen' 
        ? users.filter(u => u.role === 'teacher')
        : users.filter(u => u.studentClass === cls);
      const delivered = classUsers.filter(u => u.cardDelivered).length;
      return {
        class: cls,
        total: classUsers.length,
        delivered,
        pending: classUsers.length - delivered,
        rate: classUsers.length > 0 ? ((delivered / classUsers.length) * 100).toFixed(1) : '0'
      };
    }).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

    const topPerformingClasses = classDeliveryRates.filter(c => parseFloat(c.rate) === 100);
    const needsAttentionClasses = classDeliveryRates.filter(c => parseFloat(c.rate) < 50);

    return {
      labels: last6Months.map(m => m.month),
      monthlyDeliveries,
      classDeliveryRates,
      topPerformingClasses,
      needsAttentionClasses
    };
  }, [users, uniqueClasses]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClass]);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedUserIds.size === paginatedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(paginatedUsers.map(u => u.id)));
    }
  }, [selectedUserIds.size, paginatedUsers]);

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const addDecorativeObject = (type: DecorativeObject['type']) => {
    const maxZ = Math.max(0, ...(template.decorativeObjects || []).map(o => o.zIndex || 0));
    const newObj: DecorativeObject = {
      id: Date.now().toString(),
      type,
      x: 50,
      y: 50,
      size: 30,
      color: '#ffffff',
      rotation: 0,
      opacity: 100,
      locked: false,
      zIndex: maxZ + 1
    };
    updateTemplate({ ...template, decorativeObjects: [...(template.decorativeObjects || []), newObj] });
    setSelectedObjectId(newObj.id);
  };

  const removeDecorativeObject = (id: string) => {
    updateTemplate({ ...template, decorativeObjects: (template.decorativeObjects || []).filter(obj => obj.id !== id) });
  };

  const updateObjectPosition = (id: string, x: number, y: number) => {
    const obj = template.decorativeObjects?.find(o => o.id === id);
    if (obj?.locked) return;
    updateTemplate({
      ...template,
      decorativeObjects: (template.decorativeObjects || []).map(obj =>
        obj.id === id ? { ...obj, x, y } : obj
      )
    });
  };

  const updateObjectProperty = (id: string, property: keyof DecorativeObject, value: any) => {
    updateTemplate({
      ...template,
      decorativeObjects: (template.decorativeObjects || []).map(obj =>
        obj.id === id ? { ...obj, [property]: value } : obj
      )
    });
  };

  const moveObjectLayer = (id: string, direction: 'up' | 'down') => {
    const objects = [...(template.decorativeObjects || [])];
    const index = objects.findIndex(o => o.id === id);
    if (index === -1) return;
    
    if (direction === 'up') {
      const maxZ = Math.max(...objects.map(o => o.zIndex || 0));
      objects[index].zIndex = maxZ + 1;
    } else {
      const minZ = Math.min(...objects.map(o => o.zIndex || 0));
      objects[index].zIndex = minZ - 1;
    }
    updateTemplate({ ...template, decorativeObjects: objects });
  };

  const generatePNG = async () => {
    setGenerating(true);
    const failedUsers: string[] = [];
    try {
      const usersToGenerate = selectedUserIds.size > 0 
        ? filteredUsers.filter(u => selectedUserIds.has(u.id))
        : filteredUsers;

      let completed = 0;
      for (const user of usersToGenerate) {
        try {
          const cardElement = document.getElementById(`card-${user.id}`);
          if (cardElement) {
            const canvas = await html2canvas(cardElement, { 
              scale: 3,
              useCORS: true,
              allowTaint: true,
              backgroundColor: null,
              logging: false,
              foreignObjectRendering: false,
              imageTimeout: 0
            });
            const link = document.createElement('a');
            link.download = `${user.displayName}-kutuphane-karti.png`;
            link.href = canvas.toDataURL();
            link.click();
            completed++;
          }
        } catch (err) {
          failedUsers.push(user.displayName);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (failedUsers.length > 0) {
        const errorId = Date.now().toString();
        setErrors(prev => [...prev, { id: errorId, message: `PNG oluşturulamadı: ${failedUsers.join(', ')}` }]);
        setTimeout(() => setErrors(prev => prev.filter(e => e.id !== errorId)), 8000);
      }
      
      Swal.fire({
        icon: failedUsers.length === 0 ? 'success' : 'warning',
        title: failedUsers.length === 0 ? 'Başarılı!' : 'Kısmen Başarılı',
        text: failedUsers.length === 0 ? `${completed} kart indirildi` : `${completed} kart indirildi, ${failedUsers.length} başarısız`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      const errorId = Date.now().toString();
      setErrors(prev => [...prev, { id: errorId, message: 'PNG oluşturulurken kritik hata oluştu' }]);
      setTimeout(() => setErrors(prev => prev.filter(e => e.id !== errorId)), 5000);
    } finally {
      setGenerating(false);
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    const failedUsers: string[] = [];
    try {
      const generateQR = httpsCallable(functions, 'generateLibraryCardQR');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: printSettings.paperSize === 'A4' ? 'a4' : 'letter'
      });
      
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
          const errorId = Date.now().toString();
          setErrors(prev => [...prev, { id: errorId, message: 'Logo yüklenemedi, logo olmadan devam ediliyor' }]);
          setTimeout(() => setErrors(prev => prev.filter(e => e.id !== errorId)), 4000);
        }
      }

      let backgroundData: string | null = null;
      if (template.backgroundImage) {
        try {
          const bgBlob = await fetch(template.backgroundImage).then(r => r.blob());
          backgroundData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(bgBlob);
          });
        } catch (e) {
          const errorId = Date.now().toString();
          setErrors(prev => [...prev, { id: errorId, message: 'Arka plan yüklenemedi, arka plan olmadan devam ediliyor' }]);
          setTimeout(() => setErrors(prev => prev.filter(e => e.id !== errorId)), 4000);
        }
      }
      
      const cardWidth = template.cardSize === 'standard' ? 85.6 : 90;
      const cardHeight = template.cardSize === 'standard' ? 54 : 60;
      const margin = printSettings.margin;
      const cardsPerRow = 2;
      const cardsPerCol = printSettings.cardsPerPage === 8 ? 4 : 3;
      const cardsPerPage = printSettings.cardsPerPage;

      const usersToGenerate = selectedUserIds.size > 0 
        ? filteredUsers.filter(u => selectedUserIds.has(u.id))
        : filteredUsers;

      for (let i = 0; i < usersToGenerate.length; i++) {
        const user = usersToGenerate[i];
        
        try {
          const cached = qrCache.get(user.id);
          let qrCode: string;
          if (cached && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) {
            qrCode = cached.qrCode;
          } else {
            const result = await generateQR({ userId: user.id, encrypted: useEncryption }) as any;
            qrCode = result.data.qrCode;
            setQrCache(prev => new Map(prev).set(user.id, { qrCode, timestamp: Date.now() }));
          }
        
        const { userName, studentNumber, studentClass } = { 
          userName: user.displayName, 
          studentNumber: user.studentNumber, 
          studentClass: user.studentClass 
        };

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

        if (backgroundData) {
          try {
            pdf.addImage(backgroundData, 'JPEG', x, y, cardWidth, cardHeight);
            if (template.backgroundOpacity && template.backgroundOpacity < 100) {
              pdf.setFillColor(255, 255, 255);
              pdf.setGState(new pdf.GState({ opacity: (100 - template.backgroundOpacity) / 100 }));
              pdf.rect(x, y, cardWidth, cardHeight, 'F');
              pdf.setGState(new pdf.GState({ opacity: 1 }));
            }
          } catch (e) {
            console.log('Arka plan PDF\'e eklenemedi');
          }
        }
        
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

        const qrSizeMap = { small: 24, medium: 30, large: 36 };
        const qrSize = qrSizeMap[template.qrSize || 'medium'];
        const qrPadding = (qrSize - qrSize * 0.9) / 2;
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x + 5, y + 16, qrSize + 2, qrSize + 2, 2, 2, 'F');
        pdf.addImage(qrCode, 'PNG', x + 6, y + 17, qrSize, qrSize);

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
            failedUsers.push(`${user.displayName} (fotoğraf)`);
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
        
        // Kesim çizgileri
        if (printSettings.showCutLines) {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.1);
          pdf.setLineDash([2, 2]);
          pdf.rect(x, y, cardWidth, cardHeight);
          pdf.setLineDash([]);
        }
        } catch (err) {
          failedUsers.push(user.displayName);
        }
      }

      pdf.save('kutuphane-kartlari.pdf');
      
      if (failedUsers.length > 0) {
        const errorId = Date.now().toString();
        setErrors(prev => [...prev, { id: errorId, message: `Bazı kartlar oluşturulamadı: ${failedUsers.slice(0, 3).join(', ')}${failedUsers.length > 3 ? '...' : ''}` }]);
        setTimeout(() => setErrors(prev => prev.filter(e => e.id !== errorId)), 8000);
      }
      
      Swal.fire({
        icon: failedUsers.length === 0 ? 'success' : 'warning',
        title: failedUsers.length === 0 ? 'Başarılı!' : 'Kısmen Başarılı',
        text: failedUsers.length === 0 ? `${usersToGenerate.length} kart PDF olarak indirildi` : `${usersToGenerate.length - failedUsers.length}/${usersToGenerate.length} kart indirildi`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      const errorId = Date.now().toString();
      setErrors(prev => [...prev, { id: errorId, message: 'PDF oluşturulurken kritik hata oluştu' }]);
      setTimeout(() => setErrors(prev => prev.filter(e => e.id !== errorId)), 5000);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-3 sm:p-6">
      {/* Error Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {errors.map(error => (
          <div key={error.id} className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 animate-slideIn">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold">{error.message}</p>
            </div>
            <button onClick={() => setErrors(prev => prev.filter(e => e.id !== error.id))} className="text-white hover:text-gray-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 mr-2" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Kütüphane Kartları</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 bg-gray-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-sm sm:text-base"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="hidden sm:inline">Şablon Ayarları</span>
                <span className="sm:hidden">Ayarlar</span>
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
                className="flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 transition-all font-semibold text-sm sm:text-base"
              >
                {generating ? <Loader className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> : template.decorativeObjects?.length > 0 ? <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> : <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />}
                <span className="hidden sm:inline">{generating ? 'Oluşturuluyor...' : selectedUserIds.size > 0 ? `Seçili ${selectedUserIds.size} Kartı İndir` : template.decorativeObjects?.length > 0 ? 'Kartları PNG İndir' : 'Tüm Kartları PDF İndir'}</span>
                <span className="sm:hidden">{generating ? 'Oluşturuluyor...' : 'İndir'}</span>
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6 animate-fadeIn">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-3 rounded-xl shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Hazır Şablon Galerisi</h3>
                      <p className="text-sm text-gray-500">Profesyonel tasarımları tek tıkla uygulayın</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTemplateGallery(!showTemplateGallery)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-semibold transition-all flex items-center gap-2"
                  >
                    {showTemplateGallery ? (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg> Gizle</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg> Göster</>
                    )}
                  </button>
                </div>
                {showTemplateGallery && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {presetTemplates.map((preset, index) => {
                      const renderPreview = () => {
                        if (preset.name === 'Modern') {
                          return (
                            <div className="aspect-[1.6/1] p-3 relative" style={{ background: `linear-gradient(135deg, ${preset.primaryColor}, ${preset.secondaryColor})` }}>
                              <div className="absolute top-2 right-2 w-8 h-8 bg-white/20 rounded-full"></div>
                              <div className="rounded-lg p-1.5 mb-2 flex items-center justify-center gap-1" style={{ background: `linear-gradient(90deg, ${preset.secondaryColor}, ${preset.primaryColor})` }}>
                                <div className="w-3 h-3 bg-white rounded-full"></div>
                                <h5 className="font-bold text-xs" style={{ color: preset.textColor }}>KÜTÜPHANE</h5>
                              </div>
                              <div className="flex gap-2">
                                <div className="bg-white rounded-lg p-1 w-12 h-12"><div className="w-full h-full bg-gray-300 rounded"></div></div>
                                <div className="flex-1" style={{ color: preset.textColor }}>
                                  <p className="font-bold text-xs">Öğrenci</p>
                                  <p className="text-[8px] opacity-90">No: 12345</p>
                                  <p className="text-[8px] opacity-90">9-A</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (preset.name === 'Klasik') {
                          return (
                            <div className="aspect-[1.6/1] p-3 relative" style={{ background: preset.primaryColor }}>
                              <div className="absolute inset-0 border-4 border-white/10 m-2 rounded-lg"></div>
                              <div className="relative bg-white/10 backdrop-blur-sm rounded-lg p-2 mb-2 text-center border border-white/20">
                                <h5 className="font-bold text-xs" style={{ color: preset.textColor }}>KÜTÜPHANE KARTI</h5>
                              </div>
                              <div className="relative flex flex-col items-center gap-1">
                                <div className="bg-white rounded-full p-1 w-10 h-10"><div className="w-full h-full bg-gray-300 rounded-full"></div></div>
                                <div className="text-center" style={{ color: preset.textColor }}>
                                  <p className="font-bold text-xs">Öğrenci Adı</p>
                                  <p className="text-[8px] opacity-90">12345 | 9-A</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (preset.name === 'Minimalist') {
                          return (
                            <div className="aspect-[1.6/1] p-3 relative bg-white">
                              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: preset.primaryColor }}></div>
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                                <div className="w-4 h-4 rounded" style={{ background: preset.primaryColor }}></div>
                                <h5 className="font-bold text-xs text-gray-800">KÜTÜPHANE</h5>
                              </div>
                              <div className="flex gap-2">
                                <div className="border-2 rounded-lg p-1 w-12 h-12" style={{ borderColor: preset.primaryColor }}><div className="w-full h-full bg-gray-200 rounded"></div></div>
                                <div className="flex-1 text-gray-800">
                                  <p className="font-bold text-xs">Öğrenci</p>
                                  <p className="text-[8px] text-gray-600">No: 12345</p>
                                  <p className="text-[8px] text-gray-600">Sınıf: 9-A</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (preset.name === 'Renkli') {
                          return (
                            <div className="aspect-[1.6/1] p-3 relative overflow-hidden" style={{ background: `linear-gradient(45deg, ${preset.primaryColor}, ${preset.secondaryColor})` }}>
                              <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"></div>
                              <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full"></div>
                              <div className="absolute top-3 left-3 text-2xl">⭐</div>
                              <div className="absolute bottom-3 right-3 text-xl">❤️</div>
                              <div className="relative rounded-xl p-1.5 mb-2 text-center" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
                                <h5 className="font-bold text-xs" style={{ color: preset.textColor }}>KÜTÜPHANE</h5>
                              </div>
                              <div className="relative flex gap-2 items-center">
                                <div className="bg-white rounded-xl p-1 w-12 h-12 shadow-lg"><div className="w-full h-full bg-gradient-to-br from-pink-200 to-orange-200 rounded-lg"></div></div>
                                <div className="flex-1" style={{ color: preset.textColor }}>
                                  <p className="font-bold text-xs">Öğrenci</p>
                                  <p className="text-[8px]">12345 • 9-A</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (preset.name === 'Doğa') {
                          return (
                            <div className="aspect-[1.6/1] p-3 relative" style={{ background: `linear-gradient(180deg, ${preset.primaryColor}, ${preset.secondaryColor})` }}>
                              <div className="absolute bottom-2 left-2 text-2xl opacity-50">📚</div>
                              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 mb-2">
                                <h5 className="font-bold text-xs text-center" style={{ color: preset.textColor }}>🌿 KÜTÜPHANE 🌿</h5>
                              </div>
                              <div className="flex gap-2">
                                <div className="bg-white rounded-lg p-1 w-12 h-12 shadow-md"><div className="w-full h-full bg-green-100 rounded"></div></div>
                                <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-lg p-1.5">
                                  <p className="font-bold text-xs" style={{ color: preset.textColor }}>Öğrenci</p>
                                  <p className="text-[8px]" style={{ color: preset.textColor }}>12345</p>
                                  <p className="text-[8px]" style={{ color: preset.textColor }}>9-A</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (preset.name === 'Teknoloji') {
                          return (
                            <div className="aspect-[1.6/1] p-3 relative" style={{ background: `linear-gradient(225deg, ${preset.primaryColor}, ${preset.secondaryColor})` }}>
                              <div className="absolute top-2 right-2 text-xl">⚡</div>
                              <div className="absolute bottom-2 left-2 text-lg">🎯</div>
                              <div className="border-2 border-white/30 rounded-lg p-1.5 mb-2 font-mono">
                                <h5 className="font-bold text-xs text-center" style={{ color: preset.textColor }}>&lt;KÜTÜPHANE/&gt;</h5>
                              </div>
                              <div className="flex gap-2 items-start">
                                <div className="border-2 border-white/50 rounded p-1 w-12 h-12"><div className="w-full h-full bg-cyan-200 rounded grid grid-cols-2 gap-0.5"><div className="bg-cyan-400"></div><div className="bg-cyan-300"></div><div className="bg-cyan-300"></div><div className="bg-cyan-400"></div></div></div>
                                <div className="flex-1 font-mono" style={{ color: preset.textColor }}>
                                  <p className="font-bold text-xs">Öğrenci_Adı</p>
                                  <p className="text-[8px] opacity-90">ID: 12345</p>
                                  <p className="text-[8px] opacity-90">Class: 9-A</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      };
                      
                      return (
                        <div
                          key={index}
                          onClick={() => {
                            updateTemplate({
                              ...preset,
                              schoolName: template.schoolName,
                              logoUrl: template.logoUrl,
                              decorativeObjects: preset.decorativeObjects.map(obj => ({ ...obj, id: Date.now().toString() + obj.id }))
                            });
                            Swal.fire({
                              icon: 'success',
                              title: 'Şablon Uygulandı!',
                              text: `${preset.name} şablonu başarıyla yüklendi`,
                              timer: 1500,
                              showConfirmButton: false
                            });
                          }}
                          className="cursor-pointer group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-indigo-500 transition-all hover:shadow-xl"
                        >
                          {renderPreview()}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-all bg-white rounded-full p-2">
                              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                          <div className="bg-white p-2 border-t-2 border-gray-200">
                            <p className="font-bold text-sm text-gray-800">{preset.name}</p>
                            <p className="text-xs text-gray-600">{preset.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-b border-gray-200 mb-6">
                <div className="flex gap-2 overflow-x-auto">
                  <button onClick={() => setActiveSettingsTab('colors')} className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeSettingsTab === 'colors' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Palette className="w-4 h-4" /> Renkler & Stiller
                  </button>
                  <button onClick={() => setActiveSettingsTab('layout')} className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeSettingsTab === 'layout' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg> Düzen & Tipografi
                  </button>
                  <button onClick={() => setActiveSettingsTab('decoration')} className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeSettingsTab === 'decoration' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Sparkles className="w-4 h-4" /> Dekorasyon
                  </button>
                  <button onClick={() => setActiveSettingsTab('advanced')} className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeSettingsTab === 'advanced' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Settings className="w-4 h-4" /> Gelişmiş
                  </button>
                </div>
              </div>

              {activeSettingsTab === 'colors' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                  <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><div className="w-2 h-2 bg-indigo-600 rounded-full"></div>Renk Paleti</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ana Renk</label>
                  <input
                    type="color"
                    value={template.primaryColor}
                    onChange={(e) => updateTemplate({ ...template, primaryColor: e.target.value })}
                    className="w-full h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">İkincil Renk</label>
                  <input
                    type="color"
                    value={template.secondaryColor}
                    onChange={(e) => updateTemplate({ ...template, secondaryColor: e.target.value })}
                    className="w-full h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Metin Rengi</label>
                  <input
                    type="color"
                    value={template.textColor}
                    onChange={(e) => updateTemplate({ ...template, textColor: e.target.value })}
                    className="w-full h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Logo</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={template.logoUrl}
                      onChange={(e) => updateTemplate({ ...template, logoUrl: e.target.value })}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="URL girin veya dosya yükleyin"
                    />
                    <label className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap">
                      {uploadingLogo ? <Loader className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                      Yükle
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'logo')} disabled={uploadingLogo} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Maksimum 1MB</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Okul Adı</label>
                  <input
                    type="text"
                    value={template.schoolName}
                    onChange={(e) => updateTemplate({ ...template, schoolName: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.showLogo}
                      onChange={(e) => updateTemplate({ ...template, showLogo: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded mr-2"
                    />
                    <span className="text-sm font-semibold text-gray-700">Logo Göster</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.showPhoto}
                      onChange={(e) => updateTemplate({ ...template, showPhoto: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded mr-2"
                    />
                    <span className="text-sm font-semibold text-gray-700">Profil Fotoğrafı Göster</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Font Stili</label>
                  <select
                    value={template.fontFamily}
                    onChange={(e) => updateTemplate({ ...template, fontFamily: e.target.value as any })}
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
                    onChange={(e) => updateTemplate({ ...template, cardSize: e.target.value as any })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="standard">Standart (85.6 x 54 mm)</option>
                    <option value="large">Büyük (90 x 60 mm)</option>
                  </select>
                </div>
                  </div>
                </div>
              </div>
              )}

              {activeSettingsTab === 'layout' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100">
                  <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><div className="w-2 h-2 bg-blue-600 rounded-full"></div>QR Kod Ayarları</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">QR Kod Boyutu</label>
                      <select
                        value={template.qrSize || 'medium'}
                        onChange={(e) => updateTemplate({ ...template, qrSize: e.target.value as any })}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all bg-white"
                      >
                        <option value="small">Küçük</option>
                        <option value="medium">Orta</option>
                        <option value="large">Büyük</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                  <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><div className="w-2 h-2 bg-purple-600 rounded-full"></div>Tipografi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="mt-6 border-t-2 border-gray-200 pt-6">
                <div className="flex items-center mb-4">
                  <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h4 className="text-lg font-bold text-gray-800">Arka Plan Özelleştirme</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Arka Plan Resmi</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={template.backgroundImage || ''}
                        onChange={(e) => updateTemplate({ ...template, backgroundImage: e.target.value })}
                        placeholder="URL girin veya dosya yükleyin"
                        className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <label className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap">
                        {uploadingBackground ? <Loader className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                        Yükle
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'background')} disabled={uploadingBackground} />
                      </label>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">Maksimum 1MB</p>
                      {template.backgroundImage && (
                        <button
                          onClick={() => updateTemplate({ ...template, backgroundImage: '' })}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold"
                        >
                          Kaldır
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Arka Plan Şeffaflığı: {template.backgroundOpacity || 100}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={template.backgroundOpacity || 100}
                      onChange={(e) => updateTemplate({ ...template, backgroundOpacity: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>Şeffaf</span>
                      <span>Opak</span>
                    </div>
                  </div>
                </div>
                {template.backgroundImage && (
                  <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-blue-800">Arka Plan İpuçları</p>
                        <p className="text-xs text-blue-700 mt-1">• Arka plan resmi gradient renklerinin üzerine uygulanır</p>
                        <p className="text-xs text-blue-700">• Şeffaflık ayarı ile arka plan yoğunluğunu kontrol edin</p>
                        <p className="text-xs text-blue-700">• Okunabilirlik için %30-70 arası şeffaflık önerilir</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">Yazı Boyutu: {template.fontSize || 14}px</label>
                    <input
                      type="range"
                      min="8"
                      max="24"
                      value={template.fontSize || 14}
                      onChange={(e) => updateTemplate({ ...template, fontSize: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">Yazı Kalınlığı</label>
                      <select
                        value={template.fontWeight || 'normal'}
                        onChange={(e) => updateTemplate({ ...template, fontWeight: e.target.value as any })}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all bg-white"
                      >
                        <option value="light">İnce</option>
                        <option value="normal">Normal</option>
                        <option value="bold">Kalın</option>
                        <option value="extrabold">Ekstra Kalın</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">Satır Aralığı: {template.lineHeight || 1.5}</label>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.1"
                      value={template.lineHeight || 1.5}
                      onChange={(e) => updateTemplate({ ...template, lineHeight: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                    <div className="flex items-center">
                      <label className="flex items-center cursor-pointer px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-300 transition-all w-full">
                        <input
                          type="checkbox"
                          checked={template.textShadow || false}
                          onChange={(e) => updateTemplate({ ...template, textShadow: e.target.checked })}
                          className="w-5 h-5 text-indigo-600 rounded mr-3"
                        />
                        <span className="text-sm font-semibold text-gray-700">Metin Gölgesi</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {activeSettingsTab === 'decoration' && (

              <div className="space-y-6 animate-fadeIn">
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-5 border border-yellow-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2"><div className="w-2 h-2 bg-yellow-600 rounded-full"></div>Dekoratif Nesneler</h4>
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
                  <div className="mt-4 bg-white rounded-lg p-4 space-y-3 border-2 border-gray-200">
                    <h5 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-600" />
                      Nesne Kontrolleri ({template.decorativeObjects.length})
                    </h5>
                    {template.decorativeObjects.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)).map(obj => (
                      <div key={obj.id} className={`border-2 rounded-lg p-3 transition-all ${selectedObjectId === obj.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <button onClick={() => setSelectedObjectId(selectedObjectId === obj.id ? null : obj.id)} className="flex items-center gap-2 flex-1">
                            <span className="text-xl">{{
                              book: '📖', books: '📚', bookmark: '🔖', pen: '📝',
                              graduation: '🎓', trophy: '🏆', palette: '🎨',
                              star: '⭐', 'sparkle-star': '🌟', moon: '🌙', sun: '☀️',
                              rainbow: '🌈', lightning: '⚡', sparkles: '✨',
                              heart: '❤️', balloon: '🎈', confetti: '🎉',
                              medal: '🏅', diamond: '💎', target: '🎯', circle: '🔵'
                            }[obj.type]}</span>
                            <span className="text-sm font-semibold text-gray-700 capitalize">{obj.type}</span>
                            {obj.locked && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">🔒</span>}
                          </button>
                          <div className="flex gap-1">
                            <button onClick={() => moveObjectLayer(obj.id, 'up')} className="p-1 bg-gray-200 rounded hover:bg-gray-300" title="Öne Getir">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <button onClick={() => moveObjectLayer(obj.id, 'down')} className="p-1 bg-gray-200 rounded hover:bg-gray-300" title="Arkaya Gönder">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            <button onClick={() => updateObjectProperty(obj.id, 'locked', !obj.locked)} className={`p-1 rounded ${obj.locked ? 'bg-yellow-200 text-yellow-700' : 'bg-gray-200'} hover:bg-yellow-300`} title={obj.locked ? 'Kilidi Aç' : 'Kilitle'}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{obj.locked ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />}</svg>
                            </button>
                            <button onClick={() => removeDecorativeObject(obj.id)} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {selectedObjectId === obj.id && (
                          <div className="space-y-2 pt-2 border-t border-gray-200">
                            <div>
                              <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                                <span>Boyut: {obj.size}px</span>
                              </label>
                              <input type="range" min="10" max="100" value={obj.size} onChange={(e) => updateObjectProperty(obj.id, 'size', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                                <span>Rotasyon: {obj.rotation}°</span>
                              </label>
                              <input type="range" min="0" max="360" value={obj.rotation} onChange={(e) => updateObjectProperty(obj.id, 'rotation', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                                <span>Opaklık: {obj.opacity}%</span>
                              </label>
                              <input type="range" min="0" max="100" value={obj.opacity} onChange={(e) => updateObjectProperty(obj.id, 'opacity', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-700 mb-1 block">Renk</label>
                              <input type="color" value={obj.color} onChange={(e) => updateObjectProperty(obj.id, 'color', e.target.value)} className="w-full h-8 rounded border-2 border-gray-300 cursor-pointer" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
              )}

              {activeSettingsTab === 'advanced' && (
              <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">Güvenlik Ayarları</h4>
                      <p className="text-xs text-gray-600">QR kod şifreleme ile hassas bilgileri koruyun</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-6 rounded-full transition-all ${useEncryption ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${useEncryption ? 'translate-x-7' : 'translate-x-1'} mt-0.5`}></div>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-800">QR Kod Şifreleme</span>
                        <p className="text-xs text-gray-600">AES-256 şifreleme ile güvenli QR kodlar oluşturun</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={useEncryption}
                      onChange={(e) => {
                        setUseEncryption(e.target.checked);
                        setQrCache(new Map()); // Cache'i temizle
                      }}
                      className="hidden"
                    />
                  </label>
                  {useEncryption && (
                    <div className="mt-3 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-xs font-bold text-green-800">Güvenlik Aktif</p>
                          <p className="text-xs text-green-700 mt-1">• Öğrenci bilgileri şifrelenmiş olarak saklanır</p>
                          <p className="text-xs text-green-700">• QR kodlar 24 saat geçerlidir</p>
                          <p className="text-xs text-green-700">• Sadece yetkili adminler okuyabilir</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t-2 border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">Yazdırma Ayarları</h4>
                      <p className="text-xs text-gray-600">PDF çıktısı için özelleştirme seçenekleri</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPrintSettings(!showPrintSettings)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    {showPrintSettings ? 'Gizle' : 'Göster'}
                  </button>
                </div>
                {showPrintSettings && (
                  <div className="bg-white rounded-lg p-4 border-2 border-gray-200 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Kağıt Boyutu</label>
                        <select
                          value={printSettings.paperSize}
                          onChange={(e) => setPrintSettings({ ...printSettings, paperSize: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value="A4">A4 (210 x 297 mm)</option>
                          <option value="Letter">Letter (216 x 279 mm)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Kenar Boşluğu (mm)</label>
                        <input
                          type="number"
                          min="5"
                          max="20"
                          value={printSettings.margin}
                          onChange={(e) => setPrintSettings({ ...printSettings, margin: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Sayfa Başına Kart</label>
                        <select
                          value={printSettings.cardsPerPage}
                          onChange={(e) => setPrintSettings({ ...printSettings, cardsPerPage: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value={8}>8 Kart (2x4)</option>
                          <option value={6}>6 Kart (2x3)</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printSettings.showCutLines}
                            onChange={(e) => setPrintSettings({ ...printSettings, showCutLines: e.target.checked })}
                            className="w-5 h-5 text-indigo-600 rounded mr-2"
                          />
                          <span className="text-sm font-semibold text-gray-700">Kesim Çizgileri Göster</span>
                        </label>
                      </div>
                    </div>
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-xs font-bold text-blue-800">Yazdırma İpuçları</p>
                          <p className="text-xs text-blue-700 mt-1">• Kesim çizgileri kartları kesmek için rehber sağlar</p>
                          <p className="text-xs text-blue-700">• Profesyonel baskı için 300 DPI önerilir</p>
                          <p className="text-xs text-blue-700">• Karton kağıt kullanımı dayanıklılığı artırır</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Geri Al"
                  >
                    <Undo className="w-5 h-5" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= templateHistory.length - 1}
                    className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="İleri Al"
                  >
                    <Redo className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={saveTemplate}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Şablonu Kaydet
                </button>
              </div>
            </div>
          )}

          {/* Analytics Toggle */}
          <div className="mb-4 sm:mb-8 animate-fadeIn">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="w-full bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-2 sm:p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">İstatistikler ve Analizler</h3>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Kart teslim trendi, sınıf performansı ve detaylı raporlar</p>
                </div>
              </div>
              <div className={`transform transition-transform ${showAnalytics ? 'rotate-180' : ''}`}>
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
          </div>

          {/* Analytics Section */}
          {showAnalytics && (
            <div className="space-y-6 mb-8 animate-fadeIn">
              <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Aylık Kart Teslim Trendi (Son 6 Ay)
                </h3>
                <div className="h-80">
                  <Line
                    data={{
                      labels: analyticsData.labels,
                      datasets: [{
                        label: 'Teslim Edilen Kartlar',
                        data: analyticsData.monthlyDeliveries,
                        borderColor: 'rgba(147, 51, 234, 1)',
                        backgroundColor: 'rgba(147, 51, 234, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: 12,
                          cornerRadius: 8
                        }
                      },
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Sınıf Bazlı Teslim Oranı</h3>
                  <div className="h-80">
                    <Bar
                      data={{
                        labels: analyticsData.classDeliveryRates.map(c => c.class),
                        datasets: [{
                          label: 'Teslim Oranı (%)',
                          data: analyticsData.classDeliveryRates.map(c => parseFloat(c.rate)),
                          backgroundColor: analyticsData.classDeliveryRates.map(c => 
                            parseFloat(c.rate) === 100 ? 'rgba(34, 197, 94, 0.8)' :
                            parseFloat(c.rate) >= 75 ? 'rgba(59, 130, 246, 0.8)' :
                            parseFloat(c.rate) >= 50 ? 'rgba(251, 146, 60, 0.8)' :
                            'rgba(239, 68, 68, 0.8)'
                          ),
                          borderRadius: 8
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { beginAtZero: true, max: 100, ticks: { callback: (value) => value + '%' } }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Kart Durumu Dağılımı</h3>
                  <div className="h-80">
                    <Pie
                      data={{
                        labels: ['Teslim Edildi', 'Bekliyor'],
                        datasets: [{
                          data: [
                            users.filter(u => u.cardDelivered).length,
                            users.filter(u => !u.cardDelivered).length
                          ],
                          backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(251, 146, 60, 0.8)']
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-600" />
                    Tam Teslim Sınıflar
                  </h3>
                  {analyticsData.topPerformingClasses.length > 0 ? (
                    <div className="space-y-3">
                      {analyticsData.topPerformingClasses.map(cls => (
                        <div key={cls.class} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-2 border-green-200">
                          <div className="flex items-center gap-3">
                            <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">✓</div>
                            <div>
                              <p className="font-bold text-gray-800">{cls.class}</p>
                              <p className="text-xs text-gray-600">{cls.total} öğrenci</p>
                            </div>
                          </div>
                          <span className="text-green-600 font-bold text-lg">%100</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500"><p className="text-sm">Henüz tam teslim sınıf yok</p></div>
                  )}
                </div>

                <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-600" />
                    Dikkat Gereken Sınıflar
                  </h3>
                  {analyticsData.needsAttentionClasses.length > 0 ? (
                    <div className="space-y-3">
                      {analyticsData.needsAttentionClasses.slice(0, 5).map(cls => (
                        <div key={cls.class} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border-2 border-orange-200">
                          <div className="flex items-center gap-3">
                            <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">!</div>
                            <div>
                              <p className="font-bold text-gray-800">{cls.class}</p>
                              <p className="text-xs text-gray-600">{cls.delivered}/{cls.total} teslim</p>
                            </div>
                          </div>
                          <span className="text-orange-600 font-bold text-lg">%{cls.rate}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500"><p className="text-sm">Tüm sınıflar iyi durumda! 🎉</p></div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Öğrenci ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full sm:w-auto pl-9 sm:pl-10 pr-8 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white cursor-pointer text-sm sm:text-base"
              >
                <option value="all">Tüm Sınıflar</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8 animate-fadeIn">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Öğrenci</p>
                  <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{users.length}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
                  <BarChart3 className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-white/90">Teslim Edildi</p>
                  <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{users.filter(u => u.cardDelivered).length}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
                  <Package className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-white/90">Bekleyen</p>
                  <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{users.filter(u => !u.cardDelivered).length}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
                  <Package className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-white/90">Toplam Sınıf</p>
                  <p className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{uniqueClasses.length}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-4">
                  <Filter className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-gray-600 mb-4 sm:mb-6">
            <div>
              <p className="mb-1 sm:mb-2 text-sm sm:text-base">📊 {filteredUsers.length} / {users.length} öğrenci</p>
              <p className="text-xs sm:text-sm text-gray-500">Sayfa {currentPage} / {totalPages}</p>
              {selectedClass !== 'all' && (
                <p className="text-xs sm:text-sm text-indigo-600 font-semibold mt-1">
                  🎯 Filtre: {selectedClass} sınıfı
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {selectedClass !== 'all' && (
                <button
                  onClick={() => {
                    const classUsers = filteredUsers.map(u => u.id);
                    setSelectedUserIds(new Set(classUsers));
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all font-semibold text-sm sm:text-base justify-center"
                >
                  <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  Tüm Sınıfı Seç
                </button>
              )}
              {paginatedUsers.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all font-semibold text-sm sm:text-base justify-center"
                >
                  {selectedUserIds.size === paginatedUsers.length ? <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" /> : <Square className="w-4 h-4 sm:w-5 sm:h-5" />}
                  {selectedUserIds.size === paginatedUsers.length ? 'Sayfayı Kaldır' : 'Sayfayı Seç'}
                </button>
              )}
            </div>
          </div>

          {uniqueClasses.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-indigo-600" />
                Sınıf Bazlı Durum
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {uniqueClasses.map(cls => {
                  const classUsers = cls === 'Öğretmen'
                    ? users.filter(u => u.role === 'teacher')
                    : users.filter(u => u.studentClass === cls);
                  const delivered = classUsers.filter(u => u.cardDelivered).length;
                  const total = classUsers.length;
                  const percentage = Math.round((delivered / total) * 100);
                  const bgColor = percentage === 100 ? 'from-green-50 to-emerald-50' : percentage >= 75 ? 'from-blue-50 to-cyan-50' : percentage >= 50 ? 'from-orange-50 to-yellow-50' : 'from-red-50 to-pink-50';
                  const borderColor = percentage === 100 ? 'border-green-300' : percentage >= 75 ? 'border-blue-300' : percentage >= 50 ? 'border-orange-300' : 'border-red-300';
                  const progressColor = percentage === 100 ? 'bg-green-500' : percentage >= 75 ? 'bg-blue-500' : percentage >= 50 ? 'bg-orange-500' : 'bg-red-500';
                  const icon = percentage === 100 ? '✓' : percentage < 50 ? '⚠️' : '';
                  const isSelected = selectedClass === cls;
                  return (
                    <div 
                      key={cls} 
                      onClick={() => setSelectedClass(selectedClass === cls ? 'all' : cls)}
                      className={`bg-gradient-to-br ${bgColor} rounded-lg p-3 border-2 ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-300' : borderColor} hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group relative`}
                    >
                      {icon && <span className="absolute top-2 right-2 text-lg">{icon}</span>}
                      <p className="font-bold text-gray-800 text-sm mb-1">{cls}</p>
                      <p className="text-xs text-gray-600 mb-2">{delivered}/{total} <span className="font-semibold">(%{percentage})</span></p>
                      <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full ${progressColor} transition-all duration-1000 ease-out`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg">
                          Seçili
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-lg transition-all pointer-events-none"></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8 sm:py-12">
            <Loader className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
                    Kart Önizleme
                  </h3>
                  <button
                    onClick={() => setShowPreviewModal(true)}
                    className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all"
                    title="Tam Ekran Önizleme"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </div>
                {selectedUser ? (
                  <div className="perspective-1000">
                    <div className="relative w-full aspect-[1.6/1] transform hover:scale-105 transition-transform duration-300" style={{ transformStyle: 'preserve-3d', transform: `scale(${previewZoom})` }}>
                      <div 
                        id={`card-${selectedUser.id}`}
                        className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden" 
                        style={{ 
                          background: `linear-gradient(to bottom right, ${template.primaryColor}, ${template.secondaryColor})`
                        }}
                      >
                        {template.backgroundImage && (
                          <>
                            <img 
                              src={template.backgroundImage} 
                              alt="Background"
                              crossOrigin="anonymous"
                              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                              style={{ mixBlendMode: 'overlay' }}
                            />
                            <div 
                              className="absolute inset-0 pointer-events-none" 
                              style={{ 
                                backgroundColor: 'white',
                                opacity: (100 - (template.backgroundOpacity || 100)) / 100
                              }}
                            />
                          </>
                        )}
                        <div 
                          className="relative p-4 h-full"
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
                              <img src={selectedUser.qrCode} alt="QR" className={template.qrSize === 'small' ? 'w-16 h-16' : template.qrSize === 'large' ? 'w-24 h-24' : 'w-20 h-20'} />
                            ) : (
                              <Loader className={template.qrSize === 'small' ? 'w-16 h-16' : template.qrSize === 'large' ? 'w-24 h-24' : 'w-20 h-20'} />
                            )}
                          </div>
                          <div className="flex-1" style={{ 
                            color: template.textColor,
                            fontSize: `${(template.fontSize || 14) * 0.85}px`,
                            fontWeight: template.fontWeight === 'light' ? 300 : template.fontWeight === 'bold' ? 700 : template.fontWeight === 'extrabold' ? 800 : 400,
                            lineHeight: template.lineHeight || 1.5,
                            textShadow: template.textShadow ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                          }}>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold flex-1" style={{ fontSize: `${(template.fontSize || 14)}px` }}>{selectedUser.displayName}</p>
                              {template.showPhoto && selectedUser.photoURL && (
                                <img 
                                  src={selectedUser.photoURL} 
                                  alt="Profil" 
                                  className="w-10 h-10 rounded-full border-2 object-cover"
                                  style={{ borderColor: template.textColor }}
                                />
                              )}
                            </div>
                            <p className="opacity-90">No: {selectedUser.studentNumber}</p>
                            <p className="opacity-90">Sınıf: {selectedUser.studentClass}</p>
                            <p className="opacity-75 mt-2" style={{ fontSize: `${(template.fontSize || 14) * 0.7}px` }}>{template.schoolName}</p>
                          </div>
                        </div>
                        {template.decorativeObjects?.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(obj => {
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
                              draggable={!obj.locked}
                              onDragStart={() => !obj.locked && setDraggedObject(obj.id)}
                              onClick={() => setSelectedObjectId(obj.id)}
                              className={`absolute ${obj.locked ? 'cursor-not-allowed' : 'cursor-move'} ${selectedObjectId === obj.id ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                              style={{
                                left: `${obj.x}%`,
                                top: `${obj.y}%`,
                                transform: `translate(-50%, -50%) rotate(${obj.rotation}deg)`,
                                fontSize: `${obj.size}px`,
                                color: obj.color,
                                opacity: (obj.opacity || 100) / 100,
                                zIndex: obj.zIndex || 0
                              }}
                            >
                              {emojiMap[obj.type]}
                              {obj.locked && <span className="absolute -top-1 -right-1 text-xs">🔒</span>}
                            </div>
                          );
                        })}
                        </div>
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Öğrenci Listesi</h3>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-semibold text-gray-700">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-semibold mb-2">Öğrenci bulunamadı</p>
                    <p className="text-sm">Arama veya filtre kriterlerinizi değiştirin</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paginatedUsers.map(user => (
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

        {/* Preview Modal */}
        {showPreviewModal && selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPreviewModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Eye className="w-6 h-6 text-indigo-600" />
                  Tam Ekran Önizleme
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewZoom(Math.max(0.5, previewZoom - 0.1))}
                    className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all"
                  >
                    <ZoomIn className="w-5 h-5 rotate-180" />
                  </button>
                  <span className="text-sm font-semibold text-gray-700">{Math.round(previewZoom * 100)}%</span>
                  <button
                    onClick={() => setPreviewZoom(Math.min(2, previewZoom + 0.1))}
                    className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPreviewZoom(1)}
                    className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center overflow-auto max-h-[70vh]">
                <div 
                  className="rounded-2xl shadow-2xl overflow-hidden" 
                  style={{ 
                    background: `linear-gradient(to bottom right, ${template.primaryColor}, ${template.secondaryColor})`,
                    backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundBlendMode: 'overlay',
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.2s'
                  }}
                >
                  {template.backgroundImage && (
                    <div 
                      className="absolute inset-0 pointer-events-none" 
                      style={{ 
                        backgroundColor: 'white',
                        opacity: (100 - (template.backgroundOpacity || 100)) / 100
                      }}
                    />
                  )}
                  <div className="relative p-8">
                  <div className="rounded-xl p-4 mb-6 flex items-center justify-center gap-4" style={{ background: `linear-gradient(to right, ${template.secondaryColor}, ${template.primaryColor})` }}>
                    {template.showLogo && template.logoUrl && (
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1">
                        <img src={template.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <h4 className="font-bold text-2xl" style={{ color: template.textColor }}>KÜTÜPHANE KARTI</h4>
                  </div>
                  <div className="flex gap-6">
                    <div className="bg-white rounded-xl p-4 flex items-center justify-center">
                      {selectedUser.qrCode && <img src={selectedUser.qrCode} alt="QR" className={template.qrSize === 'small' ? 'w-32 h-32' : template.qrSize === 'large' ? 'w-48 h-48' : 'w-40 h-40'} />}
                    </div>
                    <div className="flex-1" style={{ color: template.textColor }}>
                      <div className="flex items-center gap-4 mb-3">
                        <p className="font-bold text-2xl flex-1">{selectedUser.displayName}</p>
                        {template.showPhoto && selectedUser.photoURL && (
                          <img 
                            src={selectedUser.photoURL} 
                            alt="Profil" 
                            className="w-20 h-20 rounded-full border-4 object-cover"
                            style={{ borderColor: template.textColor }}
                          />
                        )}
                      </div>
                      <p className="text-lg opacity-90 mb-2">No: {selectedUser.studentNumber}</p>
                      <p className="text-lg opacity-90 mb-4">Sınıf: {selectedUser.studentClass}</p>
                      <p className="text-base opacity-75">{template.schoolName}</p>
                    </div>
                  </div>
                  </div>
                </div>
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
