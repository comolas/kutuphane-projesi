# Kampüs Bazlı Filtreleme - Tab Güncellemeleri

## ✅ Tamamlanan Dosyalar
1. AdminDashboard.tsx
2. BorrowedBooksTab.tsx  
3. MessagesTab.tsx
4. FinesTab.tsx (import eklendi, BookContext'ten veri alıyor)

## 📝 Güncellenmesi Gereken Tab Dosyaları

Her dosyaya aşağıdaki değişiklikler uygulanacak:

### 1. Import Ekle
```typescript
import { useAuth } from '../../../contexts/AuthContext';
```

### 2. Hook Kullan
```typescript
const { isSuperAdmin, campusId } = useAuth();
```

### 3. Query Güncelle
```typescript
// ÖNCE:
const q = query(collection(db, 'koleksiyon'), ...filters);

// SONRA:
const q = isSuperAdmin 
  ? query(collection(db, 'koleksiyon'), ...filters)
  : query(collection(db, 'koleksiyon'), ...filters, where('campusId', '==', campusId));
```

## Dosya Listesi ve Koleksiyonları

1. **UsersTab.tsx** → `users` koleksiyonu
2. **AdminCatalogTab.tsx** → `books` koleksiyonu
3. **EventManagementTab.tsx** → `events` koleksiyonu
4. **ReportsTab.tsx** → Birden fazla koleksiyon (books, borrowedBooks, users, etc.)
5. **ReviewManagementTab.tsx** → `reviews` koleksiyonu
6. **AdminMagazinesTab.tsx** → `magazines` koleksiyonu
7. **GameManagementTab.tsx** → `games` koleksiyonu
8. **AdminGameReservationsTab.tsx** → `gameReservations` koleksiyonu
9. **BlogManagementTab.tsx** → `posts` koleksiyonu
10. **ShopManagementTab.tsx** → `products`, `orders` koleksiyonları
11. **BudgetTab.tsx** → `budget` koleksiyonu
12. **QuoteManagementTab.tsx** → `quotes` koleksiyonu
13. **AuthorManagementTab.tsx** → `authors` koleksiyonu
14. **CollectionManagementTab.tsx** → `collections` koleksiyonu

## NOT
- BookContext ve diğer context'ler de güncellenmeli
- announcements koleksiyonu GLOBAL - filtreleme YOK
