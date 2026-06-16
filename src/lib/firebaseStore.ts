/**
 * POPCORN PLAY firebaseStore
 * Dual-Sync Engine: Connects to actual Firebase cloud if provisioned,
 * otherwise runs a premium stateful local fallback with pre-seeded data.
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, limit, getDocFromServer, where } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ContentItem, NotificationItem, SupportSession, PaymentRequest, AppSettings, VisitorStat, UserProfile, ChatMessage, PremiumPlan, BannerItem } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Detect if Firebase is configured properly
export const IS_FIREBASE_REAL = 
  firebaseConfig && 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'placeholder-key' && 
  !firebaseConfig.apiKey.includes('MY_GEMINI_API');

let firebaseAuth: any = null;
let firebaseDb: any = null;

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth?.currentUser?.uid || null,
      email: firebaseAuth?.currentUser?.email || null,
      emailVerified: firebaseAuth?.currentUser?.emailVerified || null,
      isAnonymous: firebaseAuth?.currentUser?.isAnonymous || null,
      tenantId: firebaseAuth?.currentUser?.tenantId || null,
      providerInfo: firebaseAuth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

if (IS_FIREBASE_REAL) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firebaseAuth = getAuth(app);
    firebaseDb = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    console.log('🔥 Popcorn Play: Successfully connected to cloud Firebase!');
    
    // Validate Connection to Firestore on startup as mandated by Firebase skill
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(firebaseDb, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  } catch (err) {
    console.warn('⚠️ Popcorn Play: Firebase connection failed, falling back to LocalStorage engine:', err);
  }
} else {
  console.log('📱 Popcorn Play: Running with LocalStorage engine (Firebase credentials empty).');
}

// Default Seed Content Data
const DEFAULT_CONTENT: ContentItem[] = [
  {
    id: 'm1',
    title: 'Toofan',
    category: 'Movies',
    coverUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    downloadUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    tags: ['Bangla', 'Shakib Khan', 'Action', 'Dhallywood', 'Mass'],
    isPremium: false,
    isAdult: false,
    schedule: 'Released',
    description: 'A notorious gangster rises to dominance in Dhaka’s criminal underground. An action-packed blockbuster featuring stunning choreography and Dhallywood star Shakib Khan.',
    rating: 8.6
  },
  {
    id: 'm2',
    title: 'Jawan',
    category: 'Movies',
    coverUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    tags: ['SRK', 'Action', 'Thriller', 'Bollywood', 'HighOctane'],
    isPremium: true,
    isAdult: false,
    schedule: 'Released',
    description: 'A high-octane action thriller which outlines the emotional journey of a man who is set to rectify the societal wrongs of the past.',
    rating: 8.8
  },
  {
    id: 'm3',
    title: 'The Evil Within',
    category: 'Movies',
    coverUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    tags: ['Horror', 'Supernatural', 'Thriller', '18+'],
    isPremium: false,
    isAdult: true,
    schedule: 'Fridays',
    description: 'A spine-chilling horror mystery about a haunted manor in the suburbs. Only for brave hearts.',
    rating: 7.4
  },
  {
    id: 'a1',
    title: 'Naruto Shippuden',
    category: 'Anime',
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    videoUrl: '',
    tags: ['Naruto', 'Ninjutsu', 'Action', 'Anime Classics'],
    isPremium: false,
    isAdult: false,
    schedule: 'Monday',
    description: 'Naruto Uzumaki returns to Konoha village after years of intense training. Witness the epic battles against the Akatsuki organization.',
    rating: 9.1,
    status: 'completed',
    zipUrl: 'https://archive.org/download/naruto-zip-download',
    episodes: [
      { id: 'nar-ep1', number: 1, title: 'Homecoming', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', isFiller: false },
      { id: 'nar-ep2', number: 2, title: 'The Akatsuki Makes Its Move', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', isFiller: false },
      { id: 'nar-ep3', number: 3, title: 'History of Konoha (Special)', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', isFiller: true },
      { id: 'nar-ep4', number: 4, title: 'The Sand Outpost Guarded', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', isFiller: false }
    ]
  },
  {
    id: 'a2',
    title: 'Jujutsu Kaisen S2',
    category: 'Anime',
    coverUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
    videoUrl: '',
    tags: ['Gojo', 'Shibuya Incident', 'Curses', 'Dark Fantasy'],
    isPremium: true,
    isAdult: false,
    schedule: 'Thursday',
    description: 'Explore the past of Gojo Satoru and Geto Suguru in their high school years, leading up to the traumatic Shibuya Incident.',
    rating: 9.3,
    status: 'ongoing',
    episodes: [
      { id: 'jjk-ep1', number: 1, title: 'Hidden Inventory', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', isFiller: false },
      { id: 'jjk-ep2', number: 2, title: 'Premature Death', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutback.mp4', isFiller: false }
    ]
  },
  {
    id: 'd1',
    title: 'Bachelor Point',
    category: 'Drama',
    coverUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    videoUrl: '',
    tags: ['Bangla', 'Comedy', 'Dhallywood', 'Kabila', 'Bachelor'],
    isPremium: false,
    isAdult: false,
    schedule: 'Sunday',
    description: 'An extremely popular comedy drama serial representing the challenges and humor of bachelors living together in Dhaka.',
    rating: 9.4,
    status: 'ongoing',
    episodes: [
      { id: 'bp-ep1', number: 1, title: 'New Roommate Kabila', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', isFiller: false },
      { id: 'bp-ep2', number: 2, title: 'Flat Landlord’s Shock', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', isFiller: false }
    ]
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'POPCORN PLAY',
  adultPin: '0000',
  supportActive: true,
  bkash: '01712-345678 (Personal)',
  nagad: '01912-876543 (Merchant)',
  bank: 'Popcorn Play Media Ltd, Sonali Bank, A/C: 1022-0987-1234',
  adminEmail: 'admin@popcornplay.com',
  adminPassword: 'Ikhlas124@#',
  recName: 'MD. Ikhlas',
  recMother: 'Salma Begum',
  recFather: 'Anamul Kabir Sumon',
  recBlood: 'B+',
  recDob: '31-12-2005',
  recNid: '6466938138',
  paymentMethods: [
    { id: '1', name: 'bKash Personal', number: '01712-345678', instructions: 'Send Money only' },
    { id: '2', name: 'Nagad Merchant', number: '01912-876543', instructions: 'Use Make Payment option' },
    { id: '3', name: 'Dutch-Bangla Bank', number: '1022-0987-1234', instructions: 'Branch or App Transfer' }
  ],
  customCategories: {
    Movies: ['Action', 'Romance', '18+ content', 'Thriller', 'Comedy', 'Sci-Fi', 'Horror', 'Bollywood', 'Dhallywood'],
    Anime: ['Action', 'Romance', '18+ content', 'Fantasy', 'Shounen', 'Slice of Life', 'Isekai', 'Adventure', 'Mystery'],
    Drama: ['Action', 'Romance', '18+ content', 'Comedy', 'Family', 'Thriller', 'Crime', 'Romantic Comedy'],
    Cartoon: ['Action', 'Romance', '18+ content', 'Adventure', 'Comedy', 'Family', 'Kids', 'Fantasy'],
    Serial: ['Action', 'Romance', '18+ content', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Mystery']
  },
  premiumPlans: [
    { id: 'plan-1', name: '30 Days VIP Premium', price: 150, durationDays: 30 },
    { id: 'plan-2', name: '6 Months VIP Premium', price: 700, durationDays: 180 },
    { id: 'plan-3', name: '1 Year VIP Premium', price: 1200, durationDays: 365 }
  ],
  popupEnabled: true,
  popupTitle: '🎉 Welcome to Popcorn Play Premium!',
  popupMessage: 'Unlock unlimited full HD movies, premium blockbusters, ad-free streaming and high speed direct download packets! Enter our plans to get started.',
  popupImageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
  popupButtonText: '👉 EXPLORE PLANS NOW',
  popupButtonLink: '#premium',
  banners: [
    {
      id: 'banner-default-1',
      title: 'Toofan Blockbuster 2024',
      description: 'Shakib Khan lights up the screen in this action packed saga of power, betrayal, and salvation. Watch direct streaming in ultra 4K.',
      coverUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
      category: 'Movies',
      isActive: true,
      type: 'custom',
      createdAt: Date.now() - 10000000
    }
  ],
  autoBannerLimit: 5,
  autoBannerDays: 30,
  autoNotificationLimit: 5,
  socialLinks: [
    {
      id: 'sl-1',
      platformName: 'Telegram',
      linkName: 'Popcorn Play Official Channel',
      url: 'https://t.me/PopcornPlayOfficial',
      icon: 'Send',
      createdAt: Date.now() - 5000000
    },
    {
      id: 'sl-2',
      platformName: 'Facebook',
      linkName: 'Popcorn Play Discussion Group',
      url: 'https://facebook.com/groups/popcornplay',
      icon: 'Facebook',
      createdAt: Date.now() - 4000000
    }
  ],
  bannerAnimationType: 'fade'
};

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', msg: '🔥 Toofan Movie now streaming directly with watch links!', time: '10 mins ago', read: false },
  { id: 'n2', msg: '🥋 Naruto Shippuden episodes 1-4 updated on the schedule.', time: '2 hours ago', read: false }
];

const DEFAULT_STATS: VisitorStat[] = [
  { label: 'Sunday', visitors: 1420, revenue: 15400 },
  { label: 'Monday', visitors: 1650, revenue: 18200 },
  { label: 'Tuesday', visitors: 1510, revenue: 12100 },
  { label: 'Wednesday', visitors: 1890, revenue: 25800 },
  { label: 'Thursday', visitors: 1980, revenue: 28900 },
  { label: 'Friday', visitors: 2650, revenue: 45000 },
  { label: 'Saturday', visitors: 2420, revenue: 38200 }
];

// Helper to interact with Local Storage safely
const getLocal = (key: string, defaultValue: any) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return defaultValue;
};

const setLocal = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(e);
  }
};

// Ensure seed data is initialized
if (!localStorage.getItem('pp_content')) setLocal('pp_content', DEFAULT_CONTENT);
if (!localStorage.getItem('pp_settings')) setLocal('pp_settings', DEFAULT_SETTINGS);
if (!localStorage.getItem('pp_notifications')) setLocal('pp_notifications', DEFAULT_NOTIFICATIONS);
if (!localStorage.getItem('pp_payments')) setLocal('pp_payments', []);
if (!localStorage.getItem('pp_chats')) setLocal('pp_chats', {});
if (!localStorage.getItem('pp_visitor_stats')) setLocal('pp_visitor_stats', DEFAULT_STATS);

/**
 * ----------------- AUTHENTICATION WRAPPERS -----------------
 */
