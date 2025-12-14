import React, { useState } from 'react';
import { User } from './types';
import { AuthScreen } from './components/AuthScreen';
import { Layout } from './components/Layout';
import { Feed } from './components/Feed';
import { Profile } from './components/Profile';
import { Search } from './components/Search';
import { Activity } from './components/Activity';
import { Messages } from './components/Messages';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [refreshFeed, setRefreshFeed] = useState(0);

  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }

  const handlePostCreated = () => {
      setRefreshFeed(prev => prev + 1);
      setActiveTab('home'); // Go back to feed on post
  };

  return (
    <Layout 
      user={user} 
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={() => setUser(null)}
      onPostCreated={handlePostCreated}
    >
      {activeTab === 'home' && <Feed user={user} refreshTrigger={refreshFeed} />}
      {activeTab === 'search' && <Search />}
      {activeTab === 'activity' && <Activity />}
      {activeTab === 'profile' && (
        <Profile 
          user={user} 
          onLogout={() => {
            setUser(null);
            setActiveTab('home');
          }}
          onUserUpdate={(updatedUser) => setUser(updatedUser)}
        />
      )}
      {activeTab === 'messages' && <Messages onBack={() => setActiveTab('home')} />}
    </Layout>
  );
};

export default App;