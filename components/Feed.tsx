import React, { useEffect, useState } from 'react';
import { Post, User } from '../types';
import { ApiService } from '../services/api.ts';
import { PostItem } from './PostItem';
import { StoriesBar } from './StoriesBar';

interface FeedProps {
  user: User | null;
  refreshTrigger: number;
}

export const Feed: React.FC<FeedProps> = ({ user, refreshTrigger }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, [refreshTrigger]);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getFeed();
      // Backend now returns { posts: [], pagination: {} }
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Feed error:", error);
      setPosts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <StoriesBar />
      {posts.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No posts yet. Be the first!</div>
      ) : (
          posts.map((post) => (
            <PostItem key={post.id} post={post} currentUser={user} />
          ))
      )}
      <div className="h-10 text-center text-xs text-gray-400 py-4">
        You're all caught up!
      </div>
    </div>
  );
};