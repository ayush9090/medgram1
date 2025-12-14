import { User, UserRole, Post, PostType } from '../types';

// Initial Mock Data
const MOCK_USERS: User[] = [
  {
    id: 'u1',
    username: 'dr_house',
    fullName: 'Dr. Gregory House',
    role: UserRole.MODERATOR,
    avatarUrl: 'https://picsum.photos/seed/house/100/100',
    verified: true
  },
  {
    id: 'u2',
    username: 'nurse_jackie',
    fullName: 'Jackie Peyton',
    role: UserRole.CREATOR,
    avatarUrl: 'https://picsum.photos/seed/jackie/100/100',
    verified: true
  },
  {
    id: 'u3',
    username: 'med_student_john',
    fullName: 'John Dorian',
    role: UserRole.USER,
    avatarUrl: 'https://picsum.photos/seed/jd/100/100',
    verified: false // Student exemption
  },
  {
    id: 'u4',
    username: 'observer_kim',
    fullName: 'Kim Observer',
    role: UserRole.VIEW_ONLY,
    avatarUrl: 'https://picsum.photos/seed/kim/100/100',
    verified: false
  }
];

const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    type: PostType.VIDEO,
    authorId: 'u1',
    authorName: 'Dr. Gregory House',
    authorAvatar: 'https://picsum.photos/seed/house/100/100',
    authorRole: UserRole.MODERATOR,
    content: 'Rare case of lupus presenting with neurological symptoms. #differential #diagnosis',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/video1/400/600',
    likes: 1240,
    comments: [],
    timestamp: Date.now() - 1000000,
    likedByCurrentUser: false,
    savedByCurrentUser: false
  },
  {
    id: 'p2',
    type: PostType.THREAD,
    authorId: 'u2',
    authorName: 'Jackie Peyton',
    authorAvatar: 'https://picsum.photos/seed/jackie/100/100',
    authorRole: UserRole.CREATOR,
    content: 'Discussion: Best practices for managing patient triage in an overflowing ER. What are your protocols for rapid assessment?',
    likes: 45,
    comments: [
        { id: 'c1', userId: 'u1', username: 'dr_house', text: 'Everybody lies.', timestamp: Date.now() }
    ],
    timestamp: Date.now() - 500000,
    likedByCurrentUser: false,
    savedByCurrentUser: false
  },
  {
    id: 'p3',
    type: PostType.VIDEO,
    authorId: 'u2',
    authorName: 'Jackie Peyton',
    authorAvatar: 'https://picsum.photos/seed/jackie/100/100',
    authorRole: UserRole.CREATOR,
    content: 'Proper technique for IV insertion in dehydrated patients.',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/video2/400/600',
    likes: 890,
    comments: [],
    timestamp: Date.now() - 200000,
    likedByCurrentUser: false,
    savedByCurrentUser: false
  },
  {
    id: 'p4',
    type: PostType.THREAD,
    authorId: 'u1',
    authorName: 'Dr. Gregory House',
    authorAvatar: 'https://picsum.photos/seed/house/100/100',
    authorRole: UserRole.MODERATOR,
    content: 'Patient lied about travel history. Check for parasites.',
    likes: 230,
    comments: [],
    timestamp: Date.now() - 2000000,
    likedByCurrentUser: true,
    savedByCurrentUser: true
  }
];

// Service to simulate backend logic and delays
export const MockBackend = {
  login: async (username: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = MOCK_USERS.find(u => u.username === username);
        if (user) {
          resolve(user);
        } else {
          // If not found in mock list, create a transient user for demo
          resolve({
            id: username,
            username: username,
            fullName: username.charAt(0).toUpperCase() + username.slice(1),
            role: UserRole.USER,
            avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=random`,
            verified: false
          });
        }
      }, 800);
    });
  },

  getFeed: async (cursor: number = 0): Promise<Post[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_POSTS);
      }, 500);
    });
  },

  getPostsByUser: async (userId: string): Promise<Post[]> => {
     return new Promise((resolve) => {
         setTimeout(() => {
             // Return posts authored by this user, or random ones if none found for demo density
             const userPosts = MOCK_POSTS.filter(p => p.authorId === userId || p.authorName === userId);
             if (userPosts.length > 0) {
                 resolve(userPosts);
             } else {
                 // Return empty for new users
                 resolve([]);
             }
         }, 400);
     });
  },

  likePost: async (postId: string, user: User): Promise<void> => {
    if (user.role === UserRole.VIEW_ONLY) {
      throw new Error('Permission denied: View-Only users cannot like posts.');
    }
    const post = MOCK_POSTS.find(p => p.id === postId);
    if (post) {
      if (post.likedByCurrentUser) {
        post.likes--;
        post.likedByCurrentUser = false;
      } else {
        post.likes++;
        post.likedByCurrentUser = true;
      }
    }
  },

  createPost: async (postData: Partial<Post>, user: User): Promise<Post> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // STRICT ROLE ENFORCEMENT
        if (user.role === UserRole.VIEW_ONLY) {
            reject(new Error("View-Only users cannot create content."));
            return;
        }

        if (postData.type === PostType.VIDEO) {
            if (user.role === UserRole.USER) {
                reject(new Error("Standard Users cannot post videos. Upgrade to Creator or Moderator."));
                return;
            }
        }

        const newPost: Post = {
          id: `new_${Date.now()}`,
          type: postData.type || PostType.THREAD,
          authorId: user.id,
          authorName: user.fullName,
          authorAvatar: user.avatarUrl,
          authorRole: user.role,
          content: postData.content || '',
          mediaUrl: postData.mediaUrl,
          likes: 0,
          comments: [],
          timestamp: Date.now(),
          likedByCurrentUser: false,
          savedByCurrentUser: false
        };

        MOCK_POSTS.unshift(newPost);
        resolve(newPost);
      }, 1000);
    });
  }
};