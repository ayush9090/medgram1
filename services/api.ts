import { User, Post } from '../types';

// Points to your backend API. 
// Can be configured via VITE_API_URL environment variable
// Default: http://74.208.158.126:4000 (your server)
const API_URL = import.meta.env.VITE_API_URL || 'http://74.208.158.126:4000'; 

export const ApiService = {
  // Helper for requests
  request: async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API Request failed');
    }
    return data;
  },

  login: async (username: string, password: string): Promise<User> => {
    const data = await ApiService.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('token', data.token);
    return data.user;
  },

  register: async (userData: any): Promise<User> => {
    const data = await ApiService.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
    
    // If verification required, handle it
    if (data.requiresVerification) {
      // Store verification info
      localStorage.setItem('pendingVerification', JSON.stringify({
        userId: data.user.id,
        verificationCode: data.verificationCode
      }));
      // Return user but note verification needed
      return { ...data.user, requiresVerification: true };
    }
    
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data.user;
  },

  getFeed: async (page: number = 1, limit: number = 20): Promise<{ posts: Post[], pagination: any }> => {
    const data = await ApiService.request(`/feed?page=${page}&limit=${limit}`);
    // Backend returns { posts: [], pagination: {} }
    return data;
  },

  getPostsByUser: async (userId: string): Promise<Post[]> => {
     // Use the dedicated endpoint
     return ApiService.request(`/users/${userId}/posts`);
  },

  createPost: async (postData: Partial<Post>): Promise<void> => {
    await ApiService.request('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  // Uploads video to MinIO via Backend Presigned URL
  uploadMedia: async (file: File): Promise<string> => {
    // 1. Get Presigned URL
    const { uploadUrl, publicUrl } = await ApiService.request('/upload/presigned', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, fileType: file.type.startsWith('image/') ? 'image' : 'video' })
    });

    // 2. Upload directly to Object Storage
    await fetch(uploadUrl, {
        method: 'PUT',
        body: file
    });

    return publicUrl;
  },

  // Get user profile with stats
  getUserProfile: async (userId: string): Promise<any> => {
    return ApiService.request(`/users/${userId}`);
  },

  // Update user profile
  updateProfile: async (userId: string, profileData: any): Promise<User> => {
    return ApiService.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  // Get saved posts
  getSavedPosts: async (userId: string): Promise<Post[]> => {
    return ApiService.request(`/users/${userId}/saved`);
  },

  // Logout (clear token)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('pendingVerification');
  },

  // Email Verification
  verifyEmail: async (code: string, userId: string): Promise<void> => {
    await ApiService.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ code, userId })
    });
  },

  resendVerification: async (email: string): Promise<void> => {
    await ApiService.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // Password Reset
  forgotPassword: async (email: string): Promise<void> => {
    await ApiService.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await ApiService.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }
};