export async function signInWithGoogle(): Promise<UserProfile> {
  if (IS_FIREBASE_REAL && firebaseAuth) {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(firebaseAuth, provider);
    const user = result.user;
    
    const profile: UserProfile = {
      uid: user.uid,
      name: user.displayName || 'Google Member',
      email: user.email || '',
      isPremium: false,
      favorites: []
    };
    
    // Check if profile exists in db to get real premium/fav states
    if (firebaseDb) {
      const userRef = doc(firebaseDb, 'users', user.uid);
      let snap;
      try {
        snap = await getDoc(userRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }

      if (snap && snap.exists()) {
        const data = snap.data() as UserProfile;
        return { ...profile, ...data };
      } else {
        try {
          await setDoc(userRef, profile);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
        }
      }
    }
    return profile;
  } else {
    // Local storage login helper
    const dummyUser: UserProfile = {
      uid: 'google-usr-123',
      name: 'Ikhlas Uddin',
      email: 'guest.ikhlas@gmail.com',
      isPremium: getLocal('pp_premium_user_status', false),
      favorites: getLocal('pp_user_favorites', ['m1', 'a2'])
    };
    return dummyUser;
  }
}

export async function customSignUp(profile: Partial<UserProfile> & {password: string}): Promise<UserProfile> {
  if (IS_FIREBASE_REAL && firebaseAuth) {
    try {
      const email = profile.email || 'viewer@popcorn.com';
      const password = profile.password;
      
      // 1. Create the user in Firebase Authentication
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const user = result.user;

      const newProfile: UserProfile = {
        uid: user.uid,
        name: profile.name || 'Anonymous Viewer',
        email: email,
        isPremium: false,
        favorites: [],
        password: password // Keep for compatibility
      };

      // 2. Write profile to Firestore
      const userRef = doc(firebaseDb, 'users', user.uid);
      await setDoc(userRef, newProfile);

      setLocal(`pp_user_session_${user.uid}`, newProfile);
      return newProfile;
    } catch (error: any) {
      console.error("Firebase Auth custom signup failed:", error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists inside our registry. Please select Login instead! (এই ইমেইল দিয়ে ইতঃপূর্বেই অ্যাকাউন্ট তৈরি করা হয়েছে, দয়া করে লগইন করুন!)');
      }
      throw new Error(error.message || 'Firebase Authentication registration failed.');
    }
  } else {
    // Local storage fallback
    const cleanEmail = (profile.email || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const uid = cleanEmail ? `local-usr-${cleanEmail}` : 'local-usr-' + Math.random().toString(36).substr(2, 9);
    
    // Verify if user already exists
    let existingUser = getLocal(`pp_user_session_${uid}`, null);
    if (existingUser) {
      throw new Error('An account with this email already exists inside our registry. Please select Login instead! (এই ইমেইল দিয়ে ইতঃপূর্বেই অ্যাকাউন্ট তৈরি করা হয়েছে, দয়া করে লগইন করুন!)');
    }

    const newProfile: UserProfile = {
      uid,
      name: profile.name || 'Anonymous Viewer',
      email: profile.email || 'viewer@popcorn.com',
      isPremium: false,
      favorites: [],
      password: profile.password // Persist registration password credentials
    };
    
    setLocal(`pp_user_session_${uid}`, newProfile);
    return newProfile;
  }
}

export async function customSignIn(email: string, passwordInput: string): Promise<UserProfile> {
  if (IS_FIREBASE_REAL && firebaseAuth) {
    try {
      // 1. Sign in via Firebase Auth
      const result = await signInWithEmailAndPassword(firebaseAuth, email, passwordInput);
      const user = result.user;

      // 2. Fetch or create Firestore user profile
      const userRef = doc(firebaseDb, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const fetchedProfile = snap.data() as UserProfile;
        setLocal(`pp_user_session_${user.uid}`, fetchedProfile);
        return fetchedProfile;
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          name: user.displayName || email.split('@')[0],
          email: email,
          isPremium: false,
          favorites: [],
          password: passwordInput
        };
        await setDoc(userRef, newProfile);
        setLocal(`pp_user_session_${user.uid}`, newProfile);
        return newProfile;
      }
    } catch (error: any) {
      console.error("Firebase Auth custom signin failed:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        throw new Error('Incorrect email or password! Please try again. (ইমেইল অথবা পাসওয়ার্ড সফলভাবে মেলেনি!)');
      }
      throw new Error(error.message || 'Firebase Authentication login failed.');
    }
  } else {
    // Local storage fallback
    const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '');
    const uid = `local-usr-${cleanEmail}`;

    let fetchedProfile = getLocal(`pp_user_session_${uid}`, null);

    if (fetchedProfile) {
      // If user has a password set, verify it
      if (fetchedProfile.password) {
        if (fetchedProfile.password !== passwordInput) {
          throw new Error('Incorrect password entered! Please try again. (পাসওয়ার্ড সফলভাবে মেলেনি!)');
        }
      } else {
        // Legacy user has no password set yet. Let's register this password now!
        fetchedProfile.password = passwordInput;
        setLocal(`pp_user_session_${uid}`, fetchedProfile);
      }
      return fetchedProfile;
    }

    // DO NOT dynamically register unregistered users on login attempts!
    throw new Error('No registered profile matches this email address. Please click Sign Up to register! (এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট তৈরি করা হয়নি। দয়া করে সাইন-আপ করুন!)');
  }
}

