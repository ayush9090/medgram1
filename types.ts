export enum UserRole {
  MODERATOR = 'MODERATOR',
  CREATOR = 'CREATOR',
  USER = 'USER',
  VIEW_ONLY = 'VIEW_ONLY'
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string;
  verified: boolean; // NPI/License verification
}

export enum PostType {
  VIDEO = 'VIDEO',
  THREAD = 'THREAD'
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface Post {
  id: string;
  type: PostType;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  content: string; // Text for threads, Caption for videos
  mediaUrl?: string; // Video URL or Image URL
  thumbnailUrl?: string;
  likes: number;
  comments: Comment[];
  timestamp: number;
  likedByCurrentUser?: boolean;
  savedByCurrentUser?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}