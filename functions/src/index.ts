/* eslint-disable @typescript-eslint/no-explicit-any */
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();

export const setAdminRole = onCall(async (request: any) => {
  // Güvenlik kontrolü: Sadece mevcut adminler yeni admin atayabilir
  if (request.auth?.token.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Bu işlemi sadece adminler yapabilir."
    );
  }

  // Rate limiting - Saatte maksimum 5 admin atama
  const adminActionLimit = await checkAdminActionRateLimit(request.auth.uid, "setAdminRole");
  if (!adminActionLimit.allowed) {
    throw new HttpsError(
      "resource-exhausted",
      "Bu işlemi çok sık yaptınız. Lütfen daha sonra tekrar deneyin."
    );
  }

  const email = request.data.email;
  
  // Email validation
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    throw new HttpsError(
      "invalid-argument",
      emailValidation.error!
    );
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    
    // Firestore'daki kullanıcı belgesini de güncelle
    await admin.firestore().collection("users").doc(user.uid).update({
      role: "admin",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { message: `${email} kullanıcısı başarıyla admin yapıldı.` };
  } catch (error) {
    const err = error as any;
    logger.error("Error setting admin role", { code: err.code });
    throw new HttpsError("internal", "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
  }
});

// İLK SÜPER ADMIN OLUŞTURMA FONKSİYONU
export const initializeFirstSuperAdmin = onCall(async (request: any) => {
  const db = admin.firestore();
  
  // Sistemde süper admin var mı kontrol et
  const superAdminsSnapshot = await db.collection("users").where("role", "==", "superadmin").limit(1).get();
  
  if (!superAdminsSnapshot.empty) {
    throw new HttpsError(
      "already-exists",
      "Sistemde zaten süper admin kullanıcı mevcut. Bu fonksiyon devre dışı bırakıldı."
    );
  }
  
  const email = request.data.email;
  
  // Email validation
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    throw new HttpsError("invalid-argument", emailValidation.error!);
  }
  
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: "superadmin" });
    
    await db.collection("users").doc(user.uid).update({
      role: "superadmin",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    logger.info("İlk süper admin kullanıcı oluşturuldu");
    return { message: `${email} ilk süper admin olarak atandı. Bu fonksiyonu artık kullanmayın.` };
  } catch (error) {
    const err = error as any;
    logger.error("İlk süper admin oluşturma hatası", { code: err.code });
    throw new HttpsError("internal", "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
  }
});

// İLK ADMIN OLUŞTURMA FONKSİYONU (Sadece bir kez kullanılmalı, sonra silinmeli veya devre dışı bırakılmalı)
// KULLANIM: Firebase Console > Functions > initializeFirstAdmin çalıştır
export const initializeFirstAdmin = onCall(async (request: any) => {
  const db = admin.firestore();
  
  // Sistemde admin var mı kontrol et
  const adminsSnapshot = await db.collection("users").where("role", "==", "admin").limit(1).get();
  
  if (!adminsSnapshot.empty) {
    throw new HttpsError(
      "already-exists",
      "Sistemde zaten admin kullanıcı mevcut. Bu fonksiyon devre dışı bırakıldı."
    );
  }
  
  const email = request.data.email;
  
  // Email validation
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    throw new HttpsError("invalid-argument", emailValidation.error!);
  }
  
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    
    await db.collection("users").doc(user.uid).update({
      role: "admin",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    logger.info("İlk admin kullanıcı oluşturuldu");
    return { message: `${email} ilk admin olarak atandı. Bu fonksiyonu artık kullanmayın.` };
  } catch (error) {
    const err = error as any;
    logger.error("İlk admin oluşturma hatası", { code: err.code });
    throw new HttpsError("internal", "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
  }
});

export const deleteUser = onCall(async (request: any) => {
  // Make sure the user is an admin.
  if (request.auth?.token.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Bu işlemi sadece adminler yapabilir."
    );
  }

  const uid = request.data.uid;
  if (!uid) {
    throw new HttpsError(
      "invalid-argument",
      "Kullanıcı ID'si belirtilmedi."
    );
  }

  try {
    await admin.auth().deleteUser(uid);
    logger.info("User deleted successfully");
    return { message: `Kullanıcı ${uid} başarıyla silindi.` };
  } catch (error) {
    const err = error as any;
    logger.error("Error deleting user", { code: err.code });
    throw new HttpsError(
      "internal",
      "Bir hata oluştu. Lütfen daha sonra tekrar deneyin."
    );
  }
});

// Süper admin tarafından bir kullanıcının rolünü ayarlayan fonksiyon
export const setRole = onCall(async (request: any) => {
  const context = request;
  const data = request.data || {};

  // 1. Güvenlik Kontrolü: Çağrıyı yapan kullanıcının süper admin olup olmadığını kontrol et.
  if (context.auth?.token.role !== "superadmin") {
    throw new HttpsError(
      "permission-denied",
      "Bu işlemi sadece süper adminler yapabilir."
    );
  }

  const { userId, newRole, campusId } = data;

  // 2. Veri Doğrulama
  if (!userId || !newRole) {
    throw new HttpsError(
      "invalid-argument",
      "Kullanıcı ID (userId) ve yeni rol (newRole) gereklidir."
    );
  }

  if (newRole === "admin" && !campusId) {
    throw new HttpsError(
      "invalid-argument",
      "Admin rolü için kampüs ID (campusId) gereklidir."
    );
  }

  try {
    // 3. Custom Claims Ayarlama
    const claims: { [key: string]: any } = {
      role: newRole,
    };

    if (newRole === "admin") {
      claims.campusId = campusId;
    } else {
      // Eğer rol admin değilse, olası bir campusId claim'ini kaldır
      claims.campusId = null;
    }

    // Süper adminlik rolünü koruma
    const userToUpdate = await admin.auth().getUser(userId);
    if (userToUpdate.customClaims?.role === "superadmin" && newRole !== "superadmin") {
      throw new HttpsError(
        "permission-denied",
        "Süper admin rolü bu fonksiyonla değiştirilemez."
      );
    }

    await admin.auth().setCustomUserClaims(userId, claims);

    // 4. Firestore'daki kullanıcı belgesini de güncelle
    await admin.firestore().collection("users").doc(userId).update({
      role: newRole,
      campusId: newRole === "admin" ? campusId : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      status: "success",
      message: `Kullanıcı ${userId} için rol ${newRole} olarak ayarlandı.`,
    };
  } catch (error) {
    const err = error as any;
    logger.error("Rol atama sırasında hata:", { code: err.code, message: err.message });
    throw new HttpsError(
      "internal",
      "Rol atama sırasında bir sunucu hatası oluştu."
    );
  }
});

// Süper adminlerin global rapor oluşturmasını sağlayan fonksiyon
export const generateGlobalReport = onCall(async (request: any) => {
  // Güvenlik Kontrolü: Sadece süper adminler rapor oluşturabilir.
  if (request.auth?.token.role !== "superadmin") {
    throw new HttpsError(
      "permission-denied",
      "Bu işlemi sadece süper adminler yapabilir."
    );
  }

  const { reportType } = request.data || {};

  if (!reportType) {
    throw new HttpsError("invalid-argument", "Rapor tipi (reportType) belirtilmelidir.");
  }

  const db = admin.firestore();

  switch (reportType) {
    case "bookActivityByCampus":
      try {
        const campusesSnapshot = await db.collection("campuses").get();
        const borrowedBooksSnapshot = await db.collection("borrowedBooks").get();

        const campusData = new Map<string, { name: string; borrowCount: number }>();
        campusesSnapshot.forEach(doc => {
          campusData.set(doc.id, { name: doc.data().name, borrowCount: 0 });
        });

        borrowedBooksSnapshot.forEach(doc => {
          const campusId = doc.data().campusId;
          if (campusId && campusData.has(campusId)) {
            const currentData = campusData.get(campusId)!;
            currentData.borrowCount += 1;
          }
        });

        const reportData = Array.from(campusData.values()).sort((a, b) => b.borrowCount - a.borrowCount);

        return {
          title: "Kampüs Bazında Kitap Aktivitesi",
          data: reportData,
        };

      } catch (error) {
        logger.error("Rapor oluşturulurken hata:", error);
        throw new HttpsError("internal", "Rapor oluşturulurken bir sunucu hatası oluştu.");
      }

    case "userGrowth":
      try {
        const campusesSnapshot = await db.collection("campuses").get();
        const usersSnapshot = await db.collection("users").get();
        
        const campusNames = new Map<string, string>();
        campusesSnapshot.forEach(doc => {
          campusNames.set(doc.id, doc.data().name);
        });

        const monthlyData = new Map<string, any>();

        usersSnapshot.forEach(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate();
          const campusId = data.campusId;
          
          if (createdAt) {
            const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData.has(monthKey)) {
              monthlyData.set(monthKey, { month: monthKey });
            }
            
            const monthData = monthlyData.get(monthKey);
            
            if (campusId && campusNames.has(campusId)) {
              const campusName = campusNames.get(campusId)!;
              monthData[campusName] = (monthData[campusName] || 0) + 1;
            } else {
              monthData["Atanmamış"] = (monthData["Atanmamış"] || 0) + 1;
            }
          }
        });

        const sortedData = Array.from(monthlyData.values())
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-12);

        const campusList = Array.from(new Set(
          sortedData.flatMap(item => Object.keys(item).filter(key => key !== 'month'))
        ));

        return {
          title: "Kullanıcı Büyüme Trendi (Son 12 Ay)",
          data: sortedData,
          campuses: campusList,
        };
      } catch (error) {
        logger.error("Rapor oluşturulurken hata:", error);
        throw new HttpsError("internal", "Rapor oluşturulurken bir sunucu hatası oluştu.");
      }

    case "categoryPopularity":
      try {
        const booksSnapshot = await db.collection("books").get();
        const borrowedBooksSnapshot = await db.collection("borrowedBooks").get();
        const campusesSnapshot = await db.collection("campuses").get();

        // Get all unique categories from books collection
        const allCategoriesSet = new Set<string>();
        booksSnapshot.forEach(doc => {
          const category = doc.data().category;
          if (category) allCategoriesSet.add(category);
        });

        const campusNames = new Map<string, string>();
        campusesSnapshot.forEach(doc => {
          campusNames.set(doc.id, doc.data().name);
        });

        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

        // Basic popularity data
        const categoryData = new Map<string, number>();
        // Campus-based data
        const categoryCampusData = new Map<string, any>();
        // Time-based data
        const monthlyData = new Map<string, any>();
        // Comparison data
        const categoryStats = new Map<string, any>();

        borrowedBooksSnapshot.forEach(doc => {
          const data = doc.data();
          const category = data.bookCategory || "Diğer";
          const campusId = data.campusId;
          const userId = data.userId;
          const borrowedAt = data.borrowedAt?.toDate();

          // Basic count
          categoryData.set(category, (categoryData.get(category) || 0) + 1);

          // Campus distribution
          if (!categoryCampusData.has(category)) {
            categoryCampusData.set(category, { category });
          }
          const campusData = categoryCampusData.get(category);
          if (campusId && campusNames.has(campusId)) {
            const campusName = campusNames.get(campusId)!;
            campusData[campusName] = (campusData[campusName] || 0) + 1;
          }

          // Time-based trend (last 6 months)
          if (borrowedAt && borrowedAt >= sixMonthsAgo) {
            const monthKey = `${borrowedAt.getFullYear()}-${String(borrowedAt.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData.has(monthKey)) {
              monthlyData.set(monthKey, { month: monthKey });
            }
            const monthData = monthlyData.get(monthKey);
            monthData[category] = (monthData[category] || 0) + 1;
          }

          // Comparison stats
          if (!categoryStats.has(category)) {
            categoryStats.set(category, {
              name: category,
              totalBorrows: 0,
              uniqueUsers: new Set(),
              campusDistribution: new Map(),
            });
          }
          const stats = categoryStats.get(category);
          stats.totalBorrows += 1;
          if (userId) stats.uniqueUsers.add(userId);
          if (campusId && campusNames.has(campusId)) {
            const campusName = campusNames.get(campusId)!;
            stats.campusDistribution.set(campusName, (stats.campusDistribution.get(campusName) || 0) + 1);
          }
        });

        // Process basic popularity
        const allCategories = Array.from(categoryData.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        const top10 = allCategories.slice(0, 10);
        const totalBorrows = allCategories.reduce((sum, cat) => sum + cat.count, 0);

        // Process campus-based data
        const campusAnalysis = Array.from(categoryCampusData.values())
          .map(item => {
            const total = Object.keys(item).filter(k => k !== 'category').reduce((sum, k) => sum + (item[k] || 0), 0);
            return { ...item, total };
          })
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
        const campusList = Array.from(new Set(
          campusAnalysis.flatMap(item => Object.keys(item).filter(key => key !== 'category' && key !== 'total'))
        ));

        // Process time-based data
        const trendData = Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
        const categoryTotals = new Map<string, number>();
        trendData.forEach(monthData => {
          Object.keys(monthData).filter(k => k !== 'month').forEach(category => {
            categoryTotals.set(category, (categoryTotals.get(category) || 0) + monthData[category]);
          });
        });
        const topTrendCategories = Array.from(categoryTotals.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cat]) => cat);

        // Process comparison data
        const comparisonCategories = Array.from(categoryStats.entries())
          .map(([name, stats]) => ({
            name,
            totalBorrows: stats.totalBorrows,
            uniqueUsers: stats.uniqueUsers.size,
            avgBorrowsPerUser: (stats.totalBorrows / stats.uniqueUsers.size).toFixed(1),
            campusDistribution: Array.from(stats.campusDistribution.entries()).map((entry: any) => ({ campus: entry[0], count: entry[1] })),
          }))
          .sort((a, b) => b.totalBorrows - a.totalBorrows);

        return {
          title: "Kategori Popülerliği Analizi",
          // Basic popularity
          data: top10,
          totalCategories: allCategories.length,
          totalBorrows: totalBorrows,
          topCategory: allCategories[0],
          // Campus analysis
          campusAnalysis: campusAnalysis,
          campuses: campusList,
          // Trend analysis
          trendData: trendData,
          trendCategories: topTrendCategories,
          // Comparison
          comparisonCategories: comparisonCategories,
        };
      } catch (error) {
        logger.error("Rapor oluşturulurken hata:", error);
        throw new HttpsError("internal", "Rapor oluşturulurken bir sunucu hatası oluştu.");
      }

    case "activeUsers":
      try {
        const usersSnapshot = await db.collection("users").get();
        const borrowedBooksSnapshot = await db.collection("borrowedBooks").get();

        const userActivity = new Map<string, { name: string; email: string; borrowCount: number; level: number }>();

        usersSnapshot.forEach(doc => {
          const data = doc.data();
          userActivity.set(doc.id, {
            name: data.displayName || "İsimsiz",
            email: data.email || "",
            borrowCount: 0,
            level: data.level || 1,
          });
        });

        borrowedBooksSnapshot.forEach(doc => {
          const userId = doc.data().userId;
          if (userId && userActivity.has(userId)) {
            userActivity.get(userId)!.borrowCount += 1;
          }
        });

        const reportData = Array.from(userActivity.values())
          .filter(user => user.borrowCount > 0)
          .sort((a, b) => b.borrowCount - a.borrowCount)
          .slice(0, 20)
          .map((user, index) => ({ rank: index + 1, ...user }));

        return {
          title: "En Aktif Kullanıcılar (Top 20)",
          data: reportData,
        };
      } catch (error) {
        logger.error("Rapor oluşturulurken hata:", error);
        throw new HttpsError("internal", "Rapor oluşturulurken bir sunucu hatası oluştu.");
      }

    case "campusCategoryAnalysis":
      try {
        const campusesSnapshot = await db.collection("campuses").get();
        const borrowedBooksSnapshot = await db.collection("borrowedBooks").get();

        const campusNames = new Map<string, string>();
        campusesSnapshot.forEach(doc => {
          campusNames.set(doc.id, doc.data().name);
        });

        const categoryData = new Map<string, any>();

        borrowedBooksSnapshot.forEach(doc => {
          const data = doc.data();
          const category = data.bookCategory || "Diğer";
          const campusId = data.campusId;

          if (!categoryData.has(category)) {
            categoryData.set(category, { category });
          }

          const catData = categoryData.get(category);

          if (campusId && campusNames.has(campusId)) {
            const campusName = campusNames.get(campusId)!;
            catData[campusName] = (catData[campusName] || 0) + 1;
          } else {
            catData["Atanmamış"] = (catData["Atanmamış"] || 0) + 1;
          }
        });

        const sortedData = Array.from(categoryData.values())
          .map(item => {
            const total = Object.keys(item).filter(k => k !== 'category').reduce((sum, k) => sum + (item[k] || 0), 0);
            return { ...item, total };
          })
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

        const campusList = Array.from(new Set(
          sortedData.flatMap(item => Object.keys(item).filter(key => key !== 'category' && key !== 'total'))
        ));

        return {
          title: "Kampüs Bazında Kategori Analizi (Top 10)",
          data: sortedData,
          campuses: campusList,
        };
      } catch (error) {
        logger.error("Rapor oluşturulurken hata:", error);
        throw new HttpsError("internal", "Rapor oluşturulurken bir sunucu hatası oluştu.");
      }

    case "categoryTrend":
      try {
        const borrowedBooksSnapshot = await db.collection("borrowedBooks").get();
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

        const monthlyData = new Map<string, any>();
        const allCategories = new Set<string>();

        borrowedBooksSnapshot.forEach(doc => {
          const data = doc.data();
          const borrowedAt = data.borrowedAt?.toDate();
          const category = data.bookCategory || "Diğer";

          if (borrowedAt && borrowedAt >= sixMonthsAgo) {
            const monthKey = `${borrowedAt.getFullYear()}-${String(borrowedAt.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData.has(monthKey)) {
              monthlyData.set(monthKey, { month: monthKey });
            }

            const monthData = monthlyData.get(monthKey);
            monthData[category] = (monthData[category] || 0) + 1;
            allCategories.add(category);
          }
        });

        const sortedData = Array.from(monthlyData.values())
          .sort((a, b) => a.month.localeCompare(b.month));

        // Get top 5 categories by total borrows
        const categoryTotals = new Map<string, number>();
        sortedData.forEach(monthData => {
          Object.keys(monthData).filter(k => k !== 'month').forEach(category => {
            categoryTotals.set(category, (categoryTotals.get(category) || 0) + monthData[category]);
          });
        });

        const topCategories = Array.from(categoryTotals.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cat]) => cat);

        return {
          title: "Kategori Popülerlik Trendi (Son 6 Ay)",
          data: sortedData,
          categories: topCategories,
        };
      } catch (error) {
        logger.error("Rapor oluşturulurken hata:", error);
        throw new HttpsError("internal", "Rapor oluşturulurken bir sunucu hatası oluştu.");
      }

    case "categoryComparison":
      try {
        const borrowedBooksSnapshot = await db.collection("borrowedBooks").get();
        const campusesSnapshot = await db.collection("campuses").get();

        const campusNames = new Map<string, string>();
        campusesSnapshot.forEach(doc => {
          campusNames.set(doc.id, doc.data().name);
        });

        // Get all categories
        const categoryStats = new Map<string, any>();

        borrowedBooksSnapshot.forEach(doc => {
          const data = doc.data();
          const category = data.bookCategory || "Diğer";
          const userId = data.userId;
          const campusId = data.campusId;

          if (!categoryStats.has(category)) {
            categoryStats.set(category, {
              name: category,
              totalBorrows: 0,
              uniqueUsers: new Set(),
              campusDistribution: new Map(),
            });
          }

          const stats = categoryStats.get(category);
          stats.totalBorrows += 1;
          if (userId) stats.uniqueUsers.add(userId);
          
          if (campusId && campusNames.has(campusId)) {
            const campusName = campusNames.get(campusId)!;
            stats.campusDistribution.set(campusName, (stats.campusDistribution.get(campusName) || 0) + 1);
          }
        });

        // Convert to array and get top categories
        const allCategories = Array.from(categoryStats.entries())
          .map(([name, stats]) => ({
            name,
            totalBorrows: stats.totalBorrows,
            uniqueUsers: stats.uniqueUsers.size,
            avgBorrowsPerUser: (stats.totalBorrows / stats.uniqueUsers.size).toFixed(1),
            campusDistribution: Array.from(stats.campusDistribution.entries()).map((entry: any) => ({ campus: entry[0], count: entry[1] })),
          }))
          .sort((a, b) => b.totalBorrows - a.totalBorrows);

        return {
          title: "Kategori Karşılaştırma",
          categories: allCategories,
        };
      } catch (error) {
        logger.error("Rapor oluşturulurken hata:", error);
        throw new HttpsError("internal", "Rapor oluşturulurken bir sunucu hatası oluştu.");
      }

    case "campusBudgets":
      try {
        const [campusesSnapshot, transactionsSnapshot] = await Promise.all([
          db.collection("campuses").get(),
          db.collection("transactions").get(),
        ]);
        
        const campusNames = new Map<string, string>();
        campusesSnapshot.forEach(doc => {
          campusNames.set(doc.id, doc.data().name || "İsimsiz Kampüs");
        });

        const campusBudgets = new Map<string, number>();
        transactionsSnapshot.forEach(doc => {
          const data = doc.data();
          const campusId = data.campusId;
          const amount = data.amount || 0;
          
          if (campusId) {
            campusBudgets.set(campusId, (campusBudgets.get(campusId) || 0) + amount);
          }
        });

        const budgetData = Array.from(campusBudgets.entries())
          .map(([campusId, budget]) => ({
            id: campusId,
            name: campusNames.get(campusId) || "Bilinmeyen Kampüs",
            budget,
          }))
          .sort((a, b) => b.budget - a.budget);

        const totalBudget = budgetData.reduce((sum, campus) => sum + campus.budget, 0);
        const avgBudget = budgetData.length > 0 ? totalBudget / budgetData.length : 0;

        return {
          title: "Kampüs Bütçeleri",
          data: budgetData,
          totalBudget,
          avgBudget: avgBudget.toFixed(2),
          campusCount: budgetData.length,
        };
      } catch (error) {
        logger.error("Rapor oluşturulurken hata:", error);
        throw new HttpsError("internal", "Rapor oluşturulurken bir sunucu hatası oluştu.");
      }

    default:
      throw new HttpsError("not-found", `'${reportType}' adında bir rapor bulunamadı.`);
  }
});

