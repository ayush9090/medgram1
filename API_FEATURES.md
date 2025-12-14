# MedGram API - Complete Feature List

## 🎯 All Configuration is Dynamic (No Hardcoding)

All settings can be configured via environment variables:

### Environment Variables:
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRY` - Token expiry (default: 7d)
- `MINIO_VIDEOS_BUCKET` - Videos bucket name (default: videos)
- `MINIO_IMAGES_BUCKET` - Images bucket name (default: images)
- `MINIO_HLS_BUCKET` - HLS bucket name (default: hls)
- `MINIO_PUBLIC_URL` - Public MinIO URL
- `MAX_FILE_SIZE` - Max upload size in bytes (default: 100MB)
- `PRESIGNED_URL_EXPIRY` - Presigned URL expiry in seconds (default: 900)
- `DEFAULT_PAGE_SIZE` - Default pagination size (default: 20)
- `MAX_PAGE_SIZE` - Maximum pagination size (default: 50)

## 📡 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Posts & Feed
- `GET /feed` - Get feed with pagination
  - Query params: `page`, `limit`, `type`, `userId`
  - Returns: `{ posts: [], pagination: {} }`
- `POST /posts` - Create post (auth required)
  - Body: `{ type, content, mediaUrl, thumbnailUrl }`
- `DELETE /posts/:id` - Delete post (auth required, owner/admin only)

### Media Upload
- `POST /upload/presigned` - Get presigned upload URL (auth required)
  - Body: `{ filename, fileType }` (fileType: 'video' or 'image')
  - Returns: `{ uploadUrl, publicUrl, bucket, objectName, expiresIn }`
- `POST /upload/direct` - Direct file upload (auth required)
  - Form data: `file` (multipart/form-data)
  - Supports: images (jpg, png, gif, webp) and videos (mp4, mov, avi, mkv, webm)

### Interactions
- `POST /posts/:id/like` - Like/Unlike post (auth required)
  - Returns: `{ liked: true/false }`
- `POST /posts/:id/comments` - Add comment (auth required)
  - Body: `{ content }`
- `GET /posts/:id/comments` - Get comments
  - Query params: `page`, `limit`

### Users
- `GET /users/:id` - Get user profile
- `GET /users/:id/posts` - Get user's posts

### Search
- `GET /search?q=query&type=all|users|posts` - Search users and posts
  - Returns: `{ users: [], posts: [] }`

### System
- `GET /health` - Health check

## 🎨 Instagram-like Features

✅ **Dynamic Feed** - Pagination, filtering by type/user
✅ **Video Upload** - Direct upload or presigned URLs
✅ **Image Upload** - Support for all image formats
✅ **Comments** - Add and view comments on posts
✅ **Likes** - Like/unlike posts
✅ **Search** - Search users and posts
✅ **User Profiles** - View user info and their posts
✅ **Media Management** - Automatic bucket selection based on file type
✅ **Pagination** - All list endpoints support pagination
✅ **Comprehensive Logging** - All actions are logged

## 📦 Buckets Created Automatically

- `videos` - For video files
- `images` - For image files  
- `hls` - For processed HLS video streams

All buckets are created automatically and set to public read access.

## 🔒 Security Features

- JWT authentication for protected routes
- Role-based permissions (USER, MODERATOR, CREATOR, VIEW_ONLY)
- File type validation
- File size limits
- User-specific file organization (files stored in user folders)

## 📊 Response Format

All endpoints return consistent JSON responses:
- Success: `{ data }` or `{ success: true, ... }`
- Error: `{ error: "message" }`
- Paginated: `{ items: [], pagination: { page, limit, total, totalPages } }`

