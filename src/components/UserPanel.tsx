import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Bell, Menu, Home, MessageSquare, User, Bookmark, 
  PlayCircle, Tv, Film, Lock, Unlock, Settings, CreditCard, 
  X, ChevronRight, Info, Heart, Download, Globe, Sparkles, Check, AlertCircle, RefreshCw,
  ArrowLeft, ExternalLink, Mail, Code, Laptop, Smartphone, Copy, Play, Maximize2
} from 'lucide-react';
import { 
  ContentItem, Episode, AppSettings, NotificationItem, 
  PaymentRequest, SupportSession, UserProfile, ContentCategory,
  SLIDER_ANIMATIONS, WatchHistoryEntry
} from '../types';
import { UserProfileComponent } from './UserProfileComponent';
import { 
  subscribeContent, subscribeAppSettings, subscribeNotifications, subscribeContentFiltered,
  subscribeUserChat, sendMessage, submitPaymentRequest, clearChatSession, deleteChatSession, signInWithGoogle, customSignUp,
  customSignIn, subscribeUserProfile, updateUserProfile, submitUserRating, subscribeUserRating, subscribeAuth, logOut
} from '../lib/firebaseStore';

// Helper to parse YouTube URLs for embedding
function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  
  // 1. Shorts
  const shortsMatch = cleanUrl.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&rel=0`;
  }
  
  // 2. Live
  const liveMatch = cleanUrl.match(/\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch && liveMatch[1]) {
    return `https://www.youtube.com/embed/${liveMatch[1]}?autoplay=1&rel=0`;
  }

  // 3. General YouTube ID extractor (handling watch?v=, youtu.be/, embed/, v/, /v=)
  const mainRegExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|live\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = cleanUrl.match(mainRegExp);
  if (match && match[1] && match[1].trim().length === 11) {
    return `https://www.youtube.com/embed/${match[1].trim()}?autoplay=1&rel=0`;
  }

  // Check if the URL *is* just the 11 character ID itself
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return `https://www.youtube.com/embed/${cleanUrl}?autoplay=1&rel=0`;
  }

  // Query parameter backup
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    try {
      const urlObj = new URL(cleanUrl);
      const vParam = urlObj.searchParams.get('v');
      if (vParam && vParam.trim().length === 11) {
        return `https://www.youtube.com/embed/${vParam.trim()}?autoplay=1&rel=0`;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

// Helper to get YouTube Thumbnail image
function getYouTubeThumbnail(url: string | null): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  
  const shortsMatch = cleanUrl.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://img.youtube.com/vi/${shortsMatch[1]}/mqdefault.jpg`;
  }
  
  const liveMatch = cleanUrl.match(/\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch && liveMatch[1]) {
    return `https://img.youtube.com/vi/${liveMatch[1]}/mqdefault.jpg`;
  }

  const mainRegExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|live\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = cleanUrl.match(mainRegExp);
  if (match && match[1] && match[1].trim().length === 11) {
    return `https://img.youtube.com/vi/${match[1].trim()}/mqdefault.jpg`;
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return `https://img.youtube.com/vi/${cleanUrl}/mqdefault.jpg`;
  }

  return null;
}

interface UserPanelProps {
  onSuggestAdminMode: () => void;
}

export default function UserPanel({ onSuggestAdminMode }: UserPanelProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'chat' | 'profile'>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | 'All'>('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-reset subcategory on main category pivot
  useEffect(() => {
    setSelectedSubCategory('All');
  }, [selectedCategory]);
  
  // Real-time models from Firebase
  const [content, setContent] = useState<ContentItem[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chatSession, setChatSession] = useState<SupportSession | null>(null);

  // Applets User Authentication State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    // Read cached login
    try {
      const cached = localStorage.getItem('pp_current_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        const cleanEmail = parsed?.email?.trim().toLowerCase();
        const isAdmin = cleanEmail === 'mdikhlas098@gmail.com' || cleanEmail === 'admin@popcornplay.com';
        if (isAdmin && localStorage.getItem('pp_user_logged_in') !== 'true') {
          return null;
        }
        return parsed;
      }
    } catch(e){}
    return null; // Empty profile means Auth required
  });

  // Auth Forms
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPass, setAuthConfirmPass] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Active movie viewing state
  const [viewingContent, setViewingContent] = useState<ContentItem | null>(null);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [activeTrailerLightboxUrl, setActiveTrailerLightboxUrl] = useState<string | null>(null);

  // Notification UI Toggle
  const [showNotifications, setShowNotifications] = useState(false);

  // Premium Payment billing invoice modal
  const [paymentContent, setPaymentContent] = useState<ContentItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('bkash');
  const [paySenderNumber, setPaySenderNumber] = useState('');
  const [payTxnId, setPayTxnId] = useState('');
  const [payAmount, setPayAmount] = useState('200'); // Standard upgrade BDT
  const [payDuration, setPayDuration] = useState<number>(30); // Default to 30 days
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  // Parental Control Locks
  const [adultEnabled, setAdultEnabled] = useState(() => {
    return localStorage.getItem('pp_adult_unlocked') === 'true';
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Dynamic Confirmation Dialog Modal (bypasses iframe window.confirm blocks)
  const [customModal, setCustomModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setCustomModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        setCustomModal(prev => ({ ...prev, isOpen: false }));
        await onConfirm();
      }
    });
  };

  // Floating Support Chat
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportText, setSupportText] = useState('');

  // Local Favorite status helpers
  const [favorites, setFavorites] = useState<string[]>([]);

  // User Ratings UI States
  const [myCurrentRating, setMyCurrentRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  // Watchlist & UI Carousel Slider index
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [copiedDevEmail, setCopiedDevEmail] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);

  // Hot Carousel items populated by settings.banners or fallback movies content
  const autoBannerLimit = settings?.autoBannerLimit !== undefined ? settings.autoBannerLimit : 5;
  const autoBannerDays = settings?.autoBannerDays !== undefined ? settings.autoBannerDays : 30;
  const nowTime = Date.now();
  const rawBanners = settings?.banners || [];
  
  // Custom Banners from settings
  const activeCustomBanners = rawBanners.filter(b => {
    if (b.type === 'auto') return false;
    if (b.isActive === false) return false;
    const expDays = b.expirationDays !== undefined && b.expirationDays !== null ? Number(b.expirationDays) : NaN;
    if (!isNaN(expDays) && expDays > 0) {
      const bannerCreatedAt = b.createdAt || nowTime;
      const ageMs = nowTime - bannerCreatedAt;
      const maxAgeMs = expDays * 24 * 60 * 60 * 1000;
      if (ageMs > maxAgeMs) {
        return false;
      }
    }
    return true;
  });
  
  // Real active Auto-Banners saved in settings
  const activeSavedAutoBanners = rawBanners.filter(b => b.type === 'auto' && b.isActive !== false);

  // Map of existing contentId values already covered by either a custom or saved auto banner
  const coveredContentIds = new Set(
    rawBanners.map(b => b.contentId).filter(Boolean)
  );

  // Automatically take other uploaded items from content list that are NOT currently in rawBanners
  // to ensure they show up in the slider too under their respective categories and "All"!
  const activeContentItems = content.filter(item => {
    if (item.isAdult && (!adultEnabled || userProfile?.parentalEnabled)) return false;
    if (coveredContentIds.has(item.id)) return false;
    return true;
  });

  // Sort them so that newest uploaded items appear first
  const sortedContentForAutoBanner = [...activeContentItems].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  // Convert the newest uploaded content items into virtual auto-banners
  const virtualAutoBanners = sortedContentForAutoBanner.map(item => ({
    id: `banner-virtual-${item.id}`,
    title: item.title,
    description: item.description || '',
    coverUrl: item.coverUrl,
    category: item.category,
    contentId: item.id,
    isActive: true,
    type: 'auto' as const,
    createdAt: item.createdAt || (Date.now() - 45 * 24 * 60 * 60 * 1000) // Fallback as 45 days old so expiration calculation applies
  }));

  // Combine explicitly saved auto-banners and virtual auto-banners
  const combinedAutoBanners = [...activeSavedAutoBanners, ...virtualAutoBanners];

  // Filter auto-banners by expiration days if specified
  const unexpiredAutoBanners = combinedAutoBanners.filter(b => {
    const bannerCreatedAt = b.createdAt || (Date.now() - 45 * 24 * 60 * 60 * 1000); // Fallback as 45 days old to support auto banner expiration
    const daysLimit = b.expirationDays !== undefined && b.expirationDays > 0 ? b.expirationDays : autoBannerDays;
    if (daysLimit > 0) {
      const ageMs = nowTime - bannerCreatedAt;
      const maxAgeMs = daysLimit * 24 * 60 * 60 * 1000;
      if (ageMs > maxAgeMs) {
        return false;
      }
    }
    return true;
  });

  // Enforce the auto-banner display count limit configured in settings
  const limitedAutoBanners = unexpiredAutoBanners.slice(0, autoBannerLimit);

  // Merge the active custom banners with the limited auto-banners list
  const finalBannersList = [...activeCustomBanners, ...limitedAutoBanners];

  const bannerCarouselItems = finalBannersList
    .map(b => {
      const matchedItem = b.contentId ? content.find(item => item.id === b.contentId) : null;
      return {
        id: b.id,
        title: b.title,
        description: b.description || matchedItem?.description || '',
        coverUrl: b.coverUrl,
        category: b.category || matchedItem?.category || 'Movies',
        rating: matchedItem?.rating || 8.5,
        contentId: b.contentId,
        link: b.link,
        matchedItem: matchedItem
      };
    })
    .filter(slide => {
      if (selectedCategory !== 'All') {
        const slideCat = slide.category || '';
        return slideCat.toLowerCase() === selectedCategory.toLowerCase();
      }
      return true;
    });

  const carouselItems = bannerCarouselItems.length > 0
    ? bannerCarouselItems
    : content
        .filter(item => !item.isAdult || (adultEnabled && !userProfile?.parentalEnabled))
        .filter(item => {
          if (selectedCategory !== 'All') {
            return item.category.toLowerCase() === selectedCategory.toLowerCase();
          }
          return true;
        })
        .slice(0, 3)
        .map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          coverUrl: item.coverUrl,
          category: item.category,
          rating: item.rating,
          contentId: item.id,
          link: undefined,
          matchedItem: item
        }));

  // Auto-slide carousel effect every 4.5 seconds for active slides
  useEffect(() => {
    if (carouselItems.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => {
        if (carouselItems.length === 0) return 0;
        return (prev + 1) % carouselItems.length;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [carouselItems.length]);

  // Keep carouselIndex in safe bounds and reset when categories update
  useEffect(() => {
    setCarouselIndex(0);
  }, [selectedCategory]);

  useEffect(() => {
    if (carouselItems.length === 0) {
      setCarouselIndex(0);
    } else if (carouselIndex >= carouselItems.length) {
      setCarouselIndex(carouselItems.length - 1);
    }
  }, [carouselItems.length, carouselIndex]);

  // App Welcome Pop-up Toggle
  const [showAnnouncePopup, setShowAnnouncePopup] = useState(true);
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);

  // Quick banners
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const watchSectionRef = useRef<HTMLDivElement>(null);

  // Auto-close delay handler for popups
  useEffect(() => {
    const activePopups = settings?.popups?.filter(p => p.isActive) || [];
    if (activePopups.length === 0 || currentPopupIndex >= activePopups.length || !showAnnouncePopup) {
      return;
    }
    const currentPopup = activePopups[currentPopupIndex];
    if (currentPopup && currentPopup.autoCloseDelay && currentPopup.autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        if (currentPopupIndex + 1 < activePopups.length) {
          setCurrentPopupIndex(prev => prev + 1);
        } else {
          setShowAnnouncePopup(false);
        }
      }, currentPopup.autoCloseDelay * 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPopupIndex, settings?.popups, showAnnouncePopup]);

  useEffect(() => {
    // Dynamic Firebase data sub for settings & notifications
    const unsubSettings = subscribeAppSettings((conf) => setSettings(conf));
    const unsubNotifications = subscribeNotifications((notifs) => setNotifications(notifs));

    // Favorites Sync
    try {
      const favs = localStorage.getItem('pp_favorites');
      if (favs) setFavorites(JSON.parse(favs));
    } catch(e){}

    return () => {
      unsubSettings();
      unsubNotifications();
    };
  }, []);

  // Real-time Firestore content subscription
  useEffect(() => {
    const unsubContent = subscribeContent((items) => setContent(items));
    return () => {
      unsubContent();
    };
  }, []);

  // Keep viewingContent up to date with fresh live content catalog updates
  useEffect(() => {
    if (viewingContent) {
      const fresh = content.find(c => c.id === viewingContent.id);
      if (fresh) {
        setViewingContent(fresh);
      } else {
        // Handle content deletion from administrative registry
        setViewingContent(null);
        triggerAlert("অ্যাডমিন এই কনটেন্টটি মুছে ফেলেছেন বা এডিট করেছেন।");
      }
    }
  }, [content, viewingContent?.id]);

  // Real-time validation for active premium content playback & subscription auto-expiration checker
  useEffect(() => {
    const checkPremiumStatus = () => {
      if (userProfile && userProfile.isPremium) {
        // Exclude admins from expiration checks
        const adminEmail = settings?.adminEmail?.trim().toLowerCase() || 'admin@popcornplay.com';
        const cleanEmail = userProfile.email?.trim().toLowerCase();
        if (cleanEmail === 'mdikhlas098@gmail.com' || cleanEmail === adminEmail) {
          return;
        }

        if (userProfile.premiumUntil && Date.now() > userProfile.premiumUntil) {
          // Subscription has expired
          const expiredProfile = { ...userProfile, isPremium: false, premiumUntil: null };
          setUserProfile(expiredProfile);
          updateUserProfile(expiredProfile);
          triggerAlert("আপনার প্রিমিয়াম সাবস্ক্রিপশন শেষ হয়ে গেছে! আবার কিনতে VIP Upgrade বাটনে ক্লিক করুন।");

          // Kick out of active premium play if currently viewing
          if (viewingContent && viewingContent.isPremium) {
            setViewingContent(null);
            setPlayingVideoUrl(null);
            setSelectedEpisodeId(null);
            setPaymentContent(viewingContent);
          }
        }
      }
    };

    // Run initial check
    checkPremiumStatus();

    // Check active premium playback restrictions
    if (viewingContent && viewingContent.isPremium && !isUserPremium()) {
      setViewingContent(null);
      setPlayingVideoUrl(null);
      setSelectedEpisodeId(null);
      setPaymentContent(viewingContent);
      triggerAlert("এই কনটেন্টটি উপভোগ করতে প্রিমিয়াম সাবস্ক্রিপশন প্রয়োজন!");
    }

    // Dynamic timer to automatically handle passive expirations in active tabs
    const interval = setInterval(checkPremiumStatus, 5000);
    return () => clearInterval(interval);
  }, [userProfile, viewingContent, settings]);

  // Synchronize React userProfile with Firebase Auth & Firestore, and handle auto-expiry
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = subscribeAuth((fbUser) => {
      // Clean up previous profile sub first
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (fbUser) {
        // Intercept any administrative/development accounts to prevent automated login if they didn't log in explicitly as standard viewer/user
        const adminEmail = settings?.adminEmail?.trim().toLowerCase() || 'admin@popcornplay.com';
        const cleanEmail = fbUser.email?.trim().toLowerCase();
        const isAdminUser = cleanEmail === 'mdikhlas098@gmail.com' || cleanEmail === adminEmail;
        
        const isGoogleLoggingIn = localStorage.getItem('pp_google_logging_in') === 'true';

        if (isAdminUser) {
          const manualEmail = localStorage.getItem('pp_user_manually_logged_in_email')?.trim().toLowerCase();
          if (manualEmail !== cleanEmail && !isGoogleLoggingIn) {
            // Discard automatic sync of the admin account in the User Panel
            setUserProfile(null);
            localStorage.removeItem('pp_current_user');
            localStorage.setItem('pp_premium_user_status', 'false');
            localStorage.removeItem('pp_premium_until');
            return;
          }
        } else if (localStorage.getItem('pp_user_logged_in') !== 'true' && !isGoogleLoggingIn) {
          // If not admin, still verify if they are logged in.
          return;
        }

        // User is authenticated via Firebase Auth
        unsubProfile = subscribeUserProfile(fbUser.uid, (freshProfile) => {
          if (freshProfile) {
            // Synchronize the local favorites state with Firestore
            if (freshProfile.favorites) {
              setFavorites(freshProfile.favorites);
              localStorage.setItem('pp_favorites', JSON.stringify(freshProfile.favorites));
            }
            // Verify if active subscription has elapsed (expired)
            if (freshProfile.isPremium && freshProfile.premiumUntil && Date.now() > freshProfile.premiumUntil) {
              const expiredProfile = { ...freshProfile, isPremium: false, premiumUntil: null };
              setUserProfile(expiredProfile);
              updateUserProfile(expiredProfile);
              triggerAlert("আপনার প্রিমিয়াম সাবস্ক্রিপশন শেষ হয়ে গেছে! আবার কিনতে VIP Upgrade বাটনে ক্লিক করুন।");
            } else {
              setUserProfile(freshProfile);
              localStorage.setItem('pp_current_user', JSON.stringify(freshProfile));
              if (freshProfile.isPremium) {
                localStorage.setItem('pp_premium_user_status', 'true');
                if (freshProfile.premiumUntil) {
                  localStorage.setItem('pp_premium_until', String(freshProfile.premiumUntil));
                }
              } else {
                localStorage.setItem('pp_premium_user_status', 'false');
                localStorage.removeItem('pp_premium_until');
              }
            }
          } else {
            // No profile document in Firestore yet - provision it dynamically
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Member',
              email: fbUser.email || '',
              isPremium: false,
              favorites: []
            };
            setUserProfile(newProfile);
            setFavorites([]);
            localStorage.setItem('pp_favorites', JSON.stringify([]));
            localStorage.setItem('pp_current_user', JSON.stringify(newProfile));
            updateUserProfile(newProfile); // This creates/merges it in doc('users', uid)
          }
        });
      } else {
        // No authenticated Firebase user.
        // We prevent automatic logging out inside iframe preview or after page refresh,
        // so we DO NOT wipe the session here. We only log out when the user explicitly clicks the Sign Out/Logout button!
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) {
        unsubProfile();
      }
    };
  }, []);

  // Sync personal local support sessions
  useEffect(() => {
    if (userProfile?.uid) {
      const unsubChat = subscribeUserChat(userProfile.uid, (session) => {
        setChatSession(session);
      });
      return () => unsubChat();
    }
  }, [userProfile?.uid]);

  const getUserIdForRating = () => {
    if (userProfile?.uid) return userProfile.uid;
    let cachedGuestId = localStorage.getItem('pp_guest_rating_id');
    if (!cachedGuestId) {
      cachedGuestId = 'local-usr-guest-' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('pp_guest_rating_id', cachedGuestId);
    }
    return cachedGuestId;
  };

  useEffect(() => {
    if (!viewingContent) {
      setMyCurrentRating(null);
      return;
    }
    const currentUserId = getUserIdForRating();
    const unsub = subscribeUserRating(viewingContent.id, currentUserId, (rating) => {
      setMyCurrentRating(rating);
    });
    return () => {
      unsub();
    };
  }, [viewingContent?.id, userProfile?.uid]);

  // Synchronously defaults the active payment method on modal mount
  useEffect(() => {
    if (paymentContent) {
      const methods = settings?.paymentMethods || [
        { id: '1', name: 'bKash Personal' },
        { id: '2', name: 'Nagad Merchant' },
        { id: '3', name: 'Dutch-Bangla Bank' }
      ];
      if (methods.length > 0) {
        setPaymentMethod(methods[0].name.toLowerCase());
      }
    }
  }, [paymentContent, settings]);

  const triggerAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Auth Operations
  const handleGoogleLogin = async () => {
    try {
      localStorage.setItem('pp_google_logging_in', 'true');
      const profile = await signInWithGoogle();
      setUserProfile(profile);
      localStorage.setItem('pp_user_logged_in', 'true');
      if (profile?.email) {
        localStorage.setItem('pp_user_manually_logged_in_email', profile.email.trim().toLowerCase());
      }
      localStorage.setItem('pp_current_user', JSON.stringify(profile));
      triggerAlert(`Welcome, ${profile.name}! Logged in via Google.`);
    } catch (err: any) {
      setAuthError(err.message || 'Google Auth failed');
    } finally {
      localStorage.removeItem('pp_google_logging_in');
    }
  };

  const handleCustomAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (isSignUp) {
      if (!authEmail || !authPassword || !authName) {
        setAuthError('Please fill out all fields.');
        return;
      }
      if (authPassword !== authConfirmPass) {
        setAuthError('Passwords do not match.');
        return;
      }
      try {
        localStorage.setItem('pp_user_logged_in', 'true');
        localStorage.setItem('pp_user_manually_logged_in_email', authEmail.trim().toLowerCase());
        const profile = await customSignUp({ name: authName, email: authEmail, password: authPassword });
        setUserProfile(profile);
        localStorage.setItem('pp_current_user', JSON.stringify(profile));
        triggerAlert(`Welcome! Registered account for ${profile.name}`);
      } catch (err: any) {
        localStorage.removeItem('pp_user_logged_in');
        localStorage.removeItem('pp_user_manually_logged_in_email');
        setAuthError(err.message || 'Registration failed');
        return; // Prevent resetting fields if registration fails
      }
    } else {
      if (!authEmail || !authPassword) {
        setAuthError('Please fill out Email and Password.');
        return;
      }
      try {
        localStorage.setItem('pp_user_logged_in', 'true');
        localStorage.setItem('pp_user_manually_logged_in_email', authEmail.trim().toLowerCase());
        const profile = await customSignIn(authEmail, authPassword);
        setUserProfile(profile);
        localStorage.setItem('pp_current_user', JSON.stringify(profile));
        triggerAlert(`Welcome back, ${profile.name}!`);
      } catch (err: any) {
        localStorage.removeItem('pp_user_logged_in');
        localStorage.removeItem('pp_user_manually_logged_in_email');
        setAuthError(err.message || 'Login failed');
        return; // Prevent resetting fields if login fails
      }
    }

    // Reset fields on successful sign up or login
    setAuthEmail('');
    setAuthPassword('');
    setAuthConfirmPass('');
    setAuthName('');
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setUserProfile(null);
      localStorage.removeItem('pp_user_logged_in');
      localStorage.removeItem('pp_current_user');
      localStorage.removeItem('pp_user_manually_logged_in_email');
      triggerAlert("Logged out of POPCORN PLAY.");
    } catch (err: any) {
      console.error("Signout error:", err);
    }
  };

  // Favorites logic
  const toggleFavorite = (id: string, title: string) => {
    if (!userProfile) {
      triggerAlert("Please log in to your POPCORN PLAY account to add items to your favorites!");
      setActiveTab('profile');
      return;
    }
    let updated = [...favorites];
    if (updated.includes(id)) {
      updated = updated.filter(fid => fid !== id);
      triggerAlert(`Removed "${title}" from My List.`);
    } else {
      updated.push(id);
      triggerAlert(`Added "${title}" to My List!`);
    }
    setFavorites(updated);
    localStorage.setItem('pp_favorites', JSON.stringify(updated));

    if (userProfile) {
      const updatedProfile = {
        ...userProfile,
        favorites: updated
      };
      setUserProfile(updatedProfile);
      updateUserProfile(updatedProfile);
    }
  };

  // Check locks
  const isUserPremium = () => {
    if (!userProfile) return false;

    // Explicit bypass if admin
    const adminEmail = settings?.adminEmail?.trim().toLowerCase() || 'admin@popcornplay.com';
    const cleanEmail = userProfile.email?.trim().toLowerCase();
    if (cleanEmail === 'mdikhlas098@gmail.com' || cleanEmail === adminEmail) {
      return true;
    }

    if (userProfile.isPremium) {
      if (userProfile.premiumUntil && Date.now() > userProfile.premiumUntil) {
        return false;
      }
      return true;
    }
    return false;
  };

  const isPremiumLocked = (item: ContentItem) => {
    if (!item.isPremium) return false;
    return !isUserPremium();
  };

  // Click watch actions
  const handleMediaPlay = (item: ContentItem) => {
    if (!userProfile) {
      triggerAlert("Please log in to your account first to watch or play video content!");
      setActiveTab('profile');
      return;
    }
    if (isPremiumLocked(item)) {
      setPaymentContent(item);
      return;
    }
    setViewingContent(item);
    
    // If standalone movie, auto play stream link
    if (item.category === 'Movies' && item.videoUrl) {
      setPlayingVideoUrl(item.videoUrl);
      setSelectedEpisodeId(null);
    } else {
      // Series, initialize stream and highlight episode 1 if available
      if (item.episodes && item.episodes.length > 0) {
        const firstEp = item.episodes[0];
        setSelectedEpisodeId(firstEp.id);
        setPlayingVideoUrl(firstEp.videoUrl || null);
      } else {
        setSelectedEpisodeId(null);
        setPlayingVideoUrl(null);
      }
    }
    
    // Smooth scroll down to player
    setTimeout(() => {
      watchSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // Record Watch History in Firestore User Profile
    if (userProfile) {
      const entryId = 'wh-' + Date.now();
      const newEntry: WatchHistoryEntry = {
        id: entryId,
        contentId: item.id,
        title: item.title,
        coverUrl: item.coverUrl,
        category: item.category,
        watchedAt: Date.now()
      };
      const currentHistory = userProfile.watchHistory || [];
      const filteredHistory = currentHistory.filter(h => h.contentId !== item.id);
      const updatedHistory = [newEntry, ...filteredHistory].slice(0, 50);
      const updatedProfile: UserProfile = {
        ...userProfile,
        watchHistory: updatedHistory
      };
      setUserProfile(updatedProfile);
      updateUserProfile(updatedProfile);
    }
  };

  // Submit payment upgrade request
  const handlePaymentSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySenderNumber || !payTxnId || !userProfile) return;

    const request: PaymentRequest = {
      id: 'pay-' + Date.now(),
      userId: userProfile.uid,
      userName: userProfile.name,
      userEmail: userProfile.email,
      method: paymentMethod,
      senderNumber: paySenderNumber,
      transactionId: payTxnId,
      amount: Number(payAmount),
      timestamp: new Date().toLocaleString(),
      status: 'pending',
      durationDays: payDuration
    };

    await submitPaymentRequest(request);
    setPaymentSubmitted(true);
    triggerAlert("Upgrade request submitted. Awaiting Admin verification!");
    setTimeout(() => {
      setPaymentSubmitted(false);
      setPaymentContent(null);
      setPaySenderNumber('');
      setPayTxnId('');
    }, 3000);
  };

  // Parental PIN Locks validation
  const handlePinSubmit = () => {
    if (!settings) return;
    if (pinEntry === settings.adultPin) {
      const nextState = !adultEnabled;
      setAdultEnabled(nextState);
      localStorage.setItem('pp_adult_unlocked', String(nextState));
      triggerAlert(nextState ? "🔓 Adult Mode Enabled (18+ Filter Lifted)" : "🔒 Adult Mode Disabled (18+ Hidden)");
      setShowPinModal(false);
      setPinEntry('');
      setPinError(null);
    } else {
      setPinError("INCORRECT SECURITY PIN. Please try again.");
    }
  };

  // Floating Chat text submission
  const handleSendSupportMsg = async () => {
    if (!supportText.trim() || !userProfile) return;
    await sendMessage(userProfile.uid, userProfile.name, userProfile.email, supportText.trim(), 'user');
    setSupportText('');
  };

  // Filter content based on Category, Search bar text, and Parental toggles
  const unfilteredContent = content.filter((item) => {
    // 1. Parental Lock (Adult 18+)
    if (item.isAdult && (!adultEnabled || userProfile?.parentalEnabled)) return false;

    // 2. Category selection
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

    // 2b. Sub-category (dynamic genre) selection
    if (selectedSubCategory !== 'All') {
      const matchSub = (item.tags || []).some(t => t.toLowerCase() === selectedSubCategory.toLowerCase());
      if (!matchSub) return false;
    }

    // 3. Query string match (tags, category, title)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchDesc = item.description.toLowerCase().includes(query);
      const matchTags = item.tags.some(t => t.toLowerCase().includes(query));
      const matchCategory = item.category.toLowerCase().includes(query);
      if (!matchTitle && !matchDesc && !matchTags && !matchCategory) return false;
    }

    return true;
  });

  const filteredContent = [...unfilteredContent].sort((a, b) => {
    if (sortBy === 'popular') {
      return (b.rating || 0) - (a.rating || 0);
    }
    // Default newest items first
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const getSubcategoriesForContext = () => {
    if (selectedCategory !== 'All') {
      return settings?.customCategories?.[selectedCategory] || 
        (selectedCategory === 'Movies' ? ['Action', 'Romance', '18+ content', 'Thriller', 'Comedy', 'Sci-Fi', 'Horror', 'Bollywood', 'Dhallywood'] :
         selectedCategory === 'Anime' ? ['Action', 'Romance', '18+ content', 'Fantasy', 'Shounen', 'Slice of Life', 'Isekai', 'Adventure', 'Mystery'] :
         selectedCategory === 'Drama' ? ['Action', 'Romance', '18+ content', 'Comedy', 'Family', 'Thriller', 'Crime', 'Romantic Comedy'] :
         selectedCategory === 'Cartoon' ? ['Action', 'Romance', '18+ content', 'Adventure', 'Comedy', 'Family', 'Kids', 'Fantasy'] :
         selectedCategory === 'Serial' ? ['Action', 'Romance', '18+ content', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Mystery'] : []);
    } else {
      // Check if there is a custom preset specified for 'All Themes' or 'All'
      const savedAll = settings?.customCategories?.['All Themes'] || settings?.customCategories?.['All'];
      if (savedAll && savedAll.length > 0) {
        return savedAll;
      }
      // If "All" is selected, merge all configured subcategories together
      const mainCategories = settings?.mainCategories || ['Movies', 'Anime', 'Drama', 'Cartoon', 'Serial'];
      const combinedLists = mainCategories.flatMap(mcat => settings?.customCategories?.[mcat] || 
        (mcat === 'Movies' ? ['Action', 'Romance', '18+ content', 'Thriller', 'Comedy', 'Sci-Fi', 'Horror', 'Bollywood', 'Dhallywood'] :
         mcat === 'Anime' ? ['Action', 'Romance', '18+ content', 'Fantasy', 'Shounen', 'Slice of Life', 'Isekai', 'Adventure', 'Mystery'] :
         mcat === 'Drama' ? ['Action', 'Romance', '18+ content', 'Comedy', 'Family', 'Thriller', 'Crime', 'Romantic Comedy'] :
         mcat === 'Cartoon' ? ['Action', 'Romance', '18+ content', 'Adventure', 'Comedy', 'Family', 'Kids', 'Fantasy'] :
         mcat === 'Serial' ? ['Action', 'Romance', '18+ content', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Mystery'] : [])
      );
      const combined = Array.from(new Set(combinedLists));
      return combined;
    }
  };

  // Carousel calculations moved to the top of UserPanel for proper hook lifecycle support.

  return (
    <div className="min-h-screen bg-[#070708] text-gray-100 font-sans relative no-scrollbar">
      
      {/* Alert Banner overlays */}
      {alertMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 glass-premium px-6 py-4 rounded-xl flex items-center space-x-2 text-yellow-400 font-medium tracking-tight shadow-2xl transition-all duration-300">
          <Sparkles className="w-4 h-5 text-yellow-400 animate-pulse" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#070708]/80 backdrop-blur-md border-b border-white/5 py-4 px-4 md:px-8 flex justify-between items-center transition-all">
        {/* Left: Brand name Drawer toggle */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-all duration-200"
            title="Open Directory Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2 select-none">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-650 to-red-500 flex items-center justify-center glow-red">
              <Film className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-display font-extrabold text-white tracking-widest text-base md:text-lg">
              {settings?.appName || 'POPCORN PLAY'}
            </h1>
          </div>
        </div>

        {/* Dynamic Search Box middle */}
        {activeTab !== 'search' && (
          <div className="hidden md:flex flex-1 max-w-md mx-6 bg-white/[0.03] border border-white/5 rounded-full px-4 py-2 items-center space-x-2 transition-all focus-within:border-red-500/30">
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Type Movies, Anime tags, or K-Dramas..."
              className="bg-transparent border-none text-xs focus:outline-none text-white w-full font-light"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Right buttons: Dynamic notifications bell, User tag */}
        <div className="flex items-center space-x-3.5">

          {/* Advanced Theater Search Quick Button on Top */}
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 transition-all cursor-pointer font-sans text-xs font-bold ${
              activeTab === 'search'
                ? 'bg-red-650/20 border-red-500 text-red-500 shadow-lg'
                : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-gray-300 hover:text-white'
            }`}
            title="Advanced Theater Search"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
            <span className="hidden sm:inline font-mono tracking-wide text-[10px] uppercase">Theater Search</span>
          </button>

          {/* Glowing Notification bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all relative"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-650 animate-ping"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 glass p-4 rounded-2xl shadow-2xl z-50 border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Broadcast Alerts</span>
                  <span className="text-[10px] text-gray-500 uppercase">{notifications.length} Unread</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6 font-mono">No active broadcasts streaming.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 bg-red-500/[0.03] hover:bg-red-500/[0.06] border border-red-500/10 rounded-xl text-xs transition-all duration-200">
                        <p className="text-gray-100 font-medium leading-relaxed">{n.msg}</p>
                        <span className="text-[9px] text-gray-500 font-mono block mt-1.5">{n.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Logged in state info */}
          {userProfile ? (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono text-gray-400 font-black hidden md:block">
                {isUserPremium() ? '★ VIP PREMIUM' : 'FREE MEMBER'}
              </span>
              <button 
                onClick={() => setActiveTab('profile')}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:border-red-550 transition-all text-white flex items-center justify-center font-bold text-xs"
              >
                {userProfile.name.charAt(0).toUpperCase()}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('profile')}
              className="bg-red-650 hover:bg-red-500 text-white font-mono font-bold text-xs px-3.5 py-1.5 rounded-lg uppercase tracking-wider shadow-lg"
            >
              Sign In
            </button>
          )}

        </div>
      </header>

      {/* MOBILE SEARCH BLOCK */}
      {activeTab !== 'search' && (
        <div className="p-3 md:hidden border-b border-white/5 bg-[#070708] flex items-center space-x-2">
          <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-full px-4 py-2 flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search anime, tags, series..."
              className="bg-transparent border-none text-[11px] focus:outline-none text-white w-full font-light"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* DIRECTORIES DRAWER MENU */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
          
          {/* Panel */}
          <div className="relative w-85 max-w-[340px] bg-[#09090a] h-full p-6 border-r border-white/5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto no-scrollbar">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-gray-400 tracking-widest uppercase">CATALOG CHANNELS</span>
                <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-white/5 rounded-full text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation lists */}
              <div className="space-y-1.5">
                {(() => {
                  const mainCats = settings?.mainCategories || ['Movies', 'Anime', 'Drama', 'Cartoon', 'Serial'];
                  return ['All', ...mainCats].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setDrawerOpen(false);
                        setActiveTab('home');
                      }}
                      className={`w-full flex items-center justify-between text-left px-4 py-2.5 rounded-xl transition-all ${
                        (selectedCategory === cat && activeTab === 'home') 
                          ? 'bg-red-650/10 text-red-500 border-l-2 border-red-500 font-bold' 
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-sm font-sans">{cat}</span>
                      <span className="text-[10px] text-gray-500 font-mono font-bold">
                        {cat === 'All' ? content.length : content.filter(c => c.category === cat).length} Titles
                      </span>
                    </button>
                  ));
                })()}
              </div>

              {/* Toggle Adult Content */}
              <div className="border-t border-white/5 pt-5">
                <span className="text-[10px] text-gray-500 font-mono tracking-wider block mb-2 px-1 uppercase">Security locks</span>
                <div className="flex justify-between items-center bg-black/30 border border-white/5 p-3 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-white block">18+ Adult Channels</span>
                    <span className="text-[10px] text-gray-400 block font-mono">Status: {adultEnabled ? 'PIN unlocked' : 'Strict Lock'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPinModal(true)}
                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-black border transition-all ${
                      adultEnabled ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                    }`}
                  >
                    {adultEnabled ? 'LOCK 18+' : 'UNLOCK (PIN)'}
                  </button>
                </div>
              </div>

              {/* Developer Profile Section */}
              <div className="border-t border-white/5 pt-5">
                <div className="flex items-center space-x-1.5 mb-3 px-1">
                  <Code className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Contract Developer</span>
                </div>
                
                {/* Glowing Premium Interactive Cyberpunk Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowDevModal(true);
                    setDrawerOpen(false);
                  }}
                  className="w-full text-left bg-gradient-to-br from-[#0e0e11] via-[#110505] to-[#070202] border border-red-500/15 hover:border-red-500/50 rounded-2xl p-4.5 space-y-3.5 shadow-xl transition-all duration-500 relative group overflow-hidden active:scale-[0.98] cursor-pointer hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                >
                  {/* Glowing ambient neon backlight circles */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-650/10 rounded-full blur-2xl group-hover:bg-red-650/20 transition-all duration-500 pointer-events-none" />
                  <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-yellow-500/5 rounded-full blur-xl group-hover:bg-yellow-500/10 transition-all duration-500 pointer-events-none" />
                  
                  {/* Futuristic dark tech pattern overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef444403_1px,transparent_1px),linear-gradient(to_bottom,#ef444403_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

                  {/* Horizontal glowing top laser streak */}
                  <div className="absolute top-0 left-0 w-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500 to-yellow-500 group-hover:w-full transition-all duration-1000 ease-out" />

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-2.5">
                      {/* Premium glowing custom coin with animate-pulse */}
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-650 to-yellow-500 p-[1px] shadow-[0_0_15px_rgba(239,68,68,0.1)] group-hover:shadow-[0_0_20px_rgba(239,68,68,0.35)] transition-all duration-500">
                        <div className="w-full h-full rounded-xl bg-[#09090b] flex items-center justify-center">
                          <Code className="w-4 h-4 text-red-500 group-hover:text-yellow-500 transition-colors duration-500" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-red-400 group-hover:text-white transition-colors duration-300 tracking-wide uppercase">Contract Developer</h4>
                        <p className="text-[8.5px] text-gray-400 font-mono tracking-widest uppercase mt-0.5">Muhammad Ikhlas</p>
                      </div>
                    </div>

                    {/* Cool active status badge */}
                    <div className="flex items-center space-x-1.5 bg-red-950/40 border border-red-500/30 px-2 py-1 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-[8px] text-red-400 font-extrabold font-mono tracking-wider">HIRE ME</span>
                    </div>
                  </div>

                  <p className="text-[11.5px] text-gray-300 leading-relaxed font-light relative z-10 font-sans group-hover:text-white transition-colors duration-300 pl-0.5">
                    আপনার ব্যবসা বা উদ্যোগের জন্য কাস্টম <span className="text-red-400 font-medium">Apps</span>, <span className="text-red-400 font-medium">Web-app</span> বা <span className="text-red-400 font-medium">Website</span> বানাতে চান? বিস্তারিত জানতে এখানে ক্লিক করুন। 🚀
                  </p>

                  <div className="flex items-center justify-between text-[9px] text-gray-400 font-mono pt-2.5 border-t border-white/5 relative z-10">
                    <span className="text-red-400 font-bold group-hover:text-yellow-400 transition-colors flex items-center space-x-1">
                      <span>Explore Portfolio & Contact</span>
                      <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
                    </span>
                    <span className="bg-white/5 px-1.5 py-0.5 rounded text-[8px] border border-white/5">Age: 21</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Drawer Social Handles */}
            {settings?.socialLinks && settings.socialLinks.length > 0 && (
              <div className="border-t border-white/5 mt-6 pt-5">
                <span className="text-[10px] text-gray-500 font-mono tracking-wider block mb-2.5 px-1 uppercase">SUPPORT NETWORKS</span>
                <div className="grid grid-cols-2 gap-2">
                  {settings.socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1.5 p-2 bg-[#101012] hover:bg-red-500/5 group border border-white/5 hover:border-red-500/20 rounded-xl transition-all"
                    >
                      <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-gray-400 text-[8px] font-mono font-bold uppercase truncate max-w-[20px] leading-none group-hover:bg-red-500/10 group-hover:text-red-400">
                        {link.icon || 'Link'}
                      </div>
                      <span className="text-[10.5px] font-bold text-gray-300 group-hover:text-white transition-colors truncate min-w-0">
                        {link.platformName}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[10px] font-mono text-gray-600 border-t border-white/5 pt-4 mt-6">
              <span>Popcorn Play Catalog Router v1.0</span>
            </div>
          </div>
        </div>
      )}

      {/* 3D CAROUSEL BILLBOARD slider */}
      {!viewingContent && activeTab === 'home' && !searchQuery && carouselItems.length > 0 && (() => {
        const activeAnim = SLIDER_ANIMATIONS[settings?.bannerAnimationType || 'fade'] || SLIDER_ANIMATIONS.fade;
        return (
          <section className="px-4 md:px-8 pt-6 pb-2">
            <div className="w-full max-w-7xl mx-auto rounded-3xl overflow-hidden glass relative md:h-[400px] h-[250px] group border-red-650/10">
              {/* Slide */}
              <AnimatePresence mode="popLayout">
                <motion.div 
                  key={carouselIndex} 
                  initial={activeAnim.initial}
                  animate={activeAnim.animate}
                  exit={activeAnim.exit}
                  transition={activeAnim.transition || { duration: 0.7 }}
                  className="absolute inset-0 w-full h-full"
                >
                  <img 
                    src={carouselItems[carouselIndex].coverUrl} 
                    alt="" 
                    onClick={() => {
                      const currentSlide = carouselItems[carouselIndex];
                      if (currentSlide.link) {
                        window.open(currentSlide.link, '_blank', 'noopener,noreferrer');
                      } else if (currentSlide.matchedItem) {
                        handleMediaPlay(currentSlide.matchedItem);
                      }
                    }}
                    className={`w-full h-full object-cover opacity-35 scale-105 filter blur-[1px] md:blur-none ${carouselItems[carouselIndex].link ? 'cursor-pointer hover:opacity-50' : ''}`}
                    title={carouselItems[carouselIndex].link ? `Visit: ${carouselItems[carouselIndex].link}` : undefined}
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-black/40 to-transparent"></div>
                  
                  {/* Description texts */}
                  <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 max-w-xl z-10">
                    <div className="flex items-center space-x-2.5 mb-2.5">
                      <span className="bg-red-650 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-widest glow-red">
                        {carouselItems[carouselIndex].link ? 'Featured Link' : 'Featured Blockbuster'}
                      </span>
                      <span className="text-xs text-yellow-500 font-bold">★ {carouselItems[carouselIndex].rating} Rating</span>
                    </div>
                    <h3 
                      className={`text-2xl md:text-5xl font-display font-black text-white leading-tight tracking-tight text-glow-red ${carouselItems[carouselIndex].link ? 'cursor-pointer hover:text-red-400' : ''}`}
                      onClick={() => {
                        const currentSlide = carouselItems[carouselIndex];
                        if (currentSlide.link) {
                          window.open(currentSlide.link, '_blank', 'noopener,noreferrer');
                        } else if (currentSlide.matchedItem) {
                          handleMediaPlay(currentSlide.matchedItem);
                        }
                      }}
                    >
                      {carouselItems[carouselIndex].title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-300 font-light mt-2 line-clamp-2 md:line-clamp-3 leading-relaxed">
                      {carouselItems[carouselIndex].description}
                    </p>

                    <div className="flex items-center space-x-3 mt-6">
                      <button
                        onClick={() => {
                          const currentSlide = carouselItems[carouselIndex];
                          if (currentSlide.link) {
                            window.open(currentSlide.link, '_blank', 'noopener,noreferrer');
                          } else if (currentSlide.matchedItem) {
                            handleMediaPlay(currentSlide.matchedItem);
                          }
                        }}
                        className="bg-red-650 hover:bg-red-500 text-white font-mono font-bold text-xs py-3 px-6 rounded-xl flex items-center space-x-2 shadow-lg glow-red cursor-pointer transform hover:-translate-y-0.5 transition-all"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>{carouselItems[carouselIndex].link ? 'OPEN INFO LINK' : 'WATCH DIRECTLY'}</span>
                      </button>
                      <button
                        onClick={() => {
                          const currentSlide = carouselItems[carouselIndex];
                          toggleFavorite(currentSlide.contentId || currentSlide.id, currentSlide.title);
                        }}
                        className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all"
                        title="Add to watchlist"
                      >
                        <Heart className={`w-4 h-4 ${favorites.includes(carouselItems[carouselIndex].contentId || carouselItems[carouselIndex].id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Slider Dots */}
              <div className="absolute right-6 bottom-6 flex space-x-2 z-20">
                {carouselItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${carouselIndex === idx ? 'bg-red-650 w-6' : 'bg-white/20'}`}
                  ></button>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* CORE DISPLAY PAGES */}

      {/* 1. HOME CATALOG GRID */}
      {!viewingContent && activeTab === 'home' && (
        <section className="px-4 md:px-8 py-8 w-full max-w-7xl mx-auto space-y-12">
          
          {/* Direct watchlist view if items favored */}
          {favorites.length > 0 && selectedCategory === 'All' && !searchQuery && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bookmark className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                  <h3 className="font-display font-black text-lg text-white tracking-wide">My Watchlist List</h3>
                </div>
                {favorites.length > 3 && (
                  <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase animate-pulse">
                    Swipe left/right →
                  </span>
                )}
              </div>
              <div className="flex gap-4.5 overflow-x-auto pb-4 scrollbar-none no-scrollbar snap-x snap-mandatory">
                {content
                  .filter(c => favorites.includes(c.id))
                  .map((item) => (
                    <div 
                      key={item.id}
                      className="relative rounded-2xl overflow-hidden border border-white/5 bg-[#0b0b0d] group hover:border-red-500/30 transition-all duration-300 flex-shrink-0 w-36 sm:w-44 md:w-52 snap-start cursor-pointer"
                    >
                      {/* Responsive Aspect Ratio height */}
                      <img 
                        src={item.coverUrl} 
                        className="w-full h-44 sm:h-52 md:h-56 object-cover transform group-hover:scale-105 transition-transform duration-500" 
                        alt="" 
                        referrerPolicy="no-referrer" 
                      />
                      
                      {/* Persistent Subtle bottom gradient with title for touch-screens */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8 pb-3.5 pointer-events-none z-0 group-hover:opacity-0 transition-opacity">
                        <h4 className="text-white font-bold text-[11px] md:text-xs truncate">{item.title}</h4>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[9px] text-yellow-500 font-mono font-medium">★ {item.rating}</span>
                          <span className="text-[8px] text-gray-400 font-mono scale-90 origin-right uppercase">{item.category}</span>
                        </div>
                      </div>

                      {/* Interactive Hover-only Overlay for PC/Click */}
                      <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3.5 z-10">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] bg-yellow-500/15 text-yellow-500 font-mono font-bold px-1.5 py-0.5 rounded-md">★ {item.rating}</span>
                          <span className="text-[9px] bg-white/5 text-gray-305 font-mono px-1.5 py-0.5 rounded-md uppercase">{item.category}</span>
                        </div>
                        <div>
                          <h4 className="text-white font-black text-xs md:text-sm mb-2">{item.title}</h4>
                          <button 
                            type="button"
                            onClick={() => handleMediaPlay(item)}
                            className="w-full bg-red-650 hover:bg-red-600 active:scale-[0.97] text-white py-2 rounded-xl text-[10px] font-extrabold font-sans flex items-center justify-center space-x-1 transition-all shadow-md cursor-pointer"
                          >
                            <PlayCircle className="w-4 h-4 text-white" />
                            <span>STREAM NOW</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Primary sorted stream grid */}
          <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <div className="flex items-center space-x-3.5">
                <Tv className="w-5 h-5 text-red-650" />
                <h3 className="font-display font-extrabold text-xl text-white">
                  {selectedCategory === 'All' ? 'Infinite Catalog Reels' : selectedCategory}
                </h3>
                {searchQuery && (
                  <span className="text-xs text-gray-500 font-mono">Search match: "{searchQuery}"</span>
                )}
              </div>
              
              <div className="flex items-center space-x-4 flex-wrap gap-2 text-xs font-mono">
                {/* Popularity / Sorting toggle */}
                <div className="flex items-center bg-[#0d0d10] p-1 rounded-xl border border-white/5 space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSortBy('latest')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all uppercase cursor-pointer ${
                      sortBy === 'latest'
                        ? 'bg-red-650 text-white font-extrabold shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Latest
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('popular')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all uppercase cursor-pointer ${
                      sortBy === 'popular'
                        ? 'bg-red-550 text-white font-extrabold shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Popular (জনপ্রিয়)
                  </button>
                </div>
                
                <span className="text-gray-500">{filteredContent.length} titles</span>
              </div>
            </div>

            {/* Dynamic Genre / Category Sub-filter pills */}
            <div className="flex items-center gap-2 mb-8 pb-4 border-b border-white/5 overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedSubCategory('All')}
                className={`px-4 py-2 rounded-xl text-xs font-mono transition-all border whitespace-nowrap cursor-pointer ${
                  selectedSubCategory === 'All'
                    ? 'bg-red-650 text-white border-transparent font-bold shadow-md'
                    : 'bg-[#0f0f11] text-gray-400 border-white/5 hover:border-white/10 hover:text-white'
                }`}
              >
                All Themes
              </button>

              {getSubcategoriesForContext().map((cat) => {
                const isActive = selectedSubCategory === cat;
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setSelectedSubCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-mono transition-all border whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-red-650 text-white border-transparent font-bold shadow-md'
                        : 'bg-[#0f0f11] text-gray-400 border-white/5 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {filteredContent.length === 0 ? (
              <div className="text-center py-24 glass rounded-3xl border border-white/5">
                <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3 animate-pulse" />
                <p className="text-base text-gray-400 font-bold font-display">No populates match your filters.</p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mt-2 font-mono">Adult content might be filtered. Connect to settings to lift restriction with PIN.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {filteredContent.map((item) => (
                  <div 
                    key={item.id}
                    className="relative rounded-2xl overflow-hidden glass hover:border-red-650/30 transition-all duration-300 group shadow-lg"
                  >
                    {/* Cover image */}
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img 
                        src={item.coverUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-all duration-300"
                        referrerPolicy="no-referrer"
                      />
                      {/* Interactive Tags */}
                      {item.isPremium && (
                        <span className="absolute top-2.5 left-2.5 bg-yellow-500 text-black font-mono font-black text-[8px] px-1.5 py-0.5 rounded tracking-wider shadow-md uppercase">
                          PREMIUM
                        </span>
                      )}
                      
                      {item.status && (
                        <span className={`absolute bottom-2.5 right-2.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          item.status === 'ongoing' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                        }`}>
                          {item.status}
                        </span>
                      )}

                      {item.isAdult && (
                        <span className="absolute top-2.5 right-2.5 bg-red-650 text-white font-mono font-bold text-[8px] px-1.5 py-0.5 rounded shadow-lg uppercase">
                          18+
                        </span>
                      )}
                    </div>

                    {/* Meta info bottom */}
                    <div className="p-3 bg-[#0a0a0c]">
                      <div className="flex justify-between items-center gap-2">
                        <h4 className="text-xs font-bold text-gray-100 truncate flex-1 leading-tight">{item.title}</h4>
                        <span className="text-[10px] text-amber-500 font-bold font-mono">★{item.rating}</span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5 text-[9px] text-gray-500 font-mono">
                        <span>{item.category}</span>
                        <span>{item.schedule === 'Released' ? 'Released' : item.schedule}</span>
                      </div>

                      {/* Interactive Buttons */}
                      <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                        <button
                          onClick={() => handleMediaPlay(item)}
                          className="col-span-3 bg-red-650 hover:bg-red-600 text-white py-1.5 rounded-lg text-[9px] font-bold font-mono flex items-center justify-center space-x-1 cursor-pointer transition-all active:scale-95 glow-red"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>WATCH NOW</span>
                        </button>
                        <button
                          onClick={() => toggleFavorite(item.id, item.title)}
                          className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-red-500 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Heart className={`w-3.5 h-3.5 ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ACTIVE MULTI-RESOLUTION IMMERSIVE WATCH ROOM (DEDICATED CINEMA PAGE) */}
      {viewingContent && (
        <section className="px-4 md:px-8 py-8 w-full max-w-7xl mx-auto min-h-[85vh] animate-fadeIn">
          {/* BACK TO CATALOG BUTTON */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                setViewingContent(null);
                setPlayingVideoUrl(null);
              }}
              className="flex items-center space-x-2 text-gray-400 hover:text-white font-mono text-xs font-bold uppercase py-3 px-5 bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer border border-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Catalog</span>
            </button>
            
            <div className="flex items-center space-x-1.5 text-xs text-red-500 font-mono font-bold uppercase tracking-widest bg-red-500/10 px-3.5 py-1.5 rounded-full border border-red-500/20">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span>Cinema Watch Mode Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
            {/* Visual player module on left */}
            <div className="lg:col-span-7 space-y-4">
              {playingVideoUrl ? (
                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-[0_12px_44px_rgba(0,0,0,0.8)] relative animate-fadeIn">
                  {getYouTubeEmbedUrl(playingVideoUrl) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(playingVideoUrl)!}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <video 
                      src={playingVideoUrl} 
                      controls 
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              ) : (
                <div className="w-full aspect-video bg-[#0c0c0e] rounded-2xl border border-white/5 border-dashed flex flex-col items-center justify-center p-6 text-center shadow-lg relative overflow-hidden min-h-[350px]">
                  <div className="absolute inset-0 bg-gradient-to-t from-red-650/10 via-transparent to-transparent animate-pulse"></div>
                  <div className="w-16 h-16 rounded-full bg-red-650/10 flex items-center justify-center text-red-500 mb-4 scale-105">
                    <PlayCircle className="w-10 h-10 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-2 font-display">Awaiting Episode/Media Selection</h4>
                  <p className="text-xs text-gray-500 max-w-sm">
                    {viewingContent.category === 'Movies' 
                      ? 'Stream is linking securely to physical nodes...' 
                      : 'Please select an episode from the active season registry indexing on the right.'}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2.5 items-center bg-[#0d0d10] p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest font-bold">Genre Tags:</span>
                {viewingContent.tags?.map((t, idx) => (
                  <span key={idx} className="bg-red-500/5 hover:bg-red-550/10 text-gray-300 px-2.5 py-1 rounded text-[10px] font-mono border border-red-500/10 transition-colors">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Plot info metadata and episodes on right */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div className="glass p-6 rounded-3xl border-white/5 space-y-4">
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
                  <h3 className="text-xl md:text-2xl font-display font-black text-white leading-tight">{viewingContent.title}</h3>
                  <span className="bg-red-550/15 text-red-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">{viewingContent.category}</span>
                </div>

                <div className="flex items-center space-x-4 flex-wrap gap-y-2">
                  <span className="text-xs text-amber-500 font-bold">
                    Popcorn Rating: ★{(viewingContent.rating || 0).toFixed(1)} ({viewingContent.ratingCount || 0} {viewingContent.ratingCount === 1 ? 'vote' : 'votes'})
                  </span>
                  <span className="text-xs text-gray-400 font-mono">Releases: {viewingContent.schedule}</span>
                  {viewingContent.status && (
                    <span className="text-xs text-green-400 font-medium uppercase font-mono">{viewingContent.status}</span>
                  )}
                </div>

                <p className="text-xs text-gray-400 font-light leading-relaxed font-sans pt-1 border-t border-white/5">
                  {viewingContent.description}
                </p>

                {/* Trailers & Screenshots Gallery Section (watchlist design right side scroll) */}
                {((viewingContent.trailers && viewingContent.trailers.length > 0) || (viewingContent.screenshots && viewingContent.screenshots.length > 0)) && (
                  <div className="pt-3 border-t border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-extrabold flex items-center space-x-1">
                        <span>🎬 Trailers & Screen Shots (ট্রেইলার ও স্ক্রিনশট)</span>
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono animate-pulse">
                        Swipe left/right →
                      </span>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none no-scrollbar snap-x snap-mandatory">
                      {/* Trailers first */}
                      {viewingContent.trailers?.map((trUrl, idx) => {
                        const ytThumbnail = getYouTubeThumbnail(trUrl);
                        return (
                          <div
                            key={`tr-${idx}`}
                            onClick={() => {
                              setActiveTrailerLightboxUrl(trUrl);
                              triggerAlert("Opening Trailer in Lightbox Player...");
                            }}
                            className="relative w-40 sm:w-48 aspect-video rounded-xl overflow-hidden border border-white/5 bg-black hover:border-red-500/50 transition-all duration-300 flex-shrink-0 snap-start group cursor-pointer"
                          >
                            {ytThumbnail ? (
                              <img
                                src={ytThumbnail}
                                alt={`Trailer ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-red-650/20 to-black flex items-center justify-center p-3 text-center">
                                <span className="text-[10px] text-gray-400 font-mono truncate max-w-full">Trailer {idx + 1}</span>
                              </div>
                            )}
                            
                            {/* Overlay play button */}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                              <span className="w-8 h-8 rounded-full bg-red-650/80 group-hover:bg-red-650 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-all duration-300 shadow-md">
                                <Play className="w-4 h-4 fill-white ml-0.5" />
                              </span>
                            </div>

                            {/* Label */}
                            <div className="absolute bottom-1 right-1 bg-black/75 px-1.5 py-0.5 rounded text-[8px] font-mono text-gray-300 font-bold uppercase tracking-wider">
                              Trailer {idx + 1}
                            </div>
                          </div>
                        );
                      })}

                      {/* Screenshots next */}
                      {viewingContent.screenshots?.map((scUrl, idx) => {
                        return (
                          <div
                            key={`sc-${idx}`}
                            onClick={() => setActiveLightboxImage(scUrl)}
                            className="relative w-40 sm:w-48 aspect-video rounded-xl overflow-hidden border border-white/5 bg-[#0b0b0d] hover:border-red-500/50 transition-all duration-300 flex-shrink-0 snap-start group cursor-pointer"
                          >
                            <img
                              src={scUrl}
                              alt={`Screen ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            
                            {/* Overlay zoom/expand */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white">
                                <Maximize2 className="w-3.5 h-3.5" />
                              </span>
                            </div>

                            {/* Label */}
                            <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[8px] font-mono text-gray-300">
                              Screen {idx + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interactive Star Rating Selector */}
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest font-bold block">
                    {myCurrentRating !== null ? 'Your Rating (আপনার রেটিং):' : 'Rate this Title (রেটিং দিন):'}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = hoverRating !== null ? star <= hoverRating : (myCurrentRating !== null && star <= myCurrentRating);
                        return (
                          <button
                            key={star}
                            type="button"
                            disabled={isRatingSubmitting}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            onClick={async () => {
                              try {
                                setIsRatingSubmitting(true);
                                const userId = getUserIdForRating();
                                await submitUserRating(viewingContent.id, userId, star);
                                triggerAlert(`Thank you for rating! (${star} Star রেটিং সফল হয়েছে)`);
                              } catch (err) {
                                triggerAlert("Failed to submit rating. Please try again.");
                              } finally {
                                setIsRatingSubmitting(false);
                              }
                            }}
                            className="p-1 focus:outline-none transition-all duration-200 hover:scale-125 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className={`text-2xl transition-colors duration-200 ${
                              isFilled ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-gray-600 hover:text-amber-350'
                            }`}>
                              ★
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    
                    {myCurrentRating !== null && (
                      <span className="text-xs text-green-400 font-mono font-medium animate-pulse animate-duration-1000">
                        ({myCurrentRating} Star Saved)
                      </span>
                    )}

                    {isRatingSubmitting && (
                      <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                </div>

                {/* Pack Zip download support link */}
                {viewingContent.zipUrl && (
                  <div className="mt-5 p-3.5 bg-yellow-500/5 border border-yellow-500/15 rounded-2xl flex justify-between items-center gap-4">
                    <div className="truncate">
                      <span className="text-xs font-bold text-white block">Download Full Series Archive</span>
                      <span className="text-[10px] text-yellow-500 block font-mono truncate">Get all episodes in high speed ZIP files pack</span>
                    </div>
                    <a 
                      href={viewingContent.zipUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-xl text-xs font-mono font-extrabold flex items-center space-x-1 shrink-0 cursor-pointer transition-all hover:scale-105"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ZIP PACK</span>
                    </a>
                  </div>
                )}
              </div>

              {/* DYNAMIC DOWNLOAD AREA AND MULTI RESOLUTION INDEXES */}
              <div className="glass p-6 rounded-3xl border-white/5 space-y-4">
                
                {/* 1. If category is Movies */}
                {viewingContent.category === 'Movies' && (
                  <div className="space-y-3">
                    <span className="text-xs font-mono font-bold text-gray-400 block pb-1 border-b border-white/5 uppercase">
                      📥 CHANNELS DOWNLOAD CHOICES
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {/* Standard direct link fallback */}
                      {viewingContent.downloadUrl && (
                        <a
                          href={viewingContent.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-red-500" />
                          <span>Direct Mirror</span>
                        </a>
                      )}

                      {viewingContent.downloadLinks && viewingContent.downloadLinks.length > 0 ? (
                        viewingContent.downloadLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-red-650 hover:bg-red-600 border border-white/5 px-4 py-2.5 rounded-xl text-xs font-mono font-black flex items-center space-x-1.5 transition-all cursor-pointer shadow hover:scale-105"
                          >
                            <Download className="w-3.5 h-3.5 text-white/90" />
                            <span className="uppercase">{link.quality}</span>
                          </a>
                        ))
                      ) : (
                        !viewingContent.downloadUrl && (
                          <span className="text-[10px] text-gray-500 font-mono">No physical download mirrors currently indexed for this cinematic.</span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* 2. If category is Series AND we have episodes */}
                {viewingContent.episodes && viewingContent.episodes.length > 0 && (
                  (() => {
                    const activeEp = viewingContent.episodes.find(ep => ep.id === selectedEpisodeId) || null;

                    return (
                      <div className="space-y-4">
                        {/* Active Episode mirror links block */}
                        {activeEp ? (
                          <div className="bg-red-650/[0.03] border border-red-500/10 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                              <div className="truncate">
                                <span className="text-xs font-black text-white block">
                                  📥 Episode {activeEp.number} Mirror Options
                                </span>
                                <span className="text-[10px] text-gray-400 block truncate font-mono max-w-[200px]">
                                  {activeEp.title}
                                </span>
                              </div>
                              <span className="bg-amber-500/10 text-amber-500 rounded px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider shrink-0 block">
                                Multiple Quality
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {activeEp.downloadLinks && activeEp.downloadLinks.length > 0 ? (
                                activeEp.downloadLinks.map((link, idx) => (
                                  <a
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-white/5 hover:bg-white/10 text-gray-200 border border-white/5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                                  >
                                    <Download className="w-3 h-3 text-red-500" />
                                    <span className="uppercase font-sans font-bold">{link.quality}</span>
                                  </a>
                                ))
                              ) : (
                                <span className="text-[10px] text-gray-500 font-mono font-sans pb-1">
                                  Default streaming links are prepared. Download quality mirrors are syncing.
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-amber-500/[0.02] border border-amber-550/10 rounded-xl p-3.5 text-center">
                            <span className="text-[10px] text-amber-550 font-mono block">
                              🍿 Select an episode inside catalog below to stream and retrieve multiple qualities download channels!
                            </span>
                          </div>
                        )}

                        {/* Episodes navigation indices list */}
                        <div className="border-t border-white/5 pt-3">
                          <span className="text-xs font-mono font-bold text-gray-400 uppercase block mb-2.5">
                            🍿 Select Episode to stream & download ({viewingContent.episodes.length})
                          </span>
                          
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                            {viewingContent.episodes.map((ep) => (
                              <button
                                key={ep.id}
                                onClick={() => {
                                  setSelectedEpisodeId(ep.id);
                                  setPlayingVideoUrl(ep.videoUrl || null);
                                }}
                                className={`w-full flex justify-between items-center p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                                  selectedEpisodeId === ep.id 
                                    ? 'bg-red-650/10 border-red-500/40 text-red-400 font-bold' 
                                    : 'bg-black/30 border-white/5 text-gray-300 hover:bg-black/50 hover:border-white/10'
                                }`}
                              >
                                <div className="flex items-center space-x-2 truncate">
                                  <span className={`w-5.5 h-5.5 rounded font-mono font-bold text-[9px] flex items-center justify-center transition-all ${
                                    selectedEpisodeId === ep.id ? 'bg-red-650 text-white' : 'bg-red-600/10 text-red-500'
                                  }`}>
                                    {ep.number}
                                  </span>
                                  <span className="truncate">{ep.title}</span>
                                </div>
                                
                                <div className="ml-2 flex items-center space-x-1.5 shrink-0">
                                  {ep.isFiller && (
                                    <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1 py-0.2 rounded text-[7.5px] font-mono">Filler</span>
                                  )}
                                  {ep.downloadLinks && ep.downloadLinks.length > 0 && (
                                    <span className="bg-green-500/10 text-green-400 rounded px-1 text-[8px] font-mono leading-none">
                                      💾 {ep.downloadLinks.length} Files
                                    </span>
                                  )}
                                  <PlayCircle className="w-4 h-4 text-red-500 shrink-0" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    );
                  })()
                )}

              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. DEDICATED FULL HELP DESK PAGE */}
      {activeTab === 'chat' && (
        <section className="px-4 py-8 max-w-4xl mx-auto space-y-6 min-h-[75vh] animate-fadeIn font-sans">
          <div className="text-center font-display mb-6">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-[10px] font-mono tracking-widest uppercase font-bold inline-block">
              🟢 Live Client Helpdesk (Real-Time Synchronized)
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-3">Help & Live Support</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Query premium vouchers, report stream offline mirrors, or request specific anime shows. Talk with POPCORN administrators directly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#0c0c0e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl min-h-[480px]">
            {/* Guide column */}
            <div className="md:col-span-4 bg-white/[0.01] border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block font-sans">popcorn play handbook</span>
                
                <div className="space-y-3.5 text-xs text-gray-300">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="font-bold text-white block mb-0.5">📥 Choosing Quality</span>
                    <span className="text-gray-400 text-[10.5px] leading-relaxed block">
                      Choose "Watch Now" on any show, click on an episode from the registry. If dynamic mirrors are prepared, choose quality files (480p, 720p, etc.)!
                    </span>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="font-bold text-white block mb-0.5">💎 Unlock VIP Premium</span>
                    <span className="text-gray-400 text-[10.5px] leading-relaxed block">
                      Navigate to the "Profile" tab. Enter your acquired payment voucher key to authenticate immediate server privileges.
                    </span>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="font-bold text-white block mb-0.5">🔒 Mature parental lock</span>
                    <span className="text-gray-400 text-[10.5px] leading-relaxed block">
                      Unlocks the restricted 18+ section inside the directory sidebar. Submit the passcode in drawer menu to activate.
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Support Social Links */}
              {settings?.socialLinks && settings.socialLinks.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest block mb-2 px-1">💬 CONNECT WITH US / আমাদের সোশ্যাল লিংক</span>
                  <div className="space-y-2">
                    {settings.socialLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2.5 p-2 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-red-500/20 rounded-xl transition-all group"
                      >
                        <div className="w-7 h-7 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center text-red-400 group-hover:bg-red-500/20 group-hover:text-red-350 transition-all text-[9px] font-mono leading-none tracking-tighter truncate max-w-[28px]">
                          {link.icon || 'Link'}
                        </div>
                        <div className="truncate text-left min-w-0">
                          <span className="text-[11px] font-black text-white block group-hover:text-red-400 transition-colors leading-tight truncate">{link.platformName}</span>
                          <span className="text-[9.5px] text-gray-500 font-medium block leading-none mt-0.5 truncate">{link.linkName}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[9px] text-gray-500 font-mono pt-3 border-t border-white/5 uppercase mt-6">
                <span>SSL Secured Gateway Access</span>
              </div>
            </div>

            {/* Live Message Area (interactive) */}
            <div className="md:col-span-8 flex flex-col h-[500px]">
              {/* Box header sub-bar */}
              <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border-b border-white/5 p-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <div className="truncate">
                    <h4 className="font-display font-extrabold text-xs text-white uppercase tracking-wider">Help Desk Conversation</h4>
                    <span className="text-[9px] text-gray-400 font-mono block">Connected as: {userProfile?.name || 'Guest User'}</span>
                  </div>
                </div>

                {chatSession?.messages && chatSession.messages.length > 0 && (
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => {
                        showConfirm(
                          "Purge Local Conversation Logs",
                          "Do you want to wipe all local conversation logs? This cannot be undone.",
                          async () => {
                            await clearChatSession(userProfile?.uid || '');
                            setChatSession(prev => prev ? { ...prev, messages: [], unreadCount: 0 } : null);
                            triggerAlert("Correspondence logs general purge completed.");
                          }
                        );
                      }}
                      className="text-[9.5px] text-gray-400 hover:text-white border border-white/10 bg-white/5 px-2.5 py-1 rounded-lg uppercase font-mono tracking-wider cursor-pointer font-bold shrink-0"
                    >
                      Clear Logs
                    </button>
                    <button
                      onClick={() => {
                        showConfirm(
                          "Delete Chat Session Completely",
                          "Are you sure you want to delete this support chat session entirely? This will remove all messages from both your screen and the administrator's dashboard in Firebase.",
                          async () => {
                            await deleteChatSession(userProfile?.uid || '');
                            setChatSession(null);
                            triggerAlert("Live chat session successfully deleted from Cloud.");
                          }
                        );
                      }}
                      className="text-[9.5px] text-red-450 hover:text-white border border-red-500/20 bg-red-500/10 hover:bg-red-500 px-2.5 py-1 rounded-lg uppercase font-mono tracking-wider cursor-pointer font-black shrink-0 transition-all"
                    >
                      🗑️ Delete Chat
                    </button>
                  </div>
                )}
              </div>

              {/* Messaging scroll channel */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40 no-scrollbar">
                {(!chatSession?.messages || chatSession.messages.length === 0) ? (
                  <div className="text-center py-24 text-gray-500 text-xs font-mono select-none space-y-2">
                    <Sparkles className="w-8 h-8 text-yellow-500/30 mx-auto animate-pulse" />
                    <span className="block text-gray-300 font-bold mb-1">State Correspondence Ticket</span>
                    <span className="block text-[11px] text-gray-500">How can our technicians assist your cinema pipeline today? Provide information below.</span>
                  </div>
                ) : (
                  chatSession.messages.map((m) => (
                    <div 
                      key={m.id} 
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`p-4 rounded-3xl text-xs max-w-sm shadow-md leading-relaxed ${
                        m.sender === 'user' 
                          ? 'bg-red-650/15 text-white rounded-tr-none border border-red-550/10' 
                          : 'bg-emerald-500/10 text-emerald-100 rounded-tl-none border border-emerald-500/15'
                      }`}>
                        <p>{m.text}</p>
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono mt-1 px-1.5">{m.timestamp}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Messaging input block */}
              <div className="p-3 bg-black/20 border-t border-white/5 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Ask and discuss payment errors, or streaming quality mirrors request..."
                  value={supportText}
                  onChange={(e) => setSupportText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendSupportMsg()}
                  className="flex-1 bg-white/[0.03] border border-white/5 focus:border-red-550 focus:outline-none rounded-xl p-3.5 text-xs text-white placeholder-gray-500 font-sans"
                />
                <button
                  onClick={handleSendSupportMsg}
                  className="bg-red-650 hover:bg-red-600 text-white px-5 py-3.5 rounded-xl font-mono text-[11px] font-black uppercase tracking-wider cursor-pointer shadow transition-all hover:scale-105 shrink-0"
                >
                  SEND
                </button>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* 3. PROFILE / LOGIN PAGE */}
      {activeTab === 'profile' && (
        <section className="px-4 py-12 max-w-4xl mx-auto space-y-6">
          {userProfile ? (
            <div className="space-y-6">
              <UserProfileComponent
                userProfile={userProfile}
                contentList={content}
                favorites={favorites}
                onPlay={(item) => {
                  handleMediaPlay(item);
                  setActiveTab('home');
                }}
                onToggleFavorite={toggleFavorite}
                onUpdateProfile={updateUserProfile}
                isUserPremium={isUserPremium}
                triggerPaymentUpgrade={() => {
                  const mockFilm: ContentItem = {
                    id: 'unlock', title: 'Unlock VIP Popcorn Access', category: 'Movies',
                    videoUrl: '', coverUrl: '', tags: [], isPremium: true, isAdult: false,
                    schedule: '', description: '', rating: 9
                  };
                  setPaymentContent(mockFilm);
                }}
                triggerAlert={triggerAlert}
              />
              
              <div className="max-w-md mx-auto pt-4">
                <button
                  onClick={handleSignOut}
                  className="w-full bg-[#141416]/80 hover:bg-red-955/20 hover:text-red-400 border border-white/5 active:scale-[0.98] py-3.5 rounded-2xl text-[10px] font-mono font-extrabold uppercase tracking-widest transition-all shadow-md"
                >
                  🚪 LOG OUT FROM THIS DEVICE
                </button>
              </div>
            </div>
          ) : (
            /* Login forms */
            <div className="glass p-8 rounded-3xl space-y-6">
              <div className="text-center">
                <Film className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h3 className="font-display font-black text-2xl text-white">
                  {isSignUp ? 'Create Popcorn Account' : 'Authenticate Viewer'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Unlock bufferless direct HD streaming and saved library lists.</p>
              </div>

              {authError && (
                <div className="bg-red-500/10 text-red-400 text-xs p-3.5 rounded-lg text-center border border-red-500/15">
                  {authError}
                </div>
              )}

              <form onSubmit={handleCustomAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="text-[10px] text-gray-400 font-mono block mb-1">YOUR DISPLAY NAME</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shakib"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-gray-400 font-mono block mb-1">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-mono block mb-1">PASSWORD</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter key keys..."
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                  />
                </div>

                {isSignUp && (
                  <div>
                    <label className="text-[10px] text-gray-400 font-mono block mb-1">RE-ENTER PASSWORD</label>
                    <input
                      type="password"
                      required
                      placeholder="Confirm your key code"
                      value={authConfirmPass}
                      onChange={(e) => setAuthConfirmPass(e.target.value)}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-red-650 hover:bg-red-600 text-white font-mono text-xs font-black py-4 rounded-xl uppercase tracking-wider"
                >
                  {isSignUp ? 'SIGN UP ACCOUNT' : 'LOGIN PLATFORM'}
                </button>
              </form>

              {/* Google Log-In integration */}
              <div className="border-t border-white/5 pt-5 space-y-3.5">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-mono text-xs py-3.5 rounded-xl uppercase tracking-wider flex items-center justify-center space-x-2 border border-white/15"
                >
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>Log In with Google</span>
                </button>

                <div className="text-center">
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setAuthError(null);
                    }}
                    className="text-xs text-gray-400 hover:text-white underline font-mono"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : 'Need a new account? Sign Up'}
                  </button>
                </div>
              </div>

            </div>
          )}
        </section>
      )}

      {/* PARENTAL CONTROL PIN MODAL POPUP */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowPinModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm"></div>
          <div className="relative w-80 glass p-6 rounded-3xl border-red-500/20 text-center animate-float">
            <h4 className="font-display font-extrabold text-base text-white mb-2 flex items-center justify-center space-x-2">
              <Lock className="w-4.5 h-4.5 text-red-500" />
              <span>Parental Channel Locker</span>
            </h4>
            <p className="text-xs text-gray-400 mb-4 font-mono">
              Provide Admin configured adult PIN to toggle restrictions. (Default: 0000)
            </p>

            {pinError && (
              <div className="text-[10px] text-red-400 font-mono mb-3 bg-red-500/10 p-2 rounded-lg border border-red-500/15">
                {pinError}
              </div>
            )}

            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pinEntry}
              onChange={(e) => setPinEntry(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              className="lg:w-40 w-32 bg-[#121215] border border-white/10 focus:border-red-500 focus:outline-none rounded-xl py-3 text-center text-lg text-white font-black tracking-widest font-mono mb-6"
            />

            <div className="flex space-x-2.5">
              <button
                onClick={() => setShowPinModal(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-3 rounded-xl text-xs font-mono font-bold"
              >
                CANCEL
              </button>
              <button
                onClick={handlePinSubmit}
                className="flex-1 bg-red-650 hover:bg-red-600 text-white py-3 rounded-xl text-xs font-mono font-black"
              >
                VERIFY PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM UPGRADE BILLING CHECKOUT MODAL */}
      {paymentContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setPaymentContent(null)} className="fixed inset-0 bg-black/85 backdrop-blur-lg"></div>
          
          <div className="relative w-full max-w-md glass p-6 md:p-8 rounded-3xl border-yellow-500/20 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
            
            <button 
              onClick={() => setPaymentContent(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-full text-gray-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {!userProfile ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mx-auto border border-yellow-500/20">
                  <User className="w-7 h-7" />
                </div>
                <h3 className="font-display font-black text-xl text-white tracking-wider">LOGIN REQUIRED</h3>
                <p className="text-xs text-gray-400 font-sans leading-relaxed px-4">
                  পেমেন্ট সাবমিট এবং ভিআইপি প্রিমিয়াম অ্যাকাউন্ট অ্যাক্টিভেট করার আগে আপনাকে অবশ্যই অ্যাকাউন্টে সাইন-ইন বা সাইন-আপ করতে হবে।
                </p>
                <div className="pt-4 px-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentContent(null);
                      setActiveTab('profile');
                      triggerAlert("Please login or register first! (অনুগ্ৰহ করে লগইন বা রেজিস্ট্রেশন করুন!)");
                    }}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-4 rounded-xl text-xs font-mono font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                  >
                    Go to Login / Sign Up
                  </button>
                </div>
              </div>
            ) : paymentSubmitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto animate-bounce border border-emerald-500/20">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="font-display font-black text-xl text-white">Upgrade Request Logged!</h3>
                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                  Your transaction has been submitted onto the Admin Dashboard ledger queue. Your profile will automagically be activated to VIP status upon validation.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2.5 text-yellow-500 mb-4">
                  <Sparkles className="w-5 h-5" />
                  <h4 className="font-display font-black text-lg text-white uppercase tracking-wider">Popcorn VIP Checkout</h4>
                </div>
                
                <p className="text-xs text-gray-400 mb-6 font-light">
                  You are unlocking premium media: <strong className="text-white font-bold">"{paymentContent.title}"</strong>. Support Bangladesh's best high speed video node by upgrading below.
                </p>

                {/* Account Details dynamically loaded from Admin panel! */}
                <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-3.5 mb-6 text-xs leading-relaxed max-h-56 overflow-y-auto no-scrollbar">
                  <span className="text-[10px] text-gray-500 font-mono font-bold tracking-widest uppercase block">PLATFORM MERCHANT WALLETS</span>
                  {(settings?.paymentMethods || [
                    { id: '1', name: 'bKash Personal', number: settings?.bkash || '01712-345678 (Personal)', instructions: 'Send money' },
                    { id: '2', name: 'Nagad Merchant', number: settings?.nagad || '01912-876543 (Merchant)', instructions: 'Payment' },
                    { id: '3', name: 'Dutch-Bangla Bank', number: settings?.bank || 'Popcorn Play Media Ltd, Sonali Bank, A/C: 1022-0987-1234', instructions: 'Transfer' }
                  ]).map((pm) => (
                    <div key={pm.id} className="border-b border-white/5 pb-2 last:border-none last:pb-0">
                      <span className="text-yellow-500 font-mono font-bold block mb-0.5 uppercase">🟡 {pm.name}:</span>
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-300 font-mono bg-white/[0.02] p-1.5 rounded text-glow-gold select-all font-bold tracking-wider">{pm.number}</span>
                        {pm.instructions && (
                          <span className="text-[10px] text-gray-400 italic font-sans pr-1">({pm.instructions})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handlePaymentSubmission} className="space-y-4">
                  {/* Option Choice */}
                  <div className="flex flex-wrap gap-2 p-1 bg-black/40 border border-white/5 rounded-xl">
                    {(settings?.paymentMethods || [
                      { id: '1', name: 'bKash Personal', number: settings?.bkash || '01712-345678 (Personal)', instructions: 'Send money' },
                      { id: '2', name: 'Nagad Merchant', number: settings?.nagad || '01912-876543 (Merchant)', instructions: 'Payment' },
                      { id: '3', name: 'Dutch-Bangla Bank', number: settings?.bank || 'Popcorn Play Media Ltd, Sonali Bank, A/C: 1022-0987-1234', instructions: 'Transfer' }
                    ]).map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.name.toLowerCase())}
                        className={`text-[10px] font-mono tracking-widest uppercase py-2.5 px-3 rounded-lg transition-all font-bold flex-1 text-center min-w-[100px] ${paymentMethod === pm.name.toLowerCase() ? 'bg-yellow-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
                      >
                        {pm.name}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Package Selector */}
                  <div>
                    <label className="text-[10px] text-gray-500 font-mono block mb-2 font-bold uppercase tracking-wider">CHOOSE YOUR SUBSCRIPTION PLAN</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                      {(settings?.premiumPlans || [
                        { id: 'plan-1', name: '30 Days VIP Premium', price: 150, durationDays: 30 },
                        { id: 'plan-2', name: '6 Months VIP Premium', price: 700, durationDays: 180 },
                        { id: 'plan-3', name: '1 Year VIP Premium', price: 1200, durationDays: 365 }
                      ]).map((plan) => {
                        const isSelected = String(payAmount) === String(plan.price);
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => {
                              setPayAmount(String(plan.price));
                              setPayDuration(plan.durationDays);
                            }}
                            className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-red-650/15 border-red-500 text-white shadow-lg shadow-red-500/5'
                                : 'bg-[#101012] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                            }`}
                          >
                            <span className="text-xs font-bold text-white mb-0.5">{plan.name}</span>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">BDT {plan.price} · {plan.durationDays} Days</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-mono block mb-1">CASH-IN TOTAL AMOUNT (BDT)</label>
                    <input
                      type="text"
                      className="w-full bg-[#101012] border border-white/5 rounded-xl px-4 py-3.5 text-xs text-emerald-400 font-bold font-mono tracking-wide"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-mono block mb-1">YOUR SENDER PHONE NUMBER</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 017xxxxxxxx"
                      value={paySenderNumber}
                      onChange={(e) => setPaySenderNumber(e.target.value)}
                      className="w-full bg-[#101012] border border-white/5 focus:border-yellow-500/20 focus:outline-none rounded-xl px-4 py-3.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-mono block mb-1">TRANSACTION HASH ID (TxID) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter 10-digit bKash/Nagad transactional hash string"
                      value={payTxnId}
                      onChange={(e) => setPayTxnId(e.target.value)}
                      className="w-full bg-[#101012] border border-white/5 focus:border-yellow-500/20 focus:outline-none rounded-xl px-4 py-3.5 text-xs text-yellow-500 font-mono font-bold select-all tracking-widest"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-mono text-xs font-black py-4 rounded-xl uppercase tracking-wider shadow-lg glow-gold mt-2"
                  >
                    SUBMIT VERIFICATION VOUCHER
                  </button>
                </form>
              </>
            )}

          </div>
        </div>
      )}

      {/* STUNNING INTERACTIVE DEVELOPER PROFILE MODAL */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <div 
            onClick={() => setShowDevModal(false)} 
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
          ></div>
          
          {/* Main Card Container */}
          <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0d0d10] via-[#09090b] to-[#040405] border border-red-500/25 rounded-3xl p-6 md:p-8 text-center animate-scale-up shadow-[0_0_60px_rgba(239,68,68,0.2)] max-h-[92vh] overflow-y-auto no-scrollbar font-sans">
            
            {/* Pulsing neon top accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-650 via-yellow-500 to-red-650 animate-pulse rounded-t-3xl" />

            {/* Glowing avatar holder */}
            <div className="relative w-24 h-24 mx-auto mb-4 group">
              <div className="absolute inset-0 bg-gradient-to-tr from-red-650 to-yellow-500 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-[#09090a] border-2 border-red-500 flex items-center justify-center text-white overflow-hidden">
                <span className="font-mono text-2xl font-black tracking-widest text-[#ef4444] group-hover:scale-110 transition-transform">MI</span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-[#09090b] w-4.5 h-4.5 rounded-full" title="Active Client Projects Support" />
            </div>

            {/* Headers */}
            <div className="space-y-1 mb-6">
              <h3 className="font-display font-black text-2xl text-white tracking-wide">Muhammad Ikhlas</h3>
              <p className="text-[#ef4444] text-[13px] font-bold tracking-wider font-mono">মুহাম্মদ ইখলাস</p>
              
              <div className="inline-flex items-center space-x-1.5 bg-red-650/15 border border-[#ef4444]/30 px-3 py-1 rounded-full text-[10px] text-[#ef4444] font-black tracking-wider uppercase font-mono animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500 font-bold" />
                <span>LEAD DEVELOPER & CREATOR</span>
              </div>
            </div>

            {/* Grid stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 text-left transition-all hover:bg-white/[0.04] hover:border-red-500/10">
                <span className="text-[10px] text-gray-500 font-mono font-bold block uppercase tracking-wider mb-1">AGE / বয়স</span>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-bold text-white">21 Years (২১ বছর)</span>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 text-left transition-all hover:bg-white/[0.04] hover:border-red-500/10">
                <span className="text-[10px] text-gray-500 font-mono font-bold block uppercase tracking-wider mb-1">EDUCATION / পড়াশোনা</span>
                <div className="flex items-center space-x-2">
                  <Laptop className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-white truncate">Honours 1st Year (অনার্স ১ম বর্ষ)</span>
                </div>
              </div>
            </div>

            {/* Persian copywriting box */}
            <div className="bg-[#0e0e11] border border-white/5 rounded-2xl p-5 text-left space-y-4 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <Code className="w-12 h-12 text-[#ef4444]" />
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-1.5 border-b border-white/5 pb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>Build Your Next Big Project</span>
                </h4>
                
                {/* Bengali Copy */}
                <p className="text-[12px] text-gray-250 leading-relaxed font-normal">
                  আপনার ব্যবসা বা উদ্যোগকে এক ধাপ এগিয়ে নিতে চান? কাস্টম নকশায় এবং প্রিমিয়াম কোডিং স্ট্যান্ডার্ড বজায় রেখে প্রফেশনাল ও রেসপনসিভ <strong className="text-[#ef4444]">Android / iOS মোবাইল অ্যাপস</strong>, শক্তিশালী <strong className="text-[#ef4444]">ওয়েব-অ্যাপ্লিকেশন</strong> অথবা আকর্ষণীয় ও দৃষ্টিনন্দন <strong className="text-[#ef4444]">ওয়েবসাইট</strong> বানাতে ও সাশ্রয়ী বাজেটে আপনার আইডিয়াকে বাস্তবে রূপ দিতে আজই আমার সাথে যোগাযোগ করুন!
                </p>

                {/* English Copy */}
                <p className="text-[11.5px] text-gray-400 leading-relaxed font-light dark:text-gray-400">
                  Are you looking to scale your business or startup online? I craft beautifully optimized, blazing-fast web portals, rich e-commerce platforms, and interactive native mobile apps engineered to scale. Let's work together to write your digital success story!
                </p>
              </div>

              {/* Major Services pill links */}
              <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5">
                {['Mobile Apps (Android & iOS)', 'Creative Web-Apps', 'Corporate Websites', 'Fast E-Commerce', 'UI/UX Craftsmanship'].map((service) => (
                  <span key={service} className="text-[9px] bg-red-650/10 text-red-500/90 border border-red-500/10 px-2 py-0.5 rounded-md font-mono">
                    ✓ {service}
                  </span>
                ))}
              </div>
            </div>

            {/* Interactive action buttons */}
            <div className="space-y-3 font-sans">
              <div className="text-[10px] text-gray-500 font-mono tracking-wider block uppercase font-bold text-left px-1">
                CONTACT DETAILS / যোগাযোগ
              </div>

              {/* Direct Contract button */}
              <a
                href="mailto:mdikhlas098@gmail.com?subject=Project Collaboration Inquiry - Muhammad Ikhlas&body=Hi Muhammad Ikhlas,%0D%0A%0D%0AI saw your developer credentials on Popcorn Play. I am looking to develop a website/app and would love to collaborate on a premium digital solution.%0D%0A%0D%0APrefered Budget: [Flexible]%0D%0AProject Type: [App / Website / Web-App]%0D%0A%0D%0ABest regards!"
                className="w-full flex items-center justify-center space-x-3 py-3.5 bg-gradient-to-r from-red-650 to-[#ef4444] hover:from-red-600 hover:to-red-500 active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all shadow-lg hover:shadow-red-500/20 cursor-pointer uppercase tracking-wider"
              >
                <Mail className="w-4 h-4 text-white animate-bounce" />
                <span>Contract via Direct Gmail</span>
              </a>

              {/* Copy action */}
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-left font-mono text-[11px] text-gray-400 select-all truncate">
                  mdikhlas098@gmail.com
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('mdikhlas098@gmail.com');
                    setCopiedDevEmail(true);
                    setTimeout(() => setCopiedDevEmail(false), 2000);
                  }}
                  className="px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-gray-300 hover:text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1 w-28 cursor-pointer relative overflow-hidden"
                >
                  {copiedDevEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-green-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom close modal button */}
            <div className="mt-8 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowDevModal(false)}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-mono transition-all uppercase tracking-wider cursor-pointer font-sans"
              >
                Close Profile
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* BOTTOM UTILITY ROUTING BAR FOR MOBILES */}
      <div className="h-20"></div> {/* Space anchor */}
      <div className="fixed bottom-0 inset-x-0 bg-[#070708]/90 backdrop-blur-md border-t border-white/5 py-3 px-6 flex justify-around items-center z-40 md:max-w-2xl md:mx-auto md:rounded-t-3xl md:border-x">
        
        <button
          onClick={() => { setSelectedCategory('All'); setSearchQuery(''); setActiveTab('home'); }}
          className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'home' ? 'text-red-500 scale-105' : 'text-gray-400 hover:text-white'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium font-sans">Home</span>
        </button>

        <button
          onClick={() => { setActiveTab('search'); }}
          className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'search' ? 'text-red-500 scale-105' : 'text-gray-400 hover:text-white'}`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-medium font-sans">Search</span>
        </button>

        <button
          onClick={() => {
            if (!userProfile) {
              triggerAlert("Authentication required to invoke client-admin dialog chats.");
              setActiveTab('profile');
              return;
            }
            setActiveTab('chat');
          }}
          className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'chat' ? 'text-red-500 scale-105' : 'text-gray-400 hover:text-white'}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium font-sans">Support</span>
        </button>

        <button
          onClick={() => { setActiveTab('profile'); }}
          className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'profile' ? 'text-red-500 scale-105' : 'text-gray-400 hover:text-white'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium font-sans">Profile</span>
        </button>

      </div>

      {/* QUICK IN-SCREEN SEARCH SECTION */}
      {activeTab === 'search' && (
        <section className="px-4 py-8 max-w-xl mx-auto space-y-6 min-h-[60vh]">
          <div className="text-center font-display mb-6">
            <h2 className="text-2xl font-black text-white">Advanced Theater Search</h2>
            <p className="text-xs text-gray-500 mt-1">Acquire single movies or targeted episodic releases instantly by tags.</p>
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center space-x-3.5 focus-within:border-red-500/25">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search e.g. Toofan, Naruto, Horror, Bangla..."
              className="bg-transparent border-none text-xs focus:outline-none text-white w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="pt-4 space-y-3.5">
            <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase block">HOT CATEGORIES</span>
            <div className="flex flex-wrap gap-2.5">
              {['Toofan', 'Jawan', 'Anime', 'Horror', 'Action', 'Drama', 'Released', 'Monday'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 font-mono text-xs text-gray-300 px-4 py-2 rounded-xl transition-all hover:border-red-550/20"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
          
          {searchQuery && (
            <div className="pt-6">
              <span className="text-xs text-gray-400 block mb-4 font-mono font-bold uppercase tracking-wider">Matched results ({filteredContent.length})</span>
              <div className="grid grid-cols-2 gap-4">
                {filteredContent.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => { handleMediaPlay(item); setActiveTab('home'); }}
                    className="flex space-x-3 bg-white/[0.02] border border-white/5 p-2 rounded-xl cursor-pointer hover:border-red-550/20 transition-all"
                  >
                    <img src={item.coverUrl} className="w-12 h-16 object-cover rounded-lg" alt="" />
                    <div className="truncate flex-1 self-center">
                      <h4 className="text-xs font-bold text-white truncate leading-tight">{item.title}</h4>
                      <span className="text-[10px] text-amber-500 font-bold block mt-1">★ {item.rating}</span>
                      <span className="text-[9px] text-gray-500 font-mono mt-0.5 block">{item.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 📢 POP-UP ANNOUNCEMENT MODAL */}
      {(() => {
        const activePopups = settings?.popups?.filter(p => p.isActive) || [];
        if (activePopups.length === 0 || currentPopupIndex >= activePopups.length || !showAnnouncePopup) {
          return null;
        }

        const currentPopup = activePopups[currentPopupIndex];
        const popupTitle = currentPopup.title || 'Special Broadcast Notice';
        const popupMessage = currentPopup.message || 'Welcome to Popcorn Play! Stay tuned for the latest releases.';
        const popupImageUrl = currentPopup.imageUrl;
        const popupButtonText = currentPopup.buttonText;
        const popupButtonLink = currentPopup.redirectLink || currentPopup.buttonLink || '#';
        const autoCloseDelay = currentPopup.autoCloseDelay;

        const advancePopup = () => {
          if (currentPopupIndex + 1 < activePopups.length) {
            setCurrentPopupIndex(prev => prev + 1);
          } else {
            setShowAnnouncePopup(false);
          }
        };

        const handlePopupAction = () => {
          if (popupButtonLink.startsWith('#')) {
            if (popupButtonLink === '#premium') {
              setActiveTab('premium');
            } else if (popupButtonLink === '#chat') {
              setSupportOpen(true);
            }
          } else if (popupButtonLink && popupButtonLink !== '#') {
            window.open(popupButtonLink, '_blank');
          }
          advancePopup();
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
            <div className="relative max-w-lg w-full bg-[#111114] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 flex flex-col items-center text-center animate-scale-up">
              
              {/* Close button */}
              <button
                onClick={advancePopup}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Image (if provided) with clickable redirect link */}
              {popupImageUrl && (
                <div 
                  onClick={handlePopupAction}
                  className="w-full relative group cursor-pointer overflow-hidden rounded-2xl mb-4 border border-white/5 shadow-md"
                >
                  <img
                    src={popupImageUrl}
                    alt=""
                    className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {popupButtonLink && popupButtonLink !== '#' && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-red-650 text-white font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
                        Click to Visit Link 🔗
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <h3 className="text-xl font-display font-black text-white px-2 mt-2 leading-tight">
                {popupTitle}
              </h3>

              {/* Message body */}
              <p className="text-xs text-gray-300 mt-3 mb-6 px-4 leading-relaxed whitespace-pre-line text-center">
                {popupMessage}
              </p>

              {/* Auto close progress indicator if delay exists */}
              {autoCloseDelay && autoCloseDelay > 0 && (
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-red-650"
                    style={{
                      animation: `shrinkWidth ${autoCloseDelay}s linear forwards`
                    }}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="w-full flex flex-col gap-2.5">
                <button
                  onClick={handlePopupAction}
                  className="w-full bg-gradient-to-r from-red-650 to-red-555 hover:from-red-600 hover:to-red-500 text-white font-mono font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg"
                >
                  <span>{popupButtonText || '👉 EXPLORE NOW'}</span>
                </button>
                
                <button
                  onClick={advancePopup}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-all py-1 cursor-pointer font-mono uppercase tracking-widest"
                >
                  Close Announcement
                </button>
              </div>
            </div>

            {/* Custom keyframe styles for countdown line */}
            <style>{`
              @keyframes shrinkWidth {
                from { width: 100%; }
                to { width: 0%; }
              }
            `}</style>
          </div>
        );
      })()}

      {/* Dynamic Inline Confirmation Dialog Modal (Bypasses Sandbox iframe Alert/Confirm blocks) */}
      {customModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0e0e11] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-red-500/5 space-y-4">
            <div className="flex items-center space-x-2.5 pb-2 border-b border-white/5">
              <span className="text-sm font-sans font-black text-white uppercase tracking-wider">
                {customModal.title}
              </span>
            </div>
            
            <p className="text-xs text-gray-300 leading-relaxed font-sans whitespace-pre-line">
              {customModal.message}
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setCustomModal(prev => ({ ...prev, isOpen: false }))}
                className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  customModal.onConfirm();
                }}
                className="bg-red-650 hover:bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-lg shadow-red-650/10"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREENSHOT FULLSCREEN LIGHTBOX MODAL */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button 
            type="button"
            onClick={() => setActiveLightboxImage(null)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-all z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <img 
            src={activeLightboxImage} 
            alt="Screenshot Preview" 
            className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* TRAILER EMBED LIGHTBOX MODAL */}
      {activeTrailerLightboxUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveTrailerLightboxUrl(null)}
        >
          <button 
            type="button"
            onClick={() => setActiveTrailerLightboxUrl(null)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-all z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div 
            className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-black transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {getYouTubeEmbedUrl(activeTrailerLightboxUrl) ? (
              <iframe
                src={getYouTubeEmbedUrl(activeTrailerLightboxUrl)!}
                title="Trailer video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <video 
                src={activeTrailerLightboxUrl} 
                controls 
                autoPlay
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>
      )}

    </div>
  );
}
