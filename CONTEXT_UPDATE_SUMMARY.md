# Context Dosyaları Güncelleme Özeti

## ✅ Tamamlanan
1. BookContext.tsx
2. AuthorContext.tsx
3. BudgetContext.tsx

## 🔄 Kalan Context Dosyaları
4. ChatContext.tsx
5. CollectionContext.tsx
6. CouponContext.tsx
7. EventContext.tsx
8. GameReservationContext.tsx
9. MagazineContext.tsx
10. RequestContext.tsx
11. ReviewContext.tsx
12. ShopContext.tsx
13. TaskContext.tsx

## Her Context İçin Yapılacaklar
1. `import { useAuth } from './AuthContext';` ekle
2. `const { isSuperAdmin, campusId } = useAuth();` ekle
3. Tüm getDocs query'lerine kampüs filtresi ekle
4. Callback dependency array'lerine isSuperAdmin ve campusId ekle
