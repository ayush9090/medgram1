import React, { useState } from 'react';
import { User } from '../types';
import { CreatePostModal } from './CreatePostModal';

interface LayoutProps {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
  onPostCreated: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ user, activeTab, onTabChange, onLogout, children, onPostCreated }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="h-full flex flex-col bg-gray-50 max-w-md mx-auto shadow-2xl relative overflow-hidden border-x border-gray-200">
      {/* Top Navbar - Only show on Feed to mimic standard patterns, or customize per view. Keeping generic for now, but hidden on Search/Profile typically */}
      {activeTab === 'home' && (
          <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200 z-20 sticky top-0">
            <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 font-sans tracking-tight">MedGram</h1>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    className="text-gray-800 hover:text-gray-600"
                    onClick={() => onTabChange('activity')}
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </button>
                <button 
                    className="text-gray-800 hover:text-gray-600 relative"
                    onClick={() => onTabChange('messages')}
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                   <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1 rounded-full">3</span>
                </button>
            </div>
          </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth bg-white">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20 text-gray-900 absolute bottom-0 w-full pb-6">
        <NavButton 
            icon="home" 
            active={activeTab === 'home'} 
            onClick={() => onTabChange('home')} 
        />
        <NavButton 
            icon="search" 
            active={activeTab === 'search'} 
            onClick={() => onTabChange('search')} 
        />
        
        {/* Create Button (Center) */}
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>

        <NavButton 
            icon="activity" 
            active={activeTab === 'activity'} 
            onClick={() => onTabChange('activity')} 
        />
        
        <button onClick={() => onTabChange('profile')} className={`rounded-full w-7 h-7 overflow-hidden border-2 ${activeTab === 'profile' ? 'border-black' : 'border-gray-200'}`}>
             <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
        </button>
      </nav>

      {isCreateModalOpen && (
        <CreatePostModal 
          user={user} 
          onClose={() => setIsCreateModalOpen(false)} 
          onPostCreated={onPostCreated}
        />
      )}
    </div>
  );
};

const NavButton = ({ icon, active = false, onClick }: { icon: string, active?: boolean, onClick: () => void }) => {
  const getIcon = () => {
    switch(icon) {
      case 'home': return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
      case 'search': return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
      case 'activity': return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
      default: return null;
    }
  }

  return (
    <button onClick={onClick} className={`p-2 transition-colors ${active ? 'text-black' : 'text-gray-500 hover:text-gray-900'}`}>
      {getIcon()}
    </button>
  );
};