export async function logOut(): Promise<void> {
  localStorage.removeItem('pp_premium_until');
  if (typeof window !== 'undefined') {
    localStorage.setItem('pp_premium_user_status', 'false');
  }
  if (IS_FIREBASE_REAL && firebaseAuth) {
    await firebaseSignOut(firebaseAuth);
  }
}

export function subscribeAuth(callback: (user: any) => void) {
  if (IS_FIREBASE_REAL && firebaseAuth) {
    return onAuthStateChanged(firebaseAuth, callback);
  } else {
    callback(getLocal('pp_current_user', null));
    return () => {};
  }
}

export async function updateUserProfile(profile: UserProfile) {
  // Update local
  setLocal('pp_current_user', profile);
  // If isPremium changed to false, make sure we align local storage pp_premium_user_status
  if (!profile.isPremium) {
    setLocal('pp_premium_user_status', false);
    localStorage.removeItem('pp_premium_until');
  } else if (profile.premiumUntil) {
    setLocal('pp_premium_user_status', true);
    localStorage.setItem('pp_premium_until', String(profile.premiumUntil));
  }

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'users', profile.uid), profile, { merge: true });
    } catch (error) {
      console.warn("Failed to update user profile in Firestore:", error);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

export function subscribeUserProfile(userId: string, callback: (profile: UserProfile | null) => void) {
  if (IS_FIREBASE_REAL && firebaseDb) {
    return onSnapshot(doc(firebaseDb, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as UserProfile);
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn("Error listening to user profile:", err);
      // Fallback
      callback(getLocal('pp_current_user', null));
    });
  } else {
    callback(getLocal('pp_current_user', null));
    const handleStorage = () => {
      callback(getLocal('pp_current_user', null));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
}

/**
 * ----------------- DATABASE EVENT SNAPSHOTS (REALTIME) -----------------
 */

// App Settings Sync
export function subscribeAppSettings(callback: (settings: AppSettings) => void) {
  if (IS_FIREBASE_REAL && firebaseDb) {
    const docPath = 'app_settings/config';
    return onSnapshot(doc(firebaseDb, 'app_settings', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        const configData = docSnap.data() as AppSettings;
        setLocal('pp_settings', configData);
        callback(configData);
      } else {
        const isAdminUser = firebaseAuth?.currentUser?.email && (
          firebaseAuth.currentUser.email === 'mdikhlas098@gmail.com' ||
          firebaseAuth.currentUser.email === 'admin@popcornplay.com' ||
          firebaseAuth.currentUser.email === getLocal('pp_settings', DEFAULT_SETTINGS)?.adminEmail
        );
        if (isAdminUser) {
          console.log("🔥 Seeding empty Firebase app_settings with default config...");
          setDoc(doc(firebaseDb, 'app_settings', 'config'), DEFAULT_SETTINGS).catch(e => {
            console.error("Failed seeding app_settings/config on Firestore:", e);
          });
        }
        callback(getLocal('pp_settings', DEFAULT_SETTINGS));
      }
    }, (err) => {
      console.error("error loading settings:", err);
      try {
        handleFirestoreError(err, OperationType.GET, docPath);
      } catch (e) {
        callback(getLocal('pp_settings', DEFAULT_SETTINGS));
      }
    });
  } else {
    // Simulate real-time by polling or simple local state trigger
    const initial = getLocal('pp_settings', DEFAULT_SETTINGS);
    callback(initial);
    
    // Add custom listener for fake live storage updates
    const handleStorage = () => {
      callback(getLocal('pp_settings', DEFAULT_SETTINGS));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
}

export async function updateAppSettings(settings: AppSettings) {
  const oldSettings = getLocal('pp_settings', DEFAULT_SETTINGS) as AppSettings;
  setLocal('pp_settings', settings);
  
  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'app_settings', 'config'), settings);
      console.log("Firestore app_settings/config saved successfully.");

      // Sync custom admin Gmail and password with Firebase Authentication if they are the logged-in user
      if (firebaseAuth && firebaseAuth.currentUser) {
        try {
          const currentUser = firebaseAuth.currentUser;
          
          const oldEmail = (oldSettings.adminEmail || 'admin@popcornplay.com').trim().toLowerCase();
          const oldPassword = oldSettings.adminPassword || 'Ikhlas124@#';
          const newEmail = (settings.adminEmail || 'admin@popcornplay.com').trim().toLowerCase();
          const newPassword = settings.adminPassword || 'Ikhlas124@#';

          // Check if this admin is the currently logged in user
          const isUserAdminEmail = currentUser.email?.toLowerCase() === oldEmail || currentUser.email?.toLowerCase() === newEmail;

          if (isUserAdminEmail) {
            const isEmailChanged = oldEmail !== newEmail;
            const isPasswordChanged = oldPassword !== newPassword;

            if (isEmailChanged || isPasswordChanged) {
              console.log("Admin credentials modified! Synchronizing with Firebase system...", { isEmailChanged, isPasswordChanged });
              
              // Only update Firebase Auth email/password if they did NOT log in via google.com provider
              const isGoogleUser = currentUser.providerData?.some(p => p.providerId === 'google.com') || currentUser.email?.endsWith('@gmail.com');

              if (!isGoogleUser) {
                // Re-authenticate user to satisfy modern browser's security/re-login prompt
                try {
                  const credential = EmailAuthProvider.credential(currentUser.email || oldEmail, oldPassword);
                  await reauthenticateWithCredential(currentUser, credential);
                  console.log("Admin session verified for credentials modification.");
                } catch (reauthErr) {
                  console.warn("Re-authentication with last known keys failed, trying new keys:", reauthErr);
                  try {
                    const credential = EmailAuthProvider.credential(currentUser.email || newEmail, newPassword);
                    await reauthenticateWithCredential(currentUser, credential);
                    console.log("Admin session verified with new credentials.");
                  } catch (reauthErr2) {
                    console.warn("Could not satisfy re-authentication criteria:", reauthErr2);
                  }
                }

                // Sync with Firebase Auth
                try {
                  if (isPasswordChanged) {
                    await updatePassword(currentUser, newPassword);
                    console.log("Firebase Auth password synchronized.");
                  }
                  if (isEmailChanged) {
                    await updateEmail(currentUser, newEmail);
                    console.log("Firebase Auth email synchronized.");
                  }
                } catch (authErr: any) {
                  console.error("Firebase Auth email/password update failed (non-blocking):", authErr);
                }
              } else {
                console.log("Logged in via Google, skipping Firebase Auth email/password updating.");
              }

              // Also synchronize custom Firestore user profile
              try {
                const userRef = doc(firebaseDb, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);
                let currentProfileName = currentUser.displayName || 'Popcorn Play Admin';
                let currentProfileEmail = currentUser.email || newEmail;
                let currentFavorites = [];

                if (userSnap.exists()) {
                  const data = userSnap.data();
                  if (data) {
                    currentProfileName = data.name || currentProfileName;
                    currentProfileEmail = data.email || currentProfileEmail;
                    currentFavorites = data.favorites || [];
                  }
                }

                const updatedProfile = {
                  uid: currentUser.uid,
                  name: currentProfileName,
                  email: currentProfileEmail,
                  isPremium: true,
                  favorites: currentFavorites,
                  password: newPassword
                };

                await setDoc(userRef, updatedProfile, { merge: true });
                setLocal(`pp_user_session_${currentUser.uid}`, updatedProfile);
                console.log("Admin user profile document synchronized on Firestore (preserved personal details).");
              } catch (profileErr: any) {
                console.error("Firebase Firestore user profile sync failed (non-blocking):", profileErr);
              }
            }
          }
        } catch (syncErr: any) {
          console.warn("Non-blocking error during admin credentials sync:", syncErr);
        }
      }
    } catch (error: any) {
      console.error("Failed saving app_settings on Firestore:", error);
      throw new Error(error.message || "Failed to finalize admin settings updates in Firebase cloud.");
    }
  }
  // Dispatch dynamic storage event to trigger simulation callbacks instantly
  window.dispatchEvent(new Event('storage'));
}

