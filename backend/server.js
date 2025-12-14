const express = require('express');
const { Pool } = require('pg');
const Minio = require('minio');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();

// --- LOGGING MIDDLEWARE ---
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
  
  // Log request body for POST/PUT (except passwords)
  if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '***HIDDEN***';
    if (logBody.password_hash) logBody.password_hash = '***HIDDEN***';
    console.log(`  Body:`, JSON.stringify(logBody));
  }
  
  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`[${timestamp}] ${method} ${url} - Status: ${res.statusCode}`);
    if (res.statusCode >= 400) {
      console.log(`  Error Response:`, data);
    }
    return originalSend.call(this, data);
  };
  
  next();
};

app.use(logger);
app.use(express.json());
app.use(cors());

// --- CONFIGURATION (All Dynamic) ---
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// MinIO Configuration - All Dynamic
const MINIO_VIDEOS_BUCKET = process.env.MINIO_VIDEOS_BUCKET || 'videos';
const MINIO_IMAGES_BUCKET = process.env.MINIO_IMAGES_BUCKET || 'images';
const MINIO_HLS_BUCKET = process.env.MINIO_HLS_BUCKET || 'hls';
// MinIO Public URL for generating public URLs (accessible by browser)
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || 'http://74.208.158.126:9000';

// Upload Configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB default
const PRESIGNED_URL_EXPIRY = parseInt(process.env.PRESIGNED_URL_EXPIRY || '900'); // 15 minutes default

// Pagination
const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE || '20');
const MAX_PAGE_SIZE = parseInt(process.env.MAX_PAGE_SIZE || '50');

// Email Configuration (All Dynamic)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || 'noreply@medgram.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Email Transporter (configured dynamically)
let emailTransporter = null;
if (SMTP_USER && SMTP_PASSWORD) {
  emailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
  console.log(`[EMAIL] Email service configured: ${SMTP_HOST}:${SMTP_PORT}`);
} else {
  console.log(`[EMAIL] Email service not configured - set SMTP_USER and SMTP_PASSWORD`);
}

