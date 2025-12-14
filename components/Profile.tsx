import React, { useEffect, useState } from 'react';
import { User, Post, PostType } from '../types';
import { ApiService } from '../services/api.ts';

interface ProfileProps {
  user: User;
  onLogout: () => void;
  onUserUpdate?: (updatedUser: User) => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onLogout, onUserUpdate }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'grid' | 'saved'>('grid');
  const [profileData, setProfileData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: user.fullName || '',
    bio: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfileData();
    loadPosts();
  }, [user.id]);

  const loadProfileData = async () => {
    try {
      const data = await ApiService.getUserProfile(user.id);
      setProfileData(data);
      setEditForm({
        fullName: data.full_name || user.fullName || '',
        bio: data.bio || '',
        email: data.email || '',
        phone: data.phone || ''
      });
    } catch (e) {
      console.error("Failed to load profile data", e);
    }
  };

  const loadPosts = async () => {
    try {
      if (activeTab === 'grid') {
        const data = await ApiService.getPostsByUser(user.id);
        setPosts(data);
      } else {
        const data = await ApiService.getSavedPosts(user.id);
        setSavedPosts(data);
      }
    } catch (e) {
      console.error("Failed to load posts", e);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [activeTab, user.id]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const updated = await ApiService.updateProfile(user.id, editForm);
      if (onUserUpdate) {
        onUserUpdate({ ...user, ...updated });
      }
      setIsEditing(false);
      loadProfileData();
    } catch (e: any) {
      alert(e.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    onLogout();
  };

  const stats = profileData?.stats || { posts: 0, followers: 0, following: 0 };
  const displayPosts = activeTab === 'grid' ? posts : savedPosts;

  return (
    <div className="bg-white min-h-full pb-20">
      {/* Profile Header */}
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-purple-600">
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-gray-100">
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                </div>
            </div>
            {user.verified && (
                <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 border-2 border-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
            )}
          </div>

          {/* Stats - Dynamic from API */}
          <div className="flex flex-1 justify-around text-center ml-4">
            <div className="cursor-pointer hover:opacity-70 active:scale-95 transition-transform">
                <div className="font-bold text-gray-900 text-lg">{stats.posts}</div>
                <div className="text-xs text-gray-500">Posts</div>
            </div>
            <div className="cursor-pointer hover:opacity-70 active:scale-95 transition-transform">
                <div className="font-bold text-gray-900 text-lg">{stats.followers}</div>
                <div className="text-xs text-gray-500">Followers</div>
            </div>
            <div className="cursor-pointer hover:opacity-70 active:scale-95 transition-transform">
                <div className="font-bold text-gray-900 text-lg">{stats.following}</div>
                <div className="text-xs text-gray-500">Following</div>
            </div>
          </div>
        </div>

        {/* Bio and Actions */}
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editForm.fullName}
                            onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                            className="font-bold text-gray-900 border-2 border-gray-300 rounded px-2 py-1 text-base flex-1"
                        />
                    ) : (
                        <>
                            <h2 className="font-bold text-gray-900">{user.fullName}</h2>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium bg-gray-100 text-gray-600`}>
                                {user.role}
                            </span>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSaveProfile}
                                disabled={loading}
                                className="px-4 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded hover:bg-gray-800 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded hover:bg-gray-200"
                        >
                            Edit
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="px-4 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded hover:bg-red-100"
                    >
                        Logout
                    </button>
                </div>
            </div>
            
            {isEditing ? (
                <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Add a bio..."
                    className="w-full text-sm text-gray-600 mt-1 border-2 border-gray-300 rounded px-2 py-1 resize-none"
                    rows={2}
                />
            ) : (
                <p className="text-sm text-gray-600 mt-1">
                    {profileData?.bio || 'No bio yet. Click Edit to add one.'}
                </p>
            )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
            onClick={() => setActiveTab('grid')}
            className={`flex-1 py-3 flex justify-center transition-colors ${activeTab === 'grid' ? 'border-b border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </button>
        <button 
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 flex justify-center transition-colors ${activeTab === 'saved' ? 'border-b border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-3 gap-0.5">
          {displayPosts.length > 0 ? (
               displayPosts.map(post => (
                       <div key={post.id} className="aspect-square bg-gray-100 relative group cursor-pointer" onClick={() => alert(`Post ${post.id} clicked`)}>
                           {post.type === PostType.VIDEO ? (
                               <>
                                <video src={post.mediaUrl} className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2 text-white drop-shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                </div>
                               </>
                           ) : (
                               <div className="w-full h-full p-2 text-[8px] bg-white overflow-hidden text-gray-500">
                                   {post.content}
                               </div>
                           )}
                       </div>
                   ))
          ) : (
              <div className="col-span-3 py-10 text-center text-gray-400 text-sm">
                  {activeTab === 'grid' ? 'No posts yet.' : 'No saved posts yet.'}
              </div>
          )}
      </div>
    </div>
  );
};