// Media Content Sync
export function subscribeContent(callback: (items: ContentItem[]) => void) {
  const sortContent = (list: ContentItem[]) => {
    return [...list].sort((a, b) => {
      const timeA = a.updatedAt || a.createdAt || 0;
      const timeB = b.updatedAt || b.createdAt || 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return (b.id || '').localeCompare(a.id || '');
    });
  };

  if (IS_FIREBASE_REAL && firebaseDb) {
    return onSnapshot(collection(firebaseDb, 'content'), (snap) => {
      const list: ContentItem[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ContentItem);
      });
      
      if (snap.empty) {
        const isAdminUser = firebaseAuth?.currentUser?.email && (
          firebaseAuth.currentUser.email === 'mdikhlas098@gmail.com' ||
          firebaseAuth.currentUser.email === 'admin@popcornplay.com' ||
          firebaseAuth.currentUser.email === getLocal('pp_settings', DEFAULT_SETTINGS)?.adminEmail
        );
        if (isAdminUser) {
          console.log("🔥 Seeding empty Firebase catalog with default items...");
          DEFAULT_CONTENT.forEach(async (item) => {
            try {
              await setDoc(doc(firebaseDb, 'content', item.id), item);
            } catch (err) {
              console.error("Failed seeding movie/serial item to Firestore:", err);
            }
          });
        }
        callback(sortContent(getLocal('pp_content', DEFAULT_CONTENT)));
      } else {
        setLocal('pp_content', list);
        callback(sortContent(list));
      }
    }, (err) => {
      console.error("error loading content:", err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'content');
      } catch (e) {
        callback(sortContent(getLocal('pp_content', DEFAULT_CONTENT)));
      }
    });
  } else {
    callback(sortContent(getLocal('pp_content', DEFAULT_CONTENT)));
    const handleStorage = () => {
      callback(sortContent(getLocal('pp_content', DEFAULT_CONTENT)));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
}

// Real-Time query search & filter using Firestore
export function subscribeContentFiltered(
  category: string,
  subCategory: string,
  searchQuery: string,
  callback: (items: ContentItem[]) => void
) {
  const sortContent = (list: ContentItem[]) => {
    return [...list].sort((a, b) => {
      const timeA = a.updatedAt || a.createdAt || 0;
      const timeB = b.updatedAt || b.createdAt || 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return (b.id || '').localeCompare(a.id || '');
    });
  };

  if (IS_FIREBASE_REAL && firebaseDb) {
    let q = query(collection(firebaseDb, 'content'));

    // Apply Firestore queries dynamically
    // To prevent Firestore from complaining about missing composite indexes, we prioritize the tag/genre filter
    // or fallback to category-specific collection queries where appropriate. Both are computed directly on Firebase Cloud.
    if (subCategory && subCategory !== 'All') {
      q = query(q, where('tags', 'array-contains', subCategory));
    } else if (category && category !== 'All') {
      q = query(q, where('category', '==', category));
    }

    return onSnapshot(q, (snap) => {
      const list: ContentItem[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ContentItem);
      });

      let results = list;

      // In case we only queried by tag but also have category, filter the category first
      if (subCategory && subCategory !== 'All' && category && category !== 'All') {
        results = results.filter(item => item.category === category);
      }

      // If user typed a search query, perform a real-time matching text search on title, category, description, and tags
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        results = results.filter(item => {
          const matchTitle = (item.title || '').toLowerCase().includes(queryLower);
          const matchDesc = (item.description || '').toLowerCase().includes(queryLower);
          const matchCategory = (item.category || '').toLowerCase().includes(queryLower);
          const matchTags = (item.tags || []).some(t => t.toLowerCase().includes(queryLower));
          return matchTitle || matchDesc || matchCategory || matchTags;
        });
      }

      callback(sortContent(results));
    }, (err) => {
      console.warn("error loading filtered content from Firestore:", err);
      // Fallback
      const offline = getLocal('pp_content', DEFAULT_CONTENT) as ContentItem[];
      callback(sortContent(offline));
    });
  } else {
    // Offline simulation mode using localStorage
    const handleStorage = () => {
      const all = getLocal('pp_content', DEFAULT_CONTENT) as ContentItem[];
      const filtered = all.filter(item => {
        if (category && category !== 'All' && item.category !== category) return false;
        if (subCategory && subCategory !== 'All' && !(item.tags || []).some(t => t.toLowerCase() === subCategory.toLowerCase())) return false;
        if (searchQuery.trim()) {
          const term = searchQuery.toLowerCase().trim();
          const matchTitle = (item.title || '').toLowerCase().includes(term);
          const matchDesc = (item.description || '').toLowerCase().includes(term);
          const matchCategory = (item.category || '').toLowerCase().includes(term);
          const matchTags = (item.tags || []).some(t => t.toLowerCase().includes(term));
          if (!matchTitle && !matchDesc && !matchCategory && !matchTags) return false;
        }
        return true;
      });
      callback(sortContent(filtered));
    };

    handleStorage();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
}