// Email Helper Functions
const sendEmail = async (to, subject, html, text) => {
  if (!emailTransporter) {
    console.log(`[EMAIL] Email not sent - service not configured. Would send to: ${to}, Subject: ${subject}`);
    return { success: false, message: 'Email service not configured' };
  }
  
  try {
    const info = await emailTransporter.sendMail({
      from: `"MedGram" <${SMTP_FROM}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`[EMAIL] Email sent successfully to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] Error sending email:`, error.message);
    return { success: false, error: error.message };
  }
};

const sendVerificationEmail = async (email, verificationCode, userId) => {
  const verificationLink = `${FRONTEND_URL}/verify-email?code=${verificationCode}&userId=${userId}`;
  const subject = 'Verify Your MedGram Account';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #1a1a1a; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .code { font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #1a1a1a; padding: 10px; background: #e9e9e9; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MedGram</h1>
          <p>Medical Education Community</p>
        </div>
        <div class="content">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for registering with MedGram! Please verify your email address to complete your registration.</p>
          
          <p>Your verification code is:</p>
          <div class="code">${verificationCode}</div>
          
          <p>Or click the button below to verify:</p>
          <a href="${verificationLink}" class="button">Verify Email</a>
          
          <p>If you didn't create an account with MedGram, please ignore this email.</p>
          <p>This verification link will expire in 24 hours.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Verify your MedGram account. Your verification code is: ${verificationCode}. Or visit: ${verificationLink}`;
  
  return await sendEmail(email, subject, html, text);
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  const subject = 'Reset Your MedGram Password';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #1a1a1a; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { color: #d32f2f; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MedGram</h1>
          <p>Medical Education Community</p>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>You requested to reset your password for your MedGram account.</p>
          
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          
          <p class="warning">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          <p>This reset link will expire in 1 hour.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Reset your MedGram password. Visit: ${resetLink}`;
  
  return await sendEmail(email, subject, html, text);
};

// --- DATABASE CONNECTION ---
// Connects to the 'medgram_db' container from your stack
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'medgram_admin',
  host: process.env.POSTGRES_HOST || 'medgram_db', 
  database: process.env.POSTGRES_DB || 'medgram_db',
  password: process.env.POSTGRES_PASSWORD || 'secure_password_change_me',
  port: 5432,
});

// --- MINIO CONNECTION ---
// Connects to the 'medgram_storage' container from your stack (Internal Docker Network)
// For presigned URLs, we need to use the public URL
const MINIO_INTERNAL_ENDPOINT = process.env.MINIO_ENDPOINT || 'medgram-storage';
const MINIO_INTERNAL_PORT = parseInt(process.env.MINIO_PORT || '9000');
const MINIO_PUBLIC_ENDPOINT = process.env.MINIO_PUBLIC_ENDPOINT || '74.208.158.126'; // Public IP or domain
const MINIO_PUBLIC_PORT = parseInt(process.env.MINIO_PUBLIC_PORT || '9000');

// Internal client for operations (bucket creation, etc.)
// This client connects to MinIO via internal Docker network
console.log(`[MINIO INIT] Creating MinIO client with endpoint: ${MINIO_INTERNAL_ENDPOINT}, port: ${MINIO_INTERNAL_PORT}`);
console.log(`[MINIO INIT] Environment variables - MINIO_ENDPOINT: ${process.env.MINIO_ENDPOINT}, MINIO_PORT: ${process.env.MINIO_PORT}`);
console.log(`[MINIO INIT] MINIO_ROOT_USER: ${process.env.MINIO_ROOT_USER || 'minio_admin'}`);

// MinIO client - connects via Docker internal network
// Changed service name from medgram_storage to medgram-storage (hyphens instead of underscores)
// because MinIO client rejects hostnames with underscores as "invalid hostname"
const minioClient = new Minio.Client({
  endPoint: MINIO_INTERNAL_ENDPOINT,
  port: MINIO_INTERNAL_PORT,
  useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER || 'minio_admin',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'secure_minio_password_change_me'
});

console.log(`[MINIO INIT] MinIO client created successfully`);

// Public client for presigned URLs (uses public endpoint)
const minioPublicClient = new Minio.Client({
  endPoint: MINIO_PUBLIC_ENDPOINT,
  port: MINIO_PUBLIC_PORT,
  useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER || 'minio_admin',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'secure_minio_password_change_me',
});

// --- AUTH MIDDLEWARE ---
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log(`[AUTH] No authorization header`);
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  if (!token) {
    console.log(`[AUTH] Invalid authorization format`);
    return res.status(401).json({ error: 'Unauthorized - Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log(`[AUTH] Authenticated user: ${decoded.id}, role: ${decoded.role}`);
    next();
  } catch (err) {
    console.log(`[AUTH] Token verification failed:`, err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired - Please login again' });
    }
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// --- ROUTES ---

// 1. REGISTER (Updated per MIB Layout requirements)
app.post('/auth/register', async (req, res) => {
  const { username, password, fullName, role, npiNumber, stateLicense, email, phone, userType } = req.body;
  console.log(`[REGISTER] Attempting to register user: ${username || email || phone}, role: ${role}`);
  
  try {
    // Username can be email or phone number
    const identifier = username || email || phone;
    if (!identifier || !password) {
      console.log(`[REGISTER] Missing identifier or password`);
      return res.status(400).json({ error: 'Email/Phone and password are required' });
    }
    
    // Validate email or phone format
    const isEmail = identifier.includes('@');
    const isPhone = /^\+?[\d\s-()]+$/.test(identifier);
    
    if (!isEmail && !isPhone) {
      return res.status(400).json({ error: 'Username must be a valid email or phone number' });
    }
    
    // Check if user already exists (by email or phone)
    const existingUser = await pool.query(
      `SELECT id FROM users WHERE username = $1 OR email = $1 OR phone = $1`,
      [identifier]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Email verification - always required for email registrations
    let emailVerified = false;
    let emailVerificationCode = null;
    
    if (isEmail) {
      // Generate email verification code
      emailVerificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      console.log(`[REGISTER] Generated email verification code for ${identifier}`);
    }
    
    // NPI/License verification requirements (except students and "others")
    let verified = false;
    let verificationCode = null;
    
    if (userType !== 'STUDENT' && userType !== 'OTHER') {
      // Requires NPI or State License verification
      if (!npiNumber && !stateLicense) {
        return res.status(400).json({ 
          error: 'NPI number or State License is required for verification',
          requiresVerification: true 
        });
      }
      // Generate verification code (to be verified by moderator)
      verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log(`[REGISTER] Generated verification code: ${verificationCode} for ${identifier}`);
    } else {
      // Students and others don't require NPI verification
      verified = true;
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultRole = role || 'USER'; // Default to USER if not specified
    
    const result = await pool.query(
      `INSERT INTO users (username, email, phone, password_hash, full_name, role, npi_number, state_license, avatar_url, verified, verification_code, user_type, email_verified, email_verification_code, email_verification_expires) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
       RETURNING id, username, email, phone, role, verified, verification_code, email_verified`,
      [
        identifier, 
        isEmail ? identifier : null, // email
        isPhone ? identifier : null, // phone
        hashedPassword, 
        fullName, 
        defaultRole, 
        npiNumber, 
        stateLicense,
        `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || identifier)}`, 
        verified,
        verificationCode,
        userType || 'OTHER',
        emailVerified,
        emailVerificationCode,
        emailVerificationCode ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null // 24 hours expiry
      ]
    );
    
    const user = result.rows[0];
    
    // Send email verification if email provided
    if (isEmail && emailVerificationCode) {
      const emailResult = await sendVerificationEmail(identifier, emailVerificationCode, user.id);
      if (!emailResult.success) {
        console.log(`[REGISTER] Failed to send verification email, but user created`);
      }
    }
    
    // If NPI verification required, don't issue token yet
    if (verificationCode) {
      console.log(`[REGISTER] User registered but requires NPI verification. Code: ${verificationCode}`);
      return res.json({ 
        user: { ...user, password_hash: undefined },
        requiresVerification: true,
        requiresEmailVerification: isEmail && !emailVerified,
        verificationCode: verificationCode,
        message: 'Registration pending verification. Please check your email for verification link.'
      });
    }
    
    // If email verification required but NPI not required
    if (isEmail && !emailVerified) {
      return res.json({
        user: { ...user, password_hash: undefined },
        requiresEmailVerification: true,
        message: 'Please verify your email address. Check your inbox for the verification link.'
      });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    console.log(`[REGISTER] Successfully registered user: ${identifier}, ID: ${user.id}`);
    res.json({ user: { ...user, password_hash: undefined }, token });
  } catch (err) {
    console.error(`[REGISTER] Error:`, err.message);
    res.status(400).json({ error: 'User already exists or invalid data' });
  }
});

// 2. LOGIN (Updated per MIB Layout - supports email or phone)
app.post('/auth/login', async (req, res) => {
  const { username, password, twoFactorCode } = req.body; // username can be email or phone
  console.log(`[LOGIN] Attempting login for user: ${username}`);
  
  try {
    // Support login with email or phone number
    const result = await pool.query(
      `SELECT * FROM users WHERE username = $1 OR email = $1 OR phone = $1`,
      [username]
    );
    const user = result.rows[0];
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      console.log(`[LOGIN] Invalid credentials for user: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if email is verified (for email-based accounts)
    if (user.email && !user.email_verified) {
      return res.status(403).json({ 
        error: 'Email not verified. Please check your email for verification link.',
        requiresEmailVerification: true,
        email: user.email
      });
    }
    
    // Check if user is verified (if NPI verification was required)
    if (!user.verified && user.verification_code) {
      return res.status(403).json({ 
        error: 'Account pending NPI/License verification',
        requiresVerification: true 
      });
    }
    
    // 2FA Check (if enabled)
    if (user.two_factor_enabled) {
      if (!twoFactorCode) {
        return res.status(200).json({ 
          requiresTwoFactor: true,
          message: 'Two-factor authentication code required'
        });
      }
      
      // Verify 2FA code (in production, use proper 2FA library like speakeasy)
      // For now, check against stored code or use time-based OTP
      const isValidCode = await verify2FACode(user.id, twoFactorCode);
      if (!isValidCode) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    // Remove sensitive data from response
    delete user.password_hash;
    delete user.verification_code;
    // Ensure username is returned (use full_name if available, otherwise username)
    const userResponse = {
      ...user,
      username: user.username || user.email || user.phone,
      fullName: user.full_name || user.username || user.email || user.phone
    };
    console.log(`[LOGIN] Successful login for user: ${username}, role: ${user.role}`);
    res.json({ user: userResponse, token });
  } catch (err) {
    console.error(`[LOGIN] Error:`, err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Helper function for 2FA verification (placeholder - implement with proper 2FA library)
const verify2FACode = async (userId, code) => {
  // TODO: Implement proper 2FA verification
  // For now, return true (implement with speakeasy or similar)
  return true;
};

// 2a. VERIFY EMAIL
app.post('/auth/verify-email', async (req, res) => {
  const { code, userId } = req.body;
  console.log(`[VERIFY EMAIL] Verifying email for user: ${userId} with code: ${code}`);
  
  if (!code || !userId) {
    return res.status(400).json({ error: 'Verification code and user ID are required' });
  }
  
  try {
    const result = await pool.query(
      `SELECT email_verification_code, email_verification_expires, email_verified 
       FROM users WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    
    if (!user.email_verification_code) {
      return res.status(400).json({ error: 'No pending email verification' });
    }
    
    if (user.email_verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    if (new Date() > new Date(user.email_verification_expires)) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }
    
    // Verify email
    await pool.query(
      'UPDATE users SET email_verified = true, email_verification_code = NULL, email_verification_expires = NULL WHERE id = $1',
      [userId]
    );
    
    console.log(`[VERIFY EMAIL] Email verified successfully for user: ${userId}`);
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error(`[VERIFY EMAIL] Error:`, err.message);
    res.status(500).json({ error: 'Could not verify email' });
  }
});

// 2b. RESEND VERIFICATION EMAIL
app.post('/auth/resend-verification', async (req, res) => {
  const { email } = req.body;
  console.log(`[RESEND VERIFICATION] Resending verification email to: ${email}`);
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  try {
    const result = await pool.query(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    
    // Generate new verification code
    const emailVerificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    await pool.query(
      `UPDATE users SET email_verification_code = $1, email_verification_expires = $2 WHERE id = $3`,
      [emailVerificationCode, new Date(Date.now() + 24 * 60 * 60 * 1000), user.id]
    );
    
    // Send verification email
    const emailResult = await sendVerificationEmail(email, emailVerificationCode, user.id);
    
    if (emailResult.success) {
      console.log(`[RESEND VERIFICATION] Verification email sent successfully`);
      res.json({ success: true, message: 'Verification email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send verification email', details: emailResult.error });
    }
  } catch (err) {
    console.error(`[RESEND VERIFICATION] Error:`, err.message);
    res.status(500).json({ error: 'Could not resend verification email' });
  }
});

// 2c. REQUEST PASSWORD RESET
app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log(`[FORGOT PASSWORD] Password reset requested for: ${email}`);
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      // Don't reveal if email exists for security
      return res.json({ success: true, message: 'If the email exists, a password reset link has been sent' });
    }
    
    const userId = result.rows[0].id;
    
    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign({ userId, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
    
    // Store reset token in database
    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, new Date(Date.now() + 60 * 60 * 1000), userId]
    );
    
    // Send password reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken);
    
    if (emailResult.success) {
      console.log(`[FORGOT PASSWORD] Password reset email sent successfully`);
      res.json({ success: true, message: 'Password reset link sent to your email' });
    } else {
      res.status(500).json({ error: 'Failed to send password reset email' });
    }
  } catch (err) {
    console.error(`[FORGOT PASSWORD] Error:`, err.message);
    res.status(500).json({ error: 'Could not process password reset request' });
  }
});

// 2d. RESET PASSWORD
app.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  console.log(`[RESET PASSWORD] Password reset attempt`);
  
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  try {
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({ error: 'Invalid token type' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Check if token exists in database and not expired
    const result = await pool.query(
      'SELECT id, password_reset_token, password_reset_expires FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    if (user.password_reset_token !== token) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }
    
    if (new Date() > new Date(user.password_reset_expires)) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    
    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [hashedPassword, decoded.userId]
    );
    
    console.log(`[RESET PASSWORD] Password reset successfully for user: ${decoded.userId}`);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error(`[RESET PASSWORD] Error:`, err.message);
    res.status(500).json({ error: 'Could not reset password' });
  }
});

// 3. GET FEED (with pagination and filtering)
app.get('/feed', async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = Math.min(parseInt(req.query.limit || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const offset = (page - 1) * limit;
  const type = req.query.type; // Filter by post type (VIDEO, THREAD, etc.)
  const userId = req.query.userId; // Filter by user
  
  console.log(`[FEED] Fetching feed - page: ${page}, limit: ${limit}, type: ${type || 'all'}, userId: ${userId || 'all'}`);
  
  try {
    let query = `
      SELECT 
        p.id, p.type, p.content, p.media_url as "mediaUrl", p.thumbnail_url as "thumbnailUrl", 
        p.created_at as timestamp, p.processing_status,
        u.id as "authorId", COALESCE(u.full_name, u.username) as "authorName", u.avatar_url as "authorAvatar", u.role as "authorRole",
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentCount
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE (p.processing_status = 'COMPLETED' OR p.processing_status IS NULL OR p.processing_status = 'PENDING')
    `;
    const params = [];
    let paramCount = 1;
    
    if (type) {
      query += ` AND p.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }
    
    if (userId) {
      query += ` AND p.user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM posts p
      WHERE (p.processing_status = 'COMPLETED' OR p.processing_status IS NULL OR p.processing_status = 'PENDING')
      ${type ? `AND p.type = '${type}'` : ''}
      ${userId ? `AND p.user_id = '${userId}'` : ''}
    `;
    
    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery)
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    // Check if user liked each post (if authenticated)
    const userIdForLikes = req.headers.authorization ? 
      (await jwt.verify(req.headers.authorization.split(' ')[1], JWT_SECRET))?.id : null;
    
    const posts = await Promise.all(result.rows.map(async (row) => {
      let likedByCurrentUser = false;
      if (userIdForLikes) {
        const likeCheck = await pool.query(
          'SELECT 1 FROM likes WHERE user_id = $1 AND post_id = $2',
          [userIdForLikes, row.id]
        );
        likedByCurrentUser = likeCheck.rows.length > 0;
      }
      
      return {
        ...row,
        comments: [], // Comments fetched separately
        timestamp: new Date(row.timestamp).getTime(),
        likedByCurrentUser
      };
    }));
    
    console.log(`[FEED] Returning ${posts.length} posts (page ${page}/${totalPages}, total: ${total})`);
    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error(`[FEED] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch feed' });
  }
});

// 4. CREATE POST (Updated per MIB Layout permissions)
app.post('/posts', authenticate, async (req, res) => {
  const { type, content, mediaUrl, thumbnailUrl } = req.body;
  const userRole = req.user.role;
  console.log(`[CREATE POST] User ${req.user.id} (${userRole}) creating ${type} post`);
  
  // MIB Layout Permissions:
  // VIEW_ONLY: Cannot create posts
  if (userRole === 'VIEW_ONLY') {
    console.log(`[CREATE POST] Permission denied - VIEW_ONLY role`);
    return res.status(403).json({ error: 'View-Only users cannot create posts' });
  }
  
  // USER: Can post THREAD but NOT VIDEO
  if (type === 'VIDEO' && userRole === 'USER') {
    console.log(`[CREATE POST] Permission denied - USER cannot post videos`);
    return res.status(403).json({ 
      error: 'Standard users cannot post videos. Only Creators and Moderators can post videos.' 
    });
  }
  
  // MODERATOR and CREATOR: Can post both THREAD and VIDEO

  // Videos start as PENDING and are processed to HLS by the worker
  // This enables chunked streaming like Instagram
  const processingStatus = type === 'VIDEO' ? 'PENDING' : 'COMPLETED';

  try {
    const result = await pool.query(
      `INSERT INTO posts (user_id, type, content, media_url, thumbnail_url, processing_status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.user.id, type, content, mediaUrl, thumbnailUrl, processingStatus]
    );
    console.log(`[CREATE POST] Post created successfully, ID: ${result.rows[0].id}`);
    res.json({ success: true, postId: result.rows[0].id });
  } catch (err) {
    console.error(`[CREATE POST] Error:`, err.message);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// 5. GET PRESIGNED URL (For Video/Image Upload - Dynamic)
app.post('/upload/presigned', authenticate, async (req, res) => {
  const { filename, fileType } = req.body; // fileType: 'video', 'image', etc.
  console.log(`[PRESIGNED URL] User ${req.user.id} requesting upload URL for: ${filename}, type: ${fileType}`);
  
  // Determine bucket based on file type
  let bucket = MINIO_VIDEOS_BUCKET;
  if (fileType === 'image' || filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    bucket = MINIO_IMAGES_BUCKET;
  } else if (fileType === 'video' || filename.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
    bucket = MINIO_VIDEOS_BUCKET;
  }
  
  // Create unique name with timestamp and user ID
  const fileExtension = filename.split('.').pop();
  const objectName = `${req.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
  
  try {
    // Ensure bucket exists using internal client
    const bucketExists = await minioClient.bucketExists(bucket);
    if (!bucketExists) {
      await minioClient.makeBucket(bucket, 'us-east-1');
      // Set bucket policy to public read
      try {
        await minioClient.setBucketPolicy(bucket, JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`]
          }]
        }));
      } catch (policyErr) {
        console.log(`[PRESIGNED URL] Note: Could not set bucket policy (may need manual setup)`);
      }
      console.log(`[PRESIGNED URL] Created bucket: ${bucket}`);
    }
    
    // Generate presigned URL using public client (so browser can access it)
    const url = await minioPublicClient.presignedPutObject(bucket, objectName, PRESIGNED_URL_EXPIRY);
    const publicUrl = `${MINIO_PUBLIC_URL}/${bucket}/${objectName}`;
    
    console.log(`[PRESIGNED URL] Generated URL for object: ${objectName} in bucket: ${bucket}`);
    res.json({ 
      uploadUrl: url, 
      publicUrl,
      bucket,
      objectName,
      expiresIn: PRESIGNED_URL_EXPIRY
    });
  } catch (err) {
    console.error(`[PRESIGNED URL] Error:`, err.message);
    res.status(500).json({ error: 'Could not generate upload URL' });
  }
});

// 5b. DIRECT UPLOAD (Alternative - upload directly to server)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|webm/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

app.post('/upload/direct', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const file = req.file;
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');
  const bucket = isImage ? MINIO_IMAGES_BUCKET : MINIO_VIDEOS_BUCKET;
  
  console.log(`[DIRECT UPLOAD] User ${req.user.id} uploading ${file.mimetype} (${file.size} bytes) to ${bucket}`);
  
  try {
    // Ensure bucket exists - use internal client
    let bucketExists = false;
    try {
      bucketExists = await minioClient.bucketExists(bucket);
    } catch (checkErr) {
      console.log(`[DIRECT UPLOAD] Error checking bucket existence: ${checkErr.message}`);
      // Continue and try to create bucket
    }
    
    if (!bucketExists) {
      try {
        await minioClient.makeBucket(bucket, 'us-east-1');
        console.log(`[DIRECT UPLOAD] Created bucket: ${bucket}`);
        
        // Set bucket policy to public read
        try {
          await minioClient.setBucketPolicy(bucket, JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`]
            }]
          }));
          console.log(`[DIRECT UPLOAD] Set public policy for bucket: ${bucket}`);
        } catch (policyErr) {
          console.log(`[DIRECT UPLOAD] Note: Could not set bucket policy (non-critical): ${policyErr.message}`);
        }
      } catch (createErr) {
        console.error(`[DIRECT UPLOAD] Error creating bucket: ${createErr.message}`);
        // Try to continue - bucket might already exist
      }
    }
    
    const objectName = `${req.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    console.log(`[DIRECT UPLOAD] Attempting to upload to MinIO: ${MINIO_INTERNAL_ENDPOINT}:${MINIO_INTERNAL_PORT}, bucket: ${bucket}`);
    console.log(`[DIRECT UPLOAD] MinIO Client config - endpoint: ${MINIO_INTERNAL_ENDPOINT}, port: ${MINIO_INTERNAL_PORT}, bucket: ${bucket}`);
    
    // Test MinIO connection first
    try {
      const testBucketExists = await minioClient.bucketExists(bucket);
      console.log(`[DIRECT UPLOAD] Bucket ${bucket} exists: ${testBucketExists}`);
    } catch (testErr) {
      console.error(`[DIRECT UPLOAD] Error testing MinIO connection: ${testErr.message}`);
      console.error(`[DIRECT UPLOAD] Error stack:`, testErr.stack);
      throw new Error(`MinIO connection failed: ${testErr.message}`);
    }
    
    // MinIO putObject signature: putObject(bucketName, objectName, stream, size, metaData)
    // Convert buffer to stream
    const { Readable } = require('stream');
    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null); // End the stream
    
    console.log(`[DIRECT UPLOAD] Uploading file: ${objectName}, size: ${file.size} bytes, type: ${file.mimetype}`);
    
    await minioClient.putObject(bucket, objectName, bufferStream, file.size, {
      'Content-Type': file.mimetype
    });
    
    // Construct public URL - use the public endpoint configured
    const publicUrl = `http://${MINIO_PUBLIC_ENDPOINT}:${MINIO_PUBLIC_PORT}/${bucket}/${objectName}`;
    
    console.log(`[DIRECT UPLOAD] File uploaded successfully: ${objectName}, URL: ${publicUrl}`);
    res.json({
      success: true,
      url: publicUrl,
      bucket,
      objectName,
      type: isImage ? 'image' : 'video',
      size: file.size
    });
  } catch (err) {
    console.error(`[DIRECT UPLOAD] Error:`, err.message);
    console.error(`[DIRECT UPLOAD] Error details:`, err);
    res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
});

// 6. HEALTH CHECK
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    console.log(`[HEALTH] All systems operational`);
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`[HEALTH] Error:`, err.message);
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: err.message 
    });
  }
});

// 7. GET USER PROFILE (with stats)
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  let currentUserId = null;
  
  // Try to get current user if authenticated (optional for public profiles)
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      currentUserId = decoded.id;
    } catch (err) {
      // Invalid token, continue without authentication
    }
  }
  
  console.log(`[USER PROFILE] Fetching profile for user: ${id}${currentUserId ? ` (viewed by: ${currentUserId})` : ''}`);
  
  try {
    const result = await pool.query(
      `SELECT id, username, email, phone, full_name, role, avatar_url, verified, created_at, 
              npi_number, state_license, user_type, bio
       FROM users WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      console.log(`[USER PROFILE] User not found: ${id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Get dynamic stats
    const [postsCount, followersCount, followingCount] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM posts WHERE user_id = $1 AND (processing_status = \'COMPLETED\' OR processing_status IS NULL)', [id]),
      pool.query('SELECT COUNT(*) as count FROM follows WHERE following_id = $1', [id]),
      pool.query('SELECT COUNT(*) as count FROM follows WHERE follower_id = $1', [id])
    ]);
    
    // Check if current user is following this profile user
    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      const followCheck = await pool.query(
        'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
        [currentUserId, id]
      );
      isFollowing = followCheck.rows.length > 0;
    }
    
    const profile = {
      ...user,
      stats: {
        posts: parseInt(postsCount.rows[0].count),
        followers: parseInt(followersCount.rows[0].count),
        following: parseInt(followingCount.rows[0].count)
      },
      isFollowing: isFollowing
    };
    
    console.log(`[USER PROFILE] Profile retrieved for: ${user.username}, isFollowing: ${isFollowing}`);
    res.json(profile);
  } catch (err) {
    console.error(`[USER PROFILE] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch user profile' });
  }
});

// 7b. UPDATE USER PROFILE (auth required)
app.put('/users/:id', authenticate, async (req, res) => {
  const { id: userId } = req.params;
  const { fullName, avatarUrl, bio, email, phone } = req.body;
  
  // Users can only update their own profile (or moderators can update any)
  if (userId !== req.user.id && req.user.role !== 'MODERATOR') {
    return res.status(403).json({ error: 'Permission denied' });
  }
  
  console.log(`[UPDATE PROFILE] User ${req.user.id} updating profile for: ${userId}`);
  
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount}`);
      values.push(fullName);
      paramCount++;
    }
    
    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramCount}`);
      values.push(avatarUrl);
      paramCount++;
    }
    
    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }
    
    if (bio !== undefined) {
      // Store bio in a separate field or use a JSON field
      updates.push(`bio = $${paramCount}`);
      values.push(bio);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, phone, full_name, role, avatar_url, verified, bio`;
    
    const result = await pool.query(query, values);
    
    console.log(`[UPDATE PROFILE] Profile updated successfully for user: ${userId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[UPDATE PROFILE] Error:`, err.message);
    res.status(500).json({ error: 'Could not update profile' });
  }
});