export const updateMonthlyLeaderboard = onSchedule("every 1 hours", async () => {
  logger.info("Starting monthly leaderboard update...");

  try {
    const db = admin.firestore();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Fetch all users and borrows
    const [usersSnapshot, borrowedBooksSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("borrowedBooks").get(),
    ]);

    const users = new Map<string, { name: string; studentClass: string }>();
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      users.set(doc.id, { name: data.displayName, studentClass: data.studentClass });
    });

    // 2. Calculate reads for each user this month
    const userReadCounts = new Map<string, number>();
    borrowedBooksSnapshot.forEach(doc => {
      const borrow = doc.data();
      const borrowDate = borrow.borrowedAt?.toDate();

      if (borrowDate && borrowDate >= startOfMonth && borrowDate <= endOfMonth) {
        const userId = borrow.userId;
        userReadCounts.set(userId, (userReadCounts.get(userId) || 0) + 1);
      }
    });

    // 3. Create and sort the leaderboard array
    const leaderboardData = Array.from(userReadCounts.entries()).map(([userId, count]) => {
      const userData = users.get(userId);
      return {
        userId: userId,
        name: userData?.name || "Bilinmeyen Kullanıcı",
        studentClass: userData?.studentClass || "N/A",
        count: count,
      };
    });

    leaderboardData.sort((a, b) => b.count - a.count);

    // 4. Save the result to a dedicated document
    const leaderboardDocRef = db.collection("leaderboards").doc("monthly");
    await leaderboardDocRef.set({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      leaderboard: leaderboardData,
    });

    logger.info("Successfully updated monthly leaderboard.");
  } catch (error) {
    logger.error("Error updating monthly leaderboard:", error);
  }
});

// Güvenli URL whitelist
const ALLOWED_IMAGE_DOMAINS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'lh3.googleusercontent.com',
  'i.dr.com.tr',
  'img.kitapyurdu.com',
  'resimlink.com'
];

function isUrlSafe(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    // Sadece HTTPS izin ver
    if (url.protocol !== 'https:') return false;
    // Localhost ve private IP'leri engelle
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || 
        url.hostname.startsWith('192.168.') || url.hostname.startsWith('10.') ||
        url.hostname.startsWith('172.')) return false;
    // Whitelist kontrolü
    return ALLOWED_IMAGE_DOMAINS.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

export const imageProxy = onRequest({ cors: true }, async (req, res) => {
  const imageUrl = req.query.url as string;

  if (!imageUrl) {
    res.status(400).send("No image URL specified.");
    return;
  }

  // SSRF koruması
  if (!isUrlSafe(imageUrl)) {
    res.status(403).send("URL not allowed");
    return;
  }

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      timeout: 5000,
      maxRedirects: 0,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
      }
    });
    
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    response.data.pipe(res);
  } catch (error) {
    logger.error("Image proxy error");
    res.status(500).send("Error proxying image");
  }
});


// ============================================
// KÜTÜPHANE ASISTANI SOHBET BOTU
// ============================================

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import QRCode from "qrcode";

import { defineSecret } from "firebase-functions/params";
import { sanitizeInput, validateMessage, validateEmail, MIN_MESSAGE_LENGTH } from "./security";

// AWS kimlik bilgileri Secret Manager'dan alınıyor (güvenli)
const awsAccessKeyId = defineSecret("AWS_ACCESS_KEY_ID");
const awsSecretAccessKey = defineSecret("AWS_SECRET_ACCESS_KEY");

// Rate limiting sabitleri
const HOURLY_LIMIT = 10; // Saatte maksimum 10 mesaj
const DAILY_LIMIT = 30; // Günde maksimum 30 mesaj
const MINUTE_LIMIT = 3; // Dakikada maksimum 3 mesaj

// Admin rate limiting sabitleri (daha yüksek)
const ADMIN_HOURLY_LIMIT = 50;
const ADMIN_DAILY_LIMIT = 200;
const ADMIN_MINUTE_LIMIT = 10;

// Fallback yanıtları
const FALLBACK_RESPONSES = [
  "Merhaba! Şu anda teknik bir sorun yaşıyorum ama yardımcı olmaya çalışacağım. Kütüphane saatleri, kitap önerileri veya okuma istatistiklerin hakkında sormak istediğin bir şey var mı?",
  "Sistemde geçici bir aksaklık var. Lütfen biraz sonra tekrar dene veya kütüphane görevlilerimizden yardım isteyebilirsin.",
  "Maalesef şu anda sana tam olarak yardımcı olamayacağım. Kütüphane uygulamasındaki diğer özellikleri kullanabilir veya daha sonra tekrar deneyebilirsin.",
];