export async function saveContentItem(item: ContentItem) {
  const current = getLocal('pp_content', DEFAULT_CONTENT) as ContentItem[];
  const existingIndex = current.findIndex(c => c.id === item.id);
  
  const now = Date.now();
  const isNew = existingIndex === -1;

  if (existingIndex > -1) {
    const oldItem = current[existingIndex];
    item.createdAt = oldItem.createdAt || now;
    item.updatedAt = now;
    current[existingIndex] = item;
  } else {
    item.createdAt = now;
    item.updatedAt = now;
    current.push(item);
  }
  setLocal('pp_content', current);

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'content', item.id), item);
    } catch (error) {
      const op = existingIndex > -1 ? OperationType.UPDATE : OperationType.CREATE;
      handleFirestoreError(error, op, `content/${item.id}`);
    }
  }

  // Auto Banner & Auto Notification Generation
  if (isNew) {
    let settings = getLocal('pp_settings', DEFAULT_SETTINGS) as AppSettings;
    if (IS_FIREBASE_REAL && firebaseDb) {
      try {
        const docSnap = await getDoc(doc(firebaseDb, 'app_settings', 'config'));
        if (docSnap.exists()) {
          settings = docSnap.data() as AppSettings;
        }
      } catch (e) {
        console.error("Error reading live settings inside saveContentItem:", e);
      }
    }
    const autoBannerLimit = settings.autoBannerLimit !== undefined ? settings.autoBannerLimit : 5;
    const currentBanners = settings.banners || [];

    const newAutoBanner: BannerItem = {
      id: 'banner-auto-' + item.id,
      title: item.title,
      description: item.description,
      coverUrl: item.coverUrl,
      category: item.category,
      contentId: item.id,
      isActive: true,
      type: 'auto',
      createdAt: now
    };

    let autoBanners = currentBanners.filter(b => b.type === 'auto');
    const customBanners = currentBanners.filter(b => b.type !== 'auto');
    autoBanners.push(newAutoBanner);

    // Keep oldest at the front (ascending by date)
    autoBanners.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    while (autoBanners.length > autoBannerLimit) {
      autoBanners.shift();
    }

    const updatedSettings = {
      ...settings,
      banners: [...customBanners, ...autoBanners]
    };

    await updateAppSettings(updatedSettings);

    // Auto Notification
    const autoNotifLimit = settings.autoNotificationLimit !== undefined ? settings.autoNotificationLimit : 5;
    const currentNotifications = getLocal('pp_notifications', DEFAULT_NOTIFICATIONS) as NotificationItem[];

    const newAutoNotif: NotificationItem = {
      id: 'notif-auto-' + item.id,
      msg: `🎬 New ${item.category} Added: "${item.title}"! Stream directly now.`,
      time: 'Just now',
      read: false,
      type: 'auto',
      contentId: item.id,
      createdAt: now
    };

    let autoNotifs = currentNotifications.filter(n => n.type === 'auto');
    const customNotifs = currentNotifications.filter(n => n.type !== 'auto');
    autoNotifs.push(newAutoNotif);

    autoNotifs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    while (autoNotifs.length > autoNotifLimit) {
      const deleted = autoNotifs.shift();
      if (deleted && IS_FIREBASE_REAL && firebaseDb) {
        try {
          await deleteDoc(doc(firebaseDb, 'notifications', deleted.id));
        } catch (e) {
          console.error("Failed to delete older auto notification:", e);
        }
      }
    }

    const updatedNotifs = [...customNotifs, ...autoNotifs];
    setLocal('pp_notifications', updatedNotifs);

    if (IS_FIREBASE_REAL && firebaseDb) {
      try {
        await setDoc(doc(firebaseDb, 'notifications', newAutoNotif.id), newAutoNotif);
      } catch (e) {
        console.error("Failed to write auto notification:", e);
      }
    }
  }

  window.dispatchEvent(new Event('storage'));
}

