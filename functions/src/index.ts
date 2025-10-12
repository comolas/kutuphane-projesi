/* eslint-disable @typescript-eslint/no-explicit-any */
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import request = require("request");

admin.initializeApp();

export const setAdminRole = onCall(async (request: any) => {
  // **ÖNEMLİ:** İlk admin kullanıcısını atadıktan sonra, güvenliği sağlamak için
  // aşağıdaki 'if' bloğunu yorum satırından çıkarın ve fonksiyonları yeniden yayınlayın.
  
  // if (request.auth?.token.role !== "admin") {
  //   throw new HttpsError(
  //     "permission-denied",
  //     "Bu işlemi sadece adminler yapabilir."
  //   );
  // }
  

  const email = request.data.email;
  if (!email) {
    throw new HttpsError(
      "invalid-argument",
      "E-posta adresi belirtilmedi."
    );
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    return { message: `${email} kullanıcısı başarıyla admin yapıldı.` };
  } catch (error) {
    console.error("Error setting admin role:", error);
    throw new HttpsError("internal", "Admin rolü atanırken bir hata oluştu.");
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
    console.log(`Successfully deleted user ${uid}`);
    return { message: `Kullanıcı ${uid} başarıyla silindi.` };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new HttpsError(
      "internal",
      "Kullanıcı silinirken bir hata oluştu."
    );
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

export const imageProxy = onRequest({ cors: true }, (req, res) => {
  const imageUrl = req.query.url as string;

  if (!imageUrl) {
    res.status(400).send("No image URL specified.");
    return;
  }

  logger.info(`Proxying image: ${imageUrl}`);

  const options = {
    url: imageUrl,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
    }
  };

  req.pipe(request(options)).pipe(res);
});


// ============================================
// KÜTÜPHANE ASISTANI SOHBET BOTU
// ============================================

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

import { defineString } from "firebase-functions/params";
import { sanitizeInput, validateMessage, MAX_MESSAGE_LENGTH, MIN_MESSAGE_LENGTH } from "./security";

const awsAccessKeyId = defineString("AWS_ACCESS_KEY_ID");
const awsSecretAccessKey = defineString("AWS_SECRET_ACCESS_KEY");

// Rate limiting sabitleri
const HOURLY_LIMIT = 20; // Saatte maksimum 20 mesaj
const DAILY_LIMIT = 100; // Günde maksimum 100 mesaj

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

// Rate limiting kontrolü
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const db = admin.firestore();
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const rateLimitDoc = db.collection("rateLimits").doc(userId);
  const doc = await rateLimitDoc.get();
  const data = doc.data();

  const hourlyMessages = (data?.hourlyMessages || []).filter((ts: any) => ts.toDate() > hourAgo);
  const dailyMessages = (data?.dailyMessages || []).filter((ts: any) => ts.toDate() > dayAgo);

  if (hourlyMessages.length >= HOURLY_LIMIT) {
    const oldestHourly = hourlyMessages[0].toDate();
    const resetTime = new Date(oldestHourly.getTime() + 60 * 60 * 1000);
    return { allowed: false, remaining: 0, resetTime };
  }

  if (dailyMessages.length >= DAILY_LIMIT) {
    const oldestDaily = dailyMessages[0].toDate();
    const resetTime = new Date(oldestDaily.getTime() + 24 * 60 * 60 * 1000);
    return { allowed: false, remaining: 0, resetTime };
  }

  // Mesaj sayısını güncelle
  hourlyMessages.push(admin.firestore.Timestamp.now());
  dailyMessages.push(admin.firestore.Timestamp.now());

  await rateLimitDoc.set({
    hourlyMessages,
    dailyMessages,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    allowed: true,
    remaining: Math.min(HOURLY_LIMIT - hourlyMessages.length, DAILY_LIMIT - dailyMessages.length),
    resetTime: new Date(now.getTime() + 60 * 60 * 1000),
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
    logger.error("Error fetching user context:", error);
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
    logger.error(`Bedrock API Error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);

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
export const chatWithAssistant = onCall(async (request: any) => {
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
    } catch (bedrockError) {
      logger.error("Bedrock completely failed, using fallback:", bedrockError);
      aiResponse = getFallbackResponse(userMessage, userContext);
      usedFallback = true;
    }

    const db = admin.firestore();
    try {
      await db.collection("chatHistory").add({
        userId,
        userMessage: userMessage.substring(0, MAX_MESSAGE_LENGTH),
        aiResponse: aiResponse.substring(0, 2000),
        usedFallback,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          messageLength: userMessage.length,
          responseLength: aiResponse.length,
          sanitized: rawMessage !== userMessage,
        },
      });
    } catch (dbError) {
      logger.error("Failed to save chat history:", dbError);
    }

    logger.info(`Chat completed for user ${userId} (fallback: ${usedFallback})`);

    return {
      response: aiResponse,
      timestamp: new Date().toISOString(),
      remainingMessages: rateLimit.remaining,
      usedFallback,
    };
  } catch (error: any) {
    logger.error("Critical chat error:", error);
    
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
export const chatWithAdminAssistant = onCall({ cors: true }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  }

  if (request.auth?.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Bu özellik sadece adminler için.");
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
      message: userMessage,
      response: aiResponse,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { response: aiResponse, timestamp: new Date().toISOString() };
  } catch (error: any) {
    logger.error("Admin chat error:", error);
    throw new HttpsError("internal", "Bir hata oluştu.");
  }
});

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
    logger.error("Error fetching admin chat history:", error);
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
    logger.error("Error fetching chat history:", error);
    return { messages: [] };
  }
});