function getFallbackResponse(userMessage: string, userContext: any): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("öner") || lowerMessage.includes("kitap")) {
    if (userContext.recommendedBooks.length > 0) {
      return `Merhaba ${userContext.name}! Şu anda AI asistanımız çevrimdışı, ama sana favori kategorilerinden birkaç kitap önerebilirim:\n\n${userContext.recommendedBooks.slice(0, 3).join("\n")}\n\nDaha fazla bilgi için lütfen daha sonra tekrar dene!`;
    }
    return `Merhaba ${userContext.name}! Kütüphanemizde ${userContext.availableBooksCount} kitap mevcut. Detaylı öneriler için lütfen biraz sonra tekrar dene.`;
  }

  if (lowerMessage.includes("istatistik") || lowerMessage.includes("kaç") || lowerMessage.includes("sayı")) {
    return `Merhaba ${userContext.name}! İşte okuma istatistiklerin:\n\n📚 Toplam okunan kitap: ${userContext.totalBorrowedBooks}\n📖 Şu an okuduğun: ${userContext.currentBooksCount}\n✅ Tamamlanan: ${userContext.completedBooksCount}\n🎯 Seviye: ${userContext.level} (${userContext.xp} XP)\n\nDetaylı analiz için lütfen biraz sonra tekrar dene!`;
  }

  if (lowerMessage.includes("ceza") || lowerMessage.includes("borç")) {
    if (userContext.activePenaltiesCount > 0) {
      return `Merhaba ${userContext.name}! ${userContext.activePenaltiesCount} adet aktif cezan var. Toplam tutar: ${userContext.totalPenaltyAmount} TL. Lütfen kütüphane görevlilerimizle iletişime geç.`;
    }
    return `Merhaba ${userContext.name}! Herhangi bir cezan bulunmuyor. 🎉`;
  }

  const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
  return FALLBACK_RESPONSES[randomIndex];
}

// Admin action rate limiting (kritik işlemler için)
async function checkAdminActionRateLimit(userId: string, action: string): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const db = admin.firestore();
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const rateLimitDoc = db.collection("adminActionLimits").doc(`${userId}_${action}`);
  const doc = await rateLimitDoc.get();
  const data = doc.data();

  const hourlyActions = (data?.hourlyActions || []).filter((ts: any) => ts.toDate() > hourAgo);

  const ACTION_LIMIT = 5; // Saatte maksimum 5 kritik işlem

  if (hourlyActions.length >= ACTION_LIMIT) {
    const oldestAction = hourlyActions[0].toDate();
    const resetTime = new Date(oldestAction.getTime() + 60 * 60 * 1000);
    return { allowed: false, remaining: 0, resetTime };
  }

  hourlyActions.push(admin.firestore.Timestamp.now());

  await rateLimitDoc.set({
    hourlyActions,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    allowed: true,
    remaining: ACTION_LIMIT - hourlyActions.length,
    resetTime: new Date(now.getTime() + 60 * 60 * 1000),
  };
}

// Admin rate limiting kontrolü
async function checkAdminRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const db = admin.firestore();
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60 * 1000);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const rateLimitDoc = db.collection("adminRateLimits").doc(userId);
  const doc = await rateLimitDoc.get();
  const data = doc.data();

  const minuteMessages = (data?.minuteMessages || []).filter((ts: any) => ts.toDate() > minuteAgo);
  const hourlyMessages = (data?.hourlyMessages || []).filter((ts: any) => ts.toDate() > hourAgo);
  const dailyMessages = (data?.dailyMessages || []).filter((ts: any) => ts.toDate() > dayAgo);

  if (minuteMessages.length >= ADMIN_MINUTE_LIMIT) {
    const oldestMinute = minuteMessages[0].toDate();
    const resetTime = new Date(oldestMinute.getTime() + 60 * 1000);
    return { allowed: false, remaining: 0, resetTime };
  }

  if (hourlyMessages.length >= ADMIN_HOURLY_LIMIT) {
    const oldestHourly = hourlyMessages[0].toDate();
    const resetTime = new Date(oldestHourly.getTime() + 60 * 60 * 1000);
    return { allowed: false, remaining: 0, resetTime };
  }

  if (dailyMessages.length >= ADMIN_DAILY_LIMIT) {
    const oldestDaily = dailyMessages[0].toDate();
    const resetTime = new Date(oldestDaily.getTime() + 24 * 60 * 60 * 1000);
    return { allowed: false, remaining: 0, resetTime };
  }

  minuteMessages.push(admin.firestore.Timestamp.now());
  hourlyMessages.push(admin.firestore.Timestamp.now());
  dailyMessages.push(admin.firestore.Timestamp.now());

  await rateLimitDoc.set({
    minuteMessages,
    hourlyMessages,
    dailyMessages,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    allowed: true,
    remaining: Math.min(ADMIN_MINUTE_LIMIT - minuteMessages.length, ADMIN_HOURLY_LIMIT - hourlyMessages.length, ADMIN_DAILY_LIMIT - dailyMessages.length),
    resetTime: new Date(now.getTime() + 60 * 1000),
  };
}

// Rate limiting kontrolü
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const db = admin.firestore();
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60 * 1000);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const rateLimitDoc = db.collection("rateLimits").doc(userId);
  const doc = await rateLimitDoc.get();
  const data = doc.data();

  const minuteMessages = (data?.minuteMessages || []).filter((ts: any) => ts.toDate() > minuteAgo);
  const hourlyMessages = (data?.hourlyMessages || []).filter((ts: any) => ts.toDate() > hourAgo);
  const dailyMessages = (data?.dailyMessages || []).filter((ts: any) => ts.toDate() > dayAgo);

  // Dakikalık limit kontrolü
  if (minuteMessages.length >= MINUTE_LIMIT) {
    const oldestMinute = minuteMessages[0].toDate();
    const resetTime = new Date(oldestMinute.getTime() + 60 * 1000);
    return { allowed: false, remaining: 0, resetTime };
  }

  // Saatlik limit kontrolü
  if (hourlyMessages.length >= HOURLY_LIMIT) {
    const oldestHourly = hourlyMessages[0].toDate();
    const resetTime = new Date(oldestHourly.getTime() + 60 * 60 * 1000);
    return { allowed: false, remaining: 0, resetTime };
  }

  // Günlük limit kontrolü
  if (dailyMessages.length >= DAILY_LIMIT) {
    const oldestDaily = dailyMessages[0].toDate();
    const resetTime = new Date(oldestDaily.getTime() + 24 * 60 * 60 * 1000);
    return { allowed: false, remaining: 0, resetTime };
  }

  // Mesaj sayısını güncelle
  minuteMessages.push(admin.firestore.Timestamp.now());
  hourlyMessages.push(admin.firestore.Timestamp.now());
  dailyMessages.push(admin.firestore.Timestamp.now());

  await rateLimitDoc.set({
    minuteMessages,
    hourlyMessages,
    dailyMessages,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    allowed: true,
    remaining: Math.min(MINUTE_LIMIT - minuteMessages.length, HOURLY_LIMIT - hourlyMessages.length, DAILY_LIMIT - dailyMessages.length),
    resetTime: new Date(now.getTime() + 60 * 1000),
  };
}

// Kullanıcı context'ini Firestore'dan çek
async function getUserContext(userId: string) {
  const db = admin.firestore();
  
  try {
    // Kullanıcı bilgileri
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    // Ödünç alınan kitaplar, cezalar ve yorumlar paralel çek
    const [borrowedBooksSnapshot, penaltiesSnapshot, booksSnapshot, reviewsSnapshot] = await Promise.all([
      db.collection("borrowedBooks").where("userId", "==", userId).get(),
      db.collection("penalties").where("userId", "==", userId).get(),
      db.collection("books").limit(100).get(),
      db.collection("reviews").get(),
    ]);

    const borrowedBooks = borrowedBooksSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        title: data.bookTitle,
        author: data.bookAuthor,
        category: data.bookCategory,
        bookId: data.bookId,
        borrowedAt: data.borrowedAt?.toDate(),
        returnedAt: data.returnedAt?.toDate(),
      };
    });

    // Cezalar
    const penalties = penaltiesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        reason: data.reason,
        amount: data.amount,
        isPaid: data.isPaid,
        createdAt: data.createdAt?.toDate(),
      };
    });

    const activePenalties = penalties.filter(p => !p.isPaid);
    const totalPenaltyAmount = activePenalties.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Şu an okuduğu kitaplar
    const currentBooks = borrowedBooks.filter(book => !book.returnedAt);

    // Tamamlanan kitaplar
    const completedBooks = borrowedBooks.filter(book => book.returnedAt);

    // Favori kategoriler (en çok ödünç alınan)
    const categoryCount = new Map<string, number>();
    borrowedBooks.forEach(book => {
      if (book.category) {
        categoryCount.set(book.category, (categoryCount.get(book.category) || 0) + 1);
      }
    });
    const favoriteCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    // Favori yazarlar
    const authorCount = new Map<string, number>();
    borrowedBooks.forEach(book => {
      if (book.author) {
        authorCount.set(book.author, (authorCount.get(book.author) || 0) + 1);
      }
    });
    const favoriteAuthors = Array.from(authorCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([author]) => author);

    // Kütüphanedeki mevcut kitaplar (kategorilere ve tag'lere göre grupla)
    const availableBooks = booksSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          title: data.title,
          author: data.author,
          category: data.category,
          tags: data.tags || [],
          pageCount: data.pageCount || 0,
          available: data.available,
        };
      })
      .filter(book => book.available);

    // Kullanıcının favori kategorilerinden öneriler
    const recommendedBooks = availableBooks
      .filter(book => favoriteCategories.includes(book.category))
      .slice(0, 10)
      .map(b => `${b.title} - ${b.author}`);

    // Benzer kitap önerileri için okunan kitapların detayları
    const readBooksDetails = completedBooks.slice(-3).map(book => {
      const matchingBook = booksSnapshot.docs.find(doc => doc.data().title === book.title);
      if (matchingBook) {
        const data = matchingBook.data();
        return {
          title: book.title,
          author: book.author,
          category: data.category,
          tags: data.tags || [],
        };
      }
      return null;
    }).filter(b => b !== null);

    // Okunan kitaplara benzer kitaplar bul
    const similarBooks: string[] = [];
    readBooksDetails.forEach(readBook => {
      if (readBook) {
        availableBooks.forEach(availBook => {
          if (availBook.title !== readBook.title) {
            const hasSameCategory = availBook.category === readBook.category;
            const hasCommonTags = readBook.tags.some((tag: string) => availBook.tags.includes(tag));
            if ((hasSameCategory || hasCommonTags) && !similarBooks.includes(`${availBook.title} - ${availBook.author}`)) {
              similarBooks.push(`${availBook.title} - ${availBook.author} (${readBook.title} kitabına benzer)`);
            }
          }
        });
      }
    });

    // Tag'lere göre grupla (örn: korku, macera, bilim-kurgu)
    const booksByTags = new Map<string, string[]>();
    availableBooks.forEach(book => {
      if (book.tags && Array.isArray(book.tags)) {
        book.tags.forEach((tag: string) => {
          if (!booksByTags.has(tag)) {
            booksByTags.set(tag, []);
          }
          booksByTags.get(tag)!.push(`${book.title} - ${book.author}`);
        });
      }
    });

    // Tag listesini string olarak hazırla
    const availableTags = Array.from(booksByTags.keys()).join(", ");
    const tagBasedBooks: { [key: string]: string[] } = {};
    booksByTags.forEach((books, tag) => {
      tagBasedBooks[tag] = books.slice(0, 5);
    });

    // Sayfa sayısına göre grupla
    const booksByPageCount = {
      short: availableBooks.filter(b => b.pageCount > 0 && b.pageCount < 150).map(b => `${b.title} - ${b.author} (${b.pageCount} sayfa)`),
      medium: availableBooks.filter(b => b.pageCount >= 150 && b.pageCount <= 300).map(b => `${b.title} - ${b.author} (${b.pageCount} sayfa)`),
      long: availableBooks.filter(b => b.pageCount > 300).map(b => `${b.title} - ${b.author} (${b.pageCount} sayfa)`),
    };

    // Kitapların ortalama puanlarını hesapla
    const bookRatings = new Map<string, { totalRating: number; count: number }>();
    reviewsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const bookId = data.bookId;
      const rating = data.rating;
      if (bookId && rating) {
        if (!bookRatings.has(bookId)) {
          bookRatings.set(bookId, { totalRating: 0, count: 0 });
        }
        const current = bookRatings.get(bookId)!;
        current.totalRating += rating;
        current.count += 1;
      }
    });

    // Yüksek puanlı kitapları bul (4+ yıldız ve en az 3 yorum)
    const highRatedBooks: string[] = [];
    booksSnapshot.docs.forEach(doc => {
      const bookData = doc.data();
      const bookId = doc.id;
      const ratingData = bookRatings.get(bookId);
      if (ratingData && ratingData.count >= 3) {
        const avgRating = ratingData.totalRating / ratingData.count;
        if (avgRating >= 4.0 && bookData.available) {
          highRatedBooks.push(`${bookData.title} - ${bookData.author} (⭐ ${avgRating.toFixed(1)})`);
        }
      }
    });

    // Puana göre sırala
    highRatedBooks.sort((a, b) => {
      const ratingA = parseFloat(a.match(/⭐ ([\d.]+)/)?.[1] || "0");
      const ratingB = parseFloat(b.match(/⭐ ([\d.]+)/)?.[1] || "0");
      return ratingB - ratingA;
    });

    // Yazarlara göre kitapları grupla
    const booksByAuthor = new Map<string, string[]>();
    availableBooks.forEach(book => {
      if (book.author) {
        if (!booksByAuthor.has(book.author)) {
          booksByAuthor.set(book.author, []);
        }
        booksByAuthor.get(book.author)!.push(book.title);
      }
    });

    // En çok kitabı olan yazarları bul
    const topAuthors = Array.from(booksByAuthor.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .map(([author, books]) => `${author} (${books.length} kitap): ${books.slice(0, 3).join(", ")}`);

    return {
      name: userData?.displayName || "Kullanıcı",
      email: userData?.email || "",
      level: userData?.level || 1,
      xp: userData?.xp || 0,
      studentClass: userData?.studentClass || "",
      totalBorrowedBooks: borrowedBooks.length,
      currentBooksCount: currentBooks.length,
      completedBooksCount: completedBooks.length,
      currentBooks: currentBooks.map(b => `${b.title} - ${b.author}`),
      recentBooks: completedBooks.slice(-5).map(b => `${b.title} - ${b.author}`),
      favoriteCategories,
      favoriteAuthors,
      activePenaltiesCount: activePenalties.length,
      totalPenaltyAmount,
      penaltyDetails: activePenalties.map(p => `${p.reason} (${p.amount} TL)`),
      availableBooksCount: availableBooks.length,
      recommendedBooks,
      availableTags,
      tagBasedBooks,
      booksByPageCount,
      similarBooks: similarBooks.slice(0, 10),
      highRatedBooks: highRatedBooks.slice(0, 10),
      topAuthors,
      booksByAuthor: Object.fromEntries(booksByAuthor),
    };
  } catch (error) {
    logger.error("Error fetching user context");
    return {
      name: "Kullanıcı",
      email: "",
      level: 1,
      xp: 0,
      studentClass: "",
      totalBorrowedBooks: 0,
      currentBooksCount: 0,
      completedBooksCount: 0,
      currentBooks: [],
      recentBooks: [],
      favoriteCategories: [],
      favoriteAuthors: [],
      activePenaltiesCount: 0,
      totalPenaltyAmount: 0,
      penaltyDetails: [],
      availableBooksCount: 0,
      recommendedBooks: [],
      availableTags: "",
      tagBasedBooks: {},
      booksByPageCount: { short: [], medium: [], long: [] },
      similarBooks: [],
      highRatedBooks: [],
      topAuthors: [],
      booksByAuthor: {},
    };
  }
}

