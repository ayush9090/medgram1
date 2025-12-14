import React, { useState, useRef, useEffect } from 'react';
import { Post, PostType, User, UserRole } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { GeminiService } from '../services/geminiService';
import { MockBackend } from '../services/mockDb';

interface PostItemProps {
  post: Post;
  currentUser: User | null;
}

export const PostItem: React.FC<PostItemProps> = ({ post, currentUser }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [liked, setLiked] = useState(post.likedByCurrentUser);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.6 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLike = async () => {
    if (!currentUser) return;
    try {
      await MockBackend.likePost(post.id, currentUser);
      setLiked(!liked);
      setLikeCount(prev => liked ? prev - 1 : prev + 1);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const toggleSave = () => {
      setSaved(!saved);
      // In real app, call API
  };

  const handleShare = () => {
      alert("Share functionality simulated: Link copied to clipboard!");
  };

  const handleComment = () => {
      // Navigate to comments logic
      console.log("Open comments");
  };

  const fetchInsight = async () => {
    if (aiInsight) {
        setAiInsight(null); // Toggle off
        return;
    } 
    setLoadingAi(true);
    const insight = await GeminiService.analyzePost(post);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  return (
    <div ref={containerRef} className="bg-white pb-2 mb-2 border-b border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 cursor-pointer">
            <div className={`p-[1px] rounded-full ${post.authorRole === UserRole.MODERATOR ? 'bg-gradient-to-tr from-yellow-400 to-red-500' : 'bg-gray-200'}`}>
                <div className="p-[1px] bg-white rounded-full">
                    <img src={post.authorAvatar} alt={post.authorName} className="w-8 h-8 rounded-full object-cover" />
                </div>
            </div>
            <div>
                 <span className="font-semibold text-sm text-gray-900 block leading-tight">{post.authorId}</span>
                 {post.authorRole !== UserRole.USER && (
                     <span className="text-[10px] text-gray-500">{post.authorRole}</span>
                 )}
            </div>
        </div>
        <button className="text-gray-900 px-2" onClick={() => alert("More options menu")}>
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      {/* Content */}
      <div className="relative">
         {post.type === PostType.THREAD ? (
            <div className="px-4 py-6 bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-serif">
                {post.content}
            </div>
         ) : (
            <div className="relative w-full bg-black">
                <VideoPlayer src={post.mediaUrl!} isActive={isVisible} poster={post.thumbnailUrl} />
                
                {/* Dr. AI Floating Button */}
                <button 
                    onClick={fetchInsight}
                    className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md text-teal-700 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg z-10 border border-teal-100 active:scale-95 transition-all"
                >
                     {loadingAi ? (
                         <div className="animate-spin h-4 w-4 border-2 border-teal-600 border-t-transparent rounded-full"></div>
                     ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                     )}
                     <span className="text-xs font-bold">Dr. AI</span>
                </button>
            </div>
         )}
         
         {/* AI Insight Overlay */}
         {aiInsight && (
             <div className="bg-teal-50 border-y border-teal-100 p-3 animate-in slide-in-from-top-2 fade-in">
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-700"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5c3.25 0 2.5-2.5 0-2.5"/></svg>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-teal-800 mb-1">MedGram Analysis</h4>
                        <p className="text-xs text-teal-900 leading-relaxed">{aiInsight}</p>
                    </div>
                </div>
             </div>
         )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLike}
            className={`transition ${liked ? 'text-red-500' : 'text-gray-900 hover:text-gray-600'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
          
          <button onClick={handleComment} className="text-gray-900 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>

          <button onClick={handleShare} className="text-gray-900 hover:text-gray-600">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        
        <button onClick={toggleSave} className={`transition ${saved ? 'text-black fill-black' : 'text-gray-900 hover:text-gray-600'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>

      <div className="px-3 pt-2">
        <p className="text-sm font-semibold">{likeCount.toLocaleString()} likes</p>
        <div className="mt-1">
            <span className="font-semibold text-sm mr-2">{post.authorId}</span>
            <span className="text-sm text-gray-800">{post.content}</span>
        </div>
        {post.comments.length > 0 && (
            <p className="text-gray-500 text-sm mt-1 cursor-pointer" onClick={() => alert("Comments view simulated")}>View all {post.comments.length} comments</p>
        )}
        <p className="text-[10px] text-gray-400 uppercase mt-1 tracking-wide">30 MINUTES AGO</p>
      </div>
    </div>
  );
};