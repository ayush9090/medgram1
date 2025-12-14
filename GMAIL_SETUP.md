# Gmail Email Setup for MedGram

## ⚠️ IMPORTANT: Use App Password, NOT Regular Password

Gmail requires an **App Password** for SMTP authentication. Your regular password (`Ayush@9090`) will NOT work.

## Steps to Get Gmail App Password

1. **Enable 2-Step Verification** (if not already enabled)
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification" and follow the setup

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" as the app
   - Select "Other (Custom name)" and enter: `MedGram`
   - Click "Generate"

3. **Copy the 16-Character Password**
   - You'll see a 16-character password like: `abcd efgh ijkl mnop`
   - Copy it (spaces don't matter, you can remove them)

4. **Configure in Docker Compose**

   **Option A: Using .env file (Recommended)**
   ```bash
   # Create .env file in project root
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=avariyava@gmail.com
   SMTP_PASSWORD=your-16-character-app-password-here
   SMTP_FROM=avariyava@gmail.com
   FRONTEND_URL=http://74.208.158.126:5173
   ```

   **Option B: Direct in docker-compose.yml**
   ```yaml
   environment:
     SMTP_USER: avariyava@gmail.com
     SMTP_PASSWORD: your-16-character-app-password-here
   ```

5. **Restart Docker Stack**
   - In Portainer, redeploy the stack
   - Or run: `docker-compose up -d --force-recreate medgram_backend`

## Testing Email

After setup, test by:
1. Register a new user with an email address
2. Check the email inbox for verification email
3. Check backend logs for email sending status

## Troubleshooting

**Error: "Invalid login credentials"**
- Make sure you're using App Password, not regular password
- Verify 2-Step Verification is enabled

**Error: "Less secure app access"**
- This is not needed with App Passwords
- App Passwords are the secure way

**Emails not sending**
- Check backend logs: `docker logs medgram_backend`
- Look for `[EMAIL]` log messages
- Verify SMTP credentials are correct

## Security Note

- Never commit `.env` file to Git
- App Passwords are safer than regular passwords
- Each App Password can be revoked individually