// Amazon Bedrock ile sohbet (retry mekanizması ile)
async function chatWithBedrock(userMessage: string, userContext: any, retryCount = 0): Promise<string> {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000;

  const bedrockClient = new BedrockRuntimeClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: awsAccessKeyId.value(),
      secretAccessKey: awsSecretAccessKey.value(),
    },
  });
  const systemPrompt = `Sen "Kitap Dostu" adlı bir kütüphane asistanısın. Öğrencilere kitap öneren, okuma motivasyonu sağlayan ve kütüphane hakkında bilgi veren yardımcı bir arkadaşsın.

=== KULLANICI PROFİLİ ===
İsim: ${userContext.name} | Seviye: ${userContext.level} (${userContext.xp} XP) | Sınıf: ${userContext.studentClass}

OKUMA İSTATİSTİKLERİ:
• Toplam okunan: ${userContext.totalBorrowedBooks} kitap
• Şu an okuyor: ${userContext.currentBooksCount} kitap
• Tamamlanan: ${userContext.completedBooksCount} kitap
• Şu anki kitaplar: ${userContext.currentBooks.join(", ") || "Yok"}
• Son okunanlar: ${userContext.recentBooks.join(", ") || "Yok"}
• Favori kategoriler: ${userContext.favoriteCategories.join(", ") || "Henüz yok"}
• Favori yazarlar: ${userContext.favoriteAuthors.join(", ") || "Henüz yok"}

CEZA DURUMU:
${userContext.activePenaltiesCount > 0 ? `⚠️ ${userContext.activePenaltiesCount} aktif ceza (${userContext.totalPenaltyAmount} TL) - ${userContext.penaltyDetails.join(", ")}` : "✅ Ceza yok"}

KÜTÜPHANE ENVANTERİ:
• Mevcut kitap: ${userContext.availableBooksCount}
• Sana özel öneriler: ${userContext.recommendedBooks.slice(0, 5).join(", ") || "Henüz yok"}
• Mevcut türler/tag'ler: ${userContext.availableTags || "Henüz yok"}

TÜRE GÖRE KİTAPLAR:
${Object.entries(userContext.tagBasedBooks || {}).slice(0, 5).map(([tag, books]: [string, any]) => `• ${tag}: ${books.slice(0, 3).join(", ")}`).join("\n") || "Henüz yok"}

SAYFA SAYISINA GÖRE KİTAPLAR:
• Kısa (150 sayfa altı): ${userContext.booksByPageCount?.short?.slice(0, 3).join(", ") || "Yok"}
• Orta (150-300 sayfa): ${userContext.booksByPageCount?.medium?.slice(0, 3).join(", ") || "Yok"}
• Uzun (300+ sayfa): ${userContext.booksByPageCount?.long?.slice(0, 3).join(", ") || "Yok"}

BENZER KİTAP ÖNERİLERİ (Okuduğun kitaplara benzer):
${userContext.similarBooks?.slice(0, 5).join("\n") || "Henüz yok"}

YÜKSEK PUANLI KİTAPLAR (4+ yıldız):
${userContext.highRatedBooks?.slice(0, 5).join("\n") || "Henüz yok"}

YAZARLARA GÖRE KİTAPLAR:
${userContext.topAuthors?.slice(0, 5).join("\n") || "Henüz yok"}

=== YANIT KURALLARI ===

1. TON & ÜSLUP:
   - Samimi, arkadaşça ama saygılı
   - Motive edici ama baskıcı değil
   - Emoji kullan (max 3-4 emoji/yanıt)
   - Kısa ve öz yanıtlar (max 150 kelime)

2. KİTAP ÖNERİLERI:
   - Maksimum 3-5 kitap öner
   - Liste formatında sun
   - Her kitap için: Başlık - Yazar - Kısa açıklama (1 cümle)
   - Önce favori kategorilerinden, sonra benzer kategorilerden öner
   - SADECE kütüphanede mevcut kitaplardan öner
   - Neden önerdiğini kısaca açıkla

3. İSTATİSTİKLER:
   - Emoji + sayısal veri formatında
   - Kısa ve görsel
   - Pozitif vurgu yap

4. CEZA HATIRLATMA:
   - Nazik ve yargılamadan
   - Çözüm odaklı
   - SADECE sorulduğunda veya alakalı olduğunda bahset

5. KAPSAM SINIRLARI:
   - SADECE kütüphane, kitap ve okuma konularında yanıt ver
   - Ödev yapma, kitap özetleme isteklerini nazikçe reddet
   - Kişisel sorunlar için rehber öğretmene yönlendir
   - Kütüphane dışı sorulara: "Bu konuda yardımcı olamam ama kütüphane hakkında sormak istediğin bir şey var mı?"

6. ÖRNEK YANITLAR:
   • Kitap isteği: "Merhaba ${userContext.name}! 👋 Senin için harika kitaplar buldum:\n\n1. [Kitap] - [Yazar]: [Neden öneriyorum]\n2. [Kitap] - [Yazar]: [Neden öneriyorum]\n\nHangisini okumak istersin? 📚"
   • İstatistik: "🎉 Harika gidiyorsun! Şimdiye kadar ${userContext.totalBorrowedBooks} kitap okudun. Seviye ${userContext.level}'desin!"
   • Kapsam dışı: "Bu konuda yardımcı olamam 😊 Ama sana güzel kitaplar önerebilirim!"

=== ÖNEMLİ ===
Her yanıtı kullanıcının profil verilerine göre kişiselleştir. Kısa, öz ve motive edici ol!`;

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `${systemPrompt}\n\nKullanıcı Mesajı: ${userMessage}`,
      },
    ],
  };

  try {
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-haiku-20240307-v1:0", // Ucuz ve hızlı model
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  } catch (error: any) {
    const err = error as any;
    logger.error(`Bedrock API Error (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`, { code: err.code, statusCode: err.$metadata?.httpStatusCode });

    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying Bedrock API call in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return chatWithBedrock(userMessage, userContext, retryCount + 1);
    }

    logger.error("All Bedrock retry attempts failed, using fallback response");
    return getFallbackResponse(userMessage, userContext);
  }
}

// Chat Function
export const chatWithAssistant = onCall(
  { secrets: [awsAccessKeyId, awsSecretAccessKey] },
  async (request: any) => {
  // Kullanıcı doğrulama
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  }

  const userId = request.auth.uid;
  const rawMessage = request.data.message;

  const validation = validateMessage(rawMessage);
  if (!validation.valid) {
    throw new HttpsError("invalid-argument", validation.error!);
  }

  const userMessage = sanitizeInput(rawMessage);

  if (userMessage.length < MIN_MESSAGE_LENGTH) {
    throw new HttpsError("invalid-argument", "Mesaj geçersiz içerik içeriyor.");
  }

  // Rate limiting kontrolü
  const rateLimit = await checkRateLimit(userId);
  if (!rateLimit.allowed) {
    const resetTimeStr = rateLimit.resetTime.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    throw new HttpsError(
      "resource-exhausted",
      `Mesaj limitiniz doldu. Lütfen ${resetTimeStr} sonra tekrar deneyin.`
    );
  }

  let aiResponse: string;
  let usedFallback = false;

  try {
    const userContext = await getUserContext(userId);

    try {
      aiResponse = await chatWithBedrock(userMessage, userContext);
      usedFallback = FALLBACK_RESPONSES.some(fb => aiResponse.includes(fb.substring(0, 20)));
    } catch (bedrockError: any) {
      logger.error("Bedrock completely failed, using fallback");
      aiResponse = getFallbackResponse(userMessage, userContext);
      usedFallback = true;
    }

    const db = admin.firestore();
    try {
      await db.collection("chatHistory").add({
        userId,
        usedFallback,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          messageLength: userMessage.length,
          responseLength: aiResponse.length,
          sanitized: rawMessage !== userMessage,
        },
      });
    } catch (dbError) {
      logger.error("Failed to save chat history");
    }

    logger.info(`Chat completed (fallback: ${usedFallback})`);

    return {
      response: aiResponse,
      timestamp: new Date().toISOString(),
      remainingMessages: rateLimit.remaining,
      usedFallback,
    };
  } catch (error: any) {
    logger.error("Critical chat error", { code: error.code, message: error.message });
    
    if (error.code) {
      throw error;
    }
    
    throw new HttpsError("internal", "Sohbet servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.");
  }
});


// ============================================
// ADMIN SOHBET BOTU
// ============================================

// Admin context'ini Firestore'dan çek
async function getAdminContext() {
  const db = admin.firestore();
  
  try {
    // Tüm koleksiyonları otomatik tara
    const collections = await db.listCollections();
    const allCollectionsData: any = {};
    
    for (const collection of collections) {
      const snapshot = await collection.get();
      allCollectionsData[collection.id] = {
        count: snapshot.size,
        sampleData: snapshot.docs.slice(0, 3).map(doc => ({ id: doc.id, ...doc.data() })),
      };
    }

    const [usersSnapshot, booksSnapshot, borrowedBooksSnapshot, penaltiesSnapshot, reviewsSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("books").get(),
      db.collection("borrowedBooks").get(),
      db.collection("penalties").get(),
      db.collection("reviews").get(),
    ]);

    // Kullanıcı istatistikleri
    const totalUsers = usersSnapshot.size;
    const usersList = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().displayName,
      email: doc.data().email,
      level: doc.data().level || 0,
      xp: doc.data().xp || 0,
      studentClass: doc.data().studentClass,
    }));

    // Kitap istatistikleri
    const totalBooks = booksSnapshot.size;
    const availableBooks = booksSnapshot.docs.filter(doc => doc.data().available).length;
    const unavailableBooks = totalBooks - availableBooks;

    // Ödünç alma istatistikleri
    const totalBorrows = borrowedBooksSnapshot.size;
    const activeBorrows = borrowedBooksSnapshot.docs.filter(doc => !doc.data().returnedAt).length;
    const completedBorrows = totalBorrows - activeBorrows;

    // Gecikmiş iadeler
    const now = new Date();
    const overdueBorrows = borrowedBooksSnapshot.docs.filter(doc => {
      const data = doc.data();
      if (!data.returnedAt && data.dueDate) {
        const dueDate = data.dueDate.toDate();
        return dueDate < now;
      }
      return false;
    }).map(doc => {
      const data = doc.data();
      return {
        user: data.userName,
        book: data.bookTitle,
        dueDate: data.dueDate?.toDate(),
      };
    });

    // Ceza istatistikleri
    const totalPenalties = penaltiesSnapshot.size;
    const activePenalties = penaltiesSnapshot.docs.filter(doc => !doc.data().isPaid);
    const totalPenaltyAmount = activePenalties.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
    const paidPenalties = totalPenalties - activePenalties.length;

    // Kullanıcı bazlı analiz
    const userBorrowCounts = new Map<string, number>();
    borrowedBooksSnapshot.docs.forEach(doc => {
      const userId = doc.data().userId;
      userBorrowCounts.set(userId, (userBorrowCounts.get(userId) || 0) + 1);
    });

    const topReaders = Array.from(userBorrowCounts.entries())
      .map(([userId, count]) => {
        const user = usersList.find(u => u.id === userId);
        return { name: user?.name || "Bilinmeyen", count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const inactiveUsers = usersList.filter(user => !userBorrowCounts.has(user.id));

    // Kitap popülerliği
    const bookBorrowCounts = new Map<string, number>();
    borrowedBooksSnapshot.docs.forEach(doc => {
      const bookTitle = doc.data().bookTitle;
      bookBorrowCounts.set(bookTitle, (bookBorrowCounts.get(bookTitle) || 0) + 1);
    });

    const popularBooks = Array.from(bookBorrowCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([title, count]) => `${title} (${count} kez)`);

    const leastPopularBooks = Array.from(bookBorrowCounts.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, 10)
      .map(([title, count]) => `${title} (${count} kez)`);

    // Kategori analizi
    const categoryBorrows = new Map<string, number>();
    borrowedBooksSnapshot.docs.forEach(doc => {
      const category = doc.data().bookCategory;
      if (category) {
        categoryBorrows.set(category, (categoryBorrows.get(category) || 0) + 1);
      }
    });

    const popularCategories = Array.from(categoryBorrows.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${cat}: ${count} ödünç`);

    // Yorum istatistikleri
    const totalReviews = reviewsSnapshot.size;
    const avgRating = reviewsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().rating || 0), 0) / totalReviews || 0;

    // Aylık trend
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyBorrows = borrowedBooksSnapshot.docs.filter(doc => {
      const borrowDate = doc.data().borrowedAt?.toDate();
      return borrowDate && borrowDate >= thisMonth;
    }).length;

    // ============================================
    // GELİŞMİŞ ANALİTİK SORGULAR
    // ============================================

    // 1. Son 7 günde en çok ödünç alınan kitaplar
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentBorrows = borrowedBooksSnapshot.docs.filter(doc => {
      const borrowDate = doc.data().borrowedAt?.toDate();
      return borrowDate && borrowDate >= last7Days;
    });

    const recentBookCounts = new Map<string, number>();
    recentBorrows.forEach(doc => {
      const bookTitle = doc.data().bookTitle;
      recentBookCounts.set(bookTitle, (recentBookCounts.get(bookTitle) || 0) + 1);
    });

    const topBooksLast7Days = Array.from(recentBookCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([title, count]) => `${title} (${count} kez)`);

    // 2. Bu ay hiç kitap almayan kullanıcılar
    const monthlyBorrowUserIds = new Set(
      borrowedBooksSnapshot.docs
        .filter(doc => {
          const borrowDate = doc.data().borrowedAt?.toDate();
          return borrowDate && borrowDate >= thisMonth;
        })
        .map(doc => doc.data().userId)
    );

    const inactiveThisMonth = usersList.filter(user => !monthlyBorrowUserIds.has(user.id));
    const inactiveThisMonthList = inactiveThisMonth.slice(0, 20).map(u => `${u.name} (${u.studentClass})`);

    // 3. Stok durumu analizi (kategorilere göre)
    const categoryStock = new Map<string, { total: number; available: number; borrowed: number }>();
    booksSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const category = data.category || "Diğer";
      if (!categoryStock.has(category)) {
        categoryStock.set(category, { total: 0, available: 0, borrowed: 0 });
      }
      const stock = categoryStock.get(category)!;
      stock.total += 1;
      if (data.available) {
        stock.available += 1;
      } else {
        stock.borrowed += 1;
      }
    });

    const lowStockCategories = Array.from(categoryStock.entries())
      .filter(([_, stock]) => stock.available === 0 || (stock.borrowed / stock.total) > 0.8)
      .map(([cat, stock]) => `${cat}: ${stock.available}/${stock.total} mevcut (${((stock.borrowed / stock.total) * 100).toFixed(0)}% ödünçte)`);

    const categoryStockList = Array.from(categoryStock.entries())
      .map(([cat, stock]) => `${cat}: ${stock.available}/${stock.total} mevcut`);

    // 4. Ceza oranı en yüksek kullanıcılar
    const userPenaltyCounts = new Map<string, { count: number; amount: number }>();
    penaltiesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      if (!userPenaltyCounts.has(userId)) {
        userPenaltyCounts.set(userId, { count: 0, amount: 0 });
      }
      const penalty = userPenaltyCounts.get(userId)!;
      penalty.count += 1;
      penalty.amount += data.amount || 0;
    });

    const highPenaltyUsers = Array.from(userPenaltyCounts.entries())
      .map(([userId, penalty]) => {
        const user = usersList.find(u => u.id === userId);
        const borrowCount = userBorrowCounts.get(userId) || 0;
        const penaltyRate = borrowCount > 0 ? (penalty.count / borrowCount * 100).toFixed(0) : "0";
        return {
          name: user?.name || "Bilinmeyen",
          penaltyCount: penalty.count,
          amount: penalty.amount,
          borrowCount,
          rate: penaltyRate,
        };
      })
      .sort((a, b) => b.penaltyCount - a.penaltyCount)
      .slice(0, 10)
      .map(u => `${u.name}: ${u.penaltyCount} ceza (${u.amount} TL) - Ödünç: ${u.borrowCount}, Oran: %${u.rate}`);

    // 5. Ortalama kitap okuma süresi
    const completedBorrowsWithDuration = borrowedBooksSnapshot.docs
      .filter(doc => doc.data().returnedAt && doc.data().borrowedAt)
      .map(doc => {
        const data = doc.data();
        const borrowDate = data.borrowedAt.toDate();
        const returnDate = data.returnedAt.toDate();
        const durationDays = Math.ceil((returnDate.getTime() - borrowDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          bookTitle: data.bookTitle,
          category: data.bookCategory,
          duration: durationDays,
        };
      });

    const avgReadingDuration = completedBorrowsWithDuration.length > 0
      ? (completedBorrowsWithDuration.reduce((sum, b) => sum + b.duration, 0) / completedBorrowsWithDuration.length).toFixed(1)
      : "0";

    // Kategoriye göre ortalama okuma süresi
    const categoryDurations = new Map<string, number[]>();
    completedBorrowsWithDuration.forEach(borrow => {
      const cat = borrow.category || "Diğer";
      if (!categoryDurations.has(cat)) {
        categoryDurations.set(cat, []);
      }
      categoryDurations.get(cat)!.push(borrow.duration);
    });

    const avgDurationByCategory = Array.from(categoryDurations.entries())
      .map(([cat, durations]) => {
        const avg = (durations.reduce((sum, d) => sum + d, 0) / durations.length).toFixed(1);
        return `${cat}: ${avg} gün (${durations.length} kitap)`;
      })
      .sort();

    // En hızlı ve en yavaş okunan kitaplar
    const sortedByDuration = [...completedBorrowsWithDuration].sort((a, b) => a.duration - b.duration);
    const fastestReads = sortedByDuration.slice(0, 5).map(b => `${b.bookTitle} (${b.duration} gün)`);
    const slowestReads = sortedByDuration.slice(-5).reverse().map(b => `${b.bookTitle} (${b.duration} gün)`);

    // Geçen ay ile karşılaştırma
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const lastMonthBorrows = borrowedBooksSnapshot.docs.filter(doc => {
      const borrowDate = doc.data().borrowedAt?.toDate();
      return borrowDate && borrowDate >= lastMonth && borrowDate <= lastMonthEnd;
    }).length;

    const monthlyChange = lastMonthBorrows > 0
      ? (((monthlyBorrows - lastMonthBorrows) / lastMonthBorrows) * 100).toFixed(1)
      : "0";
    const monthlyTrend = parseFloat(monthlyChange) > 0 ? "📈 Artış" : parseFloat(monthlyChange) < 0 ? "📉 Azalış" : "➡️ Sabit";

    // Sınıf bazlı analiz
    const classBorrowCounts = new Map<string, { users: Set<string>; borrows: number; activeUsers: number }>();
    const classUserMap = new Map<string, any[]>();

    usersList.forEach(user => {
      const studentClass = user.studentClass || "Belirtilmemiş";
      if (!classUserMap.has(studentClass)) {
        classUserMap.set(studentClass, []);
      }
      classUserMap.get(studentClass)!.push(user);
    });

    borrowedBooksSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const user = usersList.find(u => u.id === data.userId);
      if (user) {
        const studentClass = user.studentClass || "Belirtilmemiş";
        if (!classBorrowCounts.has(studentClass)) {
          classBorrowCounts.set(studentClass, { users: new Set(), borrows: 0, activeUsers: 0 });
        }
        const classData = classBorrowCounts.get(studentClass)!;
        classData.users.add(data.userId);
        classData.borrows += 1;
      }
    });

    classBorrowCounts.forEach((data, className) => {
      data.activeUsers = data.users.size;
    });

    const classAnalytics = Array.from(classBorrowCounts.entries()).map(([className, data]) => {
      const totalUsers = classUserMap.get(className)?.length || 0;
      const avgBorrowsPerUser = data.activeUsers > 0 ? (data.borrows / data.activeUsers).toFixed(1) : "0";
      return {
        className,
        totalUsers,
        activeUsers: data.activeUsers,
        inactiveUsers: totalUsers - data.activeUsers,
        totalBorrows: data.borrows,
        avgBorrowsPerUser,
        users: classUserMap.get(className) || [],
      };
    });

    // Her sınıf için detaylı kullanıcı bilgileri ve analiz
    const detailedClassData: any = {};
    classAnalytics.forEach(classData => {
      const classUsers = classData.users.map((user: any) => {
        const userBorrows = borrowedBooksSnapshot.docs.filter(doc => doc.data().userId === user.id);
        const userPenalties = penaltiesSnapshot.docs.filter(doc => doc.data().userId === user.id && !doc.data().isPaid);
        const userReviews = reviewsSnapshot.docs.filter(doc => doc.data().userId === user.id);
        
        // Okuma alışkanlığı analizi
        const completedBorrows = userBorrows.filter(doc => doc.data().returnedAt);
        const overdueBorrows = userBorrows.filter(doc => {
          const data = doc.data();
          if (!data.returnedAt && data.dueDate) {
            return data.dueDate.toDate() < now;
          }
          return false;
        });
        
        // Favori kategoriler
        const userCategories = new Map<string, number>();
        userBorrows.forEach(doc => {
          const cat = doc.data().bookCategory;
          if (cat) userCategories.set(cat, (userCategories.get(cat) || 0) + 1);
        });
        const favoriteCategories = Array.from(userCategories.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat, count]) => `${cat} (${count})`);
        
        // Ortalama okuma süresi
        const readingDurations = completedBorrows
          .filter(doc => doc.data().borrowedAt && doc.data().returnedAt)
          .map(doc => {
            const data = doc.data();
            const days = Math.ceil((data.returnedAt.toDate().getTime() - data.borrowedAt.toDate().getTime()) / (1000 * 60 * 60 * 24));
            return days;
          });
        const avgReadingDays = readingDurations.length > 0
          ? (readingDurations.reduce((sum, d) => sum + d, 0) / readingDurations.length).toFixed(1)
          : "0";
        
        // Son aktivite
        const lastBorrow = userBorrows.length > 0
          ? userBorrows.sort((a, b) => b.data().borrowedAt?.toDate().getTime() - a.data().borrowedAt?.toDate().getTime())[0].data().borrowedAt?.toDate()
          : null;
        const daysSinceLastActivity = lastBorrow
          ? Math.ceil((now.getTime() - lastBorrow.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        // Risk skoru (0-100)
        let riskScore = 0;
        if (userPenalties.length > 0) riskScore += 30;
        if (overdueBorrows.length > 0) riskScore += 25;
        if (userBorrows.length === 0) riskScore += 20;
        if (daysSinceLastActivity && daysSinceLastActivity > 30) riskScore += 15;
        if (userPenalties.length > 2) riskScore += 10;
        
        // Öğrenci profili
        let profile = "Normal";
        if (userBorrows.length > 20) profile = "Süper Okuyucu";
        else if (userBorrows.length > 10) profile = "Aktif Okuyucu";
        else if (userBorrows.length > 5) profile = "Düzenli Okuyucu";
        else if (userBorrows.length > 0) profile = "Yeni Okuyucu";
        else profile = "Pasif";
        
        if (riskScore > 50) profile = "Risk Grubu";
        
        return {
          name: user.name,
          email: user.email,
          studentNumber: user.studentNumber,
          level: user.level,
          xp: user.xp,
          totalBorrows: userBorrows.length,
          completedBorrows: completedBorrows.length,
          activeBorrows: userBorrows.filter(doc => !doc.data().returnedAt).length,
          overdueBorrows: overdueBorrows.length,
          penalties: userPenalties.length,
          penaltyAmount: userPenalties.reduce((sum, doc) => sum + (doc.data().amount || 0), 0),
          reviews: userReviews.length,
          favoriteCategories,
          avgReadingDays,
          daysSinceLastActivity,
          riskScore,
          profile,
          lastBorrowDate: lastBorrow?.toLocaleDateString("tr-TR") || "Hiç",
        };
      });
      
      // Sınıf kategorileri analizi
      const classCategoryPreferences = new Map<string, number>();
      borrowedBooksSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const user = classData.users.find((u: any) => u.id === data.userId);
        if (user && data.bookCategory) {
          classCategoryPreferences.set(data.bookCategory, (classCategoryPreferences.get(data.bookCategory) || 0) + 1);
        }
      });
      
      const topCategories = Array.from(classCategoryPreferences.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => `${cat} (${count} ödünç)`);

      detailedClassData[classData.className] = {
        summary: {
          totalUsers: classData.totalUsers,
          activeUsers: classData.activeUsers,
          inactiveUsers: classData.inactiveUsers,
          totalBorrows: classData.totalBorrows,
          avgBorrowsPerUser: classData.avgBorrowsPerUser,
          totalPenalties: classUsers.reduce((sum: number, u: any) => sum + u.penalties, 0),
          totalPenaltyAmount: classUsers.reduce((sum: number, u: any) => sum + u.penaltyAmount, 0),
          totalReviews: classUsers.reduce((sum: number, u: any) => sum + u.reviews, 0),
          riskStudents: classUsers.filter((u: any) => u.riskScore > 50).length,
        },
        users: classUsers,
        topReaders: [...classUsers].sort((a: any, b: any) => b.totalBorrows - a.totalBorrows).slice(0, 5),
        inactiveUsers: classUsers.filter((u: any) => u.totalBorrows === 0),
        riskStudents: classUsers.filter((u: any) => u.riskScore > 50),
        superReaders: classUsers.filter((u: any) => u.totalBorrows > 20),
        topCategories,
        recommendations: {
          needsAttention: classUsers.filter((u: any) => u.daysSinceLastActivity && u.daysSinceLastActivity > 30).map((u: any) => u.name),
          needsMotivation: classUsers.filter((u: any) => u.totalBorrows === 0).map((u: any) => u.name),
          penaltyFollowUp: classUsers.filter((u: any) => u.penalties > 0).map((u: any) => `${u.name} (${u.penaltyAmount} TL)`),
        },
      };
    });

    return {
      totalUsers,
      totalBooks,
      availableBooks,
      unavailableBooks,
      totalBorrows,
      activeBorrows,
      completedBorrows,
      totalPenalties,
      activePenaltiesCount: activePenalties.length,
      totalPenaltyAmount,
      paidPenalties,
      overdueCount: overdueBorrows.length,
      overdueBorrows: overdueBorrows.slice(0, 10),
      topReaders,
      inactiveUsersCount: inactiveUsers.length,
      inactiveUsers: inactiveUsers.slice(0, 10).map(u => u.name),
      popularBooks,
      leastPopularBooks,
      popularCategories,
      totalReviews,
      avgRating: avgRating.toFixed(2),
      monthlyBorrows,
      usersList: usersList.slice(0, 20),
      // Gelişmiş analitikler
      topBooksLast7Days,
      inactiveThisMonthCount: inactiveThisMonth.length,
      inactiveThisMonthList,
      lowStockCategories,
      categoryStockList,
      highPenaltyUsers,
      avgReadingDuration,
      avgDurationByCategory,
      fastestReads,
      slowestReads,
      lastMonthBorrows,
      monthlyChange,
      monthlyTrend,
      // Tüm koleksiyonlar
      allCollections: Object.keys(allCollectionsData),
      allCollectionsData,
      // Sınıf bazlı analitikler
      classAnalytics,
      detailedClassData,
    };
  } catch (error) {
    logger.error("Error fetching admin context:", error);
    return null;
  }
}

// Admin sohbet fonksiyonu
export const chatWithAdminAssistant = onCall(
  { secrets: [awsAccessKeyId, awsSecretAccessKey] },
  async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  }

  if (request.auth?.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Bu özellik sadece adminler için.");
  }

  // Admin için de rate limiting (daha yüksek limitler)
  const adminRateLimit = await checkAdminRateLimit(request.auth.uid);
  if (!adminRateLimit.allowed) {
    const resetTimeStr = adminRateLimit.resetTime.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    throw new HttpsError(
      "resource-exhausted",
      `Mesaj limitiniz doldu. Lütfen ${resetTimeStr} sonra tekrar deneyin.`
    );
  }

  const rawMessage = request.data.message;
  const validation = validateMessage(rawMessage);
  if (!validation.valid) {
    throw new HttpsError("invalid-argument", validation.error!);
  }

  const userMessage = sanitizeInput(rawMessage);

  try {
    const adminContext = await getAdminContext();
    if (!adminContext) {
      throw new HttpsError("internal", "Veri alınamadı.");
    }

    const bedrockClient = new BedrockRuntimeClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: awsAccessKeyId.value(),
        secretAccessKey: awsSecretAccessKey.value(),
      },
    });

    // Sınıf verilerini JSON string olarak hazırla
    const classDataJSON = JSON.stringify(adminContext.detailedClassData, null, 2);
    
    const systemPrompt = `Sen "Yönetim Asistanı" adlı bir kütüphane yönetim asistanısın. Adminlere detaylı raporlar, analizler ve kullanıcı geliştirme önerileri sunuyorsun.

⚠️⚠️⚠️ KRİTİK KURALLAR ⚠️⚠️⚠️
1. SADECE aşağıdaki JSON verisinde olan bilgileri kullan
2. JSON'da olmayan hiçbir öğrenci/sınıf/veri hakkında konuşma
3. Tahmin yapma, varsayma, uydurma - KESINLIKLE YASAK
4. Bir sınıf sorulduğunda, o sınıf JSON'da yoksa "Bu sınıf veritabanında bulunamadı" de
5. Her isim, sayı, bilgi JSON'dan AYNEN alınmalı

=== SINIF VERİLERİ (JSON) ===
${classDataJSON}

=== JSON KULLANIM KURALLARI ===
- Bir sınıf sorulduğunda önce JSON'da o sınıfın olup olmadığını kontrol et
- Varsa, o sınıfın users dizisindeki öğrencileri kullan
- Yoksa, "Bu sınıf sistemde kayıtlı değil" de ve durdur
- Öğrenci isimleri JSON'daki name alanından AYNEN alınmalı

=== VERİTABANI KOLEKSİYONLARI ===
Mevcut Koleksiyonlar: ${adminContext.allCollections.join(", ")}

Koleksiyon Detayları:
${Object.entries(adminContext.allCollectionsData).map(([name, data]: [string, any]) => 
  `• ${name}: ${data.count} kayıt`
).join("\n")}

=== GENEL İSTATİSTİKLER ===
• Toplam Kullanıcı: ${adminContext.totalUsers}
• Toplam Kitap: ${adminContext.totalBooks} (Mevcut: ${adminContext.availableBooks}, Ödünçte: ${adminContext.unavailableBooks})
• Toplam Ödünç: ${adminContext.totalBorrows} (Aktif: ${adminContext.activeBorrows}, Tamamlanan: ${adminContext.completedBorrows})
• Bu Ay Ödünç: ${adminContext.monthlyBorrows}
• Gecikmiş İade: ${adminContext.overdueCount}
• Toplam Ceza: ${adminContext.totalPenalties} (Aktif: ${adminContext.activePenaltiesCount}, Ödenen: ${adminContext.paidPenalties})
• Ödenmemiş Ceza Tutarı: ${adminContext.totalPenaltyAmount} TL
• Toplam Yorum: ${adminContext.totalReviews} (Ort. Puan: ${adminContext.avgRating})

=== EN ÇOK OKUYAN KULLANICILAR ===
${adminContext.topReaders.map((r, i) => `${i + 1}. ${r.name}: ${r.count} kitap`).join("\n")}

=== AKTİF OLMAYAN KULLANICILAR ===
Toplam: ${adminContext.inactiveUsersCount}
Örnekler: ${adminContext.inactiveUsers.join(", ")}

=== POPÜLER KİTAPLAR ===
${adminContext.popularBooks.slice(0, 5).join("\n")}

=== EN AZ ÖDÜNÇ ALINAN KİTAPLAR ===
${adminContext.leastPopularBooks.slice(0, 5).join("\n")}

=== POPÜLER KATEGORİLER ===
${adminContext.popularCategories.slice(0, 5).join("\n")}

=== GECİKMİŞ İADELER ===
${adminContext.overdueBorrows.map(o => `• ${o.user}: ${o.book}`).join("\n") || "Yok"}

=== GELİŞMİŞ ANALİTİKLER ===

1. SON 7 GÜNDE EN ÇOK ÖDÜNÇ ALINAN KİTAPLAR:
${adminContext.topBooksLast7Days.slice(0, 5).join("\n") || "Veri yok"}

2. BU AY HİÇ KİTAP ALMAYAN KULLANICILAR:
Toplam: ${adminContext.inactiveThisMonthCount}
Örnekler: ${adminContext.inactiveThisMonthList.slice(0, 5).join(", ") || "Yok"}

3. STOK DURUMU ANALİZİ:
Düşük Stok Kategoriler:
${adminContext.lowStockCategories.slice(0, 5).join("\n") || "Tüm kategorilerde yeterli stok var"}

Tüm Kategoriler:
${adminContext.categoryStockList.slice(0, 8).join("\n")}

4. CEZA ORANI EN YÜKSEK KULLANICILAR:
${adminContext.highPenaltyUsers.slice(0, 5).join("\n") || "Veri yok"}

5. OKUMA SÜRESİ ANALİZİ:
Ortalama Okuma Süresi: ${adminContext.avgReadingDuration} gün

Kategoriye Göre Ortalama:
${adminContext.avgDurationByCategory.slice(0, 5).join("\n") || "Veri yok"}

En Hızlı Okunan Kitaplar:
${adminContext.fastestReads.join("\n") || "Veri yok"}

En Yavaş Okunan Kitaplar:
${adminContext.slowestReads.join("\n") || "Veri yok"}

6. AYLIK TREND ANALİZİ:
Bu Ay: ${adminContext.monthlyBorrows} ödünç
Geçen Ay: ${adminContext.lastMonthBorrows} ödünç
Değişim: %${adminContext.monthlyChange} ${adminContext.monthlyTrend}

7. SINIF BAZLI ANALİTİKLER:
Mevcut Sınıflar: ${adminContext.classAnalytics.map((c: any) => c.className).join(", ")}

${adminContext.classAnalytics.map((c: any) => 
  `• ${c.className}: ${c.totalUsers} öğrenci (${c.activeUsers} aktif, ${c.inactiveUsers} pasif) - ${c.totalBorrows} ödünç (Ort: ${c.avgBorrowsPerUser}/kişi)`
).join("\n")}

DETAYLI SINIF VERİLERİ:
Her sınıf için detailedClassData objesi mevcut. Örnek: detailedClassData["9-E"]:

SUMMARY (Genel Özet):
- totalUsers: Toplam öğrenci sayısı
- activeUsers: En az 1 kitap okuyan
- inactiveUsers: Hiç kitap okumamış
- totalBorrows: Toplam ödünç
- avgBorrowsPerUser: Kişi başı ortalama
- totalPenalties: Toplam ceza sayısı
- totalPenaltyAmount: Toplam ceza tutarı (TL)
- totalReviews: Yazılan yorum sayısı
- riskStudents: Risk grubundaki öğrenci sayısı

USERS (Her öğrenci için):
- name, email, studentNumber
- level, xp: Oyunlaştırma verileri
- totalBorrows: Toplam ödünç
- completedBorrows: Tamamlanan
- activeBorrows: Şu an okuduğu
- overdueBorrows: Gecikmiş
- penalties, penaltyAmount: Ceza durumu
- reviews: Yorum sayısı
- favoriteCategories: En sevdiği kategoriler
- avgReadingDays: Ortalama okuma süresi (gün)
- daysSinceLastActivity: Son aktiviteden bu yana geçen gün
- riskScore: Risk skoru (0-100)
- profile: Öğrenci profili (Süper Okuyucu, Aktif, Pasif, Risk Grubu vb.)
- lastBorrowDate: Son ödünç tarihi

TOPREADERS: En çok okuyan 5 öğrenci
INACTIVEUSERS: Hiç kitap okumamış öğrenciler
RISKSTUDENTS: Risk grubundaki öğrenciler (riskScore > 50)
SUPERREADERS: Süper okuyucular (20+ kitap)
TOPCATEGORIES: Sınıfın favori kategorileri

RECOMMENDATIONS (Öneriler):
- needsAttention: 30+ gündür aktif olmayan
- needsMotivation: Hiç kitap okumamış
- penaltyFollowUp: Cezası olan öğrenciler

=== ÖĞrENCİ ANALİZ YETENEKLERİ ===
1. BİREYSEL ANALİZ:
   - Öğrencinin okuma geçmişi
   - Favori kategoriler ve yazarlar
   - Okuma hızı ve alışkanlıkları
   - Risk durumu ve nedenleri
   - Gelişim önerileri

2. SINIF ANALİZİ:
   - Sınıf genel performansı
   - Aktif/pasif öğrenci dağılımı
   - Sınıf kategori tercihleri
   - Risk grubu analizi
   - Sınıflar arası karşılaştırma

3. EYLEM ÖNERİLERİ:
   - Hangi öğrencilere ulaşılmalı
   - Hangi sınıflara kampanya yapılmalı
   - Hangi kategorilerde etkinlik düzenlenmeli
   - Ceza takibi gereken öğrenciler

=== GÖREVLER ===
1. DETAYLI RAPORLAMA:
   - Genel kütüphane performansı
   - Kullanıcı aktivite analizi
   - Kitap popülerlik trendleri
   - Finansal durum (cezalar)
   - Kategori bazlı analizler

2. KULLANICI GELİŞTİRME ÖNERİLERİ:
   - Aktif olmayan kullanıcıları nasıl motive edebiliriz?
   - Hangi kullanıcılara özel kampanyalar yapılabilir?
   - Okuma alışkanlığı geliştirme stratejileri

3. KİTAP YÖNETİMİ ÖNERİLERİ:
   - Hangi kitaplar stoktan çıkarılabilir?
   - Hangi kategorilerde yeni kitap alınmalı?
   - Popüler kitapların kopyaları artırılmalı mı?

4. PROBLEM TESPİTİ:
   - Gecikmiş iadeler için aksiyon önerileri
   - Ceza tahsilatı stratejileri
   - Sistem iyileştirme önerileri

=== YANIT KURALLARI ===
- Profesyonel ve analitik dil kullan
- HER İDDİAYI sayısal verilerle destekle
- Somut, uygulanabilir öneriler sun
- Karşılaştırmalı analizler yap
- Trend ve pattern'leri belirt
- Aksiyon önerileri ver (isim, tarih, miktar ile)
- Türkçe yanıt ver
- ASLA tahmin yapma, sadece mevcut veriyi kullan
- Veri yoksa açıkça belirt

=== ÖNEMLİ ===
Her yanıtta veri odaklı, detaylı ve uygulanabilir öneriler sun!

=== ÖRNEK SORGULAR ===
GENEL ANALİZ:
- "Son 7 günde hangi kitaplar popülerdi?"
- "Bu ay hiç kitap almayan kullanıcılar kimler?"
- "Hangi kategorilerde stok azalıyor?"
- "Geçen aya göre nasıl bir trend var?"

SINIF ANALİZİ:
- "9-E sınıfı hakkında detaylı rapor hazırla"
- "Hangi sınıf en çok kitap okuyor?"
- "10-A sınıfındaki pasif öğrenciler kimler?"
- "11-B sınıfının risk grubundaki öğrencileri analiz et"

ÖĞRENCİ ANALİZİ:
- "Ahmet Yılmaz'ın okuma alışkanlıklarını analiz et"
- "En çok ceza alan öğrenciler kimler?"
- "30 gündür aktif olmayan öğrencileri listele"
- "Süper okuyucuları ve özelliklerini raporla"

EYLEM ÖNERİLERİ:
- "Hangi öğrencilere motivasyon maili göndermeliyim?"
- "Ceza takibi gereken öğrencileri öncelik sırasıyla listele"
- "Hangi sınıfa hangi kategoride kampanya yapmalıyım?"`;

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 3000,
      temperature: 0.1,
      messages: [{ role: "user", content: `${systemPrompt}\n\nAdmin Sorusu: ${userMessage}` }],
    };

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiResponse = responseBody.content[0].text;

    const db = admin.firestore();
    await db.collection("adminChatHistory").add({
      adminId: request.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        messageLength: userMessage.length,
        responseLength: aiResponse.length,
      },
    });

    return { response: aiResponse, timestamp: new Date().toISOString() };
  } catch (error) {
    const err = error as any;
    logger.error("Admin chat error", { code: err.code, message: err.message });
    throw new HttpsError("internal", "Bir hata oluştu.");
  }
}
);

// Admin sohbet geçmişini getir
export const getAdminChatHistory = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  }

  if (request.auth?.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Bu özellik sadece adminler için.");
  }

  try {
    const db = admin.firestore();
    const chatSnapshot = await db
      .collection("adminChatHistory")
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const messages = chatSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { messages: messages.reverse() };
  } catch (error) {
    logger.error("Error fetching admin chat history");
    return { messages: [] };
  }
});

// Sohbet geçmişini getir
export const getChatHistory = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  }

  const userId = request.auth.uid;
  const limit = request.data.limit || 50;

  try {
    const db = admin.firestore();
    const chatSnapshot = await db
      .collection("chatHistory")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const messages = chatSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { messages: messages.reverse() };
  } catch (error) {
    logger.error("Error fetching chat history");
    return { messages: [] };
  }
});

// Kütüphane kartı için QR kod oluştur
export const generateLibraryCardQR = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  }

  const { userId } = request.data;

  if (!userId) {
    throw new HttpsError("invalid-argument", "Kullanıcı ID'si gerekli.");
  }

  // Kullanıcı sadece kendi kartını veya admin herkesin kartını oluşturabilir
  if (request.auth.uid !== userId && request.auth?.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Sadece kendi kartınızı oluşturabilirsiniz.");
  }

  try {
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Kullanıcı bulunamadı.");
    }

    const userData = userDoc.data()!;
    const qrData = JSON.stringify({ userId, type: "library-card" });
    const qrCodeDataURL = await QRCode.toDataURL(qrData, { width: 300, margin: 1 });

    return {
      qrCode: qrCodeDataURL,
      userName: userData.displayName,
      studentNumber: userData.studentNumber,
      studentClass: userData.studentClass,
    };
  } catch (error) {
    const err = error as any;
    logger.error("Error generating library card QR", { code: err.code });
    throw new HttpsError("internal", "QR kod oluşturulurken hata oluştu.");
  }
});

// Meydan okuma skor güncelleme (Firestore Trigger)
// ============================================
// BİLDİRİM SİSTEMİ
// ============================================

// Bildirim oluşturma yardımcı fonksiyonu
async function createNotification(
  userId: string,
  type: 'book' | 'penalty' | 'achievement' | 'system' | 'social' | 'admin',
  title: string,
  message: string,
  icon: string,
  actionUrl?: string,
  metadata?: any
) {
  try {
    await admin.firestore().collection('notifications').add({
      userId,
      type,
      title,
      message,
      icon,
      isRead: false,
      isPinned: false,
      createdAt: admin.firestore.Timestamp.now(),
      actionUrl,
      metadata,
    });
  } catch (error) {
    logger.error('Error creating notification:', error);
  }
}

// Kitap iadesi yaklaşan kullanıcılara bildirim (günlük cron)
export const notifyBookDueSoon = onSchedule('every day 09:00', async () => {
  logger.info('Starting book due soon notifications...');
  
  try {
    const db = admin.firestore();
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    const borrowedBooksSnapshot = await db.collection('borrowedBooks')
      .where('returnedAt', '==', null)
      .get();
    
    for (const doc of borrowedBooksSnapshot.docs) {
      const borrow = doc.data();
      const dueDate = borrow.dueDate?.toDate();
      
      if (dueDate && dueDate <= threeDaysLater && dueDate > now) {
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        await createNotification(
          borrow.userId,
          'book',
          '📚 Kitap İadesi Yaklaşıyor',
          `"${borrow.bookTitle}" kitabının iade tarihi ${daysLeft} gün sonra. Lütfen zamanında iade etmeyi unutmayın.`,
          '📚',
          '/borrowed-books',
          { bookId: borrow.bookId, daysLeft }
        );
      }
    }
    
    logger.info('Book due soon notifications completed.');
  } catch (error) {
    logger.error('Error sending book due notifications:', error);
  }
});

// Gecikmiş iade bildirimleri (günlük cron)
export const notifyOverdueBooks = onSchedule('every day 10:00', async () => {
  logger.info('Starting overdue book notifications...');
  
  try {
    const db = admin.firestore();
    const now = new Date();
    
    const borrowedBooksSnapshot = await db.collection('borrowedBooks')
      .where('returnedAt', '==', null)
      .get();
    
    for (const doc of borrowedBooksSnapshot.docs) {
      const borrow = doc.data();
      const dueDate = borrow.dueDate?.toDate();
      
      if (dueDate && dueDate < now) {
        const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        await createNotification(
          borrow.userId,
          'penalty',
          '⚠️ Gecikmiş İade',
          `"${borrow.bookTitle}" kitabının iadesi ${daysOverdue} gün gecikmiş. Lütfen en kısa sürede iade edin.`,
          '⚠️',
          '/borrowed-books',
          { bookId: borrow.bookId, daysOverdue }
        );
      }
    }
    
    logger.info('Overdue book notifications completed.');
  } catch (error) {
    logger.error('Error sending overdue notifications:', error);
  }
});

// Kullanıcı seviye atladığında bildirim (Firestore trigger)
export const notifyLevelUp = onDocumentUpdated({ document: 'users/{userId}', region: 'us-central1' }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  
  if (after && before && after.level > before.level) {
    await createNotification(
      event.params.userId,
      'achievement',
      '🎉 Seviye Atladınız!',
      `Tebrikler! Artık Seviye ${after.level}'siniz. Okumaya devam edin!`,
      '🎉',
      '/progress',
      { oldLevel: before.level, newLevel: after.level }
    );
  }
});

