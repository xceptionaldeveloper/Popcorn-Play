import React, { useState, useEffect } from 'react';
import { 
  Film, Tv, MessageSquare, DollarSign, Settings, Sparkles, 
  Plus, Trash2, Edit2, Check, X, ShieldAlert, Calendar, 
  TrendingUp, Users, Play, Download, ArrowUpRight, Search, Eye, AlertCircle, Ban, Globe,
  Lock, Fingerprint, Shield, Megaphone, Image, Bell,
  Send, MessageCircle, Phone, Link as LinkIcon
} from 'lucide-react';
import { 
  ContentItem, Episode, DownloadLink, AppSettings, PaymentRequest, 
  SupportSession, VisitorStat, ContentCategory, PremiumPlan, BannerItem, NotificationItem, PopupItem, UserProfile,
  SLIDER_ANIMATIONS
} from '../types';
import { 
  subscribeContent, saveContentItem, deleteContentItem, 
  subscribeAppSettings, updateAppSettings, subscribePayments, 
  updatePaymentRequestStatus, subscribeAllChatsForAdmin, sendMessage, 
  clearChatSession, deleteChatSession, hideChatFromAdmin, restoreChatFromAdmin, getVisitorStats, saveVisitorStats, sendNotification,
  deletePaymentRequestByAdmin, modifyPaymentRequestByAdmin, signInWithGoogle, logOut,
  deleteNotificationItem, updateNotificationItem, subscribeNotifications,
  IS_FIREBASE_REAL,
  subscribeAllUserProfiles, adminUpdateUserProfile, deleteUserProfile,
  customSignIn, customSignUp, subscribeAuth
} from '../lib/firebaseStore';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'movies' | 'series' | 'support' | 'financials' | 'settings' | 'categories' | 'popups' | 'banners' | 'notifications' | 'socials' | 'users'>('dashboard');
  const [supportSubTab, setSupportSubTab] = useState<'chat' | 'management'>('chat');
  const [supportSearchQuery, setSupportSearchQuery] = useState('');
  const [supportFilterType, setSupportFilterType] = useState<'all' | 'active' | 'hidden'>('active');
  
  // Admin Login and Custom settings states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('pp_admin_logged') === 'true';
  });
  const [currentAuthUser, setCurrentAuthUser] = useState<any>(null);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dynamic Payment Method Manager states
  const [editingPayMethodId, setEditingPayMethodId] = useState<string | null>(null);
  const [payMethodForm, setPayMethodForm] = useState({ name: '', number: '', instructions: '' });
  
  // Real-time synced states
  const [content, setContent] = useState<ContentItem[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [chatSessions, setChatSessions] = useState<SupportSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // Analytics
  const [visitorStats, setVisitorStats] = useState<VisitorStat[]>([]);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');

  // Input States - Movies
  const [movieForm, setMovieForm] = useState<Partial<ContentItem>>({
    id: '', title: '', coverUrl: '', videoUrl: '', downloadUrl: '',
    tags: [], category: 'Movies', isPremium: false, isAdult: false,
    schedule: 'Released', description: '', rating: 8.5
  });
  const [tagInput, setTagInput] = useState('');
  
  // Input States - Series (Anime, Cartoon, Drama, Serial)
  const [seriesForm, setSeriesForm] = useState<Partial<ContentItem>>({
    id: '', title: '', coverUrl: '', tags: [], category: 'Anime',
    isPremium: false, isAdult: false, schedule: 'Monday', description: '',
    rating: 8.5, status: 'ongoing', episodes: [], zipUrl: ''
  });
  const [seriesCategory, setSeriesCategory] = useState<'Anime' | 'Cartoon' | 'Drama' | 'Serial'>('Anime');
  const [episodeForm, setEpisodeForm] = useState<Partial<Episode>>({
    number: 1, title: '', videoUrl: '', isFiller: false
  });
  const [seriesFilter, setSeriesFilter] = useState('');
  const [movieFilter, setMovieFilter] = useState('');

  // Dynamic categories input state
  const [newCatInputs, setNewCatInputs] = useState<{
    Movies: string;
    Anime: string;
    Drama: string;
    Cartoon: string;
    Serial: string;
  }>({
    Movies: '',
    Anime: '',
    Drama: '',
    Cartoon: '',
    Serial: '',
  });

  // Movie specific download qualities array
  const [movieQualities, setMovieQualities] = useState<DownloadLink[]>([]);
  const [newMovieQualText, setNewMovieQualText] = useState('720p');
  const [newMovieQualUrl, setNewMovieQualUrl] = useState('');

  // Episode specific download qualities array
  const [episodeQualities, setEpisodeQualities] = useState<DownloadLink[]>([]);
  const [newEpQualityText, setNewEpQualityText] = useState('720p');
  const [newEpQualityUrl, setNewEpQualityUrl] = useState('');
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);

  // Bulk Notification Message State
  const [pushMsg, setPushMsg] = useState('');
  const [alertBanner, setAlertBanner] = useState<string | null>(null);

  // Admin Recovery Form states
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showLedgerEditModal, setShowLedgerEditModal] = useState(false);
  const [ledgerStep, setLedgerStep] = useState<1 | 2>(1);
  const [recName, setRecName] = useState('');
  const [recMother, setRecMother] = useState('');
  const [recFather, setRecFather] = useState('');
  const [recBlood, setRecBlood] = useState('');
  const [recDob, setRecDob] = useState('');
  const [recNid, setRecNid] = useState('');
  const [recoveredCreds, setRecoveredCreds] = useState<{email: string; pass: string} | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Admin Recovery Change Form states
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [recoveryChangeError, setRecoveryChangeError] = useState<string | null>(null);
  const [recoveryChangeSuccess, setRecoveryChangeSuccess] = useState<string | null>(null);

  // Temporary edit states to prevent modifying settings until authorized
  const [tempRecName, setTempRecName] = useState('');
  const [tempRecMother, setTempRecMother] = useState('');
  const [tempRecFather, setTempRecFather] = useState('');
  const [tempRecBlood, setTempRecBlood] = useState('');
  const [tempRecDob, setTempRecDob] = useState('');
  const [tempRecNid, setTempRecNid] = useState('');

  // Premium plans dynamic states
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('200');
  const [newPlanDays, setNewPlanDays] = useState('30');

  // Custom premium interactive dialog state to replace blocked window.confirm/prompt in iframe
  const [customModal, setCustomModal] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'prompt';
    title: string;
    message: string;
    placeholder?: string;
    defaultValue?: string;
    inputValue?: string;
    onConfirm: (value?: string) => void | Promise<void>;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setCustomModal({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: async () => {
        setCustomModal(prev => ({ ...prev, isOpen: false }));
        await onConfirm();
      }
    });
  };

  const showPrompt = (title: string, message: string, placeholder: string, defaultValue: string, onConfirm: (val: string) => void | Promise<void>) => {
    setCustomModal({
      isOpen: true,
      type: 'prompt',
      title,
      message,
      placeholder,
      defaultValue,
      inputValue: defaultValue,
      onConfirm: async (val) => {
        setCustomModal(prev => ({ ...prev, isOpen: false }));
        await onConfirm(val || '');
      }
    });
  };

  // Payment edit states
  const [editingPayment, setEditingPayment] = useState<PaymentRequest | null>(null);
  const [editPayName, setEditPayName] = useState('');
  const [editPayEmail, setEditPayEmail] = useState('');
  const [editPayAmount, setEditPayAmount] = useState('200');
  const [editPayTxId, setEditPayTxId] = useState('');
  const [editPayNumber, setEditPayNumber] = useState('');
  const [editPayStatus, setEditPayStatus] = useState<'pending' | 'approved' | 'rejected'>('approved');
  const [editPayDurationDays, setEditPayDurationDays] = useState('30');
  const [editPayTimestamp, setEditPayTimestamp] = useState('');

  // Banners & notifications management states
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerDesc, setNewBannerDesc] = useState('');
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [newBannerCategory, setNewBannerCategory] = useState<ContentCategory>('Movies');
  const [newBannerContentId, setNewBannerContentId] = useState('');
  const [newBannerLink, setNewBannerLink] = useState('');
  const [newBannerIsActive, setNewBannerIsActive] = useState(true);
  const [newBannerExpirationDays, setNewBannerExpirationDays] = useState('');
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  // Custom pop-ups management states
  const [newPopupTitle, setNewPopupTitle] = useState('');
  const [newPopupMessage, setNewPopupMessage] = useState('');
  const [newPopupImageUrl, setNewPopupImageUrl] = useState('');
  const [newPopupButtonText, setNewPopupButtonText] = useState('👉 EXPLORE NOW');
  const [newPopupButtonLink, setNewPopupButtonLink] = useState('#premium');
  const [newPopupRedirectLink, setNewPopupRedirectLink] = useState('');
  const [newPopupAutoCloseDelay, setNewPopupAutoCloseDelay] = useState<number | ''>('');
  const [newPopupIsActive, setNewPopupIsActive] = useState(true);
  const [editingPopupId, setEditingPopupId] = useState<string | null>(null);

  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [editingNotifId, setEditingNotifId] = useState<string | null>(null);
  const [editingNotifText, setEditingNotifText] = useState('');

  // Social links management states
  const [newSocialPlatform, setNewSocialPlatform] = useState('');
  const [newSocialLinkName, setNewSocialLinkName] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [newSocialIcon, setNewSocialIcon] = useState('Globe');
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);

  // User management states
  const [allUsersList, setAllUsersList] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [editingUserUid, setEditingUserUid] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserIsPremium, setEditUserIsPremium] = useState(false);
  const [editUserPremiumDays, setEditUserPremiumDays] = useState(30);

  // Modern VIP subscription moderation states
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [ledgerSearch, setLedgerSearch] = useState('');

  useEffect(() => {
    const unsubAuth = subscribeAuth((user) => {
      setCurrentAuthUser(user);
    });
    return () => {
      unsubAuth();
    };
  }, []);

  // Monitor auth user to ensure if a regular non-admin user logs in on the viewer side,
  // we do not falsely treat them as admin on the operator panel (which raises firebase permission denied errors).
  useEffect(() => {
    if (IS_FIREBASE_REAL && currentAuthUser) {
      const correctEmail = settings?.adminEmail?.trim() || 'admin@popcornplay.com';
      const isUserAdmin = currentAuthUser.email === 'mdikhlas098@gmail.com' || 
                          currentAuthUser.email?.toLowerCase().trim() === correctEmail.toLowerCase().trim();
      
      if (!isUserAdmin) {
        // If the logged-in user is not a real admin, turn off admin access in the client
        setIsAdminLoggedIn(false);
        sessionStorage.setItem('pp_admin_logged', 'false');
      }
    }
  }, [currentAuthUser, settings?.adminEmail]);

  useEffect(() => {
    // Subscriptions
    const unsubContent = subscribeContent((items) => setContent(items));
    const unsubSettings = subscribeAppSettings((conf) => setSettings(conf));
    
    // Only subscribe to administrative database listeners if Admin is logged in AND verified as real admin in firebase to avoid unauthenticated permission checks
    let unsubPayments = () => {};
    let unsubChats = () => {};
    let unsubUsers = () => {};
    
    const isAuthenticAdmin = !IS_FIREBASE_REAL || (currentAuthUser && (
      currentAuthUser.email === 'mdikhlas098@gmail.com' || 
      currentAuthUser.email?.toLowerCase().trim() === (settings?.adminEmail || 'admin@popcornplay.com').toLowerCase().trim()
    ));

    if (isAdminLoggedIn && isAuthenticAdmin) {
      unsubPayments = subscribePayments((pays) => setPayments(pays));
      unsubChats = subscribeAllChatsForAdmin((chats) => setChatSessions(chats));
      unsubUsers = subscribeAllUserProfiles((profiles) => setAllUsersList(profiles));
    }

    const unsubNotifications = subscribeNotifications((notifs) => setNotificationsList(notifs));
    setVisitorStats(getVisitorStats());

    return () => {
      unsubContent();
      unsubSettings();
      unsubPayments();
      unsubChats();
      unsubNotifications();
      unsubUsers();
    };
  }, [isAdminLoggedIn, currentAuthUser, settings?.adminEmail]);

  const triggerAlert = (msg: string) => {
    setAlertBanner(msg);
    setTimeout(() => setAlertBanner(null), 4000);
  };

  // Movie actions
  const addMovieQualityLink = () => {
    if (!newMovieQualUrl.trim()) return;
    const newLink: DownloadLink = {
      quality: newMovieQualText.trim(),
      url: newMovieQualUrl.trim()
    };
    setMovieQualities([...movieQualities, newLink]);
    setNewMovieQualUrl('');
  };

  const removeMovieQualityLink = (idx: number) => {
    const list = [...movieQualities];
    list.splice(idx, 1);
    setMovieQualities(list);
  };

  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieForm.title) return;
    
    const item: ContentItem = {
      id: movieForm.id || 'mov-' + Date.now().toString(36),
      title: movieForm.title,
      coverUrl: movieForm.coverUrl || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
      videoUrl: movieForm.videoUrl || '',
      downloadUrl: movieForm.downloadUrl || '',
      downloadLinks: movieQualities,
      tags: movieForm.tags || [],
      category: 'Movies',
      isPremium: movieForm.isPremium || false,
      isAdult: movieForm.isAdult || false,
      schedule: movieForm.schedule || 'Released',
      description: movieForm.description || 'No description provided.',
      rating: Number(movieForm.rating) || 8.0
    };

    await saveContentItem(item);
    triggerAlert(`Successfully saved movie: "${item.title}"`);
    setMovieForm({
      id: '', title: '', coverUrl: '', videoUrl: '', downloadUrl: '',
      tags: [], category: 'Movies', isPremium: false, isAdult: false,
      schedule: 'Released', description: '', rating: 8.5
    });
    setMovieQualities([]);
  };

  const handleEditMovie = (item: ContentItem) => {
    setMovieForm(item);
    setMovieQualities(item.downloadLinks || []);
  };

  const handleDeleteItem = async (id: string, name: string) => {
    showConfirm(
      "Confirm Removal",
      `Are you sure you want to remove "${name}"? This action cannot be undone.`,
      async () => {
        await deleteContentItem(id);
        triggerAlert(`Removed item: ${name}`);
      }
    );
  };

  const addMovieTag = () => {
    if (tagInput.trim()) {
      const currentTags = movieForm.tags || [];
      if (!currentTags.includes(tagInput.trim())) {
        setMovieForm({ ...movieForm, tags: [...currentTags, tagInput.trim()] });
      }
      setTagInput('');
    }
  };

  const removeMovieTag = (tag: string) => {
    setMovieForm({
      ...movieForm,
      tags: (movieForm.tags || []).filter(t => t !== tag)
    });
  };

  // Series actions
  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesForm.title) return;

    const item: ContentItem = {
      id: seriesForm.id || 'ser-' + Date.now().toString(36),
      title: seriesForm.title,
      coverUrl: seriesForm.coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
      videoUrl: '', // Series uses episode URLs
      tags: seriesForm.tags || [],
      category: seriesCategory,
      isPremium: seriesForm.isPremium || false,
      isAdult: seriesForm.isAdult || false,
      schedule: seriesForm.schedule || 'Monday',
      description: seriesForm.description || 'No description.',
      rating: Number(seriesForm.rating) || 8.0,
      status: seriesForm.status || 'ongoing',
      zipUrl: seriesForm.zipUrl || '',
      episodes: seriesForm.episodes || []
    };

    await saveContentItem(item);
    triggerAlert(`Saved ${seriesCategory} series: "${item.title}"`);
    setSeriesForm({
      id: '', title: '', coverUrl: '', tags: [], category: seriesCategory,
      isPremium: false, isAdult: false, schedule: 'Monday', description: '',
      rating: 8.5, status: 'ongoing', episodes: [], zipUrl: ''
    });
  };

  const addEpisodeQualityLink = () => {
    if (!newEpQualityUrl.trim()) return;
    const newLink: DownloadLink = {
      quality: newEpQualityText.trim(),
      url: newEpQualityUrl.trim()
    };
    setEpisodeQualities([...episodeQualities, newLink]);
    setNewEpQualityUrl('');
  };

  const removeEpisodeQualityLink = (idx: number) => {
    const list = [...episodeQualities];
    list.splice(idx, 1);
    setEpisodeQualities(list);
  };

  const addEpisodeToForm = () => {
    if (!episodeForm.title) return;
    let episodes = [...(seriesForm.episodes || [])];
    
    const epData: Episode = {
      id: editingEpisodeId || 'ep-' + Date.now() + Math.random().toString(36).substr(2, 5),
      number: episodeForm.number || (episodes.length + 1),
      title: episodeForm.title,
      videoUrl: episodeForm.videoUrl || '',
      isFiller: episodeForm.isFiller || false,
      downloadLinks: episodeQualities
    };

    if (editingEpisodeId) {
      episodes = episodes.map(e => e.id === editingEpisodeId ? epData : e);
      setEditingEpisodeId(null);
      triggerAlert(`Episode ${epData.number} updated in series form!`);
    } else {
      episodes.push(epData);
      triggerAlert(`Episode ${epData.number} added to series form!`);
    }

    // Sort episodes by episode number
    episodes.sort((a,b) => a.number - b.number);
    setSeriesForm({ ...seriesForm, episodes });
    setEpisodeForm({
      number: episodes.length + 1,
      title: '',
      videoUrl: '',
      isFiller: false
    });
    setEpisodeQualities([]);
    setNewEpQualityUrl('');
  };

  const handleEditEpisodeInForm = (ep: Episode) => {
    setEditingEpisodeId(ep.id);
    setEpisodeForm({
      number: ep.number,
      title: ep.title,
      videoUrl: ep.videoUrl,
      isFiller: ep.isFiller
    });
    setEpisodeQualities(ep.downloadLinks || []);
  };

  const removeEpisodeFromForm = (idx: number) => {
    const list = [...(seriesForm.episodes || [])];
    list.splice(idx, 1);
    setSeriesForm({ ...seriesForm, episodes: list });
    if (editingEpisodeId) {
      setEditingEpisodeId(null);
      setEpisodeQualities([]);
    }
  };

  const addSeriesTag = (tagText: string) => {
    if (tagText.trim()) {
      const current = seriesForm.tags || [];
      if (!current.includes(tagText.trim())) {
        setSeriesForm({ ...seriesForm, tags: [...current, tagText.trim()] });
      }
    }
  };

  const removeSeriesTag = (tag: string) => {
    const current = seriesForm.tags || [];
    setSeriesForm({ ...seriesForm, tags: current.filter(t => t !== tag) });
  };

  // Support Chat replies
  const handleSendReply = async () => {
    if (!activeChatId || !replyText.trim() || !settings) return;
    const activeSession = chatSessions.find(s => s.userId === activeChatId);
    if (!activeSession) return;

    await sendMessage(activeChatId, activeSession.userName, activeSession.userEmail, replyText.trim(), 'admin');
    setReplyText('');
  };

  // Category Configuration controllers
  const handleAddCategory = async (type: 'Movies' | 'Anime' | 'Drama' | 'Cartoon' | 'Serial') => {
    const rawVal = newCatInputs[type].trim();
    if (!rawVal || !settings) return;
    
    // Ensure we don't have duplicated entries
    const currentCats = settings.customCategories?.[type] || [];
    if (currentCats.some(c => c.toLowerCase() === rawVal.toLowerCase())) {
      triggerAlert(`Category "${rawVal}" already exists in ${type}!`);
      return;
    }
    
    const updatedCats = {
      ...settings.customCategories,
      [type]: [...currentCats, rawVal]
    };
    
    const nextSettings = {
      ...settings,
      customCategories: updatedCats
    };
    
    try {
      setSettings(nextSettings);
      await updateAppSettings(nextSettings);
      setNewCatInputs({ ...newCatInputs, [type]: '' });
      triggerAlert(`Added category "${rawVal}" to ${type}`);
    } catch (err: any) {
      console.error(err);
      triggerAlert("Category update failed! Ensure you are logged in and authorized.");
    }
  };

  const handleDeleteCategory = (type: 'Movies' | 'Anime' | 'Drama' | 'Cartoon' | 'Serial', catToDelete: string) => {
    if (!settings) return;
    showConfirm(
      "Confirm Deletion",
      `Are you sure you want to delete category "${catToDelete}" from ${type}? It will be removed from future selection guides.`,
      async () => {
        const currentCats = settings.customCategories?.[type] || [];
        const updatedCats = {
          ...settings.customCategories,
          [type]: currentCats.filter(c => c !== catToDelete)
        };
        
        const nextSettings = {
          ...settings,
          customCategories: updatedCats
        };
        
        try {
          setSettings(nextSettings);
          await updateAppSettings(nextSettings);
          triggerAlert(`Deleted category "${catToDelete}" from ${type}`);
        } catch (err: any) {
          console.error(err);
          triggerAlert("Category deletion failed! Ensure you are logged in and authorized.");
        }
      }
    );
  };

  const handleEditCategory = (type: 'Movies' | 'Anime' | 'Drama' | 'Cartoon' | 'Serial', oldCat: string) => {
    if (!settings) return;
    showPrompt(
      "Rename Category",
      `Rename category "${oldCat}" in ${type} to:`,
      "Enter new category name",
      oldCat,
      async (newName) => {
        const trimmed = newName.trim();
        if (!trimmed) {
          triggerAlert("Category name cannot be empty.");
          return;
        }
        if (trimmed.toLowerCase() === oldCat.toLowerCase()) return;

        const currentCats = settings.customCategories?.[type] || [];
        if (currentCats.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
          triggerAlert(`Category "${trimmed}" already exists in ${type}!`);
          return;
        }

        const updatedCats = {
          ...settings.customCategories,
          [type]: currentCats.map(c => c === oldCat ? trimmed : c)
        };

        const nextSettings = {
          ...settings,
          customCategories: updatedCats
        };

        try {
          setSettings(nextSettings);
          await updateAppSettings(nextSettings);
          triggerAlert(`Renamed category "${oldCat}" to "${trimmed}" successfully.`);
        } catch (err: any) {
          console.error(err);
          triggerAlert("Category rename failed! Ensure you are logged in and authorized.");
        }
      }
    );
  };

  const handleResetCategories = (type: 'Movies' | 'Anime' | 'Drama' | 'Cartoon' | 'Serial') => {
    if (!settings) return;
    showConfirm(
      "Reset Categories",
      `Reset all ${type} categories to default preset list?`,
      async () => {
        const defaults: Record<'Movies' | 'Anime' | 'Drama' | 'Cartoon' | 'Serial', string[]> = {
          Movies: ['Action', 'Romance', '18+ content', 'Thriller', 'Comedy', 'Sci-Fi', 'Horror', 'Bollywood', 'Dhallywood'],
          Anime: ['Action', 'Romance', '18+ content', 'Fantasy', 'Shounen', 'Slice of Life', 'Isekai', 'Adventure', 'Mystery'],
          Drama: ['Action', 'Romance', '18+ content', 'Comedy', 'Family', 'Thriller', 'Crime', 'Romantic Comedy'],
          Cartoon: ['Action', 'Romance', '18+ content', 'Adventure', 'Comedy', 'Family', 'Kids', 'Fantasy'],
          Serial: ['Action', 'Romance', '18+ content', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Mystery']
        };
        
        const updatedCats = {
          ...settings.customCategories,
          [type]: defaults[type]
        };
        
        const nextSettings = {
          ...settings,
          customCategories: updatedCats
        };
        
        try {
          setSettings(nextSettings);
          await updateAppSettings(nextSettings);
          triggerAlert(`Reset ${type} categories to system defaults.`);
        } catch (err: any) {
          console.error(err);
          triggerAlert("Resetting categories failed! Ensure you are logged in and authorized.");
        }
      }
    );
  };

  // Finance updates
  const handlePaymentApprove = async (payId: string) => {
    await updatePaymentRequestStatus(payId, 'approved');
    triggerAlert("Premium payment approved! User receives Premium access immediately.");
  };

  const handlePaymentReject = async (payId: string) => {
    await updatePaymentRequestStatus(payId, 'rejected');
    triggerAlert("Payment subscription rejected and logged.");
  };

  // Payment edit/delete support
  const startEditingPayment = (pay: PaymentRequest) => {
    setEditingPayment(pay);
    setEditPayName(pay.userName || '');
    setEditPayEmail(pay.userEmail || '');
    setEditPayAmount(String(pay.amount || '0'));
    setEditPayTxId(pay.transactionId || '');
    setEditPayNumber(pay.senderNumber || '');
    setEditPayStatus(pay.status || 'approved');
    setEditPayDurationDays(String(pay.durationDays || '30'));
    setEditPayTimestamp(pay.timestamp || '');
  };

  const handleUpdatePaymentFromModal = async () => {
    if (!editingPayment) return;
    await modifyPaymentRequestByAdmin(editingPayment.id, {
      userName: editPayName.trim(),
      userEmail: editPayEmail.trim(),
      amount: Number(editPayAmount) || 0,
      transactionId: editPayTxId.trim(),
      senderNumber: editPayNumber.trim(),
      status: editPayStatus,
      durationDays: Number(editPayDurationDays) || 30,
      timestamp: editPayTimestamp.trim()
    });
    setEditingPayment(null);
    triggerAlert("User payment record and level updated successfully.");
  };

  const handleDeletePaymentClick = (pay: PaymentRequest) => {
    showConfirm(
      "Confirm Deletion",
      `⚠️ WARNING: Permanent deletion of "${pay.userName}"'s voucher record?\n\nDeleting this will erase the billing statistics and revert the subscriber's Premium privileges.`,
      async () => {
        // Revoke premium access if approved
        if (pay.status === 'approved') {
          await modifyPaymentRequestByAdmin(pay.id, { status: 'rejected' });
        }
        await deletePaymentRequestByAdmin(pay.id);
        triggerAlert("Subscriber record successfully destroyed.");
      }
    );
  };

  // Dynamic VIP Subscription Plans Controllers
  const handleAddPremiumPlan = async () => {
    if (!settings) return;
    
    // Auto-generate a descriptive package name if the administrator leaves it blank
    const finalName = newPlanName.trim() || `${newPlanDays || 30} Days VIP Upgrade`;

    if (!newPlanPrice || !newPlanDays) {
      triggerAlert("Complete plan price and duration fields fully.");
      return;
    }

    const currentPlans = settings.premiumPlans || [
      { id: 'plan-1', name: '30 Days VIP Premium', price: 150, durationDays: 30 },
      { id: 'plan-2', name: '6 Months VIP Premium', price: 700, durationDays: 180 },
      { id: 'plan-3', name: '1 Year VIP Premium', price: 1200, durationDays: 365 }
    ];

    const isDuplicate = currentPlans.some(p => p.name.toLowerCase() === finalName.trim().toLowerCase());
    if (isDuplicate) {
      triggerAlert(`Plan "${finalName}" already exists!`);
      return;
    }

    const newPlan: PremiumPlan = {
      id: 'plan-' + Date.now(),
      name: finalName.trim(),
      price: Number(newPlanPrice) || 0,
      durationDays: Number(newPlanDays) || 30
    };

    const updatedSettings = {
      ...settings,
      premiumPlans: [...currentPlans, newPlan]
    };

    setSettings(updatedSettings);
    await updateAppSettings(updatedSettings);
    setNewPlanName('');
    setNewPlanPrice('200');
    setNewPlanDays('30');
    triggerAlert(`Registered subscription package "${newPlan.name}" successfully.`);
  };

  const handleDeletePremiumPlan = (planId: string) => {
    if (!settings) return;
    showConfirm(
      "Delete Subscription Plan",
      "Are you sure you want to delete this subscription plan option? It will be removed from future client checkouts immediately.",
      async () => {
        const currentPlans = settings.premiumPlans || [
          { id: 'plan-1', name: '30 Days VIP Premium', price: 150, durationDays: 30 },
          { id: 'plan-2', name: '6 Months VIP Premium', price: 700, durationDays: 180 },
          { id: 'plan-3', name: '1 Year VIP Premium', price: 1200, durationDays: 365 }
        ];

        const updatedSettings = {
          ...settings,
          premiumPlans: currentPlans.filter(p => p.id !== planId)
        };

        setSettings(updatedSettings);
        await updateAppSettings(updatedSettings);
        triggerAlert("Deleted subscription plan pack.");
      }
    );
  };

  // App Settings Updates
  const handleUpdateFinanceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    await updateAppSettings(settings);
    triggerAlert("Financial Payment accounts updated successfully.");
  };

  // Admin Custom Authentication Logic
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const correctEmail = settings?.adminEmail?.trim() || 'admin@popcornplay.com';
    const correctPassword = settings?.adminPassword || 'Ikhlas124@#';

    if (adminEmailInput.trim().toLowerCase() === correctEmail.toLowerCase() && adminPasswordInput === correctPassword) {
      if (IS_FIREBASE_REAL) {
        try {
          triggerAlert("Verification in progress with Firebase...");
          let profile;
          try {
            profile = await customSignIn(correctEmail.toLowerCase(), correctPassword);
          } catch (signInErr) {
            // First time login - dynamically bootstrap and register this custom admin on Firebase Auth & Firestore!
            profile = await customSignUp({
              name: 'Popcorn Play Admin',
              email: correctEmail.toLowerCase(),
              password: correctPassword
            });
          }
          
          setIsAdminLoggedIn(true);
          sessionStorage.setItem('pp_admin_logged', 'true');
          setLoginError(null);
          triggerAlert("Welcome Admin! Securely Authenticated with Firebase!");
        } catch (err: any) {
          console.error(err);
          // If popup or other standard operations are blocked/fail, login locally
          setIsAdminLoggedIn(true);
          sessionStorage.setItem('pp_admin_logged', 'true');
          setLoginError(null);
          triggerAlert("Welcome Admin! Logged in successfully. (⚠️ Sync limits might apply if connection is unstable)");
        }
      } else {
        setIsAdminLoggedIn(true);
        sessionStorage.setItem('pp_admin_logged', 'true');
        setLoginError(null);
        triggerAlert("Welcome Admin! Logged in successfully.");
      }
    } else {
      setLoginError("Invalid Email or Password! Please write correct credentials.");
    }
  };

  const handleGoogleAdminLogin = async () => {
    try {
      const profile = await signInWithGoogle();
      const correctEmail = settings?.adminEmail?.trim() || 'admin@popcornplay.com';
      if (profile.email === 'mdikhlas098@gmail.com' || profile.email === correctEmail || profile.isAdmin) {
        setIsAdminLoggedIn(true);
        sessionStorage.setItem('pp_admin_logged', 'true');
        setLoginError(null);
        triggerAlert("Welcome Admin! Logged in via Google Authentication.");
      } else {
        setLoginError("This Google Account is not authorized as Administrator.");
      }
    } catch (err: any) {
      setLoginError(err.message || "Google Admin login failed.");
    }
  };

  const handleRecoverCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStr = (s: string) => s.trim().toLowerCase();

    const expectedName = settings?.recName?.trim() || 'MD. Ikhlas';
    const expectedMother = settings?.recMother?.trim() || 'Salma Begum';
    const expectedFather = settings?.recFather?.trim() || 'Anamul Kabir Sumon';
    const expectedBlood = settings?.recBlood?.trim() || 'B+';
    const expectedDob = settings?.recDob?.trim() || '31-12-2005';
    const expectedNid = settings?.recNid?.trim() || '6466938138';

    const nameMatch = cleanStr(recName) === cleanStr(expectedName);
    const motherMatch = cleanStr(recMother) === cleanStr(expectedMother);
    const fatherMatch = cleanStr(recFather) === cleanStr(expectedFather);
    const bloodMatch = cleanStr(recBlood) === cleanStr(expectedBlood);
    const dobMatch = cleanStr(recDob) === cleanStr(expectedDob);
    const nidMatch = cleanStr(recNid) === cleanStr(expectedNid);

    if (nameMatch && motherMatch && fatherMatch && bloodMatch && dobMatch && nidMatch) {
      setRecoveredCreds({
        email: settings?.adminEmail || 'admin@popcornplay.com',
        pass: settings?.adminPassword || 'Ikhlas124@#'
      });
      setRecoveryError(null);
    } else {
      setRecoveryError("One or more fields did not match our offline security ledger. Please retry.");
      setRecoveredCreds(null);
    }
  };

  const handleResetRecovery = () => {
    setRecName('');
    setRecMother('');
    setRecFather('');
    setRecBlood('');
    setRecDob('');
    setRecNid('');
    setRecoveredCreds(null);
    setRecoveryError(null);
    setShowRecoveryModal(false);
  };

  const handleNextStep = () => {
    if (!tempRecName.trim() || !tempRecMother.trim() || !tempRecFather.trim() || !tempRecBlood.trim() || !tempRecDob.trim() || !tempRecNid.trim()) {
      setRecoveryChangeError("অনুগ্রহ করে সব রিকভারি বিবরণ পূরণ করুন! / Please enter all recovery details before proceeding.");
      return;
    }
    setRecoveryChangeError(null);
    setLedgerStep(2);
  };

  const handleUpdateRecoveryCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) {
      setRecoveryChangeError("Settings have not loaded yet. Please wait.");
      return;
    }

    const currentAdminEmail = settings.adminEmail?.trim() || 'admin@popcornplay.com';
    const currentAdminPassword = settings.adminPassword || 'Ikhlas124@#';

    if (authEmail.trim().toLowerCase() !== currentAdminEmail.toLowerCase() || authPass !== currentAdminPassword) {
      setRecoveryChangeError("Authorization failed! Entered Admin Gmail or Password does not match current access credentials.");
      setRecoveryChangeSuccess(null);
      return;
    }

    try {
      setRecoveryChangeError(null);
      const updatedConf = {
        ...settings,
        recName: tempRecName.trim(),
        recMother: tempRecMother.trim(),
        recFather: tempRecFather.trim(),
        recBlood: tempRecBlood.trim(),
        recDob: tempRecDob.trim(),
        recNid: tempRecNid.trim()
      };
      await updateAppSettings(updatedConf);
      setSettings(updatedConf);
      setRecoveryChangeSuccess("Recovery security parameters authorized and synchronized successfully!");
      setAuthEmail('');
      setAuthPass('');
      triggerAlert("Recovery parameters successfully updated.");
      
      // Auto clear success label and close modal after 2 seconds
      setTimeout(() => {
        setRecoveryChangeSuccess(null);
        setShowLedgerEditModal(false);
      }, 2000);
    } catch (err: any) {
      setRecoveryChangeError(err.message || "Failed to save recovery configuration.");
      setRecoveryChangeSuccess(null);
    }
  };

  const handleAdminLogout = async () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('pp_admin_logged');
    setAdminEmailInput('');
    setAdminPasswordInput('');
    try {
      await logOut();
    } catch (e) {
      console.error("Firebase logout from admin error:", e);
    }
    triggerAlert("Logged out of administrative console and Firebase Auth session.");
  };

  // Dynamic Payment Methods handlers
  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !payMethodForm.name.trim() || !payMethodForm.number.trim()) return;

    let updatedMethods = settings.paymentMethods ? [...settings.paymentMethods] : [
      { id: '1', name: 'bKash Personal', number: settings.bkash || '01712-345678', instructions: 'Send Money only' },
      { id: '2', name: 'Nagad Merchant', number: settings.nagad || '01912-876543', instructions: 'Use Make Payment option' },
      { id: '3', name: 'Dutch-Bangla Bank', number: settings.bank || '1022-0987-1234', instructions: 'Branch or App Transfer' }
    ];

    if (editingPayMethodId) {
      updatedMethods = updatedMethods.map(m => m.id === editingPayMethodId ? { ...m, ...payMethodForm } : m);
      triggerAlert(`Payment gateway "${payMethodForm.name}" updated successfully!`);
    } else {
      const newMethod = {
        id: 'paymethod-' + Date.now(),
        name: payMethodForm.name.trim(),
        number: payMethodForm.number.trim(),
        instructions: payMethodForm.instructions.trim()
      };
      updatedMethods.push(newMethod);
      triggerAlert(`New payment gateway "${payMethodForm.name}" added successfully!`);
    }

    const updatedSettings = { ...settings, paymentMethods: updatedMethods };
    setSettings(updatedSettings);
    await updateAppSettings(updatedSettings);

    setEditingPayMethodId(null);
    setPayMethodForm({ name: '', number: '', instructions: '' });
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!settings) return;
    const currentMethods = settings.paymentMethods ? [...settings.paymentMethods] : [
      { id: '1', name: 'bKash Personal', number: settings.bkash || '01712-345678', instructions: 'Send Money only' },
      { id: '2', name: 'Nagad Merchant', number: settings.nagad || '01912-876543', instructions: 'Use Make Payment option' },
      { id: '3', name: 'Dutch-Bangla Bank', number: settings.bank || '1022-0987-1234', instructions: 'Branch or App Transfer' }
    ];

    if (currentMethods.length <= 1) {
      triggerAlert("You must keep at least one payment method active!");
      return;
    }

    const updatedMethods = currentMethods.filter(m => m.id !== id);
    const updatedSettings = { ...settings, paymentMethods: updatedMethods };
    setSettings(updatedSettings);
    await updateAppSettings(updatedSettings);
    triggerAlert("Deleted payment method successfully.");
  };

  // Send push notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushMsg.trim()) return;
    await sendNotification(pushMsg.trim());
    triggerAlert("Platform-wide broadcast alert sent!");
    setPushMsg('');
  };

  // Analytics derivations
  const totalRevenue = payments
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const moviesCount = content.filter(c => c.category === 'Movies').length;
  const animeCount = content.filter(c => c.category === 'Anime').length;
  const dramaCount = content.filter(c => c.category === 'Drama').length;
  const cartoonCount = content.filter(c => c.category === 'Cartoon').length;
  const serialCount = content.filter(c => c.category === 'Serial').length;

  const currentChatSession = chatSessions.find(s => s.userId === activeChatId);

  if (!isAdminLoggedIn) {
    return (
      <div className="flex-1 min-h-screen bg-[#060606] flex items-center justify-center p-4">
        
        {/* Alert Banner inside login */}
        {alertBanner && (
          <div className="fixed top-4 right-4 z-50 glass-premium px-6 py-4 rounded-xl flex items-center space-x-3 text-yellow-400 font-medium tracking-tight shadow-2xl transition-all duration-300">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <span>{alertBanner}</span>
          </div>
        )}

        <div className="w-full max-w-md glass p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
          
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-650 via-amber-550 to-red-600"></div>
          <div className="absolute right-[-20%] top-[-20%] w-48 h-48 bg-red-650/5 rounded-full filter blur-3xl"></div>

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-650 to-amber-550 flex items-center justify-center glow-red mx-auto mb-4">
              <Film className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-display font-black text-white tracking-wider uppercase">POPCORN CMD ACCESS</h2>
            <p className="text-xs text-gray-400 mt-1 font-light leading-relaxed">
              Authenticate using your registered administrator credentials to access content registries and financial ledgers.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-500/10 border border-red-500/25 p-3.5 rounded-xl flex items-start space-x-2.5 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="text-[10px] text-gray-500 font-mono block mb-1 uppercase tracking-wider">ADMIN GMAIL ACCOUNT</label>
              <input
                type="email"
                required
                placeholder="e.g. admin@popcornplay.com"
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                className="w-full bg-[#101012] border border-white/5 focus:border-red-500/20 focus:outline-none rounded-xl px-4 py-3.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 font-mono block mb-1 uppercase tracking-wider">SECURITY ACCESS PASSWORD</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className="w-full bg-[#101012] border border-white/5 focus:border-red-500/20 focus:outline-none rounded-xl px-4 py-3.5 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-650 to-amber-555 hover:from-red-600 hover:to-amber-450 text-white font-mono text-xs font-black py-4 rounded-xl uppercase tracking-wider shadow-lg glow-red mt-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              AUTHENTICATE SHELL CMD
            </button>
          </form>

          <div className="flex items-center my-4">
            <div className="flex-1 h-[1px] bg-white/5"></div>
            <span className="px-3 text-[9px] text-[#555] font-mono tracking-widest uppercase font-bold">OR BYPASS VIA GOOGLE</span>
            <div className="flex-1 h-[1px] bg-white/5"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAdminLogin}
            className="w-full bg-[#101012] hover:bg-[#18181c] text-white border border-white/5 hover:border-white/10 font-mono text-xs font-extrabold py-3.5 rounded-xl uppercase tracking-wider flex items-center justify-center space-x-2.5 cursor-pointer transition-all hover:scale-[1.01]"
          >
            <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.35 11.1H12v2.7h5.3c-.22 1.15-.87 2.13-1.84 2.78l2.84 2.2c1.67-1.53 2.63-3.8 2.63-6.4 0-.53-.05-1.04-.12-1.28z" />
              <path d="M12 21c2.43 0 4.47-.8 5.96-2.22l-2.84-2.2c-.8.54-1.82.86-3.12.86-2.4 0-4.43-1.63-5.15-3.82l-2.93 2.27C5.4 19.33 8.44 21 12 21z" />
              <path d="M6.85 13.62c-.18-.54-.28-1.12-.28-1.72s.1-1.18.28-1.72l-2.93-2.27C3.36 9.17 3 10.54 3 12s.36 2.83.92 4.09l2.93-2.27z" />
              <path d="M12 6.38c1.32 0 2.5.45 3.44 1.35l2.58-2.58C16.46 3.65 14.43 3 12 3 8.44 3 5.4 4.67 3.92 7.91l2.93 2.27c.72-2.19 2.75-3.8 5.15-3.8z" />
            </svg>
            <span>SIGN IN VIA GOOGLE SYSTEM</span>
          </button>

          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => {
                setShowRecoveryModal(true);
                setRecoveryError(null);
                setRecoveredCreds(null);
              }}
              className="text-[11px] text-gray-400 hover:text-red-500 font-mono transition-colors uppercase tracking-widest cursor-pointer font-extrabold flex items-center space-x-1"
            >
              <span>🔐 RECOVER GMAIL & PASSWORD</span>
            </button>
          </div>

          <div className="mt-6 text-center border-t border-white/5 pt-4">
            <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest block font-bold leading-relaxed">
              SECURE OPERATOR INTERFACE // POPCORN MEDIA CO
            </span>
          </div>

           {/* Recovery Modal overlay */}
           {showRecoveryModal && (
             <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md animate-fadeIn flex justify-center items-start overflow-y-auto p-4 py-6 md:py-12">
               <div className="w-full max-w-md bg-[#08080a] border border-white/10 rounded-[28px] p-6 hover:border-white/15 md:p-8 relative shadow-[0_0_60px_rgba(239,68,68,0.16)] space-y-5 my-auto flex flex-col">
                <div className="flex flex-col items-center justify-center pt-2 pb-4 text-center border-b border-white/5 relative">
                  <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-500 mb-3 shadow-[0_0_15px_rgba(239,68,68,0.15)]"><Fingerprint className="w-6 h-6 animate-pulse" /></div><h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-widest leading-none">Operator Security Ledger</h3><span className="text-[9px] text-red-400 font-mono tracking-widest uppercase font-bold mt-1.5 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/15">IDENTITY DECRYPTION PROTOCOL</span>
                  <button
                    type="button"
                    onClick={handleResetRecovery}
                    className="absolute top-2 right-2 text-gray-550 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                    Provide registered offline security ledger inputs to authenticate operator status and decrypt login credentials.
                  </p>
                  <p className="text-[9px] text-red-400 font-mono leading-relaxed">
                    নিবন্ধিত অফলাইন সিকিউরিটি লেজার বিবরণ দিয়ে আপনার অপারেটর আইডি পুনরুদ্ধার করুন।
                  </p>
                </div>

                <form onSubmit={handleRecoverCredentials} className="space-y-3">
                  {recoveryError && (
                    <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-xl text-[11px] text-red-400 font-mono leading-normal">
                      ⚠️ {recoveryError}
                    </div>
                  )}

                  {recoveredCreds ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/25 p-5 rounded-3xl space-y-4 shadow-[0_0_20px_rgba(16,185,129,0.04)] animate-fadeIn">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-emerald-500/10"><div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Lock className="w-4 h-4" /></div><div><div className="text-xs text-emerald-400 font-extrabold font-mono uppercase tracking-widest leading-none">DECRYPTION SUCCESSFUL</div><div className="text-[9px] text-gray-550 font-mono uppercase mt-1">LEADER CLEARANCE AUTHENTICATED</div></div></div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-400 font-mono block uppercase tracking-wider font-semibold">Operator Gmail address:</span>
                        <div className="bg-black/80 border border-white/5 px-3.5 py-3 rounded-2xl text-xs font-mono text-white select-all flex justify-between items-center group cursor-pointer hover:border-emerald-500/20 transition-all font-bold">
                          {recoveredCreds.email}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-400 font-mono block uppercase tracking-wider font-semibold">Master Account password:</span>
                        <div className="bg-black/80 border border-white/5 px-3.5 py-3 rounded-2xl text-xs font-mono text-red-400 select-all font-extrabold flex justify-between items-center group cursor-pointer hover:border-red-500/20 transition-all">
                          {recoveredCreds.pass}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="col-span-2">
                        <label className="text-[9px] text-gray-400 font-mono flex items-center gap-1.5 mb-1.5 uppercase tracking-wider font-semibold">
                          <Users className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>Full Name / পূর্ণ নাম *</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter your registered Full Name"
                          value={recName}
                          onChange={(e) => setRecName(e.target.value)}
                          className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none rounded-xl px-3.5 py-3 text-xs text-white placeholder-gray-600 hover:bg-[#151518] hover:border-white/15 transition-all font-sans font-medium"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[9px] text-gray-400 font-mono flex items-center gap-1.5 mb-1.5 uppercase tracking-wider font-semibold">
                          <Users className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>Mother's Name / মাতার নাম *</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter Mother's Name"
                          value={recMother}
                          onChange={(e) => setRecMother(e.target.value)}
                          className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none rounded-xl px-3.5 py-3 text-xs text-white placeholder-gray-600 hover:bg-[#151518] hover:border-white/15 transition-all font-sans font-medium"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[9px] text-gray-400 font-mono flex items-center gap-1.5 mb-1.5 uppercase tracking-wider font-semibold">
                          <Users className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>Father's Name / পিতার নাম *</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter Father's Name"
                          value={recFather}
                          onChange={(e) => setRecFather(e.target.value)}
                          className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none rounded-xl px-3.5 py-3 text-xs text-white placeholder-gray-600 hover:bg-[#151518] hover:border-white/15 transition-all font-sans font-medium"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-[9px] text-gray-400 font-mono flex items-center gap-1.5 mb-1.5 uppercase tracking-wider font-semibold">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>Blood / রক্ত *</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. B+"
                          value={recBlood}
                          onChange={(e) => setRecBlood(e.target.value)}
                          className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none rounded-xl px-3 py-3 text-xs text-white placeholder-gray-600 hover:bg-[#151518] hover:border-white/15 transition-all font-sans font-bold"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-[9px] text-gray-400 font-mono flex items-center gap-1.5 mb-1.5 uppercase tracking-wider font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>DOB / জন্ম তারিখ *</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="DD-MM-YYYY"
                          value={recDob}
                          onChange={(e) => setRecDob(e.target.value)}
                          className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none rounded-xl px-3 py-3 text-xs text-white placeholder-gray-600 hover:bg-[#151518] hover:border-white/15 transition-all font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[9px] text-gray-400 font-mono flex items-center gap-1.5 mb-1.5 uppercase tracking-wider font-semibold">
                          <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>NID NO / ভোটার আইডি *</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter NID Number"
                          value={recNid}
                          onChange={(e) => setRecNid(e.target.value)}
                          className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none rounded-xl px-3.5 py-3 text-xs text-white placeholder-gray-600 hover:bg-[#151518] hover:border-white/15 transition-all font-mono"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2.5 pt-3 animate-slideUp">
                    {recoveredCreds ? (
                      <button
                        type="button"
                        onClick={handleResetRecovery}
                        className="flex-1 bg-gradient-to-r from-red-650 to-amber-555 hover:from-red-600 hover:to-amber-500 text-white font-mono text-xs font-bold py-4 rounded-2xl uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-red-950/20 active:scale-[0.98] transition-all"
                      >
                        Great, Thank You
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleResetRecovery}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-mono text-xs font-bold py-4 rounded-2xl uppercase tracking-wider cursor-pointer transition-all active:scale-[0.98]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-red-650 to-amber-555 hover:from-red-600 hover:to-amber-500 text-white font-mono text-xs font-bold py-4 rounded-2xl uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-red-950/20 active:scale-[0.98] transition-all"
                        >
                          Verify Details
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#060606] text-gray-200 font-sans">
      
      {/* Alert Banner */}
      {alertBanner && (
        <div className="fixed top-4 right-4 z-50 glass-premium px-6 py-4 rounded-xl flex items-center space-x-3 text-yellow-400 font-medium tracking-tight shadow-2xl transition-all duration-300">
          <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
          <span>{alertBanner}</span>
        </div>
      )}

      {/* Admin Sidebar */}
      <div className="w-64 bg-[#0a0a0b] border-r border-white/5 flex flex-col justify-between py-6">
        <div>
          {/* Logo */}
          <div className="px-6 mb-8 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center glow-red">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-lg text-white tracking-wider">POPCORN</h1>
              <span className="text-[10px] text-yellow-500 font-mono uppercase tracking-widest font-semibold">Admin Panel</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5 px-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>CMS Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('movies')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'movies' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Movies Catalog</span>
            </button>

            <button
              onClick={() => setActiveTab('series')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'series' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Anime & Series CMS</span>
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'support' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4" />
                <span>Live Chat Support</span>
              </div>
              {chatSessions.some(c => !c.deletedByAdmin && (c.unreadCount || 0) > 0) && (
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-md"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('financials')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'financials' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Subscriptions & Pay</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>App Core Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'categories' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Manage Categories</span>
            </button>

            <button
              onClick={() => setActiveTab('popups')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'popups' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Broadcast Pop-Ups</span>
            </button>

            <button
              onClick={() => setActiveTab('banners')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'banners' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Image className="w-4 h-4" />
              <span>Homepage Banners</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'notifications' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notification Center</span>
            </button>

            <button
              onClick={() => setActiveTab('socials')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'socials' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Social Links</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'users' ? 'bg-red-600/10 text-red-500 border-l-2 border-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 border-t border-white/5 space-y-3.5">
          <div>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider font-extrabold mb-1">Operator Account</p>
            <span className="text-xs font-bold text-red-500 truncate block">{settings?.adminEmail || 'admin@popcornplay.com'}</span>
          </div>
          <button
            onClick={handleAdminLogout}
            className="w-full bg-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all text-xs font-mono font-bold py-2.5 rounded-xl text-gray-400 cursor-pointer"
          >
            LOG OUT SESSION
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        {/* Header bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-display font-extrabold text-white tracking-tight">
              {activeTab === 'dashboard' && 'Operations Dashboard'}
              {activeTab === 'movies' && 'Movies CMS Manager'}
              {activeTab === 'series' && 'Episodic Series Registry'}
              {activeTab === 'support' && 'Direct Support Hotline'}
              {activeTab === 'financials' && 'Revenue & Premium Subscriptions'}
              {activeTab === 'settings' && 'App System Configuration'}
              {activeTab === 'categories' && 'Dynamic Categories Control'}
              {activeTab === 'popups' && 'Broadcast Announcement Pop-Ups'}
              {activeTab === 'banners' && 'Carousel Hero Banners Slider'}
              {activeTab === 'notifications' && 'Interactive Push Notification Center'}
              {activeTab === 'socials' && 'Social Links Configuration'}
              {activeTab === 'users' && 'User Accounts & Access Management'}
            </h2>
            <p className="text-sm text-gray-400">
              {activeTab === 'dashboard' && 'Live streaming stats, database metrics, and incoming subscription requests.'}
              {activeTab === 'movies' && 'Directly adjust metadata, links, search terms, and schedule dates for standalone movies.'}
              {activeTab === 'series' && 'Construct step-by-step episodes for dramas, anime seasons, complete with filler tags.'}
              {activeTab === 'support' && 'Engage with viewers in real-time. Toggle help desk widget visibility platform-wide.'}
              {activeTab === 'financials' && 'Review payments submissions, verify transactions on bkash/nagad and configure banking.'}
              {activeTab === 'settings' && 'Modify localized application parameters, master security pins, and support options.'}
              {activeTab === 'categories' && 'Dynamically add, remove, and reset categories/genres for Movies, Anime, Dramas, Cartoons, and Serials.'}
              {activeTab === 'popups' && 'Configure custom interactive overlays and welcome modals to show to active users on app start.'}
              {activeTab === 'banners' && 'Create/edit banners shown in the top slide carousel. Automated releases automatically rotate oldest slides.'}
              {activeTab === 'notifications' && 'Draft alerts and high priority logs pushed directly to notifications logs for users.'}
              {activeTab === 'socials' && 'Configure official platforms, help links, and social channel handles displayed to users.'}
              {activeTab === 'users' && 'Search for registered viewer profiles, configure premium status variables, and edit or delete accounts.'}
            </p>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center space-x-3 bg-[#0f0f12] border border-white/5 px-4 py-2.5 rounded-xl">
            <div className="flex items-center space-x-1.5 text-xs font-mono text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
              <span>Sync Active:</span>
              <span className="text-emerald-400 font-semibold uppercase font-sans">Firebase Live</span>
            </div>
          </div>
        </div>

        {/* TAB CONTENTS */}

        {/* 1. DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-red-600/5 rounded-full filter blur-xl transition-all group-hover:bg-red-600/10"></div>
                <Film className="w-8 h-8 text-red-500 mb-4" />
                <h4 className="text-sm text-gray-400 font-medium">Standalone Movies</h4>
                <p className="text-3xl font-display font-extrabold text-white mt-1">{moviesCount}</p>
                <span className="text-xs text-gray-500 mt-2 block font-mono">Categorized & active</span>
              </div>

              <div className="glass p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full filter blur-xl transition-all group-hover:bg-amber-500/10"></div>
                <Tv className="w-8 h-8 text-amber-500 mb-4" />
                <h4 className="text-sm text-gray-400 font-medium">Anime & Series</h4>
                <p className="text-3xl font-display font-extrabold text-white mt-1">{animeCount + dramaCount + cartoonCount + serialCount}</p>
                <div className="flex gap-2 mt-2 text-[10px] text-gray-500 font-mono">
                  <span>A:{animeCount}</span>
                  <span>D:{dramaCount}</span>
                  <span>C:{cartoonCount}</span>
                  <span>S:{serialCount}</span>
                </div>
              </div>

              <div className="glass p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/5 rounded-full filter blur-xl transition-all group-hover:bg-green-500/10"></div>
                <DollarSign className="w-8 h-8 text-green-500 mb-4" />
                <h4 className="text-sm text-gray-400 font-medium">Total Premium Revenue</h4>
                <p className="text-3xl font-display font-extrabold text-emerald-400 mt-1">৳ {totalRevenue.toLocaleString()}</p>
                <span className="text-xs text-emerald-500/80 mt-2 block font-medium flex items-center space-x-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Interactive sales calculator</span>
                </span>
              </div>

              <div className="glass p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-full filter blur-xl transition-all group-hover:bg-blue-500/10"></div>
                <Users className="w-8 h-8 text-blue-400 mb-4" />
                <h4 className="text-sm text-gray-400 font-medium">Pending Approvals</h4>
                <p className="text-3xl font-display font-extrabold text-white mt-1">
                  {payments.filter(p => p.status === 'pending').length}
                </p>
                <span className="text-xs text-yellow-500 font-medium mt-2 block animate-pulse">Required immediate action</span>
              </div>
            </div>

            {/* Live Analytics Graph & Broadcast */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Custom SVG Glowing Curve (Visitor trend and Revenue streams) */}
              <div className="lg:col-span-2 glass p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">Live Performance Chart</h3>
                    <p className="text-xs text-gray-400 font-mono">Real-time dynamic traffic & income curves</p>
                  </div>
                  <div className="flex bg-[#121215] border border-white/5 rounded-lg p-0.5">
                    <button 
                      onClick={() => setTimeframe('daily')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeframe === 'daily' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Traffic
                    </button>
                    <button 
                      onClick={() => setTimeframe('weekly')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeframe === 'weekly' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Subscription Income
                    </button>
                  </div>
                </div>

                {/* Draw custom interactive SVG path representing true data streams! */}
                {timeframe === 'daily' ? (
                  <div>
                    {/* Visitor Curve */}
                    <svg viewBox="0 0 500 180" className="w-full h-48 overflow-visible">
                      <defs>
                        <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M 10,130 C 80,105 130,120 180,90 C 230,60 280,75 330,45 C 380,15 430,30 490,5" 
                        fill="none" 
                        stroke="#ef4444" 
                        strokeWidth="3.5" 
                        className="drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                      />
                      <path 
                        d="M 10,130 C 80,105 130,120 180,90 C 230,60 280,75 330,45 C 380,15 430,30 490,5 L 490,170 L 10,170 Z" 
                        fill="url(#curveGradient)"
                      />
                      {/* Grid lines */}
                      <line x1="10" y1="160" x2="490" y2="160" stroke="rgba(255,255,255,0.05)" />
                      <line x1="10" y1="110" x2="490" y2="110" stroke="rgba(255,255,255,0.05)" />
                      <line x1="10" y1="60" x2="490" y2="60" stroke="rgba(255,255,255,0.05)" />
                      {/* Data Dots and values */}
                      <circle cx="180" cy="90" r="5" fill="#ef4444" />
                      <text x="180" y="75" fill="#ffffff" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">1,890 v</text>
                      
                      <circle cx="330" cy="45" r="5" fill="#ef4444" />
                      <text x="330" y="30" fill="#ffffff" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">2,650 v</text>

                      <circle cx="490" cy="5" r="5" fill="#ef4444" />
                      <text x="470" y="20" fill="#22c55e" fontSize="10" textAnchor="right" fontFamily="monospace" fontWeight="bold">3,120 (Peak)</text>
                    </svg>
                    <div className="flex justify-between text-[11px] font-mono text-gray-500 mt-3 px-2">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri (Weekend Release)</span>
                      <span>Sat (Today)</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Revenue Bar Graph */}
                    <svg viewBox="0 0 500 180" className="w-full h-48">
                      <line x1="10" y1="160" x2="490" y2="160" stroke="rgba(255,255,255,0.05)" />
                      <line x1="10" y1="100" x2="490" y2="100" stroke="rgba(255,255,255,0.05)" />
                      <line x1="10" y1="40" x2="490" y2="40" stroke="rgba(255,255,255,0.05)" />
                      {/* Substantial Glowing Bars */}
                      <rect x="30" y="100" width="35" height="60" fill="#d4af37" rx="4" opacity="0.6"/>
                      <rect x="110" y="80" width="35" height="80" fill="#d4af37" rx="4" opacity="0.7"/>
                      <rect x="190" y="115" width="35" height="45" fill="#d4af37" rx="4" opacity="0.6"/>
                      <rect x="270" y="55" width="35" height="105" fill="#d4af37" rx="4" opacity="0.8"/>
                      <rect x="350" y="30" width="35" height="130" fill="#d4af37" rx="4" opacity="0.9" className="drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
                      <rect x="430" y="45" width="35" height="115" fill="#d4af37" rx="4" opacity="0.9" />
                      {/* Values */}
                      <text x="367" y="20" fill="#f59e0b" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">৳ 45K</text>
                      <text x="287" y="45" fill="#f59e0b" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">৳ 28.9K</text>
                    </svg>
                    <div className="flex justify-between text-[11px] font-mono text-gray-500 mt-2 px-6">
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat (Peak)</span>
                      <span>Sun (Today)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Push Broadcast Alert Section */}
              <div className="glass p-6 rounded-3xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2.5 mb-4 text-red-500">
                    <ShieldAlert className="w-5 h-5 animate-bounce" />
                    <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-white">Broadcast Alerts</h3>
                  </div>
                  <p className="text-xs text-gray-400 mb-6">
                    Compose a notification broadcast banner. This will instantly push a red flashing notification to all users' active screen menus.
                  </p>
                  
                  <form onSubmit={handleSendNotification} className="space-y-4">
                    <textarea
                      placeholder="Compose broadcast e.g.: '🚨 Shakib Khan’s TOOFAN raw movie download is now live! Stream directly. Enjoy zero buffering tags.'"
                      value={pushMsg}
                      onChange={(e) => setPushMsg(e.target.value)}
                      className="w-full bg-[#161619] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl p-3.5 text-xs text-gray-200 placeholder-gray-600 h-28 resize-none font-sans"
                    ></textarea>
                    
                    <button
                      type="submit"
                      disabled={!pushMsg.trim()}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-800 disabled:to-gray-850 text-white font-medium text-xs py-3 rounded-xl transition-all shadow-lg font-mono tracking-wider flex items-center justify-center space-x-2"
                    >
                      <span>FIRE GLOBAL ALERTS</span>
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center text-xs text-gray-500 font-mono">
                  <span>Pending notifications:</span>
                  <span>{content.length ? 'Dynamic Sync Ready' : 'Empty Database'}</span>
                </div>
              </div>

            </div>

            {/* Quick Pending Subscriptions list list */}
            <div className="glass p-6 rounded-3xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-display font-medium text-lg text-white">Prerelease Payment Actions</h3>
                  <p className="text-xs text-gray-400 font-mono">Mobile banking ledger (Bkash / Nagad / Bank Transfer logs)</p>
                </div>
                <button 
                  onClick={() => setActiveTab('financials')} 
                  className="text-xs text-red-500 hover:underline font-mono font-bold"
                >
                  View All Receipts →
                </button>
              </div>

              {payments.filter(p => p.status === 'pending').length === 0 ? (
                <div className="text-center py-10 bg-white/[0.01] rounded-2xl border border-white/5">
                  <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-sans">No pending payment vouchers awaiting authentication.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 font-mono">
                        <th className="pb-3 px-3">Subscriber</th>
                        <th className="pb-3 px-3">Method</th>
                        <th className="pb-3 px-3">Sender Phone</th>
                        <th className="pb-3 px-3">Transaction Hash (TxID)</th>
                        <th className="pb-3 px-3 text-right">Amount (BDT)</th>
                        <th className="pb-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.filter(p => p.status === 'pending').slice(0, 5).map((pay) => (
                        <tr key={pay.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                          <td className="py-4 px-3 font-medium text-white">
                            <div>{pay.userName}</div>
                            <span className="text-[10px] text-gray-500 font-mono">{pay.userEmail}</span>
                          </td>
                          <td className="py-4 px-3 uppercase text-yellow-500 font-mono font-bold">{pay.method}</td>
                          <td className="py-4 px-3 font-mono text-gray-300">{pay.senderNumber}</td>
                          <td className="py-4 px-3 font-mono text-xs select-all text-red-400 font-bold">{pay.transactionId}</td>
                          <td className="py-4 px-3 text-right text-emerald-400 font-bold font-mono">৳{pay.amount}</td>
                          <td className="py-4 px-3 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handlePaymentApprove(pay.id)}
                                className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white p-1.5 rounded-lg transition-all"
                                title="Approve Upgrade"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePaymentReject(pay.id)}
                                className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white p-1.5 rounded-lg transition-all"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 2. MOVIES CATALOG */}
        {activeTab === 'movies' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Form */}
            <div className="lg:col-span-5 glass p-6 rounded-3xl h-fit">
              <h3 className="font-display font-extrabold text-lg text-white mb-6 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-red-500" />
                <span>{movieForm.id ? "Edit Movie Record" : "Upload Standalone Movie"}</span>
              </h3>

              <form onSubmit={handleSaveMovie} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">Movie Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter movie name e.g. Toofan"
                    value={movieForm.title || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                    className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">IMDb/Popcorn Rating</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="10"
                      placeholder="8.5"
                      value={movieForm.rating || ''}
                      onChange={(e) => setMovieForm({ ...movieForm, rating: Number(e.target.value) })}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">Schedule / Status</label>
                    <input
                      type="text"
                      placeholder="e.g. Released, Friday Spot"
                      value={movieForm.schedule || ''}
                      onChange={(e) => setMovieForm({ ...movieForm, schedule: e.target.value })}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">Poster Crop URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or cloud link"
                    value={movieForm.coverUrl || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, coverUrl: e.target.value })}
                    className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">Watch Movie Video Link (Direct Streaming) *</label>
                  <input
                    type="text"
                    placeholder="Direct MP4 url or Google Drive Direct Video Link"
                    value={movieForm.videoUrl || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, videoUrl: e.target.value })}
                    className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">Direct Download File Link</label>
                  <input
                    type="url"
                    placeholder="High speed server download link"
                    value={movieForm.downloadUrl || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, downloadUrl: e.target.value })}
                    className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono"
                  />
                </div>

                {/* Multi-Quality Movie Download Link Manager */}
                <div className="bg-[#0c0c0e] border border-white/5 p-4 rounded-2xl space-y-3.5">
                  <span className="text-[10px] text-gray-500 font-mono tracking-widest font-extrabold uppercase block">
                    📥 Multi-Quality Download Links (Added: {movieQualities.length})
                  </span>

                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <select
                        value={newMovieQualText}
                        onChange={(e) => setNewMovieQualText(e.target.value)}
                        className="w-full bg-[#141417] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white"
                      >
                        <option value="1080p">1080p (FHD)</option>
                        <option value="720p">720p (HD)</option>
                        <option value="480p">480p (SD)</option>
                        <option value="360p">360p (LQ)</option>
                        <option value="GDrive">Google Drive</option>
                        <option value="Mega">Mega Link</option>
                        <option value="Direct High">Direct Stream Link</option>
                      </select>
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="url"
                        placeholder="Paste download URL for selected resolution..."
                        value={newMovieQualUrl}
                        onChange={(e) => setNewMovieQualUrl(e.target.value)}
                        className="flex-1 bg-[#141417] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={addMovieQualityLink}
                        className="bg-red-650 hover:bg-red-600 px-4 rounded-xl text-white font-mono text-xs font-semibold cursor-pointer shrink-0"
                      >
                        ADD
                      </button>
                    </div>
                  </div>

                  {/* Render quality items with remove button */}
                  {movieQualities.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar pt-1.5 border-t border-white/5">
                      {movieQualities.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-[#141417] p-2 rounded-xl text-xs border border-white/5">
                          <div className="flex items-center space-x-2">
                            <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase font-sans">
                              {item.quality}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate max-w-[200px] font-mono">{item.url}</span>
                          </div>
                          <button
                            type="button;}"
                            onClick={() => removeMovieQualityLink(idx)}
                            className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags Management */}
                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">Search Keywords / Tags</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Add tag (Press 'Add')"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMovieTag())}
                      className="flex-1 bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={addMovieTag}
                      className="bg-red-650 hover:bg-red-600 px-4 rounded-xl text-white font-mono text-xs font-semibold"
                    >
                      ADD
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {(movieForm.tags || []).map((tag, i) => (
                      <span key={i} className="bg-white/5 text-gray-300 px-2 py-1 rounded text-[10px] font-mono flex items-center space-x-1 border border-white/5">
                        <span>{tag}</span>
                        <button type="button" onClick={() => removeMovieTag(tag)} className="text-red-400 hover:text-red-300">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Dynamic Category Quick Select Buttons */}
                  <div className="mt-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4.5">
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block mb-2">🏷️ Quick Select Movie Categories (Dynamic):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(settings?.customCategories?.Movies || ['Action', 'Romance', '18+ content', 'Thriller', 'Comedy', 'Sci-Fi', 'Horror', 'Bollywood', 'Dhallywood']).map((cat) => {
                        const isSelected = (movieForm.tags || []).includes(cat);
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => {
                              const current = movieForm.tags || [];
                              if (isSelected) {
                                setMovieForm({ ...movieForm, tags: current.filter(t => t !== cat) });
                              } else {
                                setMovieForm({ ...movieForm, tags: [...current, cat] });
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono transition-all border ${
                              isSelected
                                ? 'bg-red-650 text-white border-red-500 font-bold shadow-sm'
                                : 'bg-[#101012] text-gray-400 border-white/5 hover:border-white/10 hover:text-white'
                            }`}
                          >
                            {isSelected ? '✓ ' : ''}{cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Parental controls & Premium flags */}
                <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-white/5 my-4">
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="checkbox"
                      id="mov-premium-box"
                      checked={movieForm.isPremium || false}
                      onChange={(e) => setMovieForm({ ...movieForm, isPremium: e.target.checked })}
                      className="w-4 h-4 bg-black border border-white/20 accent-red-600 rounded"
                    />
                    <label htmlFor="mov-premium-box" className="text-xs font-medium text-yellow-500 cursor-pointer flex items-center space-x-1">
                      <span>Premium Content</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <input
                      type="checkbox"
                      id="mov-adult-box"
                      checked={movieForm.isAdult || false}
                      onChange={(e) => setMovieForm({ ...movieForm, isAdult: e.target.checked })}
                      className="w-4 h-4 bg-black border border-white/20 accent-red-600 rounded"
                    />
                    <label htmlFor="mov-adult-box" className="text-xs font-medium text-red-500 cursor-pointer flex items-center space-x-1 text-glow-red">
                      <span>Adult Content (18+)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">Plot Synopsis Summary</label>
                  <textarea
                    rows={3}
                    placeholder="Draft plot summary summary..."
                    value={movieForm.description || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                    className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl p-3.5 text-xs text-gray-300 placeholder-gray-600"
                  ></textarea>
                </div>

                <div className="flex space-x-2.5 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium text-xs py-3.5 rounded-xl transition-all font-mono uppercase tracking-wider font-extrabold flex items-center justify-center space-x-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{movieForm.id ? "UPDATE MOVIE" : "LAUNCH MOVIE"}</span>
                  </button>
                  {movieForm.id && (
                    <button
                      type="button"
                      onClick={() => setMovieForm({
                        id: '', title: '', coverUrl: '', videoUrl: '', downloadUrl: '',
                        tags: [], category: 'Movies', isPremium: false, isAdult: false,
                        schedule: 'Released', description: '', rating: 8.5
                      })}
                      className="bg-white/5 hover:bg-white/10 text-gray-400 px-4.5 rounded-xl text-xs font-mono"
                    >
                      RESET
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Movie List table */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Filter */}
              <div className="flex space-x-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 items-center">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter movies by Title, Tag, or Category..."
                  value={movieFilter}
                  onChange={(e) => setMovieFilter(e.target.value)}
                  className="bg-transparent border-none text-xs focus:outline-none text-white w-full"
                />
              </div>

              {content.filter(c => c.category === 'Movies').length === 0 ? (
                <div className="text-center py-20 bg-white/[0.01] rounded-3xl border border-white/5">
                  <Film className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-sans">No movies uploaded in the platform registry.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {content
                    .filter(c => c.category === 'Movies')
                    .filter(c => !movieFilter || c.title.toLowerCase().includes(movieFilter.toLowerCase()) || c.tags.some(t => t.toLowerCase().includes(movieFilter.toLowerCase())))
                    .map((mov) => (
                      <div key={mov.id} className="glass p-4 rounded-2xl flex space-x-4 relative group hover:border-white/15 transition-all">
                        <img 
                          src={mov.coverUrl} 
                          alt="" 
                          className="w-20 h-28 object-cover rounded-xl border border-white/5"
                        />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between">
                              <h4 className="font-display font-black text-sm text-white leading-snug truncate pr-6">{mov.title}</h4>
                              <span className="text-[10px] text-gray-400 font-mono">ID: {mov.id}</span>
                            </div>
                            <span className="text-[10px] text-amber-500 font-mono font-bold">★ {mov.rating}</span>
                            
                            <div className="flex items-center space-x-2 mt-2">
                              {mov.isPremium && (
                                <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/10 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider">Premium</span>
                              )}
                              {mov.isAdult && (
                                <span className="bg-red-500/10 text-red-500 border border-red-500/10 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider">Adult 18+</span>
                              )}
                            </div>
                          </div>

                          <div className="flex space-x-1.5 pt-4">
                            <button
                              onClick={() => handleEditMovie(mov)}
                              className="bg-white/5 hover:bg-white/10 text-gray-300 p-2 rounded-lg transition-all"
                              title="Modify Metadata"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(mov.id, mov.title)}
                              className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white p-2 rounded-lg transition-all"
                              title="Delete Movie"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 3. ANIME SERIES CMS */}
        {activeTab === 'series' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Form */}
            <div className="lg:col-span-6 glass p-6 rounded-3xl h-fit">
              <h3 className="font-display font-extrabold text-lg text-white mb-6 flex items-center space-x-2">
                <Tv className="w-5 h-5 text-red-500 animate-pulse" />
                <span>{seriesForm.id ? "Edit Series Pack" : "Create Episodic Series Record"}</span>
              </h3>

              <div className="grid grid-cols-4 gap-2 mb-4 bg-black/40 border border-white/5 rounded-xl p-1">
                {['Anime', 'Cartoon', 'Drama', 'Serial'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSeriesCategory(cat as any)}
                    className={`text-[10px] font-semibold py-2.5 rounded-lg transition-all ${seriesCategory === cat ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSaveSeries} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">Series Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jujutsu Kaisen S2"
                      value={seriesForm.title || ''}
                      onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">Release Schedule Day</label>
                    <input
                      type="text"
                      placeholder="e.g. Monday, Everyday"
                      value={seriesForm.schedule || ''}
                      onChange={(e) => setSeriesForm({ ...seriesForm, schedule: e.target.value })}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">IMDb Rating</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="8.9"
                      value={seriesForm.rating || ''}
                      onChange={(e) => setSeriesForm({ ...seriesForm, rating: Number(e.target.value) })}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">Series Status</label>
                    <select
                      value={seriesForm.status || 'ongoing'}
                      onChange={(e) => setSeriesForm({ ...seriesForm, status: e.target.value as any })}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    >
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">Premium Mode</label>
                    <select
                      value={seriesForm.isPremium ? 'yes' : 'no'}
                      onChange={(e) => setSeriesForm({ ...seriesForm, isPremium: e.target.value === 'yes' })}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-2 py-3 text-xs text-white"
                    >
                      <option value="no">Free</option>
                      <option value="yes">Premium Lock</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">Adult Lock (18+)</label>
                    <select
                      value={seriesForm.isAdult ? 'adult' : 'general'}
                      onChange={(e) => setSeriesForm({ ...seriesForm, isAdult: e.target.value === 'adult' })}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white animate-pulse"
                    >
                      <option value="general">General (Kids & Teens)</option>
                      <option value="adult">Adult Only (18+ LOCK)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">Bulk Series Zip Download Link</label>
                    <input
                      type="url"
                      placeholder="e.g. Mega / Archive full series folder link"
                      value={seriesForm.zipUrl || ''}
                      onChange={(e) => setSeriesForm({ ...seriesForm, zipUrl: e.target.value })}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">Cover Poster Source URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={seriesForm.coverUrl || ''}
                    onChange={(e) => setSeriesForm({ ...seriesForm, coverUrl: e.target.value })}
                    className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">Plot Summary</label>
                  <textarea
                    rows={2}
                    placeholder="Briefly state story points..."
                    value={seriesForm.description || ''}
                    onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
                    className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl p-3 text-xs text-white resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">Quick Custom Search Tag Keywords</label>
                  <input
                    type="text"
                    placeholder="Type words and press comma to separate tags"
                    onChange={(e) => {
                      if (e.target.value.endsWith(',')) {
                        addSeriesTag(e.target.value.replace(',', ''));
                        e.target.value = '';
                      }
                    }}
                    className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(seriesForm.tags || []).map((t, idx) => (
                      <span key={idx} className="bg-white/5 text-gray-300 px-2 py-1 rounded text-[10px] font-mono flex items-center space-x-1 border border-white/5">
                        <span>{t}</span>
                        <button type="button" onClick={() => removeSeriesTag(t)} className="text-red-400 hover:text-red-300 cursor-pointer">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Dynamic Category Quick Select Buttons */}
                  <div className="mt-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4.5">
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block mb-2">🏷️ Quick Select {seriesCategory} Categories (Dynamic):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(settings?.customCategories?.[seriesCategory] || 
                        (seriesCategory === 'Anime' ? ['Action', 'Romance', '18+ content', 'Fantasy', 'Shounen', 'Slice of Life', 'Isekai', 'Adventure', 'Mystery'] :
                         seriesCategory === 'Drama' ? ['Action', 'Romance', '18+ content', 'Comedy', 'Family', 'Thriller', 'Crime', 'Romantic Comedy'] :
                         seriesCategory === 'Cartoon' ? ['Action', 'Romance', '18+ content', 'Adventure', 'Comedy', 'Family', 'Kids', 'Fantasy'] :
                         seriesCategory === 'Serial' ? ['Action', 'Romance', '18+ content', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Mystery'] : []
                        )
                      ).map((cat) => {
                        const isSelected = (seriesForm.tags || []).includes(cat);
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => {
                              const current = seriesForm.tags || [];
                              if (isSelected) {
                                setSeriesForm({ ...seriesForm, tags: current.filter(t => t !== cat) });
                              } else {
                                setSeriesForm({ ...seriesForm, tags: [...current, cat] });
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono transition-all border ${
                              isSelected
                                ? 'bg-red-650 text-white border-red-500 font-bold shadow-sm'
                                : 'bg-[#101012] text-gray-400 border-white/5 hover:border-white/10 hover:text-white'
                            }`}
                          >
                            {isSelected ? '✓ ' : ''}{cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* EPISODES MANAGEMENT SUB PANEL */}
                <div className="bg-black/30 border border-white/5 rounded-2xl p-4 mt-6">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider block mb-3">
                    🛠️ Step-by-Step Episode Addition (Currently Created: {seriesForm.episodes?.length || 0})
                  </span>
                  
                  <div className="grid grid-cols-12 gap-3 mb-3">
                    <div className="col-span-3">
                      <label className="text-[10px] text-gray-500 font-mono block mb-0.5">Ep Num</label>
                      <input
                        type="number"
                        placeholder="1"
                        value={episodeForm.number || ''}
                        onChange={(e) => setEpisodeForm({ ...episodeForm, number: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/5 focus:outline-none focus:border-red-500 rounded-lg p-2 text-xs text-white text-center font-mono"
                      />
                    </div>
                    <div className="col-span-9">
                      <label className="text-[10px] text-gray-500 font-mono block mb-0.5">Episode Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Homecoming Ceremony"
                        value={episodeForm.title || ''}
                        onChange={(e) => setEpisodeForm({ ...episodeForm, title: e.target.value })}
                        className="w-full bg-white/5 border border-white/5 focus:outline-none focus:border-red-500 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-mono block mb-0.5">Stream Link (Watch URL) *</label>
                    <input
                      type="url"
                      placeholder="Direct stream MP4 url"
                      value={episodeForm.videoUrl || ''}
                      onChange={(e) => setEpisodeForm({ ...episodeForm, videoUrl: e.target.value })}
                      className="w-full bg-white/5 border border-white/5 focus:outline-none focus:border-red-500 rounded-lg p-2 text-xs text-white font-mono"
                    />
                  </div>

                  {/* Multi-Quality Episode Download Links Dynamic Sub-Form */}
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 mt-3 space-y-2.5">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider font-extrabold uppercase block">
                      📥 Episode Download Qualities (Added: {episodeQualities.length})
                    </span>
                    <div className="flex gap-2">
                      <select
                        value={newEpQualityText}
                        onChange={(e) => setNewEpQualityText(e.target.value)}
                        className="bg-white/5 border border-white/5 focus:outline-none focus:border-red-500 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="1080p">1080p</option>
                        <option value="720p">720p</option>
                        <option value="480p">480p</option>
                        <option value="360p">360p</option>
                        <option value="GDrive">Google Drive</option>
                        <option value="Mega">Mega Link</option>
                      </select>
                      <input
                        type="url"
                        placeholder="Paste download URL/mirror..."
                        value={newEpQualityUrl}
                        onChange={(e) => setNewEpQualityUrl(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/5 focus:outline-none focus:border-red-500 rounded-lg p-2 text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={addEpisodeQualityLink}
                        className="bg-[#1a1512] border border-amber-500/20 hover:border-amber-500 text-amber-500 hover:text-white px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all"
                      >
                        ADD
                      </button>
                    </div>

                    {/* Present listed links */}
                    {episodeQualities.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-white/5 max-h-24 overflow-y-auto no-scrollbar">
                        {episodeQualities.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-[#101012] p-1.5 rounded-lg text-[10px]">
                            <div className="flex items-center space-x-1.5">
                              <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase font-sans">
                                {item.quality}
                              </span>
                              <span className="text-gray-400 truncate max-w-[150px] font-mono">{item.url}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEpisodeQualityLink(idx)}
                              className="text-red-400 hover:text-red-300 p-0.5 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="ep-filler-box"
                        checked={episodeForm.isFiller || false}
                        onChange={(e) => setEpisodeForm({ ...episodeForm, isFiller: e.target.checked })}
                        className="w-3.5 h-3.5 bg-black border border-white/10 accent-yellow-500"
                      />
                      <label htmlFor="ep-filler-box" className="text-xs text-yellow-500 font-mono font-medium cursor-pointer">
                        Mark Episode description as Filler (Skip Mode)
                      </label>
                    </div>
                    
                    <button
                      type="button"
                      onClick={addEpisodeToForm}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-mono text-[10px] font-bold px-3.5 py-1.5 rounded-lg uppercase cursor-pointer"
                    >
                      {editingEpisodeId ? '💾 UPDATE EPISODE' : 'ADD EPISODE'}
                    </button>
                  </div>

                  {/* Curated list */}
                  <div className="mt-4 max-h-32 overflow-y-auto space-y-1.5 pr-2 no-scrollbar">
                    {(seriesForm.episodes || []).map((ep, index) => (
                      <div key={ep.id || index} className="flex justify-between items-center bg-white/[0.02] hover:bg-white/[0.04] p-2 rounded-xl text-xs border border-white/5 transition-all">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-6 h-6 rounded bg-red-600/10 text-red-500 flex items-center justify-center font-mono font-bold text-[10px]">
                            {ep.number}
                          </span>
                          <span className="font-semibold text-white truncate max-w-[200px]">{ep.title}</span>
                          {ep.isFiller && (
                            <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded px-1.5 py-0.5 text-[8px] font-mono">Filler</span>
                          )}
                          {ep.downloadLinks && ep.downloadLinks.length > 0 && (
                            <span className="bg-green-500/10 text-green-400 border border-green-555/20 rounded px-1 text-[8px] font-mono">
                              💾 {ep.downloadLinks.length} files
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEditEpisodeInForm(ep)}
                            className="text-yellow-500 hover:text-yellow-400 p-1 cursor-pointer"
                            title="Edit static properties and qualities of this episode"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeEpisodeFromForm(index)}
                            className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-red-650 hover:bg-red-650/80 text-white font-mono text-xs font-black py-4.5 rounded-xl uppercase tracking-wider"
                  >
                    🚀 PUBLISH/SAVE SERIES PACK
                  </button>
                  {seriesForm.id && (
                    <button
                      type="button"
                      onClick={() => setSeriesForm({
                        id: '', title: '', coverUrl: '', tags: [], category: seriesCategory,
                        isPremium: false, isAdult: false, schedule: 'Monday', description: '',
                        rating: 8.5, status: 'ongoing', episodes: [], zipUrl: ''
                      })}
                      className="bg-white/5 hover:bg-white/10 text-gray-400 px-4 rounded-xl text-xs font-mono"
                    >
                      RESET
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Filter */}
              <div className="flex space-x-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 items-center">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter by Series title (Anime, Drama, Serial etc)..."
                  value={seriesFilter}
                  onChange={(e) => setSeriesFilter(e.target.value)}
                  className="bg-transparent border-none text-xs focus:outline-none text-white w-full"
                />
              </div>

              {content.filter(c => c.category !== 'Movies').length === 0 ? (
                <div className="text-center py-20 bg-white/[0.01] rounded-3xl border border-white/5">
                  <Tv className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-sans">No anime/drama records logged here.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                  {content
                    .filter(c => c.category !== 'Movies')
                    .filter(c => !seriesFilter || c.title.toLowerCase().includes(seriesFilter.toLowerCase()))
                    .map((item) => (
                      <div key={item.id} className="glass p-4 rounded-2xl flex justify-between items-center hover:border-white/10 transition-all">
                        <div className="flex items-center space-x-4">
                          <img src={item.coverUrl} className="w-12 h-16 object-cover rounded-md" alt="" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-display font-extrabold text-sm text-white pr-2 leading-none">{item.title}</h4>
                              <span className="bg-red-500/10 text-red-400 text-[8px] font-mono px-1 rounded uppercase">{item.category}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 block font-mono mt-1">
                              Status: <span className={item.status === 'ongoing' ? 'text-green-400 font-bold' : 'text-blue-400 font-bold'}>{item.status}</span> | eps: {item.episodes?.length || 0}
                            </span>
                            <span className="text-[10px] text-gray-500 block font-mono">📅 Releases on: {item.schedule}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSeriesCategory(item.category as any);
                              setSeriesForm(item);
                            }}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 p-2 rounded-lg transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.title)}
                            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 4. CHAT SUPPORT */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            
            {/* Horizontal Mini-Navigation Tabs inside Support */}
            <div className="flex border-b border-white/5 pb-px mb-2 space-x-1">
              <button
                onClick={() => setSupportSubTab('chat')}
                className={`flex items-center space-x-2 px-6 py-4 text-xs font-mono font-bold tracking-wider uppercase transition-all border-b-2 hover:bg-white/[0.02] cursor-pointer ${
                  supportSubTab === 'chat'
                    ? 'border-red-500 text-red-500 bg-red-600/[0.02]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-red-500" />
                <span>💬 Conversations ({chatSessions.filter(c => !c.deletedByAdmin).length})</span>
              </button>
              
              <button
                onClick={() => setSupportSubTab('management')}
                className={`flex items-center space-x-2 px-6 py-4 text-xs font-mono font-bold tracking-wider uppercase transition-all border-b-2 hover:bg-white/[0.02] cursor-pointer ${
                  supportSubTab === 'management'
                    ? 'border-red-500 text-red-550 bg-red-650/[0.02]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 text-amber-500" />
                <span>⚙️ Settings & Management ({chatSessions.length})</span>
              </button>
            </div>

            {supportSubTab === 'chat' ? (
              <div className="grid grid-cols-12 gap-6 glass p-2 rounded-3xl min-h-[500px]">
                
                {/* Thread User lists */}
                <div className="col-span-12 md:col-span-4 border-r border-white/5 p-4 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Active Call logs</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-gray-500 font-mono">APP DESK:</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                        settings?.supportActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {settings?.supportActive ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                  </div>

                  {chatSessions.filter(c => !c.deletedByAdmin).length === 0 ? (
                    <div className="text-center py-10 opacity-60">
                      <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No active support conversations logged.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1 no-scrollbar">
                      {chatSessions.filter(c => !c.deletedByAdmin).map((session) => (
                        <div
                          key={session.userId}
                          className={`w-full p-3.5 bg-white/[0.01] rounded-2xl border transition-all flex items-center justify-between ${
                            activeChatId === session.userId 
                              ? 'bg-red-600/10 border-red-500/30' 
                              : 'border-transparent hover:bg-white/[0.02]'
                          }`}
                        >
                          <button
                            onClick={() => {
                              setActiveChatId(session.userId);
                              if (session.unreadCount) session.unreadCount = 0;
                            }}
                            className="flex-grow text-left truncate mr-2 cursor-pointer bg-transparent border-none outline-none w-full"
                          >
                            <h4 className="font-display font-medium text-xs text-white leading-tight truncate">{session.userName}</h4>
                            <span className="text-[10px] text-gray-500 font-mono block truncate">{session.userEmail}</span>
                            <p className="text-[11px] text-gray-400 font-mono truncate mt-1">
                              {session.messages?.[session.messages.length - 1]?.text || 'No messages'}
                            </p>
                          </button>
                          <div className="flex flex-col items-end justify-between self-stretch space-y-1.5 shrink-0 text-right">
                            <span className="text-[9px] text-gray-500 font-mono">{session.lastUpdated}</span>
                            {(session.unreadCount || 0) > 0 && (
                              <span className="w-4 h-4 bg-green-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-lg animate-bounce">
                                {session.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chat viewport */}
                <div className="col-span-12 md:col-span-8 flex flex-col justify-between p-4 min-h-[450px]">
                  {activeChatId && currentChatSession ? (
                    <>
                      {/* Chat header */}
                      <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                        <div>
                          <span className="text-[9px] font-mono text-gray-500 font-bold tracking-widest uppercase">Currently Interacting with</span>
                          <h4 className="font-display font-extrabold text-sm text-white">{currentChatSession.userName}</h4>
                          <span className="text-[10px] text-gray-500 font-mono block">{currentChatSession.userEmail}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400 font-mono mr-2 hidden sm:inline">
                            📝 {currentChatSession.messages?.length || 0} messages
                          </span>
                          <button
                            onClick={() => {
                              setSupportSubTab('management');
                              setSupportSearchQuery(currentChatSession.userEmail || currentChatSession.userName);
                              setSupportFilterType('all');
                              triggerAlert("Jumped to support desk panel settings.");
                            }}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/15 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center space-x-1.5"
                          >
                            <span>⚙️ Manage Thread</span>
                          </button>
                        </div>
                      </div>

                      {/* Messages list */}
                      <div className="flex-grow overflow-y-auto space-y-3.5 pr-2 no-scrollbar max-h-[350px]">
                        {(!currentChatSession.messages || currentChatSession.messages.length === 0) ? (
                          <div className="text-center py-20 text-gray-600 font-mono text-xs">
                            No messages. Begin typing below.
                          </div>
                        ) : (
                          currentChatSession.messages.map((m) => (
                            <div 
                              key={m.id} 
                              className={`flex flex-col ${m.sender === 'admin' ? 'items-end' : 'items-start'}`}
                            >
                              <div className={`p-4 rounded-xl text-xs max-w-sm ${
                                m.sender === 'admin' 
                                  ? 'bg-red-600/20 text-white rounded-tr-none border border-red-500/10' 
                                  : 'bg-white/[0.04] text-gray-200 rounded-tl-none border border-white/5'
                              }`}>
                                <p>{m.text}</p>
                              </div>
                              <span className="text-[9px] text-gray-500 font-mono mt-1 px-1.5">{m.timestamp}</span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Send bar */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Type your official support response..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                          className="flex-grow bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3.5 text-xs text-white"
                        />
                        <button
                          onClick={handleSendReply}
                          className="bg-red-650 hover:bg-red-600 text-white px-5 py-3.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
                        >
                          REPLY
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 opacity-60">
                      <MessageSquare className="w-12 h-12 text-gray-700 mb-2 animate-pulse" />
                      <p className="text-xs text-gray-500 font-mono font-bold tracking-widest uppercase">Awaiting Thread Selection</p>
                      <p className="text-[11px] text-gray-500 max-w-xs text-center mt-1">Select an active user chat from the sidebar panel to respond to queries in real-time.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // ----------------- SUPPORT MANAGEMENT TAB CONTENT -----------------
              <div className="glass p-6 rounded-3xl space-y-6">
                
                {/* Global Status & Stats row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6 border-b border-white/5">
                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-xs text-gray-400 font-mono">SUPPORT WORK DESK</span>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-sm font-bold font-mono ${settings?.supportActive ? 'text-green-400' : 'text-red-400'}`}>
                        {settings?.supportActive ? '🟢 PUBLIC LIVE DESK' : '🔴 OFFLINE / AUTO'}
                      </span>
                      <button
                        onClick={async () => {
                          if (!settings) return;
                          const next = { ...settings, supportActive: !settings.supportActive };
                          setSettings(next);
                          await updateAppSettings(next);
                          triggerAlert(`Support helpdesk status is now: ${next.supportActive ? 'ONLINE' : 'OFFLINE'}`);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                          settings?.supportActive 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' 
                            : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                        }`}
                      >
                        TOGGLE
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono">TOTAL CHAT THREADS</span>
                    <h3 className="text-2xl font-display font-black text-white mt-1">{chatSessions.length}</h3>
                  </div>

                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono">ACTIVE SESSIONS</span>
                    <h3 className="text-2xl font-display font-black text-green-400 mt-1">
                      {chatSessions.filter(c => !c.deletedByAdmin).length}
                    </h3>
                  </div>

                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono">HIDDEN / ARCHIVED</span>
                    <h3 className="text-2xl font-display font-black text-amber-500 mt-1">
                      {chatSessions.filter(c => c.deletedByAdmin).length}
                    </h3>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                  <div className="flex-1 w-full relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search support threads by name, email or uid..."
                      value={supportSearchQuery}
                      onChange={(e) => setSupportSearchQuery(e.target.value)}
                      className="w-full bg-[#0d0d10] border border-white/5 focus:border-red-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full md:w-auto shrink-0 justify-end">
                    <span className="text-xs text-gray-500 font-mono">Filter:</span>
                    <div className="flex bg-black/40 border border-white/5 rounded-xl p-1 shrink-0">
                      {(['all', 'active', 'hidden'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSupportFilterType(type)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                            supportFilterType === type 
                              ? 'bg-red-600/20 text-red-400' 
                              : 'text-gray-450 hover:text-white'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Database Table of Sessions */}
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01] text-xs font-mono text-gray-400 uppercase tracking-wider">
                        <th className="p-4 font-mono font-extrabold">Identity / Subscriber info</th>
                        <th className="p-4 font-mono font-extrabold">Status & Message Details</th>
                        <th className="p-4 font-mono font-extrabold">Last Activity</th>
                        <th className="p-4 text-center font-mono font-extrabold">Admin operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {(() => {
                        const filtered = chatSessions.filter(c => {
                          const matchSearch = 
                            (c.userName || '').toLowerCase().includes(supportSearchQuery.toLowerCase()) ||
                            (c.userEmail || '').toLowerCase().includes(supportSearchQuery.toLowerCase()) ||
                            (c.userId || '').toLowerCase().includes(supportSearchQuery.toLowerCase());
                          
                          if (!matchSearch) return false;

                          if (supportFilterType === 'active') return !c.deletedByAdmin;
                          if (supportFilterType === 'hidden') return !!c.deletedByAdmin;
                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={4} className="text-center py-12 text-gray-550 font-mono">
                                No support sessions matching the selected filter query criteria.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((session) => (
                          <tr key={session.userId} className="hover:bg-white/[0.01] transition-all">
                            <td className="p-4">
                              <div className="font-display font-bold text-white text-sm">{session.userName}</div>
                              <div className="text-gray-400 font-mono text-[11px] mt-0.5">{session.userEmail}</div>
                              <div className="text-gray-600 font-mono text-[9px] mt-1 select-all">UID: {session.userId}</div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  {session.deletedByAdmin ? (
                                    <span className="bg-amber-500/10 text-amber-500 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                                      🚫 HIDDEN / ARCHIVED
                                    </span>
                                  ) : (
                                    <span className="bg-green-500/10 text-green-400 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                                      🟢 ACTIVE DESK
                                    </span>
                                  )}

                                  {(session.unreadCount || 0) > 0 && (
                                    <span className="bg-red-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                                      {session.unreadCount} UNREAD
                                    </span>
                                  )}
                                </div>
                                <span className="text-gray-450 font-mono text-[10px]">
                                  💬 Total messages: {session.messages?.length || 0}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 font-mono text-gray-400 text-[11px]">
                              {session.lastUpdated}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                {/* Jump to chat */}
                                <button
                                  onClick={() => {
                                    setActiveChatId(session.userId);
                                    setSupportSubTab('chat');
                                    triggerAlert(`Replying to ${session.userName}`);
                                  }}
                                  className="bg-red-650/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 px-3 py-1.5 rounded-lg transition-all font-mono font-bold cursor-pointer"
                                  title="Open Chat Stream"
                                >
                                  💬 Reply
                                </button>

                                {/* Clear chat log */}
                                <button
                                  onClick={() => {
                                    showConfirm(
                                      "Bulk Clear Messages History",
                                      `Permanently format and clear the support inbox log with "${session.userName}"? This cannot be undone.`,
                                      async () => {
                                        await clearChatSession(session.userId);
                                        setChatSessions((prev) =>
                                          prev.map((s) => s.userId === session.userId ? { ...s, messages: [], unreadCount: 0 } : s)
                                        );
                                        triggerAlert("Log cleared successfully.");
                                      }
                                    );
                                  }}
                                  className="bg-white/5 hover:bg-white/11 text-gray-300 px-3 py-1.5 rounded-lg transition-all font-mono border border-white/5 cursor-pointer"
                                  title="Format Message Stream"
                                >
                                  🧹 Wipe
                                </button>

                                {/* Hide or Restore */}
                                {session.deletedByAdmin ? (
                                  <button
                                    onClick={async () => {
                                      showConfirm(
                                        "Restore to Live Display",
                                        `Restore "${session.userName}"'s thread to the active chat log list?`,
                                        async () => {
                                          await restoreChatFromAdmin(session.userId);
                                          setChatSessions((prev) => prev.map(c => c.userId === session.userId ? { ...c, deletedByAdmin: false } : c));
                                          triggerAlert("Thread restored to active display logs.");
                                        }
                                      );
                                    }}
                                    className="bg-green-500/10 hover:bg-green-550 hover:text-white text-green-400 border border-green-500/10 px-3 py-1.5 rounded-lg transition-all font-mono cursor-pointer"
                                    title="Unarchive Thread"
                                  >
                                    🔓 Restore
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      showConfirm(
                                        "Hide Stream from Display",
                                        `Hide the chat conversation with subscriber "${session.userName}" from active desk lists? The user will still hold their active copies safely inside their client panels.`,
                                        async () => {
                                          await hideChatFromAdmin(session.userId);
                                          setChatSessions((prev) => prev.map(c => c.userId === session.userId ? { ...c, deletedByAdmin: true } : c));
                                          if (activeChatId === session.userId) {
                                            setActiveChatId(null);
                                          }
                                          triggerAlert("Thread marked as deleted for Admin Only.");
                                        }
                                      );
                                    }}
                                    className="bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-500 border border-amber-500/10 px-3 py-1.5 rounded-lg transition-all font-mono cursor-pointer"
                                    title="Archive from view"
                                  >
                                    🚫 Archive
                                  </button>
                                )}

                                {/* Delete session fully */}
                                <button
                                  onClick={() => {
                                    showConfirm(
                                      "Permanent Purge",
                                      `Crucial Warning: This completely deletes the live support document for student/viewer "${session.userName}" from the Firestore Database. It cannot be recovered. Ensure you want to close this stream fully.`,
                                      async () => {
                                        await deleteChatSession(session.userId);
                                        setChatSessions((prev) => prev.filter(c => c.userId !== session.userId));
                                        if (activeChatId === session.userId) {
                                          setActiveChatId(null);
                                        }
                                        triggerAlert("Correspondence purged completely.");
                                      }
                                    );
                                  }}
                                  className="bg-red-500/10 hover:bg-red-650 hover:text-white text-red-500 border border-red-550/15 px-3 py-1.5 rounded-lg transition-all font-mono cursor-pointer"
                                  title="Erase Document Entirely"
                                >
                                  🗑️ Purge
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

          </div>
        )}

        {/* 5. FINANCIALS */}
        {activeTab === 'financials' && (
          <div className="space-y-8">
            
            {/* Financial Configuration Panel */}
            <div className="glass p-6 rounded-3xl">
              <div className="mb-6">
                <h3 className="font-display font-extrabold text-base text-white">Dynamic Payment Methods Configuration</h3>
                <p className="text-xs text-gray-400">Configure multiple active phone payment numbers and instructions. Changes show up on client VIP Checkout gates immediately.</p>
              </div>

              {settings && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  
                  {/* Left block - Add / Edit Form */}
                  <form onSubmit={handleSavePaymentMethod} className="lg:col-span-2 bg-[#0c0c0e]/80 border border-white/5 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-mono font-bold tracking-wider text-yellow-500 uppercase flex items-center space-x-1">
                      <span>{editingPayMethodId ? '✏️ EDIT GATEWAY DETAILS' : '➕ ADD NEW BILLING GATEWAY'}</span>
                    </h4>

                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">GATEWAY/METHOD NAME</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. bKash Personal, Rocket Agent"
                        value={payMethodForm.name}
                        onChange={(e) => setPayMethodForm({ ...payMethodForm, name: e.target.value })}
                        className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">ACCOUNT NUMBER/DETAILS</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 017xx-xxxxxx, Sonali Bank A/C"
                        value={payMethodForm.number}
                        onChange={(e) => setPayMethodForm({ ...payMethodForm, number: e.target.value })}
                        className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">TRANSFER INSTRUCTIONS (OPTIONAL)</label>
                      <input
                        type="text"
                        placeholder="e.g. Send Money only"
                        value={payMethodForm.instructions}
                        onChange={(e) => setPayMethodForm({ ...payMethodForm, instructions: e.target.value })}
                        className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                      />
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      {editingPayMethodId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPayMethodId(null);
                            setPayMethodForm({ name: '', number: '', instructions: '' });
                          }}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-mono font-bold py-3 rounded-lg uppercase transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-red-650 to-amber-550 hover:from-red-600 text-white font-mono text-[10px] font-black py-3 rounded-lg uppercase tracking-wider block cursor-pointer transition-all"
                      >
                        {editingPayMethodId ? 'UPDATE METHOD' : 'SAVE METHOD'}
                      </button>
                    </div>
                  </form>

                  {/* Right block - Active Gateways List */}
                  <div className="lg:col-span-3 space-y-4">
                    <h4 className="text-xs font-mono font-bold tracking-wider text-gray-400 uppercase">
                      ACTIVE USER DEPOSIT GATEWAYS ({(settings.paymentMethods || []).length || 3})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                      {(settings.paymentMethods || [
                        { id: '1', name: 'bKash Personal', number: settings.bkash || '01712-345678 (Personal)', instructions: 'Send Money only' },
                        { id: '2', name: 'Nagad Merchant', number: settings.nagad || '01912-876543 (Merchant)', instructions: 'Use Make Payment option' },
                        { id: '3', name: 'Dutch-Bangla Bank', number: settings.bank || 'Popcorn Play Media Ltd, Sonali Bank, A/C: 1022-0987-1234', instructions: 'Transfer' }
                      ]).map((pm) => (
                        <div key={pm.id} className="bg-white/[0.01] border border-white/5 hover:border-white/10 p-4 rounded-2xl flex flex-col justify-between space-y-4 transition-all">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-bold text-yellow-500 font-sans tracking-wide truncate">{pm.name}</span>
                              <span className="text-[9px] bg-red-600/10 text-red-500 px-2 py-0.5 rounded-full font-mono">Live</span>
                            </div>
                            <p className="text-xs font-mono text-gray-300 font-bold select-all mt-2 bg-black/40 p-2 rounded border border-white/5 break-all">
                              {pm.number}
                            </p>
                            {pm.instructions && (
                              <p className="text-[10px] text-gray-500 italic mt-1 pl-1">
                                Info: {pm.instructions}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                            <button
                              onClick={() => {
                                setEditingPayMethodId(pm.id);
                                setPayMethodForm({ name: pm.name, number: pm.number, instructions: pm.instructions || '' });
                              }}
                              className="bg-white/5 hover:bg-yellow-500/10 hover:text-yellow-500 transition-all text-[10px] font-mono py-1.5 rounded-lg flex items-center justify-center space-x-1 text-gray-400"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeletePaymentMethod(pm.id)}
                              className="bg-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all text-[10px] font-mono py-1.5 rounded-lg flex items-center justify-center space-x-1 text-gray-400"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
            
            {/* Dynamic Premium Plans Customizer */}
            <div className="glass p-6 rounded-3xl">
              <div className="mb-6">
                <h3 className="font-display font-extrabold text-base text-white">⚙️ Customizable VIP Upgrade Plans</h3>
                <p className="text-xs text-gray-400">Add, view, or delete subscription packages. These choices immediately propagate to client-side VIP gates dynamically.</p>
              </div>

              {settings && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Left block - Add Package Form */}
                  <div className="lg:col-span-2 bg-[#0c0c0e]/80 border border-white/5 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-mono font-bold tracking-wider text-yellow-500 uppercase flex items-center space-x-1">
                      <span>➕ CREATE BILLING PACKAGE</span>
                    </h4>

                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">PACKAGE NAME</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 30 Days VIP, 6 Months Gold"
                        value={newPlanName}
                        onChange={(e) => setNewPlanName(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">PRICE (BDT)</label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 200"
                          value={newPlanPrice}
                          onChange={(e) => setNewPlanPrice(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">DURATION (DAYS)</label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 30"
                          value={newPlanDays}
                          onChange={(e) => setNewPlanDays(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddPremiumPlan}
                      className="w-full bg-red-650 hover:bg-red-600 text-white font-mono text-[10px] font-black py-4 rounded-xl uppercase tracking-wider block cursor-pointer transition-all"
                    >
                      ADD SUBSCRIPTION PLAN
                    </button>
                  </div>

                  {/* Right block - Current Packages list */}
                  <div className="lg:col-span-3 space-y-4">
                    <h4 className="text-xs font-mono font-bold tracking-wider text-gray-400 uppercase">
                      ACTIVE SYSTEM PACKAGES ({(settings.premiumPlans || []).length || 3})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                      {(settings.premiumPlans || [
                        { id: 'plan-1', name: '30 Days VIP Premium', price: 150, durationDays: 30 },
                        { id: 'plan-2', name: '6 Months VIP Premium', price: 700, durationDays: 180 },
                        { id: 'plan-3', name: '1 Year VIP Premium', price: 1200, durationDays: 365 }
                      ]).map((plan) => (
                        <div key={plan.id} className="bg-white/[0.01] border border-white/5 hover:border-white/10 p-4 rounded-2xl flex flex-col justify-between space-y-4 transition-all">
                          <div>
                            <span className="text-xs font-bold text-yellow-500 font-sans tracking-wide truncate">{plan.name}</span>
                            <div className="flex justify-between items-center mt-2.5">
                              <div>
                                <p className="text-[10px] text-gray-500">Price</p>
                                <p className="text-sm font-sans font-bold text-white">৳{plan.price}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-gray-400">Duration</p>
                                <p className="text-xs font-mono text-emerald-400 font-bold">{plan.durationDays} Days</p>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-white/0.5 pt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleDeletePremiumPlan(plan.id)}
                              className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[10px] px-3 py-1.5 rounded-lg flex items-center space-x-1 font-mono cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* VIP Premium Subscriptions Moderation Dashboard Control Panel */}
            <div className="glass p-6 rounded-3xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-white">VIP Premium Upgrade Ledgers</h3>
                  <p className="text-xs text-gray-400">Verifying cash transactions of bkash, nagad or banks to activate subscriber VIP accounts manually.</p>
                </div>
                
                {/* Real-time search */}
                <div className="relative w-full md:w-72">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search name, txn hash, phone..."
                    className="w-full bg-[#0c0c0e]/80 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 font-sans"
                  />
                  {ledgerSearch && (
                    <button
                      onClick={() => setLedgerSearch('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] font-mono text-gray-500 hover:text-white"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-wrap gap-2.5 bg-black/35 p-1 rounded-2xl border border-white/5">
                {[
                  { value: 'pending', label: 'Pending Verification', count: payments.filter(p => p.status === 'pending').length, badgeColor: 'bg-yellow-500 text-black' },
                  { value: 'approved', label: 'Approved VIPs', count: payments.filter(p => p.status === 'approved').length, badgeColor: 'bg-emerald-500 text-white' },
                  { value: 'rejected', label: 'Rejected Orders', count: payments.filter(p => p.status === 'rejected').length, badgeColor: 'bg-red-500 text-white' },
                  { value: 'all', label: 'All Ledgers', count: payments.length, badgeColor: 'bg-gray-700 text-gray-300' }
                ].map((tab) => {
                  const isActive = ledgerFilter === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setLedgerFilter(tab.value as any)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-red-650 text-white shadow-lg'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${isActive ? 'bg-white text-black' : tab.badgeColor}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Table ledger body */}
              {(() => {
                const filteredPayments = payments.filter((p) => {
                  if (ledgerFilter !== 'all' && p.status !== ledgerFilter) return false;
                  if (ledgerSearch.trim() !== '') {
                    const term = ledgerSearch.toLowerCase();
                    const name = (p.userName || '').toLowerCase();
                    const email = (p.userEmail || '').toLowerCase();
                    const method = (p.method || '').toLowerCase();
                    const sender = (p.senderNumber || '').toLowerCase();
                    const txId = (p.transactionId || '').toLowerCase();
                    return name.includes(term) || email.includes(term) || method.includes(term) || sender.includes(term) || txId.includes(term);
                  }
                  return true;
                });

                if (filteredPayments.length === 0) {
                  return (
                    <div className="text-center py-20 bg-[#08080a] border border-white/5 rounded-2xl">
                      <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-mono">No subscription history matched the selected filter context.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-gray-500 font-mono">
                          <th className="pb-3 px-3">Subscriber Info</th>
                          <th className="pb-3 px-3">Method</th>
                          <th className="pb-3 px-3">Sender Account</th>
                          <th className="pb-3 px-3">Transaction ID (TxID)</th>
                          <th className="pb-3 px-3 text-right">Amount paid (BDT)</th>
                          <th className="pb-3 px-3 text-center">Purchase Date</th>
                          <th className="pb-3 px-3 text-center">Intended Expiry</th>
                          <th className="pb-3 px-3 text-center">Moderation Action</th>
                          <th className="pb-3 px-3 text-right">System Management</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayments.map((p) => (
                          <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                            <td className="py-4.5 px-3 font-medium text-white">
                              <div className="font-sans font-bold leading-tight">{p.userName}</div>
                              <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{p.userEmail}</span>
                            </td>
                            <td className="py-4.5 px-3 uppercase text-yellow-500 font-mono font-black">{p.method}</td>
                            <td className="py-4.5 px-3 font-mono text-gray-300 font-bold select-all">{p.senderNumber}</td>
                            <td className="py-4.5 px-3 font-mono text-xs text-red-400 font-extrabold select-all tracking-wider">{p.transactionId}</td>
                            <td className="py-4.5 px-3 text-right text-emerald-400 font-mono font-bold">৳{p.amount}</td>
                            <td className="py-4.5 px-3 text-center">
                              <div className="font-mono text-xs text-sky-400 font-bold">
                                {(() => {
                                  if (!p.timestamp) return 'N/A';
                                  const d = new Date(p.timestamp);
                                  if (isNaN(d.getTime())) return p.timestamp;
                                  return d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
                                })()}
                              </div>
                              <span className="text-[9px] text-gray-500 font-mono block">
                                {p.timestamp && !isNaN(new Date(p.timestamp).getTime()) ? new Date(p.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                              </span>
                            </td>
                            <td className="py-4.5 px-3 text-center">
                              <div className="font-mono text-xs text-emerald-400 font-bold">
                                {(() => {
                                  if (!p.timestamp) return 'N/A';
                                  const d = new Date(p.timestamp);
                                  if (isNaN(d.getTime())) return `${p.durationDays || 30} Days`;
                                  const exp = new Date(d.getTime() + (p.durationDays || 30) * 24 * 60 * 60 * 1000);
                                  return exp.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
                                })()}
                              </div>
                              <span className="text-[9px] text-gray-500 font-mono block">
                                {p.timestamp && !isNaN(new Date(p.timestamp).getTime()) ? 
                                  new Date(new Date(p.timestamp).getTime() + (p.durationDays || 30) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
                                  : ''}
                              </span>
                            </td>
                            <td className="py-4.5 px-3 text-center">
                              {p.status === 'pending' && (
                                <div className="flex justify-center space-x-1.5">
                                  <button
                                    onClick={() => handlePaymentApprove(p.id)}
                                    className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>APPROVE</span>
                                  </button>
                                  <button
                                    onClick={() => handlePaymentReject(p.id)}
                                    className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>REJECT</span>
                                  </button>
                                </div>
                              )}
                              {p.status === 'approved' && (
                                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-mono font-bold select-none">
                                  <Check className="w-3 h-3" />
                                  <span>APPROVED VIP</span>
                                </span>
                              )}
                              {p.status === 'rejected' && (
                                <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-[10px] font-mono font-medium select-none">
                                  <X className="w-3 h-3" />
                                  <span>REJECTED</span>
                                </span>
                              )}
                            </td>
                            <td className="py-4.5 px-3 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => startEditingPayment(p)}
                                  className="bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-black px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1"
                                  title="Edit Subscription Details"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePaymentClick(p)}
                                  className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1"
                                  title="Delete Subscriber"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Subscriber Editing Modal Pop-up */}
            {editingPayment && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="glass max-w-md w-full p-8 rounded-3xl border border-white/10 space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <h3 className="font-display font-extrabold text-white text-lg">✏️ Edit Subscriber Payment</h3>
                    <button
                      onClick={() => setEditingPayment(null)}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">SUBSCRIBER NAME</label>
                      <input
                        type="text"
                        value={editPayName}
                        onChange={(e) => setEditPayName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">SUBSCRIBER EMAIL</label>
                      <input
                        type="email"
                        value={editPayEmail}
                        onChange={(e) => setEditPayEmail(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white text-gray-300"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">SENDER PHONE</label>
                        <input
                          type="text"
                          value={editPayNumber}
                          onChange={(e) => setEditPayNumber(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">AMOUNT PAID (BDT)</label>
                        <input
                          type="number"
                          value={editPayAmount}
                          onChange={(e) => setEditPayAmount(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-bold text-emerald-400 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">TRANSACTION ID (TxID)</label>
                      <input
                        type="text"
                        value={editPayTxId}
                        onChange={(e) => setEditPayTxId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-yellow-500 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">SUBSCRIPTION APPROVAL STATUS</label>
                      <select
                        value={editPayStatus}
                        onChange={(e) => setEditPayStatus(e.target.value as any)}
                        className="w-full bg-[#101012] border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-sans font-bold shadow-sm"
                      >
                        <option value="pending" className="bg-neutral-950 text-yellow-500">PENDING (Awaiting Verification)</option>
                        <option value="approved" className="bg-neutral-950 text-emerald-400">APPROVED (Premium VIP Enabled)</option>
                        <option value="rejected" className="bg-neutral-950 text-red-500">REJECTED (Access Suspended)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">DURATION (DAYS)</label>
                        <input
                          type="number"
                          value={editPayDurationDays}
                          onChange={(e) => setEditPayDurationDays(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono"
                          placeholder="e.g. 30, 90"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">PURCHASE DATE / কিনার তারিখ</label>
                        <input
                          type="text"
                          value={editPayTimestamp}
                          onChange={(e) => setEditPayTimestamp(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono"
                          placeholder="toLocaleString values"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingPayment(null)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-mono font-bold py-3 rounded-lg uppercase transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdatePaymentFromModal}
                      className="flex-1 bg-red-650 hover:bg-red-650/80 text-white font-mono text-xs font-black py-3 rounded-lg uppercase tracking-wider block cursor-pointer transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 6. SYSTEM CORE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl glass p-8 rounded-3xl space-y-6">
            <h3 className="font-display font-extrabold text-white text-lg mb-4">Popcorn Play Platform Settings</h3>
            
            {settings && (
              <div className="space-y-6">
                <div>
                  <label className="text-xs text-gray-400 font-mono block mb-1">Dynamic Platform Display Title</label>
                  <input
                    type="text"
                    value={settings.appName || ''}
                    onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                    className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">Updating this instantly rebrands user catalog panels dynamically list.</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">Parental Adult Settings PIN Lock</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={settings.adultPin || ''}
                      onChange={(e) => setSettings({ ...settings, adultPin: e.target.value })}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono tracking-widest font-black"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">A 4-digit numeric pin to lift adult restrictions.</span>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">Live customer support status</label>
                    <select
                      value={settings.supportActive ? 'enabled' : 'disabled'}
                      onChange={(e) => setSettings({ ...settings, supportActive: e.target.value === 'enabled' })}
                      className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    >
                      <option value="enabled">Online (Show WhatsApp floating icon)</option>
                      <option value="disabled">Offline (Completely hide widgets)</option>
                    </select>
                  </div>
                </div>

                {/* 🛡️ SYSTEM OPERATOR LOGINS */}
                <div className="border-t border-white/5 pt-6 space-y-4">
                  <h4 className="text-xs font-mono font-bold text-red-500 uppercase tracking-wider">🛡️ Access Management Credentials</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Specify the Gmail address and secure password key required to initialize or resume administrative workspace access.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 font-mono block mb-1">Operator Gmail Account</label>
                      <input
                        type="email"
                        required
                        value={settings.adminEmail || 'admin@popcornplay.com'}
                        onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                        className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                        placeholder="e.g. admin@popcornplay.com"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 font-mono block mb-1">Operator Access Password</label>
                      <input
                        type="text"
                        required
                        value={settings.adminPassword || 'Ikhlas124@#'}
                        onChange={(e) => setSettings({ ...settings, adminPassword: e.target.value })}
                        className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono"
                        placeholder="Security password key"
                      />
                    </div>
                  </div>
                </div>

                {/* 🔒 RECOVERY SECURITY LEDGER BUTTON & TRIGGER */}
                <div className="border-t border-white/5 pt-6 space-y-3">
                  <h4 className="text-xs font-mono font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔒 Operator Recovery Administration</span>
                  </h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    নিবন্ধিত সিকিউরিটি লেজার বা রিকভারি ডাটা যেকোনো সময় পরিবর্তন বা আপডেট করার জন্য নিচের বাটনটি ব্যবহার করুন।
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerStep(1);
                      setTempRecName('');
                      setTempRecMother('');
                      setTempRecFather('');
                      setTempRecBlood('');
                      setTempRecDob('');
                      setTempRecNid('');
                      setAuthEmail('');
                      setAuthPass('');
                      setRecoveryChangeError(null);
                      setRecoveryChangeSuccess(null);
                      setShowLedgerEditModal(true);
                    }}
                    className="w-full bg-[#121215] hover:bg-[#151518] border border-white/10 hover:border-red-500/25 rounded-2xl px-5 py-4 flex items-center justify-between group active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center justify-center text-red-500 group-hover:bg-red-500/20 transition-all">
                        <Fingerprint className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-mono text-white tracking-wide uppercase font-black">
                          🔒 OPERATOR RECOVERY IDENTITY LEDGER
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          Click to enter new recovery properties and authorize
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-red-500 font-mono group-hover:translate-x-1 transition-transform">➔</span>
                  </button>
                </div>

                {/* Operator Recovery Ledger Modification Modal */}
                {showLedgerEditModal && (
                  <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md animate-fadeIn flex justify-center items-start overflow-y-auto p-4 py-6 md:py-12">
                    <div className="w-full max-w-lg bg-[#08080a] border border-white/10 rounded-[28px] p-6 hover:border-white/15 md:p-8 relative shadow-[0_0_60px_rgba(239,68,68,0.16)] space-y-5 my-auto flex flex-col">
                      <div className="flex flex-col items-center justify-center pt-2 pb-4 text-center border-b border-white/5 relative">
                        <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-500 mb-3 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                          <Fingerprint className="w-6 h-6 animate-pulse" />
                        </div>
                        <h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-widest leading-none">
                          Update Operator Recovery Identity Ledger
                        </h3>
                        <span className="text-[9px] text-red-400 font-mono tracking-widest uppercase font-bold mt-1.5 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/15">
                          LEDGER MODIFICATION PROTOCOL
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowLedgerEditModal(false)}
                          className="absolute top-2 right-2 text-gray-550 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1 text-center sm:text-left">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-red-400 font-mono font-bold uppercase tracking-wider bg-red-500/10 px-2.5 py-1 rounded border border-red-500/15">
                            STEP {ledgerStep} OF 2
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {ledgerStep === 1 ? '• Enter New Recovery Data' : '• Master Admin Approval'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                          Configure the unique offline identity details used to recover the administrator log-in credentials.
                        </p>
                        <p className="text-[9px] text-red-400 font-mono leading-relaxed">
                          নিবন্ধিত অফলাইন সিকিউরিটি লেজার বিবরণ পরিবর্তন করতে নিচের ফর্মটি পূরণ করুন এবং আপনার এডমিন ডিটেইলস দিয়ে সাবমিট দিন।
                        </p>
                      </div>

                      {recoveryChangeError && (
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-xs text-red-400 font-mono leading-normal">
                          ⚠️ {recoveryChangeError}
                        </div>
                      )}

                      {recoveryChangeSuccess && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-400 font-mono leading-normal">
                          ✅ {recoveryChangeSuccess}
                        </div>
                      )}

                      <form onSubmit={(e) => { e.preventDefault(); if (ledgerStep === 1) { handleNextStep(); } else { handleUpdateRecoveryCredentials(e); } }} className="space-y-4">
                        {ledgerStep === 1 ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-gray-400 font-mono block mb-1">Full Name / পূর্ণ নাম *</label>
                                <input
                                  type="text"
                                  required
                                  value={tempRecName}
                                  onChange={(e) => setTempRecName(e.target.value)}
                                  className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                                  placeholder="Enter Full Name"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-400 font-mono block mb-1">Mother's Name / মাতার নাম *</label>
                                <input
                                  type="text"
                                  required
                                  value={tempRecMother}
                                  onChange={(e) => setTempRecMother(e.target.value)}
                                  className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                                  placeholder="Enter Mother's Name"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-400 font-mono block mb-1">Father's Name / পিতার নাম *</label>
                                <input
                                  type="text"
                                  required
                                  value={tempRecFather}
                                  onChange={(e) => setTempRecFather(e.target.value)}
                                  className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                                  placeholder="Enter Father's Name"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-400 font-mono block mb-1">Blood Group / রক্ত *</label>
                                <input
                                  type="text"
                                  required
                                  value={tempRecBlood}
                                  onChange={(e) => setTempRecBlood(e.target.value)}
                                  className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                                  placeholder="Enter Blood Group (e.g. B+)"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-400 font-mono block mb-1">Date Of Birth / জন্ম তারিখ *</label>
                                <input
                                  type="text"
                                  required
                                  value={tempRecDob}
                                  onChange={(e) => setTempRecDob(e.target.value)}
                                  className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono"
                                  placeholder="DD-MM-YYYY"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-400 font-mono block mb-1">NID NO / ভোটার আইডি *</label>
                                <input
                                  type="text"
                                  required
                                  value={tempRecNid}
                                  onChange={(e) => setTempRecNid(e.target.value)}
                                  className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white font-mono"
                                  placeholder="Enter NID Number"
                                />
                              </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowLedgerEditModal(false);
                                  setRecoveryChangeSuccess(null);
                                  setRecoveryChangeError(null);
                                }}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-mono text-xs font-bold py-3 px-4 rounded-xl uppercase tracking-wider cursor-pointer transition-all text-center"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleNextStep}
                                className="flex-2 bg-gradient-to-r from-red-650 to-amber-555 hover:from-red-600 hover:to-amber-500 text-white font-mono font-bold text-xs py-3 px-4 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-red-950/25 animate-pulse"
                              >
                                <span>Next step / পরবর্তী ধাপ ➔</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-[#0e0e11] border border-white/5 rounded-2xl p-4 md:p-5 space-y-4 animate-fadeIn">
                              <span className="text-[10px] text-yellow-500 font-mono font-bold uppercase tracking-wider block">
                                ⚠️ Admin Confirmation Verification Required
                              </span>
                              <p className="text-[10px] text-gray-400 leading-normal">
                                To authorize these ledger modifications, please confirm your current Administrative Gmail register account and Password keys below.
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <div>
                                  <label className="text-[9px] text-gray-500 font-mono block mb-1 uppercase tracking-wider">Admin Gmail Address</label>
                                  <input
                                    type="email"
                                    required
                                    placeholder="Current Admin Gmail"
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 focus:border-red-500/20 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-gray-500 font-mono block mb-1 uppercase tracking-wider">Admin Access Password</label>
                                  <input
                                    type="password"
                                    required
                                    placeholder="Current Admin Password"
                                    value={authPass}
                                    onChange={(e) => setAuthPass(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 focus:border-red-500/20 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setLedgerStep(1);
                                  setRecoveryChangeError(null);
                                }}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-mono text-xs font-bold py-3 px-4 rounded-xl uppercase tracking-wider cursor-pointer transition-all text-center"
                              >
                                Back / পিছনে
                              </button>
                              <button
                                type="submit"
                                className="flex-2 bg-gradient-to-r from-red-650 to-amber-555 hover:from-red-600 hover:to-amber-500 text-white font-mono font-bold text-xs py-3 px-4 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-red-950/25 animate-pulse"
                              >
                                <span>🔒 Verify & Synchronize Ledger</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                )}

                {/* Save button for general parameters */}
                <div className="border-t border-white/5 pt-6 mt-4">
                  <button
                    onClick={async (e) => {
                      const button = e.currentTarget;
                      const originalText = button.innerHTML;
                      try {
                        button.disabled = true;
                        button.innerHTML = "<span class='animate-pulse'>Saving & Synchronizing Credentials...</span>";
                        await updateAppSettings(settings);
                        triggerAlert("Platform settings & Admin credentials (Email/Password) successfully synchronized in current DB and authentication system!");
                      } catch (err: any) {
                        console.error(err);
                        triggerAlert("⚠️ Credentials Sync Error: " + (err.message || String(err)));
                      } finally {
                        button.disabled = false;
                        button.innerHTML = originalText;
                      }
                    }}
                    className="w-full bg-red-650 hover:bg-red-600 font-mono font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider text-white disabled:opacity-50 cursor-pointer transition-all"
                  >
                    SAVE ALL DYNAMIC PARAMETERS
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. DYNAMIC CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="glass p-8 rounded-3xl">
              <h3 className="font-display font-extrabold text-white text-lg mb-2">Category & Genre Settings</h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Manage dynamic content subcategories or genres for different content categories. These tags will be available as selectable buttons during content updates to automate search discovery.
              </p>

              {settings && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {(['Movies', 'Anime', 'Drama', 'Cartoon', 'Serial'] as const).map((type) => {
                    const savedCats = settings.customCategories?.[type] || [];
                    const count = savedCats.length;
                    return (
                      <div key={type} className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <span className="text-sm font-sans font-extrabold text-white uppercase tracking-wider">
                            🎬 {type} Categories ({count})
                          </span>
                          <button
                            onClick={() => handleResetCategories(type)}
                            className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all"
                          >
                            RESET TO DEFAULTS
                          </button>
                        </div>

                        {/* Add and List Subclass Options */}
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder={`New category (e.g. 18+ content, Comedy)`}
                            value={newCatInputs[type]}
                            onChange={(e) => setNewCatInputs({ ...newCatInputs, [type]: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory(type))}
                            className="flex-1 bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white"
                          />
                          <button
                            onClick={() => handleAddCategory(type)}
                            className="bg-red-650 hover:bg-red-600 text-white font-mono text-xs px-4 rounded-xl font-bold transition-all"
                          >
                            ADD
                          </button>
                        </div>

                        {/* Current Tags List */}
                        {savedCats.length === 0 ? (
                          <div className="text-[11px] text-gray-500 font-mono py-1">No custom categories registered yet. Click "Reset to Defaults".</div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {savedCats.map((cat, i) => (
                              <span
                                key={i}
                                className="bg-black/50 hover:bg-neutral-800 border border-white/5 text-gray-300 px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center justify-between gap-1.5 group transition-all"
                              >
                                <span>{cat}</span>
                                <div className="flex items-center space-x-1 pl-1 border-l border-white/10">
                                  <button
                                    type="button"
                                    onClick={() => handleEditCategory(type, cat)}
                                    className="text-gray-500 hover:text-yellow-400 transition-colors cursor-pointer"
                                    title="Edit category"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(type, cat)}
                                    className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Delete category"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 8. BROADCAST ANNOUNCEMENT POP-UPS CMS */}
        {activeTab === 'popups' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="glass p-6 md:p-8 rounded-3xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5 mb-6">
                <div>
                  <h3 className="font-display font-extrabold text-white text-xl">Broadcast Overlay Announcements</h3>
                  <p className="text-gray-400 text-xs mt-1">Configure premium, visual modal announcements pushed to users upon system launch.</p>
                </div>
                {editingPopupId && (
                  <button
                    onClick={() => {
                      setEditingPopupId(null);
                      setNewPopupTitle('');
                      setNewPopupMessage('');
                      setNewPopupImageUrl('');
                      setNewPopupButtonText('👉 EXPLORE NOW');
                      setNewPopupButtonLink('#premium');
                      setNewPopupRedirectLink('');
                      setNewPopupAutoCloseDelay('');
                      setNewPopupIsActive(true);
                    }}
                    className="bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-mono px-4 py-2 rounded-xl transition-all font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              {/* Main row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Form column */}
                <div className="bg-black/20 border border-white/5 rounded-2xl p-5 md:p-6 space-y-4">
                  <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-wider block">
                    {editingPopupId ? '✏️ Edit Broadcast Notice' : '📢 Add New Popup / Construct Overlay'}
                  </span>
                  
                  <div className="space-y-4 font-sans">
                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">1. Popup Title / popup এর নাম *</label>
                      <input
                        type="text"
                        value={newPopupTitle}
                        onChange={(e) => setNewPopupTitle(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 focus:border-red-500/20 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white"
                        placeholder="e.g. 🎉 Grand Eid Release Event!"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">Popup Welcome Text / Tagline Phrase *</label>
                      <textarea
                        value={newPopupMessage}
                        onChange={(e) => setNewPopupMessage(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 focus:border-red-500/20 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white h-24 resize-none"
                        placeholder="Provide details about the update or Eid celebration actions..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">2. Image URL / Upload Link</label>
                        <input
                          type="url"
                          value={newPopupImageUrl}
                          onChange={(e) => setNewPopupImageUrl(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 focus:border-red-500/20 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">Action Button Text</label>
                        <input
                          type="text"
                          value={newPopupButtonText}
                          onChange={(e) => setNewPopupButtonText(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 focus:border-red-500/20 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white"
                          placeholder="e.g.: 👉 EXPLORE NOW"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">3. Redirect Link / রিডায়রেক্ট লিংক (Optional)</label>
                      <input
                        type="url"
                        value={newPopupRedirectLink}
                        onChange={(e) => setNewPopupRedirectLink(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 focus:border-red-500/20 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                        placeholder="e.g. https://facebook.com/yourpage or https://t.me/yourchannel"
                      />
                      <span className="text-[9px] text-gray-500 mt-1 block">user যদি image বা Action Button এ click করে তখন যেনো user কে সেখানে নিয়ে যায়।</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">4. Enable Popup / পপআপ চালু রাখুন?</label>
                        <div className="flex items-center space-x-3 mt-1.5">
                          <button
                            type="button"
                            onClick={() => setNewPopupIsActive(!newPopupIsActive)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${newPopupIsActive ? 'bg-red-650' : 'bg-neutral-800'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newPopupIsActive ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <span className={`text-xs font-mono ${newPopupIsActive ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                            {newPopupIsActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">5. Auto-Close Delay (seconds)</label>
                        <input
                          type="number"
                          min={1}
                          max={300}
                          value={newPopupAutoCloseDelay}
                          onChange={(e) => setNewPopupAutoCloseDelay(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-[#101012] border border-white/5 focus:border-red-500/20 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                          placeholder="e.g. 5 or leave blank"
                        />
                        <span className="text-[9px] text-gray-500 mt-1 block">কতক্ষন popup show করবে তা seconds এ দিন।</span>
                      </div>
                    </div>

                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newPopupTitle.trim() || !newPopupMessage.trim()) {
                            triggerAlert("Title & Message fields are required!");
                            return;
                          }
                          let plist = settings?.popups ? [...settings.popups] : [];
                          
                          if (newPopupIsActive) {
                            // If user is editing/creating and made this popup active, keep other active ones active too, or handle custom sequence.
                            // To be convenient, sequential showing handles multiple active ones. We can allow multiple active popups.
                          }

                          if (editingPopupId) {
                            plist = plist.map(p => p.id === editingPopupId ? {
                              ...p,
                              title: newPopupTitle.trim(),
                              message: newPopupMessage.trim(),
                              imageUrl: newPopupImageUrl.trim() || undefined,
                              buttonText: newPopupButtonText.trim() || undefined,
                              buttonLink: newPopupRedirectLink.trim() || undefined, // match redirectLink or legacy state buttonLink
                              redirectLink: newPopupRedirectLink.trim() || undefined,
                              autoCloseDelay: newPopupAutoCloseDelay !== '' ? Number(newPopupAutoCloseDelay) : undefined,
                              isActive: newPopupIsActive
                            } : p);
                            triggerAlert("Notice updated successfully.");
                          } else {
                            const np: PopupItem = {
                              id: 'popup-' + Date.now().toString(36),
                              title: newPopupTitle.trim(),
                              message: newPopupMessage.trim(),
                              imageUrl: newPopupImageUrl.trim() || undefined,
                              buttonText: newPopupButtonText.trim() || undefined,
                              buttonLink: newPopupRedirectLink.trim() || undefined,
                              redirectLink: newPopupRedirectLink.trim() || undefined,
                              autoCloseDelay: newPopupAutoCloseDelay !== '' ? Number(newPopupAutoCloseDelay) : undefined,
                              isActive: newPopupIsActive,
                              createdAt: Date.now()
                            };
                            plist.push(np);
                            triggerAlert("New broadcast pop-up announcement published!");
                          }

                          const hasActive = plist.some(p => p.isActive);
                          const activeItem = plist.find(p => p.isActive);

                          const updatedSettings = {
                            ...settings!,
                            popups: plist,
                            popupEnabled: hasActive,
                            popupTitle: activeItem ? activeItem.title : '',
                            popupMessage: activeItem ? activeItem.message : '',
                            popupImageUrl: activeItem ? activeItem.imageUrl : '',
                            popupButtonText: activeItem ? activeItem.buttonText : '',
                            popupButtonLink: activeItem ? activeItem.buttonLink : ''
                          };

                          setSettings(updatedSettings);
                          await updateAppSettings(updatedSettings);

                          // Clear form
                          setEditingPopupId(null);
                          setNewPopupTitle('');
                          setNewPopupMessage('');
                          setNewPopupImageUrl('');
                          setNewPopupButtonText('👉 EXPLORE NOW');
                          setNewPopupButtonLink('#premium');
                          setNewPopupRedirectLink('');
                          setNewPopupAutoCloseDelay('');
                          setNewPopupIsActive(true);
                        }}
                        className="w-full bg-red-650 hover:bg-red-600 text-white font-mono font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-red-950/20"
                      >
                        <span>{editingPopupId ? '🎯 Update Broadcast Overlay' : '🚀 Publish Broadcast Overlay'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Display Feed Column */}
                <div className="space-y-4">
                  <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest block">Active Announcements Book</span>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {(!settings?.popups || settings.popups.length === 0) ? (
                      <div className="text-center p-8 bg-neutral-900/40 border border-white/5 rounded-2xl text-gray-500 text-xs font-sans">No custom pop-up announcements registered yet. Construct one on the left.</div>
                    ) : (
                      settings.popups.map((popup) => (
                        <div key={popup.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/10 transition-all">
                          <div className="flex gap-3 items-start min-w-0 font-sans">
                            {popup.imageUrl ? (
                              <img src={popup.imageUrl} alt="" className="w-16 h-12 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                            ) : (
                              <div className="w-16 h-12 rounded-lg bg-[#141418] border border-white/5 flex items-center justify-center text-gray-500 font-mono text-[9px] flex-shrink-0 font-bold">NO IMG</div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                <span className="text-sm font-bold text-white truncate max-w-[150px]">{popup.title}</span>
                                {popup.isActive ? (
                                  <span className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">ACTIVE</span>
                                ) : (
                                  <span className="bg-neutral-800 border border-white/5 text-gray-500 text-[8px] font-mono px-1.5 py-0.5 rounded uppercase">DISABLED</span>
                                )}
                                {popup.autoCloseDelay && (
                                  <span className="bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[8px] font-mono px-1.5 py-0.5 rounded">
                                    ⏳ {popup.autoCloseDelay}s Delay
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed mt-1 font-sans">{popup.message}</p>
                              {popup.buttonText && (
                                <span className="text-[9px] font-mono text-gray-400 mt-1 block">CTA Button text: <span className="text-red-400 font-semibold">{popup.buttonText}</span></span>
                              )}
                              {popup.redirectLink && (
                                <span className="text-[9px] font-mono text-blue-400 truncate max-w-[200px] mt-0.5 block flex items-center gap-1" title={popup.redirectLink}>
                                  🔗 Redirect: <span className="underline">{popup.redirectLink}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 w-full md:w-auto justify-end flex-shrink-0 border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
                            <button
                              onClick={async () => {
                                // Toggle active state for this specific popup item
                                let plist = settings?.popups ? [...settings.popups] : [];
                                plist = plist.map(p => p.id === popup.id ? { ...p, isActive: !p.isActive } : p);
                                
                                const hasActive = plist.some(p => p.isActive);
                                const activeItem = plist.find(p => p.isActive);
                                const updatedSettings = {
                                  ...settings!,
                                  popups: plist,
                                  popupEnabled: hasActive,
                                  popupTitle: activeItem ? activeItem.title : '',
                                  popupMessage: activeItem ? activeItem.message : '',
                                  popupImageUrl: activeItem ? activeItem.imageUrl : '',
                                  popupButtonText: activeItem ? activeItem.buttonText : '',
                                  popupButtonLink: activeItem ? activeItem.buttonLink : ''
                                };
                                setSettings(updatedSettings);
                                await updateAppSettings(updatedSettings);
                                triggerAlert(`Popup "${popup.title}" ${!popup.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`);
                              }}
                              className={`p-1.5 px-3 text-[9px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                                popup.isActive ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                              }`}
                            >
                              {popup.isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingPopupId(popup.id);
                                setNewPopupTitle(popup.title);
                                setNewPopupMessage(popup.message);
                                setNewPopupImageUrl(popup.imageUrl || '');
                                setNewPopupButtonText(popup.buttonText || '👉 EXPLORE NOW');
                                setNewPopupButtonLink(popup.buttonLink || '#premium');
                                setNewPopupRedirectLink(popup.redirectLink || popup.buttonLink || '');
                                setNewPopupAutoCloseDelay(popup.autoCloseDelay !== undefined ? popup.autoCloseDelay : '');
                                setNewPopupIsActive(popup.isActive || false);
                              }}
                              className="p-1 px-2.5 text-[9px] font-mono bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                showConfirm("Delete Popup", `Are you sure you want to permanently delete custom pop-up "${popup.title}"?`, async () => {
                                  let plist = settings?.popups ? [...settings.popups] : [];
                                  plist = plist.filter(p => p.id !== popup.id);
                                  const hasActive = plist.some(p => p.isActive);
                                  const activeItem = plist.find(p => p.isActive);
                                  const updatedSettings = {
                                    ...settings!,
                                    popups: plist,
                                    popupEnabled: hasActive,
                                    popupTitle: activeItem ? activeItem.title : '',
                                    popupMessage: activeItem ? activeItem.message : '',
                                    popupImageUrl: activeItem ? activeItem.imageUrl : '',
                                    popupButtonText: activeItem ? activeItem.buttonText : '',
                                    popupButtonLink: activeItem ? activeItem.buttonLink : ''
                                  };
                                  setSettings(updatedSettings);
                                  await updateAppSettings(updatedSettings);
                                  triggerAlert("Custom pop-up deleted successfully.");
                                });
                              }}
                              className="p-1.5 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 9. CAROUSEL HERO BANNERS SLIDER CMS */}
        {activeTab === 'banners' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="glass p-6 md:p-8 rounded-3xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5">
                <div>
                  <h3 className="font-display font-extrabold text-white text-xl">Hero Banners Manager</h3>
                  <p className="text-gray-400 text-xs mt-1">Directly regulate manual carousel designs and auto-banners queues rotation.</p>
                </div>
                {editingBannerId && (
                  <button
                    onClick={() => {
                      setEditingBannerId(null);
                      setNewBannerTitle('');
                      setNewBannerDesc('');
                      setNewBannerUrl('');
                      setNewBannerCategory('Movies');
                      setNewBannerContentId('');
                      setNewBannerLink('');
                      setNewBannerIsActive(true);
                      setNewBannerExpirationDays('');
                    }}
                    className="bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-mono px-4 py-2 rounded-xl transition-all"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {/* Advanced configuration bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#09090c] p-5 rounded-2xl border border-white/5 font-sans">
                <div>
                  <label className="text-xs font-mono font-bold text-gray-300 block mb-1">🎯 Auto Banner Retention Limit</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={settings?.autoBannerLimit !== undefined ? settings.autoBannerLimit : 5}
                    onChange={async (e) => {
                      const next = Number(e.target.value);
                      const updated = { ...settings!, autoBannerLimit: next };
                      setSettings(updated);
                      await updateAppSettings(updated);
                    }}
                    className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-gray-500 mt-1.5 block">Maximum automated items (auto-added upon upload) kept in slides. Excess triggers FIFO pruning.</span>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold text-gray-300 block mb-1">⏳ Auto Banner Expiration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={settings?.autoBannerDays !== undefined ? settings.autoBannerDays : 30}
                    onChange={async (e) => {
                      const next = Number(e.target.value);
                      const updated = { ...settings!, autoBannerDays: next };
                      setSettings(updated);
                      await updateAppSettings(updated);
                    }}
                    className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-gray-500 mt-1.5 block">Maximum days an automatically generated banner is allowed to remain visible in user panel. Value of 9999 means unlimited.</span>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold text-gray-300 block mb-1">🎬 Banner Slide Animation (২০+ স্লাইড অ্যানিমেশন)</label>
                  <select
                    value={settings?.bannerAnimationType || 'fade'}
                    onChange={async (e) => {
                      const next = e.target.value;
                      const updated = { ...settings!, bannerAnimationType: next };
                      setSettings(updated);
                      await updateAppSettings(updated);
                    }}
                    className="w-full bg-[#121215] border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    {Object.entries(SLIDER_ANIMATIONS).map(([key, anim]) => (
                      <option key={key} value={key} className="bg-[#121215] text-white text-xs">
                        {anim.name} ({anim.banglaName})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-500 mt-1.5 block">Select the active transition style for user-facing billboard slides. Powered by hardware-accelerated loops.</span>
                </div>
              </div>

              {/* Split screen banner admin */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Form layout */}
                <div className="bg-black/20 border border-white/5 rounded-2xl p-5 space-y-4">
                  <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-wider block">
                    {editingBannerId ? '✏️ Edit Carousel Slide' : '➕ Register Custom Slide'}
                  </span>
                  
                  <div className="space-y-4 font-sans">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">Banner Slide Title *</label>
                        <input
                          type="text"
                          value={newBannerTitle}
                          onChange={(e) => setNewBannerTitle(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white"
                          placeholder="e.g. TOOFAN (2025)"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">Banner Small Tagline / Note</label>
                        <input
                          type="text"
                          value={newBannerDesc}
                          onChange={(e) => setNewBannerDesc(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white"
                          placeholder="e.g. Stream Eid blockbuster movie online"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">Slide Cover Image Artwork URL *</label>
                        <input
                          type="url"
                          value={newBannerUrl}
                          onChange={(e) => setNewBannerUrl(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">Banner Redirection Link (Optional)</label>
                        <input
                          type="url"
                          value={newBannerLink}
                          onChange={(e) => setNewBannerLink(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                          placeholder="e.g. https://t.me/popcornplay or https://facebook.com/..."
                        />
                        <span className="text-[9px] text-gray-500 mt-1 block">Redirects user to Telegram, FB group or link direct on element click.</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">Category Route Filtering</label>
                        <select
                          value={newBannerCategory}
                          onChange={(e) => setNewBannerCategory(e.target.value as ContentCategory)}
                          className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white text-gray-300"
                        >
                          <option value="Movies">standalone Movies</option>
                          <option value="Anime">Anime Series</option>
                          <option value="Drama">Korean / Bangla Dramas</option>
                          <option value="Cartoon">Kids Cartoons</option>
                          <option value="Serial">Web Series Collections</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">Associated Content ID (Optional)</label>
                        <input
                          type="text"
                          value={newBannerContentId}
                          onChange={(e) => setNewBannerContentId(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                          placeholder="e.g. m_12345"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">⏳ Auto Banner Expiration (Days)</label>
                        <input
                          type="number"
                          value={newBannerExpirationDays}
                          onChange={(e) => setNewBannerExpirationDays(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                          placeholder="e.g. 30 (Empty for unlimited)"
                          min={1}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-neutral-900/60 rounded-xl border border-white/5">
                      <div>
                        <span className="text-xs font-bold text-white block">Status: Enable Banner?</span>
                        <span className="text-[9px] text-gray-400 block font-mono">Control slide direct active visibility inside homepage.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewBannerIsActive(!newBannerIsActive)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${newBannerIsActive ? 'bg-red-650' : 'bg-neutral-800'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newBannerIsActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newBannerTitle.trim() || !newBannerUrl.trim()) {
                            triggerAlert("Title & Image Cover artwork URL are required!");
                            return;
                          }
                          const allBanners = settings?.banners ? [...settings.banners] : [];
                          let updatedB: BannerItem[] = [];

                          if (editingBannerId) {
                            updatedB = allBanners.map(b => {
                              if (b.id === editingBannerId) {
                                const updated: any = {
                                  ...b,
                                  title: newBannerTitle.trim(),
                                  description: newBannerDesc.trim(),
                                  coverUrl: newBannerUrl.trim(),
                                  category: newBannerCategory,
                                  contentId: newBannerContentId.trim(),
                                  isActive: newBannerIsActive
                                };
                                if (newBannerLink.trim()) {
                                  updated.link = newBannerLink.trim();
                                } else {
                                  delete updated.link;
                                }
                                if (newBannerExpirationDays.trim()) {
                                  updated.expirationDays = Number(newBannerExpirationDays);
                                } else {
                                  delete updated.expirationDays;
                                }
                                return updated as BannerItem;
                              }
                              return b;
                            });
                            triggerAlert("Hero slide modified successfully.");
                          } else {
                            const slide: any = {
                              id: 'banner-custom-' + Date.now().toString(36),
                              title: newBannerTitle.trim(),
                              description: newBannerDesc.trim(),
                              coverUrl: newBannerUrl.trim(),
                              category: newBannerCategory,
                              contentId: newBannerContentId.trim(),
                              isActive: newBannerIsActive,
                              type: 'custom',
                              createdAt: Date.now()
                            };
                            if (newBannerLink.trim()) {
                              slide.link = newBannerLink.trim();
                            }
                            if (newBannerExpirationDays.trim()) {
                              slide.expirationDays = Number(newBannerExpirationDays);
                            }
                            updatedB = [slide as BannerItem, ...allBanners];
                            triggerAlert("Custom hero slide appended!");
                          }

                          const updatedSec = { ...settings!, banners: updatedB };
                          setSettings(updatedSec);
                          await updateAppSettings(updatedSec);

                          // reset
                          setEditingBannerId(null);
                          setNewBannerTitle('');
                          setNewBannerDesc('');
                          setNewBannerUrl('');
                          setNewBannerCategory('Movies');
                          setNewBannerContentId('');
                          setNewBannerLink('');
                          setNewBannerIsActive(true);
                          setNewBannerExpirationDays('');
                        }}
                        className="w-full bg-red-650 hover:bg-red-600 font-mono font-bold text-xs py-3 rounded-xl uppercase tracking-wider text-white transition-all shadow-md shadow-red-950/20 cursor-pointer"
                      >
                        <span>{editingBannerId ? '🎯 Update Hero Slide' : '🚀 Publish Custom Slide'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Slides active gallery row */}
                <div className="space-y-4">
                  <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest block">Slider Carousel Deck</span>

                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {(!settings?.banners || settings.banners.length === 0) ? (
                      <div className="text-center p-8 bg-neutral-900/40 border border-white/5 rounded-2xl text-gray-500 text-xs">No hero slides currently active. Build banner on left card.</div>
                    ) : (
                      settings.banners.map((ban) => (
                        <div key={ban.id} className="p-3 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between gap-3 hover:border-white/10 transition-all font-sans">
                          <div className="flex items-center space-x-3 min-w-0 max-w-[70%] text-left">
                            <img src={ban.coverUrl} alt="" className="w-16 h-10 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-bold text-white truncate block">{ban.title}</span>
                                <span className={`text-[7px] font-mono font-black px-1.5 py-0.5 rounded ${
                                  ban.type === 'auto' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                  {(ban.type || 'CUSTOM').toUpperCase()}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 block truncate mt-0.5">{ban.description || 'No taglines/note provided.'}</span>
                              
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[8px] opacity-70 font-mono bg-white/5 border border-white/10 px-1 text-gray-400 rounded inline-block">{ban.category}</span>
                                {ban.expirationDays && (
                                  <span className="text-[8px] font-mono bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1 rounded inline-block">
                                    ⏳ {ban.expirationDays} Days Expire
                                  </span>
                                )}
                                {ban.link && (
                                  <span className="text-[8px] font-mono bg-blue-500/10 text-blue-400 px-1 rounded truncate max-w-[120px]" title={ban.link}>
                                    🔗 {ban.link}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            {/* Toggle Banner Active status */}
                            <button
                              onClick={async () => {
                                const updated = (settings?.banners || []).map(b => b.id === ban.id ? { ...b, isActive: b.isActive === false ? true : false } : b);
                                const updatedSec = { ...settings!, banners: updated };
                                setSettings(updatedSec);
                                await updateAppSettings(updatedSec);
                                triggerAlert(`Slide "${ban.title}" ${ban.isActive !== false ? 'নিষ্ক্রিয়' : 'সক্রিয়'} করা হয়েছে।`);
                              }}
                              className={`p-1 px-2 text-[9px] font-mono rounded-lg transition-all flex items-center space-x-1 ${
                                ban.isActive !== false 
                                  ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                                  : 'bg-white/5 text-gray-500 hover:bg-white/10'
                              }`}
                            >
                              <span>{ban.isActive !== false ? '✅ On' : '❌ Off'}</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditingBannerId(ban.id);
                                setNewBannerTitle(ban.title);
                                setNewBannerDesc(ban.description || '');
                                setNewBannerUrl(ban.coverUrl);
                                setNewBannerCategory(ban.category || 'Movies');
                                setNewBannerContentId(ban.contentId || '');
                                setNewBannerLink(ban.link || '');
                                setNewBannerIsActive(ban.isActive !== false);
                                setNewBannerExpirationDays(ban.expirationDays !== undefined ? String(ban.expirationDays) : '');
                              }}
                              className="p-1 px-2 text-[9px] font-mono bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg flex items-center space-x-1 transition-all"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => {
                                showConfirm("Delete Slide Banner", `Are you sure you want to delete the slide banner "${ban.title}"?`, async () => {
                                  const filtered = (settings?.banners || []).filter(b => b.id !== ban.id);
                                  const updatedSec = { ...settings!, banners: filtered };
                                  setSettings(updatedSec);
                                  await updateAppSettings(updatedSec);
                                  triggerAlert("Hero slide removed successfully.");
                                });
                              }}
                              className="p-1.5 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 10. INTERACTIVE PUSH NOTIFICATION CENTER */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-7xl mx-auto font-sans">
            <div className="glass p-6 md:p-8 rounded-3xl space-y-6">
              <div>
                <h3 className="font-display font-extrabold text-white text-xl">Interactive Notification Center</h3>
                <p className="text-gray-400 text-xs mt-1">Dispatch high importance bulletins to user feeds, edit active alert terms and establish automatic broadcast safeguards limits.</p>
              </div>

              {/* Limit adjusters & instant messenger split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Immediate bulletin messenger code */}
                <div className="bg-black/20 border border-white/5 rounded-2xl p-5 space-y-4">
                  <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-wider block">
                    🚀 Dispatch High Priority Bulletin
                  </span>
                  
                  <textarea
                    value={pushMsg}
                    onChange={(e) => setPushMsg(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl p-3 text-xs text-white h-24 resize-none font-sans"
                    placeholder="Eid Mubarak! We registered standalone Blockbusters movies inside list. Play now!"
                  />

                  <div className="grid grid-cols-2 gap-3 pb-2 font-mono text-[10px]">
                    <div>
                      <label className="text-gray-400 block mb-0.5">Queue Rotation Limit</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={settings?.autoNotificationLimit !== undefined ? settings.autoNotificationLimit : 5}
                        onChange={async (e) => {
                          const nextLimit = Number(e.target.value);
                          const updated = { ...settings!, autoNotificationLimit: nextLimit };
                          setSettings(updated);
                          await updateAppSettings(updated);
                        }}
                        className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-gray-500 block mt-4">FIFO automated pruning rules safeguard memory.</span>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!pushMsg.trim()) return;
                      await sendNotification(pushMsg.trim());
                      triggerAlert("Platform-wide bulletin successfully dispatched!");
                      setPushMsg('');
                    }}
                    disabled={!pushMsg.trim()}
                    className="w-full bg-red-650 hover:bg-red-600 disabled:opacity-40 text-white font-mono font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-red-950/20"
                  >
                    Dispatch Now
                  </button>
                </div>

                {/* Notifications Archive feed */}
                <div className="space-y-4">
                  <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest block">Active Bulletin Archives ({notificationsList.length})</span>

                  {editingNotifId && (
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3 animate-fade-in font-sans">
                      <span className="text-xs font-mono font-semibold text-white block">✏️ Fine-tune Alert Phrase</span>
                      <textarea
                        value={editingNotifText}
                        onChange={(e) => setEditingNotifText(e.target.value)}
                        className="w-full bg-[#101012] border border-white/5 focus:border-red-500/20 focus:outline-none rounded-xl p-3 text-xs text-white h-16 resize-none"
                      />
                      <div className="flex justify-end gap-2 text-[10px] font-mono">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNotifId(null);
                            setEditingNotifText('');
                          }}
                          className="bg-white/5 text-gray-400 px-3 py-1.5 rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!editingNotifText.trim()) return;
                            const match = notificationsList.find(n => n.id === editingNotifId);
                            if (match) {
                              await updateNotificationItem({
                                ...match,
                                msg: editingNotifText.trim()
                              });
                              triggerAlert("Modified alert phrase saved.");
                              setEditingNotifId(null);
                              setEditingNotifText('');
                            }
                          }}
                          className="bg-red-650 text-white font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2 custom-scrollbar font-sans">
                    {notificationsList.length === 0 ? (
                      <div className="text-center p-8 bg-neutral-900/40 border border-white/5 rounded-2xl text-gray-500 text-xs">No active alert logs found on system database.</div>
                    ) : (
                      notificationsList.map((notif) => (
                        <div key={notif.id} className="flex justify-between items-start p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-white/10 transition-all gap-4">
                          <div className="min-w-0 flex-1 font-sans">
                            <p className="text-xs text-gray-100 leading-relaxed font-normal break-words">{notif.msg}</p>
                            <div className="flex items-center space-x-2 mt-2 font-mono text-[9px]">
                              <span className="text-gray-500">{notif.time || 'Dispatched'}</span>
                              <span className={`px-1 rounded-sm text-[8px] tracking-wider uppercase font-extrabold ${
                                notif.type === 'auto' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/5' : 'bg-red-500/15 text-red-500 border border-red-500/5'
                              }`}>
                                {(notif.type || 'bulletin').toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <button
                              onClick={() => {
                                setEditingNotifId(notif.id);
                                setEditingNotifText(notif.msg);
                              }}
                              className="p-1.5 text-gray-400 bg-white/5 hover:bg-[#161619] rounded-lg transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                showConfirm("Delete Alert Log", "Are you sure you want to permanently delete this alert from users' feeds?", async () => {
                                  await deleteNotificationItem(notif.id);
                                  triggerAlert("Notification alert deleted.");
                                });
                              }}
                              className="p-1.5 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 11. SOCIAL LINKS CONFIGURATION */}
        {activeTab === 'socials' && (
          <div className="space-y-6">
            <div className="glass p-8 rounded-3xl animate-fadeIn">
              <h3 className="font-display font-extrabold text-white text-lg mb-2">Configure Social Services & Help Links</h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6 font-mono">
                Manage external dynamic redirects shown globally to platform end-users. Registered links and channels show on user helpdesks and directories.
              </p>

              {settings && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  {/* Left Column: Form to Add/Edit Social Link */}
                  <div className="xl:col-span-5 space-y-4">
                    <div className="bg-[#0b0b0e] border border-white/5 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-mono font-bold text-red-500 uppercase tracking-wider">
                        {editingSocialId ? '✍️ Edit Social Resource' : '➕ Register Social Resource'}
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Platform Name (যেমন: Telegram, Facebook, YouTube, WhatsApp)</label>
                          <input
                            type="text"
                            placeholder="e.g. Telegram"
                            value={newSocialPlatform}
                            onChange={(e) => setNewSocialPlatform(e.target.value)}
                            className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Link Name (যেমন: Official Channel, Discussion Group, Support Chat)</label>
                          <input
                            type="text"
                            placeholder="e.g. Official Channel"
                            value={newSocialLinkName}
                            onChange={(e) => setNewSocialLinkName(e.target.value)}
                            className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Platform URL Link</label>
                          <input
                            type="url"
                            placeholder="https://t.me/PopcornPlayOfficial"
                            value={newSocialUrl}
                            onChange={(e) => setNewSocialUrl(e.target.value)}
                            className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Icon Name (Material / Lucide name e.g. Send, Facebook, Tv, MessageCircle, Phone, Globe, Link)</label>
                          <select
                            value={newSocialIcon}
                            onChange={(e) => setNewSocialIcon(e.target.value)}
                            className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white"
                          >
                            <option value="Send">Send (Telegram)</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Tv">Tv (YouTube)</option>
                            <option value="MessageCircle">MessageCircle (WhatsApp)</option>
                            <option value="Phone">Phone</option>
                            <option value="Globe">Globe</option>
                            <option value="Link">Link (Generic)</option>
                            <option value="Megaphone">Megaphone</option>
                            <option value="Sparkles">Sparkles</option>
                          </select>
                          <span className="text-[10px] text-gray-500 block mt-1 leading-normal font-sans">
                            or type a custom Material / Lucide icon name below:
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. Send, Facebook, MessageCircle"
                            value={newSocialIcon}
                            onChange={(e) => setNewSocialIcon(e.target.value)}
                            className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white font-mono mt-1"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        {editingSocialId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSocialId(null);
                              setNewSocialPlatform('');
                              setNewSocialLinkName('');
                              setNewSocialUrl('');
                              setNewSocialIcon('Globe');
                            }}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-mono text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider cursor-pointer transition-all"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newSocialPlatform.trim() || !newSocialLinkName.trim() || !newSocialUrl.trim()) {
                              triggerAlert("সকল তথ্য সঠিকভাবে পূরণ করুন!");
                              return;
                            }
                            
                            const currentLinks = settings.socialLinks || [];
                            let updatedLinks = [...currentLinks];
                            
                            if (editingSocialId) {
                              updatedLinks = updatedLinks.map(link => 
                                link.id === editingSocialId 
                                  ? { ...link, platformName: newSocialPlatform.trim(), linkName: newSocialLinkName.trim(), url: newSocialUrl.trim(), icon: newSocialIcon.trim() }
                                  : link
                              );
                              setEditingSocialId(null);
                            } else {
                              const newLink = {
                                id: 'sl-' + Date.now(),
                                platformName: newSocialPlatform.trim(),
                                linkName: newSocialLinkName.trim(),
                                url: newSocialUrl.trim(),
                                icon: newSocialIcon.trim(),
                                createdAt: Date.now()
                              };
                              updatedLinks.push(newLink);
                            }
                            
                            const updatedSettings = { ...settings, socialLinks: updatedLinks };
                            await updateAppSettings(updatedSettings);
                            setSettings(updatedSettings);
                            
                            // Reset state
                            setNewSocialPlatform('');
                            setNewSocialLinkName('');
                            setNewSocialUrl('');
                            setNewSocialIcon('Globe');
                            
                            triggerAlert(editingSocialId ? "সামাজিক যোগসূত্র সফলভাবে আপডেট করা হয়েছে।" : "নতুন সামাজিক যোগসূত্র যুক্ত করা হয়েছে।");
                          }}
                          className={`${editingSocialId ? 'bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400' : 'bg-red-650 hover:bg-red-600'} text-white font-mono font-bold text-xs py-2.5 px-4 rounded-xl uppercase tracking-wider flex-1 cursor-pointer transition-all text-center`}
                        >
                          {editingSocialId ? 'SAVE CHANGES' : 'CREATE SOCIAL LINK'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: List of Existing Social Links */}
                  <div className="xl:col-span-7 space-y-4">
                    <div className="bg-[#0b0b0e] border border-white/5 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                        Existing Links / যুক্ত হওয়া লিংক সমূহ
                      </h4>

                      <div className="space-y-3">
                        {!settings.socialLinks || settings.socialLinks.length === 0 ? (
                          <div className="text-center py-8 border border-dashed border-white/5 rounded-2xl">
                            <Globe className="w-8 h-8 text-gray-600 mx-auto mb-2 animate-pulse" />
                            <p className="text-xs text-gray-500 font-mono">কোন সামাজিক লিংক এখনো যুক্ত করা হয়নি।</p>
                          </div>
                        ) : (
                          settings.socialLinks.map((link) => (
                            <div key={link.id} className="flex justify-between items-center bg-black/40 border border-white/5 p-4 rounded-2xl hover:border-red-500/20 hover:bg-[#121215] transition-all">
                              <div className="flex items-center space-x-3.5 min-w-0">
                                <div className="w-10 h-10 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center justify-center text-red-500">
                                  <span className="text-[10px] font-bold font-mono tracking-tighter truncate max-w-[36px]">
                                    {link.icon || 'Link'}
                                  </span>
                                </div>
                                <div className="truncate text-left min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-sans font-black text-white">{link.platformName}</span>
                                    <span className="text-[9px] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full text-gray-400 font-mono uppercase truncate max-w-[80px]">{link.icon}</span>
                                  </div>
                                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{link.linkName}</p>
                                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-red-400 truncate font-mono mt-0.5 block hover:underline">
                                    {link.url}
                                  </a>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSocialId(link.id);
                                    setNewSocialPlatform(link.platformName);
                                    setNewSocialLinkName(link.linkName);
                                    setNewSocialUrl(link.url);
                                    setNewSocialIcon(link.icon || 'Globe');
                                  }}
                                  className="p-1.5 text-gray-400 bg-white/5 hover:bg-[#161619] rounded-lg transition-all cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    showConfirm("Delete Social Link", `Are you sure you want to permanently delete the social link for '${link.platformName} - ${link.linkName}'?`, async () => {
                                      const updatedLinks = (settings.socialLinks || []).filter(sl => sl.id !== link.id);
                                      const updatedSettings = { ...settings, socialLinks: updatedLinks };
                                      await updateAppSettings(updatedSettings);
                                      setSettings(updatedSettings);
                                      
                                      // If deleting the currently edited item, clear form
                                      if (editingSocialId === link.id) {
                                        setEditingSocialId(null);
                                        setNewSocialPlatform('');
                                        setNewSocialLinkName('');
                                        setNewSocialUrl('');
                                        setNewSocialIcon('Globe');
                                      }
                                      
                                      triggerAlert("সামাজিক লিংকটি চিরতরে ডিলেট করা হয়েছে।");
                                    });
                                  }}
                                  className="p-1.5 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 12. USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="glass p-8 rounded-3xl animate-fadeIn">
              <h3 className="font-display font-extrabold text-white text-lg mb-2">User Registry & Platform Access Control</h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6 font-mono">
                Monitor actively registered viewer profiles, manually add accounts, alter subscription status parameters, and eliminate accounts.
              </p>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left side: Add / Edit User profile form */}
                <div className="xl:col-span-12 lg:col-span-12 xl:col-span-5 space-y-4">
                  <div className="bg-[#0b0b0e] border border-white/5 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-mono font-bold text-red-500 uppercase tracking-wider">
                      {editingUserUid ? '✍️ Modify User Profile' : '➕ Manually Create User Account'}
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Full Name</label>
                        <input
                          type="text"
                          placeholder="e.g. MD Ikhlas"
                          value={editUserName}
                          autoComplete="new-name"
                          onChange={(e) => setEditUserName(e.target.value)}
                          className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Email Address</label>
                        <input
                          type="email"
                          placeholder="e.g. user@popcornplay.com"
                          value={editUserEmail}
                          disabled={!!editingUserUid} // We shouldn't change uid email usually during edit
                          autoComplete="new-email"
                          onChange={(e) => setEditUserEmail(e.target.value)}
                          className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                        />
                      </div>

                      <div className="pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-white block">Upgrade to Premium?</span>
                            <span className="text-[10px] text-gray-400 block font-mono">Provide instant full catalog premium access.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditUserIsPremium(!editUserIsPremium)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${editUserIsPremium ? 'bg-red-650' : 'bg-[#1a1a1e]'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editUserIsPremium ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>

                      {editUserIsPremium && (
                        <div className="bg-[#101012] border border-white/5 p-3 rounded-xl space-y-2 animate-fadeIn font-sans">
                          <label className="text-xs text-gray-400 font-mono block">Premium Validity Duration</label>
                          <select
                            value={editUserPremiumDays}
                            onChange={(e) => setEditUserPremiumDays(Number(e.target.value))}
                            className="w-full bg-black border border-white/10 focus:border-red-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-white"
                          >
                            <option value={1}>1 Day (Trial)</option>
                            <option value={7}>7 Days (Weekly)</option>
                            <option value={30}>30 Days (Monthly)</option>
                            <option value={90}>90 Days (Quarterly)</option>
                            <option value={365}>365 Days (Annual)</option>
                            <option value={9999}>Lifetime Unlimited</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUserUid(null);
                          setEditUserName('');
                          setEditUserEmail('');
                          setEditUserIsPremium(false);
                          setEditUserPremiumDays(30);
                        }}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-mono text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider cursor-pointer transition-all"
                      >
                        Reset / Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!editUserName.trim() || !editUserEmail.trim()) {
                            triggerAlert("সকল তথ্য সঠিকভাবে পূরণ করুন!");
                            return;
                          }

                          if (!editUserEmail.includes('@')) {
                            triggerAlert("সঠিক ইমেইল এড্রেস প্রদান করুন!");
                            return;
                          }

                          const targetUid = editingUserUid || ('local-usr-' + editUserEmail.toLowerCase().replace(/[^a-z0-9]/g, ''));

                          // Find existing user in allUsersList to keep favorites
                          const existingUsr = allUsersList.find(u => u.uid === targetUid);

                          // Construct user profile
                          const updatedUser: UserProfile = {
                            ...existingUsr,
                            uid: targetUid,
                            name: editUserName.trim(),
                            email: editUserEmail.trim().toLowerCase(),
                            isPremium: editUserIsPremium,
                            favorites: existingUsr?.favorites || []
                          };

                          if (editUserIsPremium) {
                            updatedUser.premiumUntil = Date.now() + editUserPremiumDays * 24 * 60 * 60 * 1000;
                          }

                          await adminUpdateUserProfile(updatedUser);

                          // Trigger alert
                          // Trigger alert
                          triggerAlert(editingUserUid ? "গ্রাহক প্রোফাইল সফলভাবে সংশোধন করা হয়েছে।" : "নতুন গ্রাহক হিসাব সফলভাবে তৈরি করা হয়েছে।");

                          // Reset states
                          setEditingUserUid(null);
                          setEditUserName('');
                          setEditUserEmail('');
                          setEditUserIsPremium(false);
                          setEditUserPremiumDays(30);
                        }}
                        className="flex-1 bg-red-650 hover:bg-red-600 text-white font-mono font-bold text-xs py-2.5 rounded-xl uppercase tracking-wider cursor-pointer transition-all text-center"
                      >
                        {editingUserUid ? 'SAVE PROFILE' : 'CREATE USER'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right side: User Accounts List with Search */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-4">
                  <div className="bg-[#0b0b0e] border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                        Viewer Accounts Registry ({allUsersList.filter(user => {
                          const emailLower = (user.email || '').trim().toLowerCase();
                          const adminEmailConf = (settings?.adminEmail || 'admin@popcornplay.com').trim().toLowerCase();
                          return emailLower !== adminEmailConf && emailLower !== 'admin@popcornplay.com' && emailLower !== 'mdikhlas098@gmail.com';
                        }).length})
                      </h4>

                      {/* Search Bar */}
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search using name, email..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {allUsersList.filter(user => {
                        const emailLower = (user.email || '').trim().toLowerCase();
                        const adminEmailConf = (settings?.adminEmail || 'admin@popcornplay.com').trim().toLowerCase();
                        const isUsrAdmin = emailLower === adminEmailConf || emailLower === 'admin@popcornplay.com' || emailLower === 'mdikhlas098@gmail.com';
                        if (isUsrAdmin) return false;
                        const name = (user.name || '').toLowerCase();
                        const email = (user.email || '').toLowerCase();
                        const q = userSearchQuery.toLowerCase();
                        return name.includes(q) || email.includes(q);
                      }).length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                          <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-500 font-mono">কোন ইউজার প্রোফাইল খুঁজে পাওয়া যায়নি।</p>
                        </div>
                      ) : (
                        allUsersList.filter(user => {
                          const emailLower = (user.email || '').trim().toLowerCase();
                          const adminEmailConf = (settings?.adminEmail || 'admin@popcornplay.com').trim().toLowerCase();
                          const isUsrAdmin = emailLower === adminEmailConf || emailLower === 'admin@popcornplay.com' || emailLower === 'mdikhlas098@gmail.com';
                          if (isUsrAdmin) return false;
                          const name = (user.name || '').toLowerCase();
                          const email = (user.email || '').toLowerCase();
                          const q = userSearchQuery.toLowerCase();
                          return name.includes(q) || email.includes(q);
                        }).map((usr) => {
                          const isUsrAdmin = (() => {
                            const emailLower = (usr.email || '').trim().toLowerCase();
                            const adminEmailConf = (settings?.adminEmail || 'admin@popcornplay.com').trim().toLowerCase();
                            return emailLower === adminEmailConf || emailLower === 'admin@popcornplay.com' || emailLower === 'mdikhlas098@gmail.com';
                          })();

                          return (
                            <div key={usr.uid} className="flex justify-between items-center bg-black/40 border border-white/5 p-4 rounded-2xl hover:border-red-500/20 hover:bg-[#121215] transition-all">
                              <div className="flex items-center space-x-3.5 min-w-0">
                                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 relative">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  {usr.isPremium && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-black animate-pulse" />
                                  )}
                                </div>
                                <div className="truncate text-left min-w-0">
                                  <span className="text-xs font-sans font-black text-white block truncate">{usr.name}</span>
                                  <span className="text-[10px] text-gray-400 font-mono block truncate mt-0.5">{usr.email}</span>
                                  
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {isUsrAdmin ? (
                                      <span className="text-[9px] font-mono font-bold bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full tracking-wide">
                                        🛡️ PLATFORM ADMIN
                                      </span>
                                    ) : usr.isPremium ? (
                                      <span className="text-[9px] font-sans font-black bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-2 py-0.5 rounded-full tracking-wide">
                                        PREMIUM MEMBER
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-sans font-black bg-white/5 text-gray-400 px-2 py-0.5 rounded-full tracking-wide">
                                        FREE ACCOUNT
                                      </span>
                                    )}

                                    {usr.premiumUntil && !isUsrAdmin && (
                                      <span className="text-[9px] text-yellow-400 font-mono">
                                        Expires: {new Date(usr.premiumUntil).toLocaleDateString()}
                                      </span>
                                    )}
                                    
                                    <span className="text-[8.5px] text-gray-600 font-mono">
                                      UID: {usr.uid}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUserUid(usr.uid);
                                    setEditUserName(usr.name);
                                    setEditUserEmail(usr.email);
                                    setEditUserIsPremium(!!usr.isPremium);
                                    setEditUserPremiumDays(30); // Default placeholder
                                  }}
                                  className="p-1.5 text-gray-400 bg-white/5 hover:bg-[#161619] rounded-lg transition-all cursor-pointer"
                                  title="Edit Profile"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (isUsrAdmin) {
                                      triggerAlert("নিরাপত্তার স্বার্থে প্রধান এডমিন একাউন্টটি ডিলিট করা সম্ভব নয়।");
                                      return;
                                    }

                                    showConfirm("Delete Account?", `Are you sure you want to permanently delete the profile for client '${usr.name}'?`, async () => {
                                      try {
                                        await deleteUserProfile(usr.uid);
                                        triggerAlert("গ্রাহক প্রোফাইলটি সফলভাবে ডিলিট করা হয়েছে।");
                                        
                                        // If currently editing this user, reset
                                        if (editingUserUid === usr.uid) {
                                          setEditingUserUid(null);
                                          setEditUserName('');
                                          setEditUserEmail('');
                                          setEditUserIsPremium(false);
                                          setEditUserPremiumDays(30);
                                        }
                                      } catch (err: any) {
                                        console.error("Failed to delete user profile from Firestore:", err);
                                        triggerAlert("ডিলিট ব্যর্থ হয়েছে: " + (err.message || String(err)));
                                      }
                                    });
                                  }}
                                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                    isUsrAdmin 
                                      ? 'text-gray-600 bg-white/2 cursor-not-allowed opacity-45' 
                                      : 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
                                  }`}
                                  disabled={isUsrAdmin}
                                  title={isUsrAdmin ? "Admin account cannot be deleted" : "Delete Account"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Dynamic Inline Premium Dialog Modal (Bypasses Sandbox iframe Alert/Confirm/Prompt blocks) */}
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

            {customModal.type === 'prompt' && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder={customModal.placeholder || "Enter value..."}
                  value={customModal.inputValue || ''}
                  onChange={(e) => setCustomModal(prev => ({ ...prev, inputValue: e.target.value }))}
                  className="w-full bg-black/60 border border-white/10 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      customModal.onConfirm(customModal.inputValue);
                    }
                  }}
                />
              </div>
            )}

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
                  customModal.onConfirm(customModal.inputValue);
                }}
                className="bg-red-650 hover:bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-lg shadow-red-650/10"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