export async function deleteContentItem(itemId: string) {
  const current = getLocal('pp_content', DEFAULT_CONTENT) as ContentItem[];
  const filtered = current.filter(c => c.id !== itemId);
  setLocal('pp_content', filtered);

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await deleteDoc(doc(firebaseDb, 'content', itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `content/${itemId}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

// Premium Subscription Payment Submissions Sync
export function subscribePayments(callback: (items: PaymentRequest[]) => void) {
  if (IS_FIREBASE_REAL && firebaseDb) {
    return onSnapshot(collection(firebaseDb, 'payments'), (snap) => {
      const list: PaymentRequest[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as PaymentRequest);
      });
      callback(list);
    }, (err) => {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'payments');
      } catch (e) {
        callback(getLocal('pp_payments', []));
      }
    });
  } else {
    callback(getLocal('pp_payments', []));
    const handleStorage = () => {
      callback(getLocal('pp_payments', []));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
}

export async function submitPaymentRequest(req: PaymentRequest) {
  const current = getLocal('pp_payments', []) as PaymentRequest[];
  current.push(req);
  setLocal('pp_payments', current);

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'payments', req.id), req);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `payments/${req.id}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

export async function updatePaymentRequestStatus(reqId: string, status: 'approved' | 'rejected') {
  let payReq: PaymentRequest | undefined = undefined;
  let durationDays = 30;

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      const payDocRef = doc(firebaseDb, 'payments', reqId);
      const paySnap = await getDoc(payDocRef);
      if (paySnap.exists()) {
        payReq = { id: reqId, ...paySnap.data() } as PaymentRequest;
        durationDays = payReq.durationDays || 30;
      }
    } catch (error) {
      console.error("Error fetching payment request from Firestore:", error);
    }
  }

  // Fallback / sync with local storage
  const current = getLocal('pp_payments', []) as PaymentRequest[];
  const localPayReq = current.find(p => p.id === reqId);
  if (localPayReq) {
    localPayReq.status = status;
    setLocal('pp_payments', current);
    if (!payReq) {
      payReq = localPayReq;
      durationDays = payReq.durationDays || 30;
    }
  }

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await updateDoc(doc(firebaseDb, 'payments', reqId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `payments/${reqId}`);
    }
    // Update user sub record in the users database collection
    if (payReq) {
      try {
        const userRef = doc(firebaseDb, 'users', payReq.userId);
        if (status === 'approved') {
          const userSnap = await getDoc(userRef);
          let currentExpiry = Date.now();
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (uData.premiumUntil && uData.premiumUntil > Date.now()) {
              currentExpiry = uData.premiumUntil;
            }
          }
          const nextExpiry = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
          await setDoc(userRef, { isPremium: true, premiumUntil: nextExpiry }, { merge: true });
        } else {
          await setDoc(userRef, { isPremium: false, premiumUntil: null }, { merge: true });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${payReq.userId}`);
      }
    }
  }

  // Sync general local storage user session and details
  if (payReq) {
    const userSessionKey = `pp_user_session_${payReq.userId}`;
    const localUser = getLocal(userSessionKey, null) as UserProfile | null;
    if (localUser) {
      let currentExpiry = Date.now();
      if (localUser.premiumUntil && localUser.premiumUntil > Date.now() && status === 'approved') {
        currentExpiry = localUser.premiumUntil;
      }
      const nextExpiry = status === 'approved' ? (currentExpiry + durationDays * 24 * 60 * 60 * 1000) : null;
      localUser.isPremium = (status === 'approved');
      localUser.premiumUntil = nextExpiry;
      setLocal(userSessionKey, localUser);
    }
  }

  // Sync client-side session immediately if this belongs to the active logged-in user
  if (payReq) {
    const cachedUserStr = localStorage.getItem('pp_current_user');
    if (cachedUserStr) {
      try {
        const cachedUser = JSON.parse(cachedUserStr) as UserProfile;
        if (cachedUser.uid === payReq.userId) {
          if (status === 'approved') {
            const currentExpiry = cachedUser.premiumUntil && cachedUser.premiumUntil > Date.now() ? cachedUser.premiumUntil : Date.now();
            const nextExpiry = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
            setLocal('pp_premium_user_status', true);
            localStorage.setItem('pp_premium_until', String(nextExpiry));
            
            cachedUser.isPremium = true;
            cachedUser.premiumUntil = nextExpiry;
            localStorage.setItem('pp_current_user', JSON.stringify(cachedUser));
          } else {
            setLocal('pp_premium_user_status', false);
            localStorage.removeItem('pp_premium_until');
            
            cachedUser.isPremium = false;
            cachedUser.premiumUntil = null;
            localStorage.setItem('pp_current_user', JSON.stringify(cachedUser));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  window.dispatchEvent(new Event('storage'));
}

export async function deletePaymentRequestByAdmin(reqId: string) {
  let payReq: PaymentRequest | undefined = undefined;

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      const payDocRef = doc(firebaseDb, 'payments', reqId);
      const paySnap = await getDoc(payDocRef);
      if (paySnap.exists()) {
        payReq = { id: reqId, ...paySnap.data() } as PaymentRequest;
      }
    } catch (error) {
      console.error("Error fetching payment request before delete:", error);
    }
  }

  const current = getLocal('pp_payments', []) as PaymentRequest[];
  const localReq = current.find(p => p.id === reqId);
  if (localReq) {
    if (!payReq) payReq = localReq;
  }
  const remaining = current.filter(p => p.id !== reqId);
  setLocal('pp_payments', remaining);

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await deleteDoc(doc(firebaseDb, 'payments', reqId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `payments/${reqId}`);
    }
  }

  // Revoke premium access if this subscription payment record is being deleted from the upgrade ledger
  if (payReq) {
    const userId = payReq.userId;
    if (IS_FIREBASE_REAL && firebaseDb) {
      try {
        const userRef = doc(firebaseDb, 'users', userId);
        await setDoc(userRef, { isPremium: false, premiumUntil: null }, { merge: true });
        console.log(`Successfully downgraded user ${userId} in Firestore upon payment deletion.`);
      } catch (error) {
        console.error("Failed to revoke premium status in Firestore:", error);
      }
    }

    // Revoke locally if current browser user matches
    const cachedUserStr = localStorage.getItem('pp_current_user');
    if (cachedUserStr) {
      try {
        const cachedUser = JSON.parse(cachedUserStr) as UserProfile;
        if (cachedUser.uid === userId) {
          setLocal('pp_premium_user_status', false);
          localStorage.removeItem('pp_premium_until');
          cachedUser.isPremium = false;
          cachedUser.premiumUntil = null;
          localStorage.setItem('pp_current_user', JSON.stringify(cachedUser));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  window.dispatchEvent(new Event('storage'));
}

export async function modifyPaymentRequestByAdmin(reqId: string, updatedFields: Partial<PaymentRequest>) {
  let payReq: PaymentRequest | undefined = undefined;

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      const payDocRef = doc(firebaseDb, 'payments', reqId);
      const paySnap = await getDoc(payDocRef);
      if (paySnap.exists()) {
        payReq = { id: reqId, ...paySnap.data() } as PaymentRequest;
      }
    } catch (error) {
      console.error("Error fetching payment request in modifyPaymentRequestByAdmin:", error);
    }
  }

  const current = getLocal('pp_payments', []) as PaymentRequest[];
  const foundIndex = current.findIndex(p => p.id === reqId);
  if (foundIndex !== -1) {
    current[foundIndex] = { ...current[foundIndex], ...updatedFields };
    setLocal('pp_payments', current);
    if (!payReq) {
      payReq = current[foundIndex];
    }
  } else if (payReq) {
    payReq = { ...payReq, ...updatedFields };
  }

  const mergedReq = payReq ? { ...payReq, ...updatedFields } : null;
  const durationDays = mergedReq?.durationDays || 30;

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'payments', reqId), updatedFields, { merge: true });
      if (mergedReq) {
        const userRef = doc(firebaseDb, 'users', mergedReq.userId);
        if (updatedFields.status === 'approved') {
          const userSnap = await getDoc(userRef);
          let currentExpiry = Date.now();
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (uData.premiumUntil && uData.premiumUntil > Date.now()) {
              currentExpiry = uData.premiumUntil;
            }
          }
          const nextExpiry = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
          await setDoc(userRef, { isPremium: true, premiumUntil: nextExpiry }, { merge: true });
        } else if (updatedFields.status === 'rejected' || updatedFields.status === 'pending') {
          await setDoc(userRef, { isPremium: false, premiumUntil: null }, { merge: true });
        }
      }
    } catch (error) {
      console.warn("Firestore error in modifyPaymentRequestByAdmin:", error);
    }
  } else {
    // Only local storage mode
    if (updatedFields.status === 'approved') {
      const currentExpiry = Number(localStorage.getItem('pp_premium_until')) || Date.now();
      const baseStart = currentExpiry > Date.now() ? currentExpiry : Date.now();
      const nextExpiry = baseStart + durationDays * 24 * 60 * 60 * 1000;
      localStorage.setItem('pp_premium_user_status', 'true');
      localStorage.setItem('pp_premium_until', String(nextExpiry));
    } else if (updatedFields.status === 'rejected' || updatedFields.status === 'pending') {
      localStorage.setItem('pp_premium_user_status', 'false');
      localStorage.removeItem('pp_premium_until');
    }
  }

  // Always synchronize local user profiles too (for local storage / fallback consistency)
  if (mergedReq) {
    const userSessionKey = `pp_user_session_${mergedReq.userId}`;
    const localUser = getLocal(userSessionKey, null) as UserProfile | null;
    if (localUser) {
      let currentExpiry = Date.now();
      if (localUser.premiumUntil && localUser.premiumUntil > Date.now() && updatedFields.status === 'approved') {
        currentExpiry = localUser.premiumUntil;
      }
      const nextExpiry = updatedFields.status === 'approved' ? (currentExpiry + durationDays * 24 * 60 * 60 * 1000) : null;
      localUser.isPremium = (updatedFields.status === 'approved');
      localUser.premiumUntil = nextExpiry;
      setLocal(userSessionKey, localUser);
    }
  }

  // Also sync locally if current browser user matches
  if (mergedReq) {
    const cachedUserStr = localStorage.getItem('pp_current_user');
    if (cachedUserStr) {
      try {
        const cachedUser = JSON.parse(cachedUserStr) as UserProfile;
        if (cachedUser.uid === mergedReq.userId) {
          if (updatedFields.status === 'approved') {
            const currentExpiry = cachedUser.premiumUntil && cachedUser.premiumUntil > Date.now() ? cachedUser.premiumUntil : Date.now();
            const nextExpiry = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
            setLocal('pp_premium_user_status', true);
            localStorage.setItem('pp_premium_until', String(nextExpiry));
            
            cachedUser.isPremium = true;
            cachedUser.premiumUntil = nextExpiry;
            localStorage.setItem('pp_current_user', JSON.stringify(cachedUser));
          } else if (updatedFields.status === 'rejected' || updatedFields.status === 'pending') {
            setLocal('pp_premium_user_status', false);
            localStorage.removeItem('pp_premium_until');
            
            cachedUser.isPremium = false;
            cachedUser.premiumUntil = null;
            localStorage.setItem('pp_current_user', JSON.stringify(cachedUser));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  window.dispatchEvent(new Event('storage'));
}

// Notifications Sync
export function subscribeNotifications(callback: (items: NotificationItem[]) => void) {
  if (IS_FIREBASE_REAL && firebaseDb) {
    return onSnapshot(collection(firebaseDb, 'notifications'), (snap) => {
      const list: NotificationItem[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as NotificationItem);
      });
      callback(list);
    }, (err) => {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'notifications');
      } catch (e) {
        callback(getLocal('pp_notifications', DEFAULT_NOTIFICATIONS));
      }
    });
  } else {
    callback(getLocal('pp_notifications', DEFAULT_NOTIFICATIONS));
    const handleStorage = () => {
      callback(getLocal('pp_notifications', DEFAULT_NOTIFICATIONS));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
}

export async function sendNotification(msgText: string) {
  const id = 'notif-' + Date.now();
  const notif: NotificationItem = {
    id,
    msg: msgText,
    time: 'Just now',
    read: false
  };
  const list = getLocal('pp_notifications', DEFAULT_NOTIFICATIONS) as NotificationItem[];
  list.unshift(notif);
  setLocal('pp_notifications', list);

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'notifications', id), notif);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `notifications/${id}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

export async function clearNotifications() {
  setLocal('pp_notifications', []);
  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      const listSnap = await getDocs(collection(firebaseDb, 'notifications'));
      listSnap.forEach(async (document) => {
        try {
          await deleteDoc(doc(firebaseDb, 'notifications', document.id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `notifications/${document.id}`);
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    }
  }
  window.dispatchEvent(new Event('storage'));
}

export async function deleteNotificationItem(id: string) {
  const list = getLocal('pp_notifications', DEFAULT_NOTIFICATIONS) as NotificationItem[];
  const filtered = list.filter(n => n.id !== id);
  setLocal('pp_notifications', filtered);
  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await deleteDoc(doc(firebaseDb, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

export async function updateNotificationItem(item: NotificationItem) {
  const list = getLocal('pp_notifications', DEFAULT_NOTIFICATIONS) as NotificationItem[];
  const idx = list.findIndex(n => n.id === item.id);
  if (idx > -1) {
    list[idx] = item;
  } else {
    list.push(item);
  }
  setLocal('pp_notifications', list);
  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'notifications', item.id), item);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${item.id}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

// Live Support Real-Time Messaging Sync
// In offline mode we collect all active chat threads into a record pp_chats.
export function subscribeAllChatsForAdmin(callback: (sessions: SupportSession[]) => void) {
  if (IS_FIREBASE_REAL && firebaseDb) {
    return onSnapshot(collection(firebaseDb, 'live_support'), (snap) => {
      const list: SupportSession[] = [];
      snap.forEach((doc) => {
        list.push({ userId: doc.id, ...doc.data() } as SupportSession);
      });
      callback(list);
    }, (err) => {
      console.warn(err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'live_support');
      } catch (e) {
        const chats = getLocal('pp_chats', {}) as { [userId: string]: SupportSession };
        callback(Object.values(chats));
      }
    });
  } else {
    const chats = getLocal('pp_chats', {}) as { [userId: string]: SupportSession };
    callback(Object.values(chats));
    
    const handleStorage = () => {
      const updated = getLocal('pp_chats', {}) as { [userId: string]: SupportSession };
      callback(Object.values(updated));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
}

export function subscribeUserChat(userId: string, callback: (session: SupportSession | null) => void) {
  if (IS_FIREBASE_REAL && firebaseDb) {
    return onSnapshot(doc(firebaseDb, 'live_support', userId), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as SupportSession);
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn(err);
      try {
        handleFirestoreError(err, OperationType.GET, `live_support/${userId}`);
      } catch (e) {
        const chats = getLocal('pp_chats', {}) as { [uId: string]: SupportSession };
        callback(chats[userId] || null);
      }
    });
  } else {
    const chats = getLocal('pp_chats', {}) as { [uId: string]: SupportSession };
    callback(chats[userId] || null);
    
    const handleStorage = () => {
      const updated = getLocal('pp_chats', {}) as { [uId: string]: SupportSession };
      callback(updated[userId] || null);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
}

export async function sendMessage(userId: string, userName: string, userEmail: string, text: string, sender: 'user' | 'admin') {
  const chats = getLocal('pp_chats', {}) as { [uId: string]: SupportSession };
  const session: SupportSession = chats[userId] || {
    userId,
    userName,
    userEmail,
    messages: [],
    lastUpdated: new Date().toLocaleTimeString(),
    unreadCount: 0
  };
  
  const newMessage: ChatMessage = {
    id: 'msg-' + Date.now(),
    sender,
    senderName: sender === 'user' ? userName : 'Admin Support',
    senderId: sender === 'user' ? userId : 'admin',
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  
  session.messages.push(newMessage);
  session.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sender === 'user') {
    session.unreadCount = (session.unreadCount || 0) + 1;
    session.deletedByAdmin = false;
  } else {
    session.unreadCount = 0;
  }
  
  chats[userId] = session;
  setLocal('pp_chats', chats);

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'live_support', userId), session);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `live_support/${userId}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

export async function clearChatSession(userId: string) {
  const chats = getLocal('pp_chats', {}) as { [uId: string]: SupportSession };
  if (chats[userId]) {
    chats[userId].messages = [];
    chats[userId].unreadCount = 0;
    setLocal('pp_chats', chats);
  }

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'live_support', userId), { messages: [], unreadCount: 0 }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `live_support/${userId}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

export async function hideChatFromAdmin(userId: string) {
  const chats = getLocal('pp_chats', {}) as { [uId: string]: SupportSession };
  if (chats[userId]) {
    chats[userId].deletedByAdmin = true;
    setLocal('pp_chats', chats);
  }

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'live_support', userId), { deletedByAdmin: true }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `live_support/${userId}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

export async function restoreChatFromAdmin(userId: string) {
  const chats = getLocal('pp_chats', {}) as { [uId: string]: SupportSession };
  if (chats[userId]) {
    chats[userId].deletedByAdmin = false;
    setLocal('pp_chats', chats);
  }

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'live_support', userId), { deletedByAdmin: false }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `live_support/${userId}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

export async function deleteChatSession(userId: string) {
  const chats = getLocal('pp_chats', {}) as { [uId: string]: SupportSession };
  if (chats[userId]) {
    delete chats[userId];
    setLocal('pp_chats', chats);
  }

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await deleteDoc(doc(firebaseDb, 'live_support', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `live_support/${userId}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

// Visitor stats polling for Chart.js/Recharts mapping
export function getVisitorStats(): VisitorStat[] {
  return getLocal('pp_visitor_stats', DEFAULT_STATS);
}

export function saveVisitorStats(newStats: VisitorStat[]) {
  setLocal('pp_visitor_stats', newStats);
  window.dispatchEvent(new Event('storage'));
}

export function subscribeAllUserProfiles(callback: (profiles: UserProfile[]) => void) {
  if (IS_FIREBASE_REAL && firebaseDb) {
    return onSnapshot(collection(firebaseDb, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as UserProfile);
      });
      callback(list);
    }, (err) => {
      console.warn("Error subscribing to users in Firestore:", err);
      callback(getAllLocalUserProfiles());
    });
  } else {
    callback(getAllLocalUserProfiles());
    const handleStorage = () => {
      callback(getAllLocalUserProfiles());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
}

function getAllLocalUserProfiles(): UserProfile[] {
  const list: UserProfile[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pp_user_session_')) {
        const u = getLocal(key, null);
        if (u && u.uid) {
          list.push(u);
        }
      }
    }
  } catch (e) {
    console.warn("Error collecting local users:", e);
  }
  // If list is completely empty, add some mock ones or current user so admin has examples
  if (list.length === 0) {
    const cur = getLocal('pp_current_user', null);
    if (cur) {
      list.push(cur);
    } else {
      const defaultUser: UserProfile = {
        uid: 'local-usr-viewerpopcorncom',
        name: 'Sakib Ahmed',
        email: 'sakib.ahmed@example.com',
        isPremium: true,
        premiumUntil: Date.now() + 10 * 24 * 60 * 60 * 1000,
        favorites: []
      };
      setLocal(`pp_user_session_${defaultUser.uid}`, defaultUser);
      list.push(defaultUser);
    }
    
    // Add another dummy
    const demoUser2: UserProfile = {
      uid: 'local-usr-demotester',
      name: 'Rahat Kabir',
      email: 'rahat@gmail.com',
      isPremium: false,
      favorites: []
    };
    setLocal(`pp_user_session_${demoUser2.uid}`, demoUser2);
    list.push(demoUser2);
  }
  return list;
}

export async function adminUpdateUserProfile(profile: UserProfile): Promise<void> {
  setLocal(`pp_user_session_${profile.uid}`, profile);
  // Also sync current user if it is the current user
  const cur = getLocal('pp_current_user', null) as UserProfile | null;
  if (cur && cur.uid === profile.uid) {
    setLocal('pp_current_user', profile);
  }

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await setDoc(doc(firebaseDb, 'users', profile.uid), profile, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

export async function deleteUserProfile(uid: string): Promise<void> {
  localStorage.removeItem(`pp_user_session_${uid}`);
  const cur = getLocal('pp_current_user', null) as UserProfile | null;
  if (cur && cur.uid === uid) {
    localStorage.removeItem('pp_current_user');
  }

  if (IS_FIREBASE_REAL && firebaseDb) {
    try {
      await deleteDoc(doc(firebaseDb, 'users', uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  }
  window.dispatchEvent(new Event('storage'));
}
