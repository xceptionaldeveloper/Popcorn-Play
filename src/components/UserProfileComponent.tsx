import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Sparkles, Heart, Clock, Trash2, 
  Film, Calendar, PlayCircle, Eye, ShieldCheck, 
  ChevronRight, Award, Zap, HelpCircle, BadgeAlert,
  Camera, Edit2, Check, Trophy, Sliders, Shield,
  RefreshCw, Save, Star, Lock, Info, ExternalLink,
  Send, AlertTriangle, FileText, X
} from 'lucide-react';
import { UserProfile, ContentItem, WatchHistoryEntry, AppSettings, FeedbackItem } from '../types';
import { submitFeedback } from '../lib/firebaseStore';

interface UserProfileComponentProps {
  userProfile: UserProfile | null;
  contentList: ContentItem[];
  favorites: string[];
  onPlay: (item: ContentItem) => void;
  onToggleFavorite: (id: string, title: string) => void;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  isUserPremium: () => boolean;
  triggerPaymentUpgrade: () => void;
  triggerAlert: (msg: string) => void;
  settings: AppSettings | null;
  onUpdateSettings: (newSettings: AppSettings) => Promise<void>;
}

type ProfileTab = 'info' | 'favorites' | 'history' | 'customize';

const LOCAL_DEFAULT_AVATARS = [
  { id: 'av-spidey', name: 'Spider-Man (Neon Glow)', url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=150&q=80', premium: false },
  { id: 'av-deadpool', name: 'Deadpool (Pop Art)', url: 'https://images.unsplash.com/photo-1620336655055-088d06e36bf0?auto=format&fit=crop&w=150&q=80', premium: false },
  { id: 'av-ironman', name: 'Iron Man (Gold Tech)', url: 'https://images.unsplash.com/photo-1608889175123-8ec330b86f84?auto=format&fit=crop&w=150&q=80', premium: true },
  { id: 'av-luffy', name: 'Gear 5 (Cyber Samurai)', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=150&q=80', premium: false },
  { id: 'av-joker', name: 'The Joker (Cinematic)', url: 'https://images.unsplash.com/photo-1559583985-c80d8ad9b29f?auto=format&fit=crop&w=150&q=80', premium: true },
  { id: 'av-anime-girl', name: 'Mage Princess', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=150&q=80', premium: false },
  { id: 'av-cyberninja', name: 'Cyber Ninja Gamer', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=150&q=80', premium: false },
  { id: 'av-matrix-hero', name: 'Matrix Cyberpunk Rebel', url: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=150&q=80', premium: true },
  { id: 'av-popcorn-mascot', name: 'Neon Popcorn Vibe', url: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=150&q=80', premium: false },
  { id: 'av-hollywood-star', name: 'VIP Golden sovereign', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=150&q=80', premium: true }
];

const VIP_TITLES = [
  '🍿 Popcorn Binger',
  '👑 Cinema Monarch',
  '⚡ Neon Overlord',
  '💎 Galactic Critic',
  '🌟 Showbiz Legend',
  '🔥 Screen Warrior'
];

export const UserProfileComponent: React.FC<UserProfileComponentProps> = ({
  userProfile,
  contentList,
  favorites,
  onPlay,
  onToggleFavorite,
  onUpdateProfile,
  isUserPremium,
  triggerPaymentUpgrade,
  triggerAlert,
  settings,
  onUpdateSettings
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ProfileTab>('info');
  const [now, setNow] = useState(Date.now());
  
  const activeVipTitles = (settings?.vipTiers && settings.vipTiers.length > 0) ? settings.vipTiers : VIP_TITLES;

  // Customization States
  const [nameInput, setNameInput] = useState(userProfile?.name || '');
  const [statusInput, setStatusInput] = useState(userProfile?.customStatus || '');
  const [avatarInput, setAvatarInput] = useState(userProfile?.avatarUrl || '');
  const [vipTitleInput, setVipTitleInput] = useState(userProfile?.vipTier || activeVipTitles[0] || '🍿 Popcorn Binger');
  const [parentalLock, setParentalLock] = useState(userProfile?.parentalEnabled || false);
  const [isSaving, setIsSaving] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showLocalWarning, setShowLocalWarning] = useState(false);

  // Feedback States
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'suggestion' | 'bug' | 'other'>('suggestion');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setNameInput(userProfile.name);
      setStatusInput(userProfile.customStatus || '');
      setAvatarInput(userProfile.avatarUrl || '');
      setVipTitleInput(userProfile.vipTier || activeVipTitles[0] || '🍿 Popcorn Binger');
      setParentalLock(userProfile.parentalEnabled || false);
      
      const cachedLocal = localStorage.getItem('pp_local_avatar');
      if (cachedLocal && userProfile.avatarUrl === cachedLocal) {
        setShowLocalWarning(true);
      } else {
        setShowLocalWarning(false);
      }
    }
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile?.premiumUntil || !userProfile?.isPremium) return;
    
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [userProfile?.premiumUntil, userProfile?.isPremium]);

  if (!userProfile) {
    return (
      <div id="profile-guest-card" className="glass p-10 rounded-3xl text-center border border-white/5 space-y-6 max-w-md mx-auto animate-float">
        <div className="w-16 h-16 bg-red-650/10 rounded-2xl mx-auto flex items-center justify-center text-red-550 border border-red-550/20">
          <Film className="w-8 h-8" />
        </div>
        <h3 className="font-display font-black text-2xl text-white tracking-tight">Guest Watch Room</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Sign up or Log in above to preserve your customized playlists, permanent watch history archives, and unlock absolute VIP premium features.
        </p>
      </div>
    );
  }

  const favoriteItems = contentList.filter(item => favorites.includes(item.id));
  const watchHistoryList = [...(userProfile.watchHistory || [])].sort((a, b) => b.watchedAt - a.watchedAt);

  // Gamification: Calculate XP & Rank
  const xp = (watchHistoryList.length * 20) + (favoriteItems.length * 15);
  const level = Math.floor(Math.sqrt(xp / 25)) + 1;
  const xpForNextLevel = Math.pow(level, 2) * 25;
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 25;
  const xpProgress = xpForNextLevel === xpForCurrentLevel 
    ? 0 
    : Math.min(100, Math.max(0, ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100));

  // Determine Level Title
  let levelTitle = 'Popcorn Rookie';
  if (level >= 3 && level <= 5) levelTitle = 'Active Cinephile';
  else if (level >= 6 && level <= 8) levelTitle = 'Seasoned Watcher';
  else if (level >= 9 && level <= 12) levelTitle = 'Movie Marathoner';
  else if (level >= 13) levelTitle = 'Theatrical Overlord';

  // Handle Card Hover Holographic Tilt effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePosition({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  // Profile Save Actions
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updatedProfile: UserProfile = {
        ...userProfile,
        name: nameInput,
        customStatus: statusInput,
        avatarUrl: avatarInput,
        vipTier: vipTitleInput,
        parentalEnabled: parentalLock
      };
      await onUpdateProfile(updatedProfile);
      triggerAlert("✨ Profile specifications synchronized with Cloud successfully!");
      setActiveSubTab('info');
    } catch (err: any) {
      triggerAlert("Failed saving profile updates: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete watch records
  const handleDeleteWatchEntry = async (entryId: string) => {
    const updatedHistory = (userProfile.watchHistory || []).filter(item => item.id !== entryId);
    const updatedProfile: UserProfile = {
      ...userProfile,
      watchHistory: updatedHistory
    };
    await onUpdateProfile(updatedProfile);
    triggerAlert("Watch session removed from history.");
  };

  const handleClearWatchHistory = async () => {
    if (window.confirm("Are you sure you want to clear your entire watch history?")) {
      const updatedProfile: UserProfile = {
        ...userProfile,
        watchHistory: []
      };
      await onUpdateProfile(updatedProfile);
      triggerAlert("Watch history has been completely cleared.");
    }
  };

  return (
    <div id="user-profile-layout" className="w-full space-y-8">
      {/* 1. STUNNING AMBIENT PREMIUM OVERVIEW BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-950 via-[#0a0a0c] to-neutral-950 border border-white/10 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-650/15 rounded-full filter blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-yellow-500/10 rounded-full filter blur-[80px] pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          {/* Avatar & Profile Identity */}
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="relative group cursor-pointer" onClick={() => setActiveSubTab('customize')}>
              {avatarInput ? (
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 group-hover:scale-105 border-2 ${
                  isUserPremium() ? 'border-yellow-500 shadow-yellow-500/20' : 'border-red-500/50'
                }`}>
                  <img src={avatarInput} alt={userProfile.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`w-20 h-20 md:w-24 md:h-24 bg-gradient-to-tr ${
                  isUserPremium() ? 'from-yellow-500 via-amber-600 to-red-600' : 'from-red-600 via-rose-700 to-indigo-800'
                } rounded-2xl flex items-center justify-center text-white font-black text-3xl md:text-4xl shadow-2xl transition-all duration-300 group-hover:scale-105`}>
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Camera Icon Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity duration-200">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-black flex items-center justify-center ${
                isUserPremium() ? 'bg-yellow-500' : 'bg-red-600'
              }`}>
                {isUserPremium() ? <Sparkles className="w-3 h-3 text-black fill-black" /> : <User className="w-3 h-3 text-white" />}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-display font-black text-2xl md:text-4xl text-white tracking-tight leading-none">
                  {userProfile.name}
                </h3>
                {isUserPremium() ? (
                  <span className="flex items-center space-x-1 px-3 py-1 bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-[9px] font-mono tracking-wider font-extrabold rounded-full uppercase shadow-lg shadow-yellow-500/5 animate-bounce">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span>{vipTitleInput || '👑 VIP ELITE'}</span>
                  </span>
                ) : (
                  <span className="bg-white/5 border border-white/5 text-gray-400 text-[9px] font-mono tracking-wider px-3 py-1 rounded-full uppercase">
                    STANDARD STREAMER
                  </span>
                )}
              </div>

              {/* Bio Status */}
              <p className="text-xs text-gray-300 font-sans italic">
                {userProfile.customStatus || '"Watching movies, series & premium broadcasts in UHD! 🍿"'}
              </p>

              {/* Email & Info Row */}
              <p className="text-xs text-gray-500 font-mono flex items-center gap-2 flex-wrap">
                <span className="hover:text-red-400 transition-colors">{userProfile.email}</span>
                <span className="text-gray-700">•</span>
                <span className="text-[10px] bg-white/5 border border-white/5 px-2 py-0.5 rounded text-gray-400">UID: {userProfile.uid.slice(0, 12).toUpperCase()}</span>
              </p>
            </div>
          </div>

          {/* Gamified Stat Circle Modules */}
          <div className="flex gap-4 items-center flex-wrap md:flex-nowrap">
            {/* Gamified level */}
            <div className="bg-black/50 border border-white/5 rounded-2xl p-3 px-4 text-center min-w-[120px] transition-all hover:border-red-500/20">
              <div className="flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" />
                <span className="font-display font-black text-xl text-white">{level}</span>
              </div>
              <span className="text-[9px] font-mono text-gray-400 block uppercase tracking-wider mt-0.5">{levelTitle}</span>
              <div className="w-full bg-white/5 rounded-full h-1 mt-2 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-yellow-400 h-full rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }}></div>
              </div>
              <span className="text-[8px] font-mono text-gray-500 block mt-1">{xp} / {xpForNextLevel} XP</span>
            </div>

            {/* Quick Metrics */}
            <div className="bg-black/50 border border-white/5 rounded-2xl p-3 px-4 text-center min-w-[90px] transition-all hover:border-red-500/20 cursor-pointer" onClick={() => setActiveSubTab('favorites')}>
              <span className="font-display font-black text-xl text-white block leading-none">{favoriteItems.length}</span>
              <span className="text-[9px] font-mono text-gray-500 mt-1.5 block uppercase tracking-wider">Watchlist</span>
            </div>
            <div className="bg-black/50 border border-white/5 rounded-2xl p-3 px-4 text-center min-w-[90px] transition-all hover:border-red-500/20 cursor-pointer" onClick={() => setActiveSubTab('history')}>
              <span className="font-display font-black text-xl text-white block leading-none">{watchHistoryList.length}</span>
              <span className="text-[9px] font-mono text-gray-500 mt-1.5 block uppercase tracking-wider">Stream Log</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION PILLS WITH MODERN MICRO-EFFECTS */}
      <div className="flex justify-center border-b border-white/5 pb-2">
        <div className="bg-black/60 border border-white/5 p-1 rounded-2xl flex gap-1 flex-wrap justify-center">
          {[
            { id: 'info', label: 'VIP Pass', icon: User },
            { id: 'customize', label: 'Customize Profile', icon: Sliders },
            { id: 'favorites', label: 'Saved Watchlist', icon: Heart, count: favoriteItems.length },
            { id: 'history', label: 'Watch History', icon: Clock, count: watchHistoryList.length }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`profile-btn-${tab.id}`}
                onClick={() => setActiveSubTab(tab.id as ProfileTab)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-red-650 text-white shadow-xl shadow-red-550/10' 
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-black font-sans ${
                    isActive ? 'bg-white text-red-650' : 'bg-white/10 text-white/80'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TRANSITION-DRIVEN TAB CONTENT WRAPPER */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="w-full"
        >
          {/* TAB 1: POPCORN PLAY VIP PASS (CREDIT CARD SHINE VISUAL) */}
          {activeSubTab === 'info' && (
            <div id="profile-info-tab" className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Holographic metallic physical digital VIP pass card */}
              <div className="w-full max-w-sm mx-auto space-y-4">
                <span className="text-xs text-gray-400 font-mono block uppercase tracking-widest text-center">Interactive Pass Card (হভার করে দেখুন)</span>
                
                <div 
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    transform: `perspective(1000px) rotateY(${mousePosition.x * 20}deg) rotateX(${-mousePosition.y * 20}deg)`,
                    transition: 'transform 0.1s ease-out',
                    transformStyle: 'preserve-3d'
                  }}
                  className={`relative rounded-3xl overflow-hidden aspect-[1.58/1] w-full bg-gradient-to-br ${
                    isUserPremium() 
                      ? 'from-[#1a140a] via-[#110e08] to-[#0a0602] border border-yellow-500/35 shadow-2xl shadow-yellow-500/5' 
                      : 'from-neutral-900 via-neutral-950 to-[#201010] border border-white/10 shadow-xl shadow-red-500/5'
                  } p-6 flex flex-col justify-between group cursor-grab active:cursor-grabbing`}
                >
                  {/* Glass Card Shine overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  
                  {/* Interactive blur orbs */}
                  <div className={`absolute top-0 right-0 w-44 h-44 ${isUserPremium() ? 'bg-yellow-500/10' : 'bg-red-500/5'} rounded-full filter blur-[50px] pointer-events-none`}></div>
                  <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/5 rounded-full filter blur-[40px] pointer-events-none"></div>

                  <div className="flex justify-between items-start relative z-10" style={{ transform: 'translateZ(30px)' }}>
                    <div className="space-y-1.5">
                      <span className={`text-[8.5px] font-mono tracking-[0.2em] px-2.5 py-0.5 rounded uppercase font-black ${
                        isUserPremium() ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        POPCORN PLAY PASS
                      </span>
                      <h4 className="font-display font-black text-xl text-white tracking-wider drop-shadow-md flex items-center gap-1.5">
                        {isUserPremium() ? (
                          <>
                            <CrownIcon className="w-5 h-5 text-yellow-400 fill-yellow-400/50" />
                            <span className="text-yellow-400">VIP PREMIUM</span>
                          </>
                        ) : (
                          <>
                            <Film className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-300 font-bold">FREE WATCHER</span>
                          </>
                        )}
                      </h4>
                    </div>

                    {/* Golden Hologram Seal Chip */}
                    <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
                      isUserPremium() 
                        ? 'bg-gradient-to-tr from-yellow-500 to-amber-400 border-yellow-300 text-black shadow-lg shadow-yellow-500/20' 
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`} style={{ transform: 'translateZ(40px)' }}>
                      {isUserPremium() ? <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} /> : <User className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Card Security Specifications */}
                  <div className="space-y-1 relative z-10" style={{ transform: 'translateZ(20px)' }}>
                    <p className="text-[8.5px] text-gray-500 font-mono tracking-widest uppercase">Streaming Security Hash</p>
                    <p className="text-xs md:text-sm text-gray-300 font-mono tracking-[0.15em]">
                      PPLAY • {userProfile.uid.slice(0, 4).toUpperCase()} • {userProfile.uid.slice(4, 8).toUpperCase()} • {isUserPremium() ? 'ELITE' : 'GUEST'}
                    </p>
                  </div>

                  {/* Expiration and User Details */}
                  <div className="flex justify-between items-end border-t border-white/5 pt-3.5 relative z-10" style={{ transform: 'translateZ(25px)' }}>
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-gray-500 block font-mono uppercase tracking-wider">HOLDER</span>
                      <span className="text-xs font-black text-white uppercase tracking-wider">{userProfile.name}</span>
                    </div>

                    {userProfile.premiumUntil && isUserPremium() && (() => {
                      const diff = userProfile.premiumUntil - now;
                      if (diff <= 0) {
                        return (
                          <span className="text-[8.5px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded font-mono animate-pulse">
                            Expired
                          </span>
                        );
                      }
                      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                      const s = Math.floor((diff % (1000 * 60)) / 1000);
                      return (
                        <div className="text-right bg-black/40 border border-white/5 rounded-xl p-1.5 px-3">
                          <span className="text-[8px] text-gray-500 block font-mono">COUNTDOWN</span>
                          <span className="text-[11px] text-yellow-400 font-mono font-extrabold flex items-center justify-end gap-1 select-none animate-pulse">
                            <Clock className="w-3 h-3 text-yellow-500 shrink-0" />
                            <span>
                              {d > 0 ? `${d}d ` : ''}{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
                            </span>
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Specifications Block / Account Status */}
              <div className="bg-[#101012] border border-white/5 rounded-3xl p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-red-550" />
                      <span>Security & Pass Status</span>
                    </h4>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">Specifications mapped in Cloud servers.</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsFeedbackOpen(true)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 hover:border-red-500/25 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-mono uppercase px-3"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Feedback</span>
                    </button>
                    <button 
                      onClick={() => setActiveSubTab('customize')}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-mono text-gray-300 uppercase px-3"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-500 uppercase">Username</span>
                    <span className="text-white font-bold">{userProfile.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-500 uppercase">Registered Email</span>
                    <span className="text-gray-300">{userProfile.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-500 uppercase">Premium Badge</span>
                    <span className={`text-xs font-bold ${isUserPremium() ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {isUserPremium() ? vipTitleInput || '👑 VIP Member' : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-500 uppercase">Subscription Expiry</span>
                    <span className={`text-xs font-bold ${isUserPremium() && userProfile.premiumUntil ? 'text-yellow-400 font-mono' : 'text-gray-450 font-mono'}`}>
                      {isUserPremium() && userProfile.premiumUntil ? (
                        new Date(userProfile.premiumUntil).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : (
                        'No Active Subscription'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-500 uppercase">Database Link</span>
                    <span className="text-green-400 flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                      <span>Firestore Sync Active</span>
                    </span>
                  </div>
                </div>

                {/* Subscriptions upgrade box */}
                <div className="bg-red-650/5 border border-red-550/10 rounded-2xl p-4.5 space-y-3">
                  <div className="flex gap-3 items-start">
                    <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">Elite VIP Pass Benefits</p>
                      <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                        Unlocks ad-free 1080p theatrical movies, ultra-high-speed buffer servers, immediate live chat support, and exclusive episodic streams.
                      </p>
                    </div>
                  </div>

                  <button
                    id="profile-upgrade-btn"
                    onClick={triggerPaymentUpgrade}
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-mono font-black text-[10px] py-3.5 rounded-xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span>{isUserPremium() ? 'EXTEND / RECHARGE PASS' : 'UPGRADE TO ELITE PASS'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE CUSTOMIZATION PANEL */}
          {activeSubTab === 'customize' && (
            <div id="profile-customize-tab" className="bg-[#101012] border border-white/5 rounded-3xl p-6 md:p-8 space-y-8 max-w-3xl mx-auto">
              <div>
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-red-500" />
                  <span>Customize Your Streamer Passport</span>
                </h4>
                <p className="text-xs text-gray-500 font-mono mt-0.5">Customize how your presence appears to other players and admins on Popcorn Play.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1.5">Streamer Nickname *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AnimeLord99"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1.5">Custom Status / Bio</label>
                    <input
                      type="text"
                      placeholder="Watching JJK S2 on Popcorn Play! 🍿"
                      value={statusInput}
                      onChange={(e) => setStatusInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>

                  {isUserPremium() ? (
                    <div>
                      <label className="text-xs text-gray-400 font-mono block mb-1.5">Choose Elite VIP Title</label>
                      <select
                        value={vipTitleInput}
                        onChange={(e) => setVipTitleInput(e.target.value)}
                        className="w-full bg-[#101012] border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
                      >
                        {activeVipTitles.map((title) => (
                          <option key={title} value={title}>{title}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-gray-400">Elite VIP Title Selection</span>
                        <span className="flex items-center gap-1 text-[8.5px] font-mono text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded uppercase">
                          <Lock className="w-3 h-3" />
                          <span>LOCKED</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed font-mono">
                        Upgrade to POPCORN PLAY VIP to choose customizable metallic player tags on comments and rating cards!
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Inputs: Avatar Presets Grid */}
                <div className="space-y-5">
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1.5">Select Profile Avatar</label>
                    <div className="grid grid-cols-4 gap-3 bg-black/30 p-4 border border-white/5 rounded-2xl max-h-[220px] overflow-y-auto">
                      {((settings?.avatars && settings.avatars.length > 0) ? settings.avatars : LOCAL_DEFAULT_AVATARS).map((avatar) => {
                        const isPresetSelected = avatarInput === avatar.url;
                        const isLocked = avatar.premium && !isUserPremium();
                        return (
                          <div 
                            key={avatar.id || avatar.name}
                            onClick={() => {
                              if (isLocked) {
                                triggerAlert("Please upgrade to VIP Pass to unlock this avatar preset! 👑");
                                return;
                              }
                              setAvatarInput(avatar.url);
                              setShowLocalWarning(false);
                            }}
                            className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 border-2 ${
                              isPresetSelected 
                                ? 'border-yellow-500 scale-105 shadow-lg shadow-yellow-500/10' 
                                : 'border-white/5 hover:border-white/20'
                            }`}
                            title={avatar.name}
                          >
                            <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            
                            {/* Selection Check Indicator */}
                            {isPresetSelected && (
                              <div className="absolute inset-0 bg-yellow-500/10 flex items-center justify-center">
                                <div className="bg-yellow-500 text-black p-1 rounded-full">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              </div>
                            )}

                            {/* Locked Badge */}
                            {isLocked && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Lock className="w-4 h-4 text-yellow-500/80" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* File Manager & URL Inputs */}
                  <div className="space-y-3 bg-black/20 p-4 border border-white/5 rounded-2xl">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase block">Custom Upload Options</span>
                    
                    {/* Browse File and URL Paste Side by Side */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => document.getElementById('file-avatar-picker')?.click()}
                        className="bg-white/5 hover:bg-white/10 active:scale-95 text-white border border-white/10 rounded-xl px-4 py-3 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-red-500 shrink-0" />
                        <span>Browse File</span>
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="file-avatar-picker"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          if (file.size > 2 * 1024 * 1024) {
                            triggerAlert("File size exceeds 2MB! Please pick a smaller image.");
                            return;
                          }

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            localStorage.setItem('pp_local_avatar', base64);
                            setAvatarInput(base64);
                            setShowLocalWarning(true);
                            triggerAlert("Image loaded successfully from file manager! Save to apply.");
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      
                      <div className="flex-1">
                        <input
                          type="url"
                          placeholder="Or Paste Custom Avatar URL..."
                          value={avatarInput && !avatarInput.startsWith('data:') ? avatarInput : ''}
                          onChange={(e) => {
                            setAvatarInput(e.target.value);
                            setShowLocalWarning(false);
                          }}
                          className="w-full bg-black/40 border border-white/5 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                        />
                      </div>
                    </div>

                    {/* Local Storage Warning Banner exactly as requested */}
                    {showLocalWarning && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex gap-2.5 items-start">
                        <Info className="w-4.5 h-4.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[10.5px] font-bold text-red-400">⚠️ Local Device Upload Warning (সতর্কতা)</p>
                          <p className="text-[9.5px] text-gray-400 leading-normal font-mono">
                            ফাইল ম্যানেজার থেকে আপলোড করা প্রোফাইল পিকচারটি শুধুমাত্র আপনার এই ব্রাউজারেই সংরক্ষিত থাকবে। এটি ক্লাউডে (Firebase) সিঙ্ক হবে না।
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Firebase Presets Add Sync button if URL is valid */}
                    {avatarInput && avatarInput.startsWith('http') && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!settings) {
                            triggerAlert("Platform settings are loading, please wait.");
                            return;
                          }
                          const currentPresets = settings.avatars || LOCAL_DEFAULT_AVATARS;
                          if (currentPresets.some(av => av.url === avatarInput)) {
                            triggerAlert("This URL is already in the presets list!");
                            return;
                          }
                          const newPreset = {
                            id: 'av-' + Date.now(),
                            name: 'User Custom URL ' + (currentPresets.length - LOCAL_DEFAULT_AVATARS.length + 1),
                            url: avatarInput,
                            premium: false,
                            isCustom: true
                          };
                          const updated = {
                            ...settings,
                            avatars: [...currentPresets, newPreset]
                          };
                          try {
                            await onUpdateSettings(updated);
                            triggerAlert("✅ Avatar URL successfully saved to Cloud database as a preset! Admin can now manage this in their panel.");
                          } catch (err: any) {
                            triggerAlert("Firebase Write Error: " + err.message);
                          }
                        }}
                        className="w-full bg-gradient-to-r from-red-500/20 to-rose-500/20 hover:from-red-500/30 hover:to-rose-500/30 border border-red-500/30 text-red-400 hover:text-white py-2 rounded-xl text-[9px] font-mono uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        <span>Add Link directly to Firebase Presets list</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('info')}
                  className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-red-650 hover:bg-red-500 disabled:bg-gray-700 text-white px-6 py-3 rounded-xl text-xs font-mono font-bold uppercase transition-all shadow-lg glow-red flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSaving ? 'Synchronizing...' : 'Save Specifications'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SAVED WATCHLIST */}
          {activeSubTab === 'favorites' && (
            <div id="profile-favorites-tab" className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <h4 className="text-xs font-bold text-gray-400 font-mono uppercase tracking-widest flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-red-550 fill-red-550" />
                  <span>Saved Playlists ({favoriteItems.length})</span>
                </h4>
              </div>

              {favoriteItems.length === 0 ? (
                <div className="text-center py-20 bg-[#101012] border border-white/5 rounded-3xl space-y-3.5 max-w-md mx-auto">
                  <Heart className="w-10 h-10 text-gray-600 mx-auto animate-pulse" />
                  <div>
                    <p className="text-sm text-gray-300 font-bold">Your watchlist is completely empty</p>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed font-mono">
                      Press the Heart icon on any video or release around the catalog to gather media directly into your persistent playlist.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {favoriteItems.map((item) => (
                    <div 
                      key={item.id}
                      id={`favorite-${item.id}`} 
                      className="group relative bg-[#101012] border border-white/5 rounded-2xl overflow-hidden hover:border-red-550/20 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-black/40">
                        <img 
                          src={item.coverUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
                          referrerPolicy="no-referrer"
                        />
                        {/* Stream Overlay */}
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-2 text-center">
                          <button
                            onClick={() => onPlay(item)}
                            className="bg-red-650 hover:bg-red-500 text-white p-3.5 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer glow-red"
                            title="Stream Now"
                          >
                            <PlayCircle className="w-6 h-6 fill-white text-white" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1.5 flex-grow">
                        <h5 className="text-[11px] font-black text-white hover:text-red-400 leading-tight truncate cursor-pointer transition-colors" onClick={() => onPlay(item)}>
                          {item.title}
                        </h5>
                        <div className="flex justify-between items-center text-[9px] text-gray-500 font-mono">
                          <span className="bg-white/5 px-2 py-0.5 rounded text-gray-400 uppercase tracking-wider">{item.category}</span>
                          <span className="text-yellow-500 font-bold">★ {item.rating}</span>
                        </div>
                      </div>

                      <div className="p-2 border-t border-white/5 flex gap-1 bg-black/10">
                        <button
                          onClick={() => onToggleFavorite(item.id, item.title)}
                          className="w-full bg-white/5 hover:bg-red-950/20 text-gray-400 hover:text-red-400 text-[9px] font-mono py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>REMOVE</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ARCHIVED WATCH SESSIONS TIMELINE */}
          {activeSubTab === 'history' && (
            <div id="profile-history-tab" className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <h4 className="text-xs font-bold text-gray-400 font-mono uppercase tracking-widest flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span>Archived Playback Records Timeline ({watchHistoryList.length})</span>
                </h4>
                {watchHistoryList.length > 0 && (
                  <button
                    onClick={handleClearWatchHistory}
                    className="bg-red-650/10 hover:bg-red-650/20 text-red-400 border border-red-500/10 hover:border-red-550/30 px-3.5 py-1.5 rounded-xl font-mono text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    CLEAR HISTORY
                  </button>
                )}
              </div>

              {watchHistoryList.length === 0 ? (
                <div className="text-center py-20 bg-[#101012] border border-white/5 rounded-3xl space-y-3.5 max-w-md mx-auto">
                  <Clock className="w-10 h-10 text-gray-600 mx-auto" />
                  <div>
                    <p className="text-sm text-gray-300 font-bold">No Watch Sessions Identified</p>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed font-mono">
                      Once you launch video stream feeds, your active playback records sync dynamically into Firestore for robust progress saving.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 max-w-2xl mx-auto">
                  {watchHistoryList.map((entry) => {
                    const originalItem = contentList.find(c => c.id === entry.contentId);
                    return (
                      <div 
                        key={entry.id}
                        id={`history-${entry.id}`}
                        className="glass p-3 rounded-2xl flex items-center gap-4 border border-white/5 hover:border-red-550/10 hover:bg-white/[0.01] transition-all group relative overflow-hidden"
                      >
                        {/* Side Accent line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-650 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>

                        <img 
                          src={entry.coverUrl || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=150&q=80'} 
                          alt="" 
                          className="w-10 h-14 object-cover rounded-xl flex-shrink-0 bg-neutral-900 shadow-md border border-white/10" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 
                            className="text-xs font-bold text-white hover:text-red-400 cursor-pointer truncate transition-colors"
                            onClick={() => {
                              if (originalItem) {
                                onPlay(originalItem);
                              } else {
                                triggerAlert("This content item is no longer available.");
                              }
                            }}
                          >
                            {entry.title}
                          </h5>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[9px] text-gray-500 font-mono">
                            <span className="bg-white/5 text-gray-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">{entry.category}</span>
                            <span>•</span>
                            <span className="text-gray-400">{new Date(entry.watchedAt).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Stream Controls */}
                        <div className="flex items-center gap-2 relative z-10">
                          {originalItem && (
                            <button
                              onClick={() => onPlay(originalItem)}
                              className="bg-red-650 hover:bg-red-600 text-white font-mono font-bold text-[9px] px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer glow-red"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>PLAYBACK</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteWatchEntry(entry.id)}
                            className="bg-white/5 hover:bg-red-950/20 text-gray-500 hover:text-red-400 p-2.5 rounded-xl transition-all cursor-pointer"
                            title="Remove watch history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* GIVE FEEDBACK MODAL */}
      <AnimatePresence>
        {isFeedbackOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFeedbackOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-lg bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden z-10"
            >
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20">
                      <HelpCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-wider">Give Feedback</h4>
                      <p className="text-xs text-gray-400 font-mono">Send your suggestions or report bugs directly to the team.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFeedbackOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Feedback Type Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-gray-400">Feedback Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFeedbackType('suggestion')}
                      className={`py-3 px-4 rounded-xl font-mono text-[11px] uppercase tracking-wider border transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        feedbackType === 'suggestion'
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40 font-bold'
                          : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Suggestion</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeedbackType('bug')}
                      className={`py-3 px-4 rounded-xl font-mono text-[11px] uppercase tracking-wider border transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        feedbackType === 'bug'
                          ? 'bg-red-500/10 text-red-400 border-red-500/40 font-bold'
                          : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Bug Report</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeedbackType('other')}
                      className={`py-3 px-4 rounded-xl font-mono text-[11px] uppercase tracking-wider border transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        feedbackType === 'other'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/40 font-bold'
                          : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Other</span>
                    </button>
                  </div>
                </div>

                {/* Message Input */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs font-mono uppercase tracking-widest text-gray-400">Message</label>
                    <span className="text-[10px] font-mono text-gray-500">{feedbackMsg.length}/3000</span>
                  </div>
                  <textarea
                    value={feedbackMsg}
                    onChange={(e) => setFeedbackMsg(e.target.value.slice(0, 3000))}
                    rows={5}
                    placeholder={
                      feedbackType === 'bug'
                        ? "Please describe the bug, how to reproduce it, and any details that can help us fix it..."
                        : feedbackType === 'suggestion'
                        ? "Tell us what feature you would love to see or how we can improve Popcorn Play..."
                        : "Write your feedback or questions here..."
                    }
                    className="w-full bg-black/40 border border-white/5 hover:border-white/15 focus:border-red-500/50 rounded-2xl p-4 text-xs text-white placeholder-gray-500 font-sans leading-relaxed focus:outline-none transition-all resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFeedbackOpen(false);
                      setFeedbackMsg('');
                    }}
                    className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingFeedback || !feedbackMsg.trim()}
                    onClick={async () => {
                      if (!feedbackMsg.trim()) return;
                      setIsSubmittingFeedback(true);
                      try {
                        const newFeedback: FeedbackItem = {
                          id: 'fb-' + Date.now() + Math.random().toString(36).substring(2, 7),
                          userId: userProfile.uid,
                          userName: userProfile.name,
                          userEmail: userProfile.email,
                          type: feedbackType,
                          message: feedbackMsg,
                          timestamp: new Date().toISOString(),
                          status: 'pending'
                        };
                        await submitFeedback(newFeedback);
                        triggerAlert("Thank you! Your feedback has been received and stored in Firebase.");
                        setIsFeedbackOpen(false);
                        setFeedbackMsg('');
                      } catch (err) {
                        console.error(err);
                        triggerAlert("Error submitting feedback. Please try again.");
                      } finally {
                        setIsSubmittingFeedback(false);
                      }
                    }}
                    className="flex-1 py-3.5 bg-gradient-to-r from-red-650 to-red-500 hover:from-red-600 hover:to-red-400 text-white font-mono font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmittingFeedback ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Simple crown icon component
const CrownIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <path d="M3 20h18" />
    </svg>
  );
};
