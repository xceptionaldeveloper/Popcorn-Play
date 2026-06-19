import React, { useState, useEffect } from 'react';
import UserPanel from './components/UserPanel';
import AdminPanel from './components/AdminPanel';
import { Film, Compass, Settings, Shield } from 'lucide-react';
import { verifyUserSubscriptions } from './lib/subscriptionService';

export default function App() {
  const [view, setView] = useState<'user' | 'admin'>('user');

  useEffect(() => {
    // Run subscription verification check on startup
    verifyUserSubscriptions()
      .then((res) => {
        if (res.expiredCount > 0) {
          console.log(`✅ Automatically verified subscriptions: Downgraded ${res.expiredCount} expired user(s).`);
        } else {
          console.log("✅ Verified user subscriptions: All checks completed.");
        }
      })
      .catch((err) => {
        console.error("Subscription check failed on mount:", err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#070708] text-gray-100 flex flex-col no-scrollbar">
      
      {/* Dynamic Floating Panel Switcher for the developer preview */}
      <div className="bg-[#0b0b0d] border-b border-white/5 py-2.5 px-4 flex justify-between items-center z-50">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          <p className="text-[10px] font-mono tracking-widest text-gray-400 uppercase font-black">
            Popcorn Play Environment
          </p>
        </div>
        
        {/* Switch toggler with glowing active badge */}
        <div className="flex bg-black/60 border border-white/15 p-0.5 rounded-full">
          <button
            onClick={() => setView('user')}
            className={`px-4.5 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer ${
              view === 'user' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-650/20' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Viewer Area</span>
          </button>
          
          <button
            onClick={() => setView('admin')}
            className={`px-4.5 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer ${
              view === 'admin' 
                ? 'bg-gradient-to-r from-red-600 to-amber-550 text-white shadow-lg glow-red' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Operator CMD</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center space-x-1 text-[10px] font-mono text-gray-500">
          <span>Active View:</span>
          <span className="text-white uppercase font-bold">{view}</span>
        </div>
      </div>

      {/* RENDER ACTIVE SCREEN */}
      <div className="flex-1 flex flex-col">
        {view === 'user' ? (
          <UserPanel onSuggestAdminMode={() => setView('admin')} />
        ) : (
          <AdminPanel />
        )}
      </div>

    </div>
  );
}
