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