// 8. LIKE/UNLIKE POST (MIB Layout: VIEW_ONLY cannot like)
app.post('/posts/:id/like', authenticate, async (req, res) => {
  const { id: postId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // MIB Layout: VIEW_ONLY cannot like
  if (userRole === 'VIEW_ONLY') {
    console.log(`[LIKE] Permission denied - VIEW_ONLY cannot like posts`);
    return res.status(403).json({ error: 'View-Only users cannot like posts' });
  }
  
  console.log(`[LIKE] User ${userId} liking post ${postId}`);
  
  try {
    // Check if already liked
    const checkResult = await pool.query(
      'SELECT * FROM likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );
    
    if (checkResult.rows.length > 0) {
      // Unlike
      await pool.query(
        'DELETE FROM likes WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );
      console.log(`[LIKE] Post ${postId} unliked by user ${userId}`);
      res.json({ liked: false });
    } else {
      // Like
      await pool.query(
        'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
        [userId, postId]
      );
      console.log(`[LIKE] Post ${postId} liked by user ${userId}`);
      res.json({ liked: true });
    }
  } catch (err) {
    console.error(`[LIKE] Error:`, err.message);
    res.status(500).json({ error: 'Could not like/unlike post' });
  }
});

// 9. GET POSTS BY USER
app.get('/users/:id/posts', async (req, res) => {
  const { id: userId } = req.params;
  console.log(`[USER POSTS] Fetching posts for user: ${userId}`);
  
  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.type, p.content, p.media_url as "mediaUrl", p.thumbnail_url as "thumbnailUrl", 
        p.created_at as timestamp, p.processing_status,
        u.id as "authorId", COALESCE(u.full_name, u.username) as "authorName", u.avatar_url as "authorAvatar", u.role as "authorRole",
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1 AND (p.processing_status = 'COMPLETED' OR p.processing_status IS NULL)
      ORDER BY p.created_at DESC
    `, [userId]);
    
    const posts = result.rows.map(row => ({
      ...row,
      comments: [],
      timestamp: new Date(row.timestamp).getTime(),
      likedByCurrentUser: false
    }));
    
    console.log(`[USER POSTS] Returning ${posts.length} posts for user ${userId}`);
    res.json(posts);
  } catch (err) {
    console.error(`[USER POSTS] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch user posts' });
  }
});

// 10. ADD COMMENT (MIB Layout: VIEW_ONLY cannot comment)
app.post('/posts/:id/comments', authenticate, async (req, res) => {
  const { id: postId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // MIB Layout: VIEW_ONLY cannot comment
  if (userRole === 'VIEW_ONLY') {
    console.log(`[COMMENT] Permission denied - VIEW_ONLY cannot comment`);
    return res.status(403).json({ error: 'View-Only users cannot comment on posts' });
  }
  
  console.log(`[COMMENT] User ${userId} adding comment to post ${postId}`);
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment content is required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, content) 
       VALUES ($1, $2, $3) 
       RETURNING id, content, created_at`,
      [postId, userId, content.trim()]
    );
    
    // Get comment with user info
    const commentResult = await pool.query(`
      SELECT c.id, c.content, c.created_at as timestamp,
             u.id as "userId", u.username as "userName", u.avatar_url as "userAvatar"
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `, [result.rows[0].id]);
    
    const comment = {
      ...commentResult.rows[0],
      timestamp: new Date(commentResult.rows[0].timestamp).getTime()
    };
    
    console.log(`[COMMENT] Comment added successfully, ID: ${result.rows[0].id}`);
    res.json(comment);
  } catch (err) {
    console.error(`[COMMENT] Error:`, err.message);
    res.status(500).json({ error: 'Could not add comment' });
  }
});

// 11. GET COMMENTS
app.get('/posts/:id/comments', async (req, res) => {
  const { id: postId } = req.params;
  const page = parseInt(req.query.page || '1');
  const limit = Math.min(parseInt(req.query.limit || '50'), 100);
  const offset = (page - 1) * limit;
  
  console.log(`[COMMENTS] Fetching comments for post ${postId}, page: ${page}`);
  
  try {
    const result = await pool.query(`
      SELECT c.id, c.content, c.created_at as timestamp,
             u.id as "userId", u.username as "userName", u.avatar_url as "userAvatar"
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
      LIMIT $2 OFFSET $3
    `, [postId, limit, offset]);
    
    const comments = result.rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp).getTime()
    }));
    
    console.log(`[COMMENTS] Returning ${comments.length} comments`);
    res.json(comments);
  } catch (err) {
    console.error(`[COMMENTS] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch comments' });
  }
});

// 11a. GET ALL USERS (for sharing)
app.get('/users', authenticate, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100'), 500);
  const offset = parseInt(req.query.offset || '0');
  
  console.log(`[ALL USERS] Fetching users, limit: ${limit}, offset: ${offset}`);
  
  try {
    const result = await pool.query(`
      SELECT id, username, full_name, avatar_url, role, verified, email, phone
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    console.log(`[ALL USERS] Returning ${result.rows.length} users`);
    res.json({ users: result.rows });
  } catch (err) {
    console.error(`[ALL USERS] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch users' });
  }
});

// 12. SEARCH USERS/POSTS
app.get('/search', async (req, res) => {
  const { q, type = 'all' } = req.query; // type: 'users', 'posts', 'all'
  const limit = Math.min(parseInt(req.query.limit || '20'), 50);
  
  console.log(`[SEARCH] Searching for "${q}", type: ${type}`);
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }
  
  try {
    const results = { users: [], posts: [] };
    
    if (type === 'all' || type === 'users') {
      const usersResult = await pool.query(`
        SELECT id, username, full_name, avatar_url, role, verified
        FROM users
        WHERE username ILIKE $1 OR full_name ILIKE $1
        LIMIT $2
      `, [`%${q}%`, limit]);
      results.users = usersResult.rows;
    }
    
    if (type === 'all' || type === 'posts') {
      const postsResult = await pool.query(`
        SELECT p.id, p.type, p.content, p.media_url as "mediaUrl", p.created_at as timestamp,
               u.id as "authorId", u.username as "authorName", u.avatar_url as "authorAvatar"
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE (p.content ILIKE $1 OR u.username ILIKE $1)
          AND (p.processing_status = 'COMPLETED' OR p.processing_status IS NULL)
        ORDER BY p.created_at DESC
        LIMIT $2
      `, [`%${q}%`, limit]);
      results.posts = postsResult.rows.map(row => ({
        ...row,
        timestamp: new Date(row.timestamp).getTime()
      }));
    }
    
    console.log(`[SEARCH] Found ${results.users.length} users, ${results.posts.length} posts`);
    res.json(results);
  } catch (err) {
    console.error(`[SEARCH] Error:`, err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 13. DELETE POST
app.delete('/posts/:id', authenticate, async (req, res) => {
  const { id: postId } = req.params;
  const userId = req.user.id;
  
  console.log(`[DELETE POST] User ${userId} attempting to delete post ${postId}`);
  
  try {
    // Check if user owns the post or is admin
    const postResult = await pool.query(
      'SELECT user_id, type, media_url FROM posts WHERE id = $1',
      [postId]
    );
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = postResult.rows[0];
    if (post.user_id !== userId && req.user.role !== 'MODERATOR') {
      console.log(`[DELETE POST] Permission denied`);
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Delete associated data
    await pool.query('DELETE FROM likes WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM comments WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM saves WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
    
    // TODO: Delete media files from MinIO
    
    console.log(`[DELETE POST] Post ${postId} deleted successfully`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[DELETE POST] Error:`, err.message);
    res.status(500).json({ error: 'Could not delete post' });
  }
});

// 14. SAVE/UNSAVE POST (MIB Layout: All users can save, including VIEW_ONLY)
app.post('/posts/:id/save', authenticate, async (req, res) => {
  const { id: postId } = req.params;
  const userId = req.user.id;
  console.log(`[SAVE] User ${userId} saving post ${postId}`);
  
  try {
    // Check if already saved
    const checkResult = await pool.query(
      'SELECT * FROM saves WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );
    
    if (checkResult.rows.length > 0) {
      // Unsave
      await pool.query(
        'DELETE FROM saves WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );
      console.log(`[SAVE] Post ${postId} unsaved by user ${userId}`);
      res.json({ saved: false });
    } else {
      // Save
      await pool.query(
        'INSERT INTO saves (user_id, post_id) VALUES ($1, $2)',
        [userId, postId]
      );
      console.log(`[SAVE] Post ${postId} saved by user ${userId}`);
      res.json({ saved: true });
    }
  } catch (err) {
    console.error(`[SAVE] Error:`, err.message);
    res.status(500).json({ error: 'Could not save/unsave post' });
  }
});

// 15. GET SAVED POSTS
app.get('/users/:id/saved', authenticate, async (req, res) => {
  const { id: userId } = req.params;
  // Users can only see their own saved posts
  if (userId !== req.user.id && req.user.role !== 'MODERATOR') {
    return res.status(403).json({ error: 'Permission denied' });
  }
  
  console.log(`[SAVED POSTS] Fetching saved posts for user: ${userId}`);
  
  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.type, p.content, p.media_url as "mediaUrl", p.thumbnail_url as "thumbnailUrl", 
        p.created_at as timestamp, p.processing_status,
        u.id as "authorId", COALESCE(u.full_name, u.username) as "authorName", u.avatar_url as "authorAvatar", u.role as "authorRole",
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes,
        s.created_at as "savedAt"
      FROM saves s
      JOIN posts p ON s.post_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE s.user_id = $1 AND (p.processing_status = 'COMPLETED' OR p.processing_status IS NULL)
      ORDER BY s.created_at DESC
    `, [userId]);
    
    const posts = result.rows.map(row => ({
      ...row,
      comments: [],
      timestamp: new Date(row.timestamp).getTime(),
      savedByCurrentUser: true
    }));
    
    console.log(`[SAVED POSTS] Returning ${posts.length} saved posts`);
    res.json(posts);
  } catch (err) {
    console.error(`[SAVED POSTS] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch saved posts' });
  }
});

// 16. FORWARD POST (MIB Layout: Internal and External forwarding)
app.post('/posts/:id/forward', authenticate, async (req, res) => {
  const { id: postId } = req.params;
  const { recipientId, recipientEmail, recipientPhone, isExternal } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // MIB Layout: VIEW_ONLY cannot forward
  if (userRole === 'VIEW_ONLY') {
    console.log(`[FORWARD] Permission denied - VIEW_ONLY cannot forward`);
    return res.status(403).json({ error: 'View-Only users cannot forward posts' });
  }
  
  console.log(`[FORWARD] User ${userId} forwarding post ${postId} to ${isExternal ? 'external' : 'internal'} recipient`);
  
  try {
    // Get post details
    const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    let recipientUserId = null;
    
    if (isExternal) {
      // External forwarding - recipient needs account
      if (!recipientEmail && !recipientPhone) {
        return res.status(400).json({ error: 'Recipient email or phone required for external forwarding' });
      }
      
      // Check if recipient has account
      const recipientResult = await pool.query(
        'SELECT id FROM users WHERE email = $1 OR phone = $1',
        [recipientEmail || recipientPhone]
      );
      
      if (recipientResult.rows.length === 0) {
        // Generate shareable link (external user needs to register/login to view)
        const shareToken = jwt.sign({ postId, sharedBy: userId }, JWT_SECRET, { expiresIn: '30d' });
        const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shared/${shareToken}`;
        
        // TODO: Send email/SMS with share link
        
        console.log(`[FORWARD] External forward - share link generated: ${shareToken}`);
        return res.json({ 
          success: true, 
          shareUrl,
          message: 'Recipient will need to create an account to view this post',
          requiresAccount: true
        });
      }
      
      recipientUserId = recipientResult.rows[0].id;
    } else {
      // Internal forwarding
      if (!recipientId) {
        return res.status(400).json({ error: 'Recipient ID required for internal forwarding' });
      }
      recipientUserId = recipientId;
    }
    
    // Create forward record
    await pool.query(
      `INSERT INTO forwards (post_id, from_user_id, to_user_id, is_external, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [postId, userId, recipientUserId, isExternal]
    );
    
    console.log(`[FORWARD] Post forwarded successfully`);
    res.json({ success: true, message: 'Post forwarded successfully' });
  } catch (err) {
    console.error(`[FORWARD] Error:`, err.message);
    res.status(500).json({ error: 'Could not forward post' });
  }
});

// 17. GET SHARED POST (for external links)
app.get('/shared/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { postId } = decoded;
    
    // Get post
    const result = await pool.query(`
      SELECT 
        p.id, p.type, p.content, p.media_url as "mediaUrl", p.thumbnail_url as "thumbnailUrl", 
        p.created_at as timestamp,
        u.id as "authorId", u.username as "authorName", u.avatar_url as "authorAvatar"
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1 AND (p.processing_status = 'COMPLETED' OR p.processing_status IS NULL)
    `, [postId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found or not available' });
    }
    
    const post = {
      ...result.rows[0],
      timestamp: new Date(result.rows[0].timestamp).getTime(),
      requiresAuth: true // Frontend should prompt for login
    };
    
    res.json(post);
  } catch (err) {
    console.error(`[SHARED POST] Error:`, err.message);
    res.status(401).json({ error: 'Invalid or expired share link' });
  }
});

// 23. CHAT - GET CONVERSATIONS
app.get('/conversations', authenticate, async (req, res) => {
  const userId = req.user.id;
  console.log(`[CONVERSATIONS] Fetching conversations for user: ${userId}`);
  
  try {
    const result = await pool.query(`
      SELECT 
        c.id, c.last_message_at,
        CASE 
          WHEN c.user1_id = $1 THEN u2.id
          ELSE u1.id
        END as other_user_id,
        CASE 
          WHEN c.user1_id = $1 THEN u2.username
          ELSE u1.username
        END as other_username,
        CASE 
          WHEN c.user1_id = $1 THEN u2.avatar_url
          ELSE u1.avatar_url
        END as other_avatar,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = FALSE) as unread_count
      FROM conversations c
      JOIN users u1 ON c.user1_id = u1.id
      JOIN users u2 ON c.user2_id = u2.id
      WHERE c.user1_id = $1 OR c.user2_id = $1
      ORDER BY c.last_message_at DESC NULLS LAST
    `, [userId]);
    
    console.log(`[CONVERSATIONS] Returning ${result.rows.length} conversations`);
    res.json(result.rows);
  } catch (err) {
    console.error(`[CONVERSATIONS] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch conversations' });
  }
});

// 24. CHAT - GET MESSAGES
app.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const page = parseInt(req.query.page || '1');
  const limit = Math.min(parseInt(req.query.limit || '50'), 100);
  const offset = (page - 1) * limit;
  
  try {
    const convCheck = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [conversationId, userId]
    );
    
    if (convCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(`
      SELECT m.id, m.content, m.media_url, m.is_read, m.created_at,
             u.id as sender_id, u.username as sender_username, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [conversationId, limit, offset]);
    
    await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE',
      [conversationId, userId]
    );
    
    res.json(result.rows.reverse());
  } catch (err) {
    console.error(`[MESSAGES] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch messages' });
  }
});

// 25. CHAT - SEND MESSAGE
app.post('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  const { conversationId } = req.params;
  const { content, mediaUrl } = req.body;
  const userId = req.user.id;
  
  if (!content && !mediaUrl) {
    return res.status(400).json({ error: 'Message content or media is required' });
  }
  
  try {
    const convCheck = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [conversationId, userId]
    );
    
    if (convCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(`
      INSERT INTO messages (conversation_id, sender_id, content, media_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, content, media_url, created_at
    `, [conversationId, userId, content || null, mediaUrl || null]);
    
    await pool.query(
      'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );
    
    res.json({ ...result.rows[0], sender_id: userId });
  } catch (err) {
    console.error(`[SEND MESSAGE] Error:`, err.message);
    res.status(500).json({ error: 'Could not send message' });
  }
});

// 26. CHAT - START CONVERSATION
app.post('/conversations', authenticate, async (req, res) => {
  const { userId: otherUserId } = req.body;
  const currentUserId = req.user.id;
  
  if (!otherUserId || otherUserId === currentUserId) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  try {
    let result = await pool.query(`
      SELECT * FROM conversations 
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
    `, [currentUserId, otherUserId]);
    
    if (result.rows.length > 0) {
      return res.json({ conversationId: result.rows[0].id, existing: true });
    }
    
    const user1Id = currentUserId < otherUserId ? currentUserId : otherUserId;
    const user2Id = currentUserId < otherUserId ? otherUserId : currentUserId;
    
    result = await pool.query(`
      INSERT INTO conversations (user1_id, user2_id)
      VALUES ($1, $2)
      RETURNING id
    `, [user1Id, user2Id]);
    
    res.json({ conversationId: result.rows[0].id, existing: false });
  } catch (err) {
    console.error(`[START CONVERSATION] Error:`, err.message);
    res.status(500).json({ error: 'Could not create conversation' });
  }
});

// 27. STORIES - CREATE STORY
app.post('/stories', authenticate, async (req, res) => {
  const { mediaUrl, mediaType, metadata } = req.body;
  const userId = req.user.id;
  
  if (!mediaUrl || !mediaType) {
    return res.status(400).json({ error: 'Media URL and type are required' });
  }
  
  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const result = await pool.query(`
      INSERT INTO stories (user_id, media_url, media_type, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, media_url, media_type, expires_at, created_at
    `, [userId, mediaUrl, mediaType, expiresAt]);
    
    const storyId = result.rows[0].id;
    
    // Store metadata (text, emojis, etc.) if provided
    if (metadata) {
      await pool.query(`
        INSERT INTO story_metadata (story_id, metadata)
        VALUES ($1, $2)
        ON CONFLICT (story_id) DO UPDATE SET metadata = $2
      `, [storyId, typeof metadata === 'string' ? metadata : JSON.stringify(metadata)]);
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[CREATE STORY] Error:`, err.message);
    res.status(500).json({ error: 'Could not create story' });
  }
});

// 28. STORIES - GET ACTIVE STORIES
app.get('/stories', authenticate, async (req, res) => {
  const userId = req.user.id;
  
  try {
      const result = await pool.query(`
      SELECT DISTINCT
        s.id, s.media_url, s.media_type, s.expires_at, s.views_count, s.created_at,
        u.id as user_id, u.username, u.avatar_url, u.full_name,
        (SELECT COUNT(*) FROM story_views WHERE story_id = s.id AND viewer_id = $1) > 0 as viewed_by_me,
        sm.metadata
      FROM stories s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN follows f ON f.following_id = s.user_id AND f.follower_id = $1
      LEFT JOIN story_metadata sm ON sm.story_id = s.id
      WHERE s.expires_at > CURRENT_TIMESTAMP
        AND (s.user_id = $1 OR f.follower_id = $1)
      ORDER BY s.created_at DESC
    `, [userId]);
    
    const storiesByUser = {};
    result.rows.forEach(story => {
      if (!storiesByUser[story.user_id]) {
        storiesByUser[story.user_id] = {
          user: {
            id: story.user_id,
            username: story.username,
            avatar_url: story.avatar_url,
            full_name: story.full_name
          },
          stories: []
        };
      }
      storiesByUser[story.user_id].stories.push({
        id: story.id,
        media_url: story.media_url,
        media_type: story.media_type,
        expires_at: story.expires_at,
        views_count: story.views_count,
        created_at: story.created_at,
        viewed_by_me: story.viewed_by_me,
        metadata: story.metadata
      });
    });
    
    res.json(Object.values(storiesByUser));
  } catch (err) {
    console.error(`[STORIES] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch stories' });
  }
});

// 29. STORIES - VIEW STORY
app.post('/stories/:id/view', authenticate, async (req, res) => {
  const { id: storyId } = req.params;
  const userId = req.user.id;
  
  try {
    const existing = await pool.query(
      'SELECT * FROM story_views WHERE story_id = $1 AND viewer_id = $2',
      [storyId, userId]
    );
    
    if (existing.rows.length === 0) {
      await pool.query(
        'INSERT INTO story_views (story_id, viewer_id) VALUES ($1, $2)',
        [storyId, userId]
      );
      
      await pool.query(
        'UPDATE stories SET views_count = views_count + 1 WHERE id = $1',
        [storyId]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(`[VIEW STORY] Error:`, err.message);
    res.status(500).json({ error: 'Could not record story view' });
  }
});

// 29a. STORIES - ADD COMMENT
app.post('/stories/:id/comments', authenticate, async (req, res) => {
  const { id: storyId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment content is required' });
  }
  
  try {
    // Get story owner
    const storyResult = await pool.query('SELECT user_id FROM stories WHERE id = $1', [storyId]);
    if (storyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    const storyOwnerId = storyResult.rows[0].user_id;
    
    // Insert comment (we'll use a story_comments table or reuse comments with story_id)
    // For now, let's create a story_comments table
    const commentResult = await pool.query(`
      INSERT INTO story_comments (story_id, user_id, content, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, content, created_at
    `, [storyId, userId, content.trim()]);
    
    // Get comment with user info
    const fullComment = await pool.query(`
      SELECT sc.id, sc.content, sc.created_at as timestamp,
             u.id as "userId", u.username as "userName", u.avatar_url as "userAvatar"
      FROM story_comments sc
      JOIN users u ON sc.user_id = u.id
      WHERE sc.id = $1
    `, [commentResult.rows[0].id]);
    
    // Send message to story owner if commenter is not the owner
    if (storyOwnerId !== userId) {
      try {
        // Find or create conversation
        const convResult = await pool.query(`
          SELECT id FROM conversations 
          WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
        `, [storyOwnerId, userId]);
        
        let conversationId;
        if (convResult.rows.length === 0) {
          const newConv = await pool.query(`
            INSERT INTO conversations (user1_id, user2_id, last_message_at)
            VALUES ($1, $2, NOW())
            RETURNING id
          `, [storyOwnerId, userId]);
          conversationId = newConv.rows[0].id;
        } else {
          conversationId = convResult.rows[0].id;
        }
        
        // Send message notification
        await pool.query(`
          INSERT INTO messages (conversation_id, sender_id, content, created_at)
          VALUES ($1, $2, $3, NOW())
        `, [conversationId, userId, `commented on your story: "${content.trim()}"`]);
        
        // Update conversation timestamp
        await pool.query(`
          UPDATE conversations SET last_message_at = NOW() WHERE id = $1
        `, [conversationId]);
      } catch (msgErr) {
        console.error(`[STORY COMMENT] Error sending message notification:`, msgErr.message);
        // Don't fail the comment if message fails
      }
    }
    
    res.json({
      ...fullComment.rows[0],
      timestamp: new Date(fullComment.rows[0].timestamp).getTime()
    });
  } catch (err) {
    console.error(`[STORY COMMENT] Error:`, err.message);
    res.status(500).json({ error: 'Could not add comment' });
  }
});

// 29b. STORIES - GET COMMENTS
app.get('/stories/:id/comments', authenticate, async (req, res) => {
  const { id: storyId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT sc.id, sc.content, sc.created_at as timestamp,
             u.id as "userId", u.username as "userName", u.avatar_url as "userAvatar"
      FROM story_comments sc
      JOIN users u ON sc.user_id = u.id
      WHERE sc.story_id = $1
      ORDER BY sc.created_at ASC
    `, [storyId]);
    
    res.json({
      comments: result.rows.map(row => ({
        ...row,
        timestamp: new Date(row.timestamp).getTime()
      }))
    });
  } catch (err) {
    console.error(`[STORY COMMENTS] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch comments' });
  }
});

// 30. THREADS - ADD THREADED COMMENT
app.post('/comments/:parentId/reply', authenticate, async (req, res) => {
  const { parentId } = req.params;
  const { content, postId } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  if (userRole === 'VIEW_ONLY') {
    return res.status(403).json({ error: 'View-Only users cannot comment' });
  }
  
  if (!content) {
    return res.status(400).json({ error: 'Comment content is required' });
  }
  
  try {
    const commentResult = await pool.query(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, content, created_at
    `, [postId, userId, content]);
    
    const commentId = commentResult.rows[0].id;
    
    await pool.query(`
      INSERT INTO comment_threads (parent_comment_id, comment_id)
      VALUES ($1, $2)
    `, [parentId, commentId]);
    
    res.json({ ...commentResult.rows[0], parent_comment_id: parentId });
  } catch (err) {
    console.error(`[THREAD REPLY] Error:`, err.message);
    res.status(500).json({ error: 'Could not create thread reply' });
  }
});

// 31. THREADS - GET THREAD REPLIES
app.get('/comments/:parentId/replies', async (req, res) => {
  const { parentId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT c.id, c.content, c.created_at,
             u.id as user_id, u.username, u.avatar_url
      FROM comment_threads ct
      JOIN comments c ON ct.comment_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE ct.parent_comment_id = $1
      ORDER BY c.created_at ASC
    `, [parentId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(`[THREAD REPLIES] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch thread replies' });
  }
});

// 32. FOLLOW/UNFOLLOW USER
app.post('/users/:id/follow', authenticate, async (req, res) => {
  const { id: targetUserId } = req.params;
  const userId = req.user.id;
  
  if (targetUserId === userId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  
  try {
    const existing = await pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
      [userId, targetUserId]
    );
    
    if (existing.rows.length > 0) {
      await pool.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [userId, targetUserId]
      );
      res.json({ following: false });
    } else {
      await pool.query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
        [userId, targetUserId]
      );
      res.json({ following: true });
    }
  } catch (err) {
    console.error(`[FOLLOW] Error:`, err.message);
    res.status(500).json({ error: 'Could not follow/unfollow user' });
  }
});

// 33. MODERATOR - DELETE ANY POST
app.delete('/admin/posts/:id', authenticate, async (req, res) => {
  const { id: postId } = req.params;
  const userRole = req.user.role;
  
  if (userRole !== 'MODERATOR' && userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only moderators can delete posts' });
  }
  
  try {
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
    res.json({ success: true });
  } catch (err) {
    console.error(`[MODERATOR DELETE] Error:`, err.message);
    res.status(500).json({ error: 'Could not delete post' });
  }
});

// 34. MODERATOR - GET PENDING VERIFICATIONS
app.get('/admin/pending-verifications', authenticate, async (req, res) => {
  const userRole = req.user.role;
  
  if (userRole !== 'MODERATOR' && userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only moderators can view pending verifications' });
  }
  
  try {
    const result = await pool.query(`
      SELECT id, username, email, phone, full_name, npi_number, state_license, 
             verification_code, user_type, created_at
      FROM users
      WHERE verified = FALSE AND verification_code IS NOT NULL
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(`[PENDING VERIFICATIONS] Error:`, err.message);
    res.status(500).json({ error: 'Could not fetch pending verifications' });
  }
});

// 18. VERIFY USER (Moderator only - verify NPI/State License)
app.post('/admin/verify-user/:id', authenticate, async (req, res) => {
  const { id: userId } = req.params;
  const { verificationCode } = req.body;
  
  // Only moderators can verify users
  if (req.user.role !== 'MODERATOR' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only moderators can verify users' });
  }
  
  console.log(`[VERIFY USER] Moderator ${req.user.id} verifying user ${userId}`);
  
  try {
    const userResult = await pool.query(
      'SELECT verification_code FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (verificationCode && user.verification_code !== verificationCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Verify user
    await pool.query(
      'UPDATE users SET verified = true, verification_code = NULL WHERE id = $1',
      [userId]
    );
    
    console.log(`[VERIFY USER] User ${userId} verified successfully`);
    res.json({ success: true, message: 'User verified successfully' });
  } catch (err) {
    console.error(`[VERIFY USER] Error:`, err.message);
    res.status(500).json({ error: 'Could not verify user' });
  }
});

// Initialize DB Tables if not exist (Simple migration)
const initDb = async () => {
    console.log("[DB INIT] Starting database initialization...");
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                role VARCHAR(20),
                avatar_url TEXT,
                verified BOOLEAN DEFAULT FALSE,
                npi_number VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS posts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                type VARCHAR(10),
                content TEXT,
                media_url TEXT,
                thumbnail_url TEXT,
                processing_status VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS likes (
                user_id UUID REFERENCES users(id),
                post_id UUID REFERENCES posts(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, post_id)
            );
            CREATE TABLE IF NOT EXISTS comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS saves (
                user_id UUID REFERENCES users(id),
                post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, post_id)
            );
            CREATE TABLE IF NOT EXISTS forwards (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
                from_user_id UUID REFERENCES users(id),
                to_user_id UUID REFERENCES users(id),
                is_external BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS conversations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user1_id UUID REFERENCES users(id),
                user2_id UUID REFERENCES users(id),
                last_message_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user1_id, user2_id)
            );
            CREATE TABLE IF NOT EXISTS messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id UUID REFERENCES users(id),
                content TEXT,
                media_url TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS stories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                media_url TEXT NOT NULL,
                media_type VARCHAR(10) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                views_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS story_views (
                story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
                viewer_id UUID REFERENCES users(id),
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (story_id, viewer_id)
            );
            CREATE TABLE IF NOT EXISTS story_metadata (
                story_id UUID PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
                metadata JSONB
            );
            CREATE TABLE IF NOT EXISTS story_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS comment_threads (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
                comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS follows (
                follower_id UUID REFERENCES users(id),
                following_id UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (follower_id, following_id)
            );
            CREATE TABLE IF NOT EXISTS follows (
                follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
                following_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (follower_id, following_id)
            );
            ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS state_license VARCHAR(50);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(10);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(500);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
            CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
            CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
            CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
            CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
            CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
            CREATE INDEX IF NOT EXISTS idx_forwards_post_id ON forwards(post_id);
        `);
        console.log("[DB INIT] Database tables initialized successfully");
    } catch(e) {
        console.error("[DB INIT] Error:", e.message);
    }
}

// Start Server
const PORT = process.env.PORT || 4000;
console.log(`[SERVER] Starting server on port: ${PORT} (from env: ${process.env.PORT || 'default 4000'})`);
console.log(`[SERVER] Environment: POSTGRES_HOST=${process.env.POSTGRES_HOST || 'medgram_db'}`);
console.log(`[SERVER] Environment: MINIO_ENDPOINT=${process.env.MINIO_ENDPOINT || 'medgram_storage'}`);

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[SERVER] ✅ Backend running on port ${PORT}`);
    console.log(`[SERVER] Configuration:`);
    console.log(`  Videos Bucket: ${MINIO_VIDEOS_BUCKET}`);
    console.log(`  Images Bucket: ${MINIO_IMAGES_BUCKET}`);
    console.log(`  HLS Bucket: ${MINIO_HLS_BUCKET}`);
    console.log(`  Max File Size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    console.log(`[SERVER] Available endpoints:`);
    console.log(`  POST   /auth/register (email/phone, NPI/License verification, email verification)`);
    console.log(`  POST   /auth/login (email/phone, 2FA support)`);
    console.log(`  POST   /auth/verify-email (verify email address)`);
    console.log(`  POST   /auth/resend-verification (resend verification email)`);
    console.log(`  POST   /auth/forgot-password (request password reset)`);
    console.log(`  POST   /auth/reset-password (reset password with token)`);
    console.log(`  GET    /feed (with pagination)`);
    console.log(`  POST   /posts (auth required, role-based permissions)`);
    console.log(`  DELETE /posts/:id (auth required)`);
    console.log(`  POST   /upload/presigned (auth required)`);
    console.log(`  POST   /upload/direct (auth required)`);
    console.log(`  GET    /health`);
    console.log(`  GET    /users/:id`);
    console.log(`  GET    /users/:id/posts`);
    console.log(`  GET    /users/:id/saved (auth required)`);
    console.log(`  POST   /posts/:id/like (auth required, VIEW_ONLY blocked)`);
    console.log(`  POST   /posts/:id/save (auth required, all users)`);
    console.log(`  POST   /posts/:id/forward (auth required, VIEW_ONLY blocked)`);
    console.log(`  POST   /posts/:id/comments (auth required, VIEW_ONLY blocked)`);
    console.log(`  GET    /posts/:id/comments`);
    console.log(`  GET    /shared/:token (external share links)`);
    console.log(`  GET    /search?q=query&type=all|users|posts`);
    console.log(`  POST   /admin/verify-user/:id (moderator only)`);
    // Wait a bit for DB to be ready in Docker
    setTimeout(initDb, 5000);
});
