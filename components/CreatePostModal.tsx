import React, { useState } from 'react';
import { User, UserRole, PostType } from '../types';
import { ApiService } from '../services/api.ts';

interface CreatePostModalProps {
  user: User;
  onClose: () => void;
  onPostCreated: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ user, onClose, onPostCreated }) => {
  const [postType, setPostType] = useState<PostType>(PostType.THREAD);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission Logic
  const canPostVideo = user.role === UserRole.MODERATOR || user.role === UserRole.CREATOR;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await ApiService.createPost({
        type: postType,
        content,
        // In real app, we would handle file upload here via uploadMedia()
        // For now, if type is video, we use a placeholder or assume text only unless file input is added
        mediaUrl: postType === PostType.VIDEO 
            ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' 
            : undefined
      });
      onPostCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold">New Post</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setPostType(PostType.THREAD)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${postType === PostType.THREAD ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Thread
            </button>
            <button
              type="button"
              onClick={() => setPostType(PostType.VIDEO)}
              disabled={!canPostVideo}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${postType === PostType.VIDEO ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'} ${!canPostVideo ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Video
              {!canPostVideo && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
            </button>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={postType === PostType.VIDEO ? "Add a caption for your video..." : "Start a clinical discussion..."}
            className="w-full h-32 p-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-sm"
            required
          />

          {error && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (postType === PostType.VIDEO && !canPostVideo)}
            className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:opacity-70 disabled:cursor-not-allowed hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            {isSubmitting ? 'Posting...' : 'Share Post'}
          </button>
        </form>
      </div>
    </div>
  );
};