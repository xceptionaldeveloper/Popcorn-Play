import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Sparkles, Heart, Clock, Trash2, 
  Film, Calendar, PlayCircle, Eye, ShieldCheck, 
  ChevronRight, Award, Zap, HelpCircle, BadgeAlert
} from 'lucide-react';
import { UserProfile, ContentItem, WatchHistoryEntry } from '../types';

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
}

type ProfileTab = 'info' | 'favorites' | 'history';

export const UserProfileComponent: React.FC<UserProfileComponentProps> = ({
  userProfile,
  contentList,
  favorites,
  onPlay,
  onToggleFavorite,
  onUpdateProfile,
  isUserPremium,
  triggerPaymentUpgrade,
  triggerAlert
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ProfileTab>('info');

  if (!userProfile) {
    return (
      <div id="profile-guest-card" className="glass p-10 rounded-3xl text-center border border-white/5 space-y-5 max-w-md mx-auto animate-float">
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

  // Filter content items that match the user's favorites
  const favoriteItems = contentList.filter(item => favorites.includes(item.id));

  // Sort watch history in descending order of watch time
  const watchHistoryList = [...(userProfile.watchHistory || [])].sort((a, b) => b.watchedAt - a.watchedAt);

  // Handle removing a single watch index
  const handleDeleteWatchEntry = async (entryId: string) => {
    const updatedHistory = (userProfile.watchHistory || []).filter(item => item.id !== entryId);
    const updatedProfile: UserProfile = {
      ...userProfile,
      watchHistory: updatedHistory
    };
    await onUpdateProfile(updatedProfile);
    triggerAlert("Watch session removed from history.");
  };

  // Handle clearing entire watch history
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
      {/* Premium Header / Stats Overview Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-950 via-[#0e0e11] to-neutral-950 border border-white/5 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-650/10 rounded-full filter blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/5 rounded-full filter blur-[80px] pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          {/* Avatar & Meta info */}
          <div className="flex items-center space-x-4 md:space-x-5">
            <div className="relative group">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-tr from-red-650 via-red-600 to-amber-500 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl md:text-3xl shadow-xl border border-white/10 animate-float">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-[#0e0e11] rounded-full" title="Active Account Indicator"></div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-xl md:text-3xl text-white tracking-tight leading-none">
                  {userProfile.name}
                </h3>
                {isUserPremium() ? (
                  <span className="flex items-center space-x-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[9px] font-mono tracking-wider font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                    <Sparkles className="w-3 h-3 animate-pulse text-yellow-500 fill-yellow-500" />
                    <span>👑 VIP MEMBER</span>
                  </span>
                ) : (
                  <span className="bg-white/5 border border-white/5 text-gray-400 text-[9px] font-mono tracking-wider px-2.5 py-0.5 rounded-full uppercase">
                    FREE PLAN
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
                <span>{userProfile.email}</span>
                <span className="text-gray-700">•</span>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400">UID: {userProfile.uid.slice(0, 10)}...</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:space-x-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 md:px-5 md:py-3.5 text-center min-w-[100px] transition-all hover:bg-white/[0.04] cursor-pointer" onClick={() => setActiveSubTab('favorites')}>
              <span className="font-display font-black text-lg md:text-2xl text-white block leading-none">{favoriteItems.length}</span>
              <span className="text-[9.5px] font-mono text-gray-500 mt-1 block uppercase tracking-wider">My List</span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 md:px-5 md:py-3.5 text-center min-w-[100px] transition-all hover:bg-white/[0.04] cursor-pointer" onClick={() => setActiveSubTab('history')}>
              <span className="font-display font-black text-lg md:text-2xl text-white block leading-none">{watchHistoryList.length}</span>
              <span className="text-[9.5px] font-mono text-gray-500 mt-1 block uppercase tracking-wider">Watch Log</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-navigation Controls */}
      <div className="flex justify-center border-b border-white/5 pb-2">
        <div className="bg-[#101012] border border-white/5 p-1 rounded-2xl flex gap-1">
          {[
            { id: 'info', label: 'My Account', icon: User },
            { id: 'favorites', label: 'My List', icon: Heart, count: favoriteItems.length },
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
                    ? 'bg-red-650 text-white shadow-xl glow-red' 
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
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

      <AnimatePresence mode="wait">
        {/* Tab content wrappers */}
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          {/* TAB 1: USER INFO */}
          {activeSubTab === 'info' && (
            <div id="profile-info-tab" className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Box 1: Premium Membership Pass Card (Highly styled credit-card visual) */}
              <div className="relative rounded-3xl overflow-hidden aspect-[1.58/1] w-full max-w-sm mx-auto bg-gradient-to-br from-neutral-900 via-neutral-950 to-[#221010] border border-white/15 p-5 md:p-6 shadow-2xl flex flex-col justify-between group">
                <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-full filter blur-[50px]"></div>
                
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono tracking-widest text-[#a855f7] bg-[#a855f7]/10 border border-[#a855f7]/20 px-2 py-0.5 rounded uppercase font-bold">
                      POPCORN PLAY PASS
                    </span>
                    <h4 className="font-display font-black text-lg md:text-xl text-white tracking-widest drop-shadow-md">
                      VIP PREMIUM
                    </h4>
                  </div>
                  <div className="p-2.5 bg-yellow-500/15 border border-yellow-500/20 rounded-xl group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse fill-yellow-500" />
                  </div>
                </div>

                {/* Card Number display */}
                <div className="space-y-1 relative z-10">
                  <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Member Security Hash</p>
                  <p className="text-sm md:text-base text-gray-300 font-mono tracking-widest">
                    PPLAY • {userProfile.uid.slice(0, 4).toUpperCase()} • {userProfile.uid.slice(4, 8).toUpperCase()} • VIP
                  </p>
                </div>

                <div className="flex justify-between items-end border-t border-white/5 pt-3 relative z-10">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-500 block font-mono">STATUS</span>
                    <span className={`text-xs font-bold font-sans ${isUserPremium() ? 'text-green-400' : 'text-gray-400'}`}>
                      {isUserPremium() ? '● ACTIVE LIVE PREMIUM' : '● EXPIRED / FREE STATUS'}
                    </span>
                  </div>
                  
                  {userProfile.premiumUntil && isUserPremium() && (
                    <div className="space-y-0.5 text-right">
                      <span className="text-[9px] text-gray-500 block font-mono text-right">VALIDS UNTIL</span>
                      <span className="text-xs text-yellow-500 font-mono font-bold">
                        {new Date(userProfile.premiumUntil).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Detailed Account Metadata & Actions */}
              <div className="bg-[#101012] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-red-550" />
                    <span>Account Profile Specifications</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 font-mono mt-0.5">Manage details of your profile synchronization.</p>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-500 uppercase">Username</span>
                    <span className="text-white font-bold">{userProfile.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-500 uppercase">User Email</span>
                    <span className="text-white hover:text-red-400 transition-colors">{userProfile.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-500 uppercase">Database Server</span>
                    <span className="text-red-400 flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                      <span>Firestore Sync</span>
                    </span>
                  </div>
                </div>

                {/* Subscriptions upgrade block */}
                <div className="bg-red-650/5 border border-red-550/10 rounded-2xl p-4 space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">Unlock Ultimate VIP Premium Premium Status</p>
                      <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                        Obtain premium credentials today to experience ad-free streaming, live high-speed sports broadcasts, exclusive serial releases, and UHD theatrical cinema.
                      </p>
                    </div>
                  </div>

                  <button
                    id="profile-upgrade-btn"
                    onClick={triggerPaymentUpgrade}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-mono font-black text-[10px] py-3 rounded-xl uppercase tracking-wider shadow-lg shadow-yellow-500/5 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span>{isUserPremium() ? 'RENEW / EXTEND VIP' : 'UPGRADE TO VIP PASS'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FAVORITE LISTINGS */}
          {activeSubTab === 'favorites' && (
            <div id="profile-favorites-tab" className="space-y-5">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <h4 className="text-xs font-bold text-gray-400 font-mono uppercase tracking-widest flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-red-550 fill-red-550" />
                  <span>My Saved Watchlist ({favoriteItems.length})</span>
                </h4>
              </div>

              {favoriteItems.length === 0 ? (
                <div className="text-center py-20 bg-[#101012] border border-white/5 rounded-3xl space-y-3.5 max-w-md mx-auto">
                  <Heart className="w-10 h-10 text-gray-600 mx-auto animate-pulse" />
                  <div>
                    <p className="text-sm text-gray-300 font-bold">Your Saved watchlist is empty</p>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed font-mono">
                      Press the Heart icon on any video or release around the theatrical catalog to accumulate content directly into your persistent list.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {favoriteItems.map((item) => (
                    <div 
                      key={item.id}
                      id={`favorite-${item.id}`} 
                      className="group relative bg-[#101012] border border-white/5 rounded-2xl overflow-hidden hover:border-red-550/20 hover:shadow-xl transition-all flex flex-col justify-between"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-black/40">
                        <img 
                          src={item.coverUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" 
                          referrerPolicy="no-referrer"
                        />
                        {/* Interactive Play overlay button */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center p-2 text-center">
                          <button
                            onClick={() => onPlay(item)}
                            className="bg-red-650 hover:bg-red-500 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer glow-red"
                            title="Stream Now"
                          >
                            <User className="w-5 h-5 fill-white text-white rotate-90" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 space-y-1.5 flex-grow">
                        <h5 className="text-[11px] font-black text-white hover:text-red-400 leading-tight truncate cursor-pointer transition-colors" onClick={() => onPlay(item)}>
                          {item.title}
                        </h5>
                        <div className="flex justify-between items-center text-[9px] text-gray-500 font-mono">
                          <span className="bg-white/5 px-1.5 py-0.5 rounded text-gray-400 uppercase">{item.category}</span>
                          <span className="text-amber-500 font-bold">★ {item.rating}</span>
                        </div>
                      </div>

                      <div className="p-1 px-2 border-t border-white/5 flex gap-1 bg-black/10">
                        <button
                          onClick={() => onToggleFavorite(item.id, item.title)}
                          className="w-full bg-white/5 hover:bg-red-950/20 text-gray-400 hover:text-red-400 text-[9px] font-mono py-1 rounded-md transition-all flex items-center justify-center space-x-1 cursor-pointer"
                          title="Remove favorite"
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

          {/* TAB 3: WATCH HISTORY TIMELINE */}
          {activeSubTab === 'history' && (
            <div id="profile-history-tab" className="space-y-5">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <h4 className="text-xs font-bold text-gray-400 font-mono uppercase tracking-widest flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Recorded Watch Sessions Timeline ({watchHistoryList.length})</span>
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
                      Once you launch stream feeds, your active playback records synchronize dynamically onto Firestore for robust archival.
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
                        {/* Decorative side accent bar on hover */}
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

                        {/* Play and Remove Actions */}
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
    </div>
  );
};