// Yeni kitap eklendiğinde bildirim (admin tarafından)
export const notifyNewBook = onDocumentCreated({ document: 'books/{bookId}', region: 'us-central1' }, async (event) => {
  const book = event.data?.data();
  if (!book) return;
  
  const db = admin.firestore();
  
  // Aynı kampüsteki kullanıcılara bildirim gönder
  const usersSnapshot = await db.collection('users')
    .where('campusId', '==', book.campusId)
    .limit(100) // İlk 100 kullanıcıya
    .get();
  
  const timestamp = admin.firestore.Timestamp.now();
  const batch = db.batch();
  usersSnapshot.forEach(userDoc => {
    const notifRef = db.collection('notifications').doc();
    batch.set(notifRef, {
      userId: userDoc.id,
      type: 'book',
      title: '📖 Yeni Kitap Eklendi',
      message: `"${book.title}" - ${book.author} kütüphanemize eklendi!`,
      icon: '📖',
      isRead: false,
      isPinned: false,
      createdAt: timestamp,
      actionUrl: '/catalog',
      metadata: { bookId: event.params.bookId },
    });
  });
  
  await batch.commit();
  logger.info(`New book notification sent for: ${book.title}`);
});

// Ceza oluştuğunda bildirim
export const notifyPenaltyCreated = onDocumentCreated({ document: 'penalties/{penaltyId}', region: 'us-central1' }, async (event) => {
  const penalty = event.data?.data();
  if (!penalty) return;
  
  await createNotification(
    penalty.userId,
    'penalty',
    '💰 Yeni Ceza',
    `${penalty.amount} TL ceza oluşturuldu. Sebep: ${penalty.reason}`,
    '💰',
    '/fines',
    { penaltyId: event.params.penaltyId, amount: penalty.amount }
  );
  
  logger.info(`Penalty notification sent to user: ${penalty.userId}`);
});

