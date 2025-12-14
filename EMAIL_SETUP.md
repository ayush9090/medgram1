# Email Authentication Setup

## Environment Variables Required

Add these to your `docker-compose.yml` or `.env` file:

```yaml
environment:
  # Email Configuration
  SMTP_HOST: smtp.gmail.com          # Your SMTP server
  SMTP_PORT: 587                     # SMTP port (587 for TLS, 465 for SSL)
  SMTP_USER: your-email@gmail.com    # Your email address
  SMTP_PASSWORD: your-app-password   # App-specific password (not regular password)
  SMTP_FROM: noreply@medgram.com     # From email address
  FRONTEND_URL: http://74.208.158.126:5173  # Frontend URL for email links
```

## Gmail Setup (Example)

1. Enable 2-Step Verification on your Google account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password (not your regular password) in `SMTP_PASSWORD`

## Other Email Providers

### Outlook/Hotmail:
```yaml
SMTP_HOST: smtp-mail.outlook.com
SMTP_PORT: 587
```

### SendGrid:
```yaml
SMTP_HOST: smtp.sendgrid.net
SMTP_PORT: 587
SMTP_USER: apikey
SMTP_PASSWORD: your-sendgrid-api-key
```

### Mailgun:
```yaml
SMTP_HOST: smtp.mailgun.org
SMTP_PORT: 587
SMTP_USER: your-mailgun-username
SMTP_PASSWORD: your-mailgun-password
```

## Features Implemented

✅ **Email Verification on Registration**
- Automatic email sent with verification code
- Verification link expires in 24 hours
- Users must verify email before login

✅ **Resend Verification Email**
- `POST /auth/resend-verification`
- Allows users to request new verification email

✅ **Password Reset via Email**
- `POST /auth/forgot-password` - Request reset
- `POST /auth/reset-password` - Reset with token
- Reset link expires in 1 hour

✅ **Email Verification Check**
- Login blocked if email not verified
- Clear error messages

## API Endpoints

### Email Verification
- `POST /auth/verify-email` - Verify email with code
  - Body: `{ code: "ABC123", userId: "uuid" }`

### Resend Verification
- `POST /auth/resend-verification` - Resend verification email
  - Body: `{ email: "user@example.com" }`

### Password Reset
- `POST /auth/forgot-password` - Request password reset
  - Body: `{ email: "user@example.com" }`
  
- `POST /auth/reset-password` - Reset password
  - Body: `{ token: "jwt-token", newPassword: "newpass123" }`

## Testing Without Email Service

If email service is not configured, the system will:
- Still create users
- Log email sending attempts
- Return success (but email won't actually be sent)
- Users can verify manually via database or API

## Security Notes

- Email verification codes expire after 24 hours
- Password reset tokens expire after 1 hour
- Tokens are stored securely in database
- Invalid tokens are rejected immediately

