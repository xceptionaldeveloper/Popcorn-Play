import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseDb, IS_FIREBASE_REAL } from './firebaseStore';
import { UserProfile } from '../types';

/**
 * Parses diverse date formats into millisecond timestamps safely.
 * Supports string dates (ISO, YYYY-MM-DD), numbers (seconds or ms), 
 * and Firebase Timestamp objects.
 */
function parseExpirationDate(value: any): number | null {
  if (!value) return null;

  // Firebase Timestamp object handling
  if (value && typeof value === 'object' && 'seconds' in value) {
    return value.seconds * 1000;
  }
  if (value && typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }

  // ISO string or date-time strings handling
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  // Number handling (seconds or milliseconds)
  if (typeof value === 'number') {
    if (value < 10000000000) {
      return value * 1000; // standard Unix timestamp in seconds
    }
    return value; // timestamp in milliseconds
  }

  // Native Date object
  if (value instanceof Date) {
    return value.getTime();
  }

  return null;
}

/**
 * Verifies expiration dates of all premium subscriptions, both in real Firestore
 * and in local-storage simulation caches. Automatically sets isPremium to false
 * if a subscription has expired.
 */
export async function verifyUserSubscriptions(): Promise<{ expiredCount: number; error?: string }> {
  let expiredCount = 0;
  const now = Date.now();

  try {
    // 1. REAL FIRESTORE SUBSCRIPTION SYNC-VERIFICATION
    if (IS_FIREBASE_REAL && firebaseDb && firebaseAuth) {
      const currentUser = firebaseAuth.currentUser;
      let adminEmail = 'admin@popcornplay.com';
      try {
        const savedSettings = localStorage.getItem('pp_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed && parsed.adminEmail) {
            adminEmail = parsed.adminEmail.toLowerCase().trim();
          }
        }
      } catch (e) {}

      const userEmail = currentUser?.email?.toLowerCase().trim();
      const isAdmin = userEmail === 'mdikhlas098@gmail.com' || userEmail === 'mypassion9182@gmail.com' || userEmail === adminEmail;

      if (isAdmin) {
        console.log("⏱️ subscriptionService: Admin identified. Checking subscription expiration dates in Firestore...");
        
        const usersRef = collection(firebaseDb, 'users');
        // Query users where isPremium is true to optimize reads
        const q = query(usersRef, where('isPremium', '==', true));
        const querySnapshot = await getDocs(q);

        for (const docSnap of querySnapshot.docs) {
          const uData = docSnap.data();
          const userId = docSnap.id;
          let isExpired = false;

          // Check user custom 'expirationDate' field
          if (uData.expirationDate !== undefined && uData.expirationDate !== null) {
            const expTime = parseExpirationDate(uData.expirationDate);
            if (expTime !== null && expTime < now) {
              isExpired = true;
            }
          }

          // Check default 'premiumUntil' field
          if (uData.premiumUntil !== undefined && uData.premiumUntil !== null) {
            const expTime = parseExpirationDate(uData.premiumUntil);
            if (expTime !== null && expTime < now) {
              isExpired = true;
            }
          }

          if (isExpired) {
            console.warn(`🚨 User subscription EXPIRED inside Firestore: uid=${userId}, email=${uData.email}`);
            const userDocRef = doc(firebaseDb, 'users', userId);
            
            // Downgrade user subscription in Firestore
            await setDoc(userDocRef, { 
              isPremium: false,
              premiumUntil: null 
            }, { merge: true });
            
            expiredCount++;
          }
        }
      } else {
        console.log("⏱️ subscriptionService: Non-admin or unauthenticated session. Skipping global Firestore subscription scan to prevent permission errors.");
      }
    }

    // 2. OFFLINE / LOCAL-STORAGE Fallback Sync
    console.log("⏱️ subscriptionService: Checking subscription expiration dates in Local Storage...");
    
    // Check all prefix user session files
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pp_user_session_')) {
        try {
          const userStr = localStorage.getItem(key);
          if (userStr) {
            const user = JSON.parse(userStr) as UserProfile;
            if (user && user.isPremium) {
              let localExpired = false;
              
              if (user.expirationDate !== undefined && user.expirationDate !== null) {
                const expTime = parseExpirationDate(user.expirationDate);
                if (expTime !== null && expTime < now) {
                  localExpired = true;
                }
              }
              if (user.premiumUntil !== undefined && user.premiumUntil !== null) {
                const expTime = parseExpirationDate(user.premiumUntil);
                if (expTime !== null && expTime < now) {
                  localExpired = true;
                }
              }

              if (localExpired) {
                user.isPremium = false;
                user.premiumUntil = null;
                localStorage.setItem(key, JSON.stringify(user));
                expiredCount++;
                console.log(`🚨 Local user session expired: email=${user.email}`);
              }
            }
          }
        } catch (e) {
          console.error("Local user subscription parsing failed:", e);
        }
      }
    }

    // 3. Update current active user session if it is expired
    const currentUserStr = localStorage.getItem('pp_current_user');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr) as UserProfile;
        if (currentUser && currentUser.isPremium) {
          let curExpired = false;
          
          if (currentUser.expirationDate !== undefined && currentUser.expirationDate !== null) {
            const expTime = parseExpirationDate(currentUser.expirationDate);
            if (expTime !== null && expTime < now) {
              curExpired = true;
            }
          }
          if (currentUser.premiumUntil !== undefined && currentUser.premiumUntil !== null) {
            const expTime = parseExpirationDate(currentUser.premiumUntil);
            if (expTime !== null && expTime < now) {
              curExpired = true;
            }
          }

          if (curExpired) {
            currentUser.isPremium = false;
            currentUser.premiumUntil = null;
            
            localStorage.setItem('pp_current_user', JSON.stringify(currentUser));
            localStorage.setItem('pp_premium_user_status', 'false');
            
            // Dispatch a window storage event so that layout states refresh instantly!
            window.dispatchEvent(new Event('storage'));
            console.log("🚨 Active user session has expired & downgraded.");
          }
        }
      } catch (e) {
        console.error("pp_current_user parsing failed:", e);
      }
    }

    return { expiredCount };
  } catch (err: any) {
    console.error("❌ Subscription verification service error:", err);
    return { expiredCount, error: err.message || String(err) };
  }
}