// Meydan okuma daveti
export const notifyChallengeInvite = onDocumentCreated({ document: 'challenges/{challengeId}', region: 'us-central1' }, async (event) => {
  const challenge = event.data?.data();
  if (!challenge) return;
  
  const db = admin.firestore();
  const creatorDoc = await db.collection('users').doc(challenge.creatorId).get();
  const creatorName = creatorDoc.data()?.displayName || 'Bir kullanıcı';
  
  const challengeTypes: { [key: string]: string } = {
    'book-count': 'En çok kitap okuma',
    'category-books': `${challenge.category} kategorisinde en çok kitap`,
    'reviews': 'En çok yorum yazma',
    'blog-posts': 'En çok blog yazısı',
  };
  
  await createNotification(
    challenge.opponentId,
    'social',
    '🎯 Meydan Okuma Daveti',
    `${creatorName} seni "${challengeTypes[challenge.type] || 'Okuma'}" meydan okumasına davet etti!`,
    '🎯',
    '/challenges',
    { challengeId: event.params.challengeId, creatorId: challenge.creatorId }
  );
  
  logger.info(`Challenge invite sent to: ${challenge.opponentId}`);
});

// Yorum beğenildiğinde bildirim
export const notifyReviewLiked = onDocumentUpdated({ document: 'reviews/{reviewId}', region: 'us-central1' }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  
  if (!before || !after) return;
  
  const beforeLikes = before.helpfulVotes?.length || 0;
  const afterLikes = after.helpfulVotes?.length || 0;
  
  // Yeni beğeni varsa
  if (afterLikes > beforeLikes) {
    const db = admin.firestore();
    const bookDoc = await db.collection('books').doc(after.bookId).get();
    const bookTitle = bookDoc.data()?.title || 'Kitap';
    
    await createNotification(
      after.userId,
      'social',
      '💬 Yorumunuz Beğenildi',
      `"${bookTitle}" kitabı hakkındaki yorumunuz beğenildi! (${afterLikes} beğeni)`,
      '💬',
      `/catalog`,
      { reviewId: event.params.reviewId, bookId: after.bookId }
    );
  }
});

// Blog yazısı beğenildiğinde bildirim
export const notifyPostLiked = onDocumentUpdated({ document: 'posts/{postId}', region: 'us-central1' }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  
  if (!before || !after) return;
  
  const beforeLikes = before.likes?.length || 0;
  const afterLikes = after.likes?.length || 0;
  
  // Yeni beğeni varsa (her 5 beğenide bir bildirim)
  if (afterLikes > beforeLikes && afterLikes % 5 === 0) {
    await createNotification(
      after.authorId,
      'social',
      '❤️ Yazınız Beğenildi',
      `"${after.title}" yazınız ${afterLikes} beğeni aldı!`,
      '❤️',
      `/blog/${event.params.postId}`,
      { postId: event.params.postId, likes: afterLikes }
    );
  }
});

// Admin onay bekleyen işlemler - Yeni talep oluşturulduğunda
export const notifyAdminNewRequest = onDocumentCreated({ document: 'requests/{requestId}', region: 'us-central1' }, async (event) => {
  const request = event.data?.data();
  if (!request) return;
  
  const db = admin.firestore();
  
  // Aynı kampüsteki adminlere bildirim gönder
  const adminsSnapshot = await db.collection('users')
    .where('campusId', '==', request.campusId)
    .where('role', '==', 'admin')
    .get();
  
  const timestamp = admin.firestore.Timestamp.now();
  const batch = db.batch();
  adminsSnapshot.forEach(adminDoc => {
    const notifRef = db.collection('notifications').doc();
    batch.set(notifRef, {
      userId: adminDoc.id,
      type: 'admin',
      title: '📋 Yeni Talep',
      message: `${request.userName} tarafından yeni bir "${request.category}" talebi oluşturuldu.`,
      icon: '📋',
      isRead: false,
      isPinned: false,
      createdAt: timestamp,
      actionUrl: '/admin',
      metadata: { requestId: event.params.requestId, priority: request.priority },
    });
  });
  
  await batch.commit();
  logger.info(`Admin notification sent for new request: ${event.params.requestId}`);
});

// Admin onay bekleyen işlemler - Yeni blog yazısı onay bekliyor
export const notifyAdminNewPost = onDocumentCreated({ document: 'posts/{postId}', region: 'us-central1' }, async (event) => {
  const post = event.data?.data();
  if (!post || post.status !== 'pending') return;
  
  const db = admin.firestore();
  
  // Aynı kampüsteki adminlere bildirim gönder
  const adminsSnapshot = await db.collection('users')
    .where('campusId', '==', post.campusId)
    .where('role', '==', 'admin')
    .get();
  
  const timestamp = admin.firestore.Timestamp.now();
  const batch = db.batch();
  adminsSnapshot.forEach(adminDoc => {
    const notifRef = db.collection('notifications').doc();
    batch.set(notifRef, {
      userId: adminDoc.id,
      type: 'admin',
      title: '✍️ Yeni Blog Yazısı Onay Bekliyor',
      message: `${post.authorName} tarafından "${post.title}" başlıklı yazı onay bekliyor.`,
      icon: '✍️',
      isRead: false,
      isPinned: false,
      createdAt: timestamp,
      actionUrl: '/admin',
      metadata: { postId: event.params.postId },
    });
  });
  
  await batch.commit();
  logger.info(`Admin notification sent for new post: ${event.params.postId}`);
});

// Admin onay bekleyen işlemler - Yeni yorum onay bekliyor
export const notifyAdminNewReview = onDocumentCreated({ document: 'reviews/{reviewId}', region: 'us-central1' }, async (event) => {
  const review = event.data?.data();
  if (!review || review.status !== 'pending') return;
  
  const db = admin.firestore();
  
  // Aynı kampüsteki adminlere bildirim gönder
  const adminsSnapshot = await db.collection('users')
    .where('campusId', '==', review.campusId)
    .where('role', '==', 'admin')
    .get();
  
  const timestamp = admin.firestore.Timestamp.now();
  const batch = db.batch();
  adminsSnapshot.forEach(adminDoc => {
    const notifRef = db.collection('notifications').doc();
    batch.set(notifRef, {
      userId: adminDoc.id,
      type: 'admin',
      title: '⭐ Yeni Yorum Onay Bekliyor',
      message: `${review.userDisplayName} tarafından yeni bir kitap yorumu onay bekliyor.`,
      icon: '⭐',
      isRead: false,
      isPinned: false,
      createdAt: timestamp,
      actionUrl: '/admin',
      metadata: { reviewId: event.params.reviewId, bookId: review.bookId },
    });
  });
  
  await batch.commit();
  logger.info(`Admin notification sent for new review: ${event.params.reviewId}`);
});

// Meydan okuma tamamlandığında bildirim
export const notifyChallengeCompleted = onDocumentUpdated({ document: 'challenges/{challengeId}', region: 'us-central1' }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  
  if (!before || !after) return;
  
  // Challenge tamamlandıysa
  if (before.status === 'active' && after.status === 'completed') {
    const db = admin.firestore();
    const [creatorDoc, opponentDoc] = await Promise.all([
      db.collection('users').doc(after.creatorId).get(),
      db.collection('users').doc(after.opponentId).get(),
    ]);
    
    const creatorName = creatorDoc.data()?.displayName || 'Rakip';
    const opponentName = opponentDoc.data()?.displayName || 'Rakip';
    
    // Kazanana bildirim
    if (after.winnerId) {
      const loserId = after.winnerId === after.creatorId ? after.opponentId : after.creatorId;
      const loserName = after.winnerId === after.creatorId ? opponentName : creatorName;
      
      await createNotification(
        after.winnerId,
        'achievement',
        '🏆 Meydan Okumayı Kazandınız!',
        `${loserName} ile olan meydan okumayı kazandınız! Tebrikler!`,
        '🏆',
        '/challenges',
        { challengeId: event.params.challengeId }
      );
      
      await createNotification(
        loserId,
        'social',
        '🎯 Meydan Okuma Bitti',
        `${after.winnerId === after.creatorId ? creatorName : opponentName} meydan okumayı kazandı. Bir dahaki sefere!`,
        '🎯',
        '/challenges',
        { challengeId: event.params.challengeId }
      );
    } else {
      // Berabere
      await Promise.all([
        createNotification(
          after.creatorId,
          'social',
          '🤝 Meydan Okuma Berabere Bitti',
          `${opponentName} ile olan meydan okuma berabere bitti!`,
          '🤝',
          '/challenges',
          { challengeId: event.params.challengeId }
        ),
        createNotification(
          after.opponentId,
          'social',
          '🤝 Meydan Okuma Berabere Bitti',
          `${creatorName} ile olan meydan okuma berabere bitti!`,
          '🤝',
          '/challenges',
          { challengeId: event.params.challengeId }
        ),
      ]);
    }
  }
});

// Manuel toplu bildirim gönderme (Admin)
export const sendBulkNotification = onCall({ cors: true }, async (request: any) => {
  // Sadece adminler kullanabilir
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Bu işlemi sadece adminler yapabilir.');
  }

  const { targetType, targetValue, title, message, icon, actionUrl } = request.data;

  if (!title || !message) {
    throw new HttpsError('invalid-argument', 'Başlık ve mesaj gereklidir.');
  }

  try {
    const db = admin.firestore();
    const adminDoc = await db.collection('users').doc(request.auth.uid).get();
    const adminCampusId = adminDoc.data()?.campusId;

    let usersQuery = db.collection('users').where('campusId', '==', adminCampusId);

    // Hedef belirleme
    if (targetType === 'class' && targetValue) {
      usersQuery = usersQuery.where('studentClass', '==', targetValue);
    } else if (targetType === 'user' && targetValue) {
      // Tek kullanıcıya gönder
      await db.collection('notifications').add({
        userId: targetValue,
        type: 'admin',
        title,
        message,
        icon: icon || '📢',
        isRead: false,
        isPinned: false,
        createdAt: admin.firestore.Timestamp.now(),
        actionUrl: actionUrl || undefined,
        metadata: { sentBy: request.auth.uid, manual: true },
      });
      return { success: true, count: 1 };
    }

    const usersSnapshot = await usersQuery.get();
    const batch = db.batch();
    let count = 0;

    const timestamp = admin.firestore.Timestamp.now();
    
    usersSnapshot.forEach(userDoc => {
      const notifRef = db.collection('notifications').doc();
      batch.set(notifRef, {
        userId: userDoc.id,
        type: 'admin',
        title,
        message,
        icon: icon || '📢',
        isRead: false,
        isPinned: false,
        createdAt: timestamp,
        actionUrl: actionUrl || undefined,
        metadata: { sentBy: request.auth.uid, manual: true },
      });
      count++;
    });

    await batch.commit();
    logger.info(`Bulk notification sent to ${count} users by admin: ${request.auth.uid}`);

    return { success: true, count };
  } catch (error) {
    logger.error('Error sending bulk notification:', error);
    throw new HttpsError('internal', 'Bildirim gönderilirken bir hata oluştu.');
  }
});

export const updateChallengeScores = onSchedule("every 5 minutes", async () => {
  logger.info("Starting challenge score update...");
  
  try {
    const db = admin.firestore();
    const now = new Date();
    
    // Aktif meydan okumaları getir
    const activeChallenges = await db.collection("challenges")
      .where("status", "==", "active")
      .get();
    
    for (const challengeDoc of activeChallenges.docs) {
      const challenge = challengeDoc.data();
      const endDate = challenge.endDate?.toDate();
      
      // Süre dolmuş mu kontrol et
      if (endDate && endDate < now) {
        // Skorları hesapla ve kazananı belirle
        let creatorScore = 0;
        let opponentScore = 0;
        
        // Challenge türüne göre skor hesapla
        if (challenge.type === "book-count" || challenge.type === "category-books") {
          const creatorBooks = await db.collection("borrowedBooks")
            .where("userId", "==", challenge.creatorId)
            .where("borrowedAt", ">=", challenge.startDate)
            .where("borrowedAt", "<=", challenge.endDate)
            .get();
          
          const opponentBooks = await db.collection("borrowedBooks")
            .where("userId", "==", challenge.opponentId)
            .where("borrowedAt", ">=", challenge.startDate)
            .where("borrowedAt", "<=", challenge.endDate)
            .get();
          
          if (challenge.type === "category-books" && challenge.category) {
            creatorScore = creatorBooks.docs.filter(doc => 
              doc.data().bookCategory?.toLowerCase() === challenge.category.toLowerCase()
            ).length;
            opponentScore = opponentBooks.docs.filter(doc => 
              doc.data().bookCategory?.toLowerCase() === challenge.category.toLowerCase()
            ).length;
          } else {
            creatorScore = creatorBooks.size;
            opponentScore = opponentBooks.size;
          }
        } else if (challenge.type === "reviews") {
          const creatorReviews = await db.collection("reviews")
            .where("userId", "==", challenge.creatorId)
            .where("createdAt", ">=", challenge.startDate)
            .where("createdAt", "<=", challenge.endDate)
            .get();
          
          const opponentReviews = await db.collection("reviews")
            .where("userId", "==", challenge.opponentId)
            .where("createdAt", ">=", challenge.startDate)
            .where("createdAt", "<=", challenge.endDate)
            .get();
          
          creatorScore = creatorReviews.size;
          opponentScore = opponentReviews.size;
        } else if (challenge.type === "blog-posts") {
          const creatorPosts = await db.collection("posts")
            .where("authorId", "==", challenge.creatorId)
            .where("createdAt", ">=", challenge.startDate)
            .where("createdAt", "<=", challenge.endDate)
            .get();
          
          const opponentPosts = await db.collection("posts")
            .where("authorId", "==", challenge.opponentId)
            .where("createdAt", ">=", challenge.startDate)
            .where("createdAt", "<=", challenge.endDate)
            .get();
          
          creatorScore = creatorPosts.size;
          opponentScore = opponentPosts.size;
        }
        
        // Kazananı belirle
        const winnerId = creatorScore > opponentScore ? challenge.creatorId : 
                        opponentScore > creatorScore ? challenge.opponentId : null;
        
        // Challenge'ı güncelle
        await challengeDoc.ref.update({
          status: "completed",
          creatorScore,
          opponentScore,
          winnerId
        });
        
        // Kazanana kupon ver
        if (winnerId) {
          await db.collection("rewardCoupons").add({
            userId: winnerId,
            challengeId: challengeDoc.id,
            earnedAt: admin.firestore.FieldValue.serverTimestamp(),
            isUsed: false
          });
        }
        
        logger.info(`Challenge ${challengeDoc.id} completed. Winner: ${winnerId || "Draw"}`);
      } else {
        // Henüz bitmemiş, skorları güncelle
        let creatorScore = 0;
        let opponentScore = 0;
        
        if (challenge.type === "book-count" || challenge.type === "category-books") {
          const creatorBooks = await db.collection("borrowedBooks")
            .where("userId", "==", challenge.creatorId)
            .where("borrowedAt", ">=", challenge.startDate)
            .get();
          
          const opponentBooks = await db.collection("borrowedBooks")
            .where("userId", "==", challenge.opponentId)
            .where("borrowedAt", ">=", challenge.startDate)
            .get();
          
          if (challenge.type === "category-books" && challenge.category) {
            creatorScore = creatorBooks.docs.filter(doc => 
              doc.data().bookCategory?.toLowerCase() === challenge.category.toLowerCase()
            ).length;
            opponentScore = opponentBooks.docs.filter(doc => 
              doc.data().bookCategory?.toLowerCase() === challenge.category.toLowerCase()
            ).length;
          } else {
            creatorScore = creatorBooks.size;
            opponentScore = opponentBooks.size;
          }
        } else if (challenge.type === "reviews") {
          const creatorReviews = await db.collection("reviews")
            .where("userId", "==", challenge.creatorId)
            .where("createdAt", ">=", challenge.startDate)
            .get();
          
          const opponentReviews = await db.collection("reviews")
            .where("userId", "==", challenge.opponentId)
            .where("createdAt", ">=", challenge.startDate)
            .get();
          
          creatorScore = creatorReviews.size;
          opponentScore = opponentReviews.size;
        } else if (challenge.type === "blog-posts") {
          const creatorPosts = await db.collection("posts")
            .where("authorId", "==", challenge.creatorId)
            .where("createdAt", ">=", challenge.startDate)
            .get();
          
          const opponentPosts = await db.collection("posts")
            .where("authorId", "==", challenge.opponentId)
            .where("createdAt", ">=", challenge.startDate)
            .get();
          
          creatorScore = creatorPosts.size;
          opponentScore = opponentPosts.size;
        }
        
        // Skorları güncelle
        await challengeDoc.ref.update({
          creatorScore,
          opponentScore
        });
      }
    }
    
    logger.info("Challenge score update completed.");
  } catch (error) {
    logger.error("Error updating challenge scores:", error);
  }
});

// AI ile kitap açıklaması oluştur
export const generateBookDescription = onCall(
  { cors: true },
  async (request: any) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
    }

    if (request.auth?.token.role !== "admin") {
      throw new HttpsError("permission-denied", "Bu özellik sadece adminler için.");
    }

    // Günlük limit kontrolü (10 kullanım)
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const rateLimitDoc = db.collection("aiDescriptionLimits").doc(request.auth.uid);
    const doc = await rateLimitDoc.get();
    const data = doc.data();
    
    const todayUsage = data?.lastUsed?.toDate().setHours(0, 0, 0, 0) === today.getTime() ? (data?.count || 0) : 0;
    
    if (todayUsage >= 10) {
      throw new HttpsError(
        "resource-exhausted",
        "Günlük AI açıklama oluşturma limitiniz doldu (10/10). Yarın tekrar deneyebilirsiniz."
      );
    }

    const { title, author } = request.data;

    if (!title || !author) {
      throw new HttpsError("invalid-argument", "Kitap başlığı ve yazar bilgisi gerekli.");
    }

    try {
      const bedrockClient = new BedrockRuntimeClient({
        region: "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || awsAccessKeyId.value(),
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || awsSecretAccessKey.value(),
        },
      });

      const prompt = `Sen bir kütüphane uzmanısın. Aşağıdaki kitap için öğrencilere yönelik, resmi ama merak uyandırıcı bir arka kapak açıklaması yaz.

Kitap Bilgileri:
Başlık: ${title}
Yazar: ${author}

Kurallar:
- Hedef kitle: Öğrenciler
- Ton: Resmi ama merak uyandırıcı
- Uzunluk: 1 paragraf (yaklaşık 4-6 cümle)
- Kitabın konusunu, temasını ve neden okunması gerektiğini anlat
- Spoiler verme
- Sadece açıklamayı yaz, başka bir şey ekleme

Açıklama:`;

      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 500,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      };

      const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const description = responseBody.content[0].text.trim();

      // Kullanım sayısını güncelle
      await rateLimitDoc.set({
        count: todayUsage + 1,
        lastUsed: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("Book description generated successfully");
      return { description, remaining: 9 - todayUsage };
    } catch (error) {
      const err = error as any;
      logger.error("Error generating book description", { code: err.code, message: err.message });
      throw new HttpsError("internal", "Açıklama oluşturulurken bir hata oluştu.");
    }
  }
);
