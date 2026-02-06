# Google OAuth 2.0 Setup Guide for Panda.ai

> **Source:** [Official Google OAuth 2.0 for Web Server Apps](https://developers.google.com/identity/protocols/oauth2/web-server)

---

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project selector dropdown (top left) → **"New Project"**
3. Name: `panda-ai-auth` (or any name)
4. Click **Create** and wait for it to provision
5. Select the new project from the dropdown

---

## Step 2: Configure OAuth Consent Screen

**Required before creating OAuth credentials**

1. Go to **"APIs & Services"** → **"OAuth consent screen"** (left sidebar)
2. Select **"External"** (for apps available to any Google user)
3. Click **"Create"**
4. Fill in App Information:
   - **App name:** `Panda.ai`
   - **User support email:** Your email address
   - **App logo:** (Optional) Upload your app logo
   - **App domain:** Your app's homepage URL
   - **Developer contact information:** Your email
5. Click **"Save and Continue"**
6. On **Scopes** → Click **"Add or Remove Scopes"**
7. Add these required scopes:
   - `openid` (already included)
   - `email` 
   - `profile`
8. Click **"Update"** → **"Save and Continue"**
9. On **Test users** → Click **"Add Users"**
10. Enter your email address and click **"Add"**
11. Click **"Save and Continue"** then **"Back to Dashboard"**

**⚠️ Important:** While in testing mode, only test users can sign in. You'll see "unverified app" warnings until you complete app verification (not required for development/testing).

---

## Step 3: Create OAuth 2.0 Client ID

1. Go to **"APIs & Services"** → **"Credentials"** (left sidebar)
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"** as the Application type
4. **Name:** `Panda.ai Web Client`
5. Under **"Authorized redirect URIs"**, click **"+ Add URI"**
6. Enter your Convex callback URL:
   ```
   https://<your-deployment>.convex.site/api/auth/callback/google
   ```
   
   **To find your URL:**
   ```bash
   cd /home/nochaserz/Documents/Coding\ Projects/panda
   cat .env.local | grep CONVEX_SITE_URL
   # Example: https://enchanted-rooster-343.convex.site
   # Full callback: https://enchanted-rooster-343.convex.site/api/auth/callback/google
   ```

7. Click **"Create"**

8. **⚠️ CRITICAL:** A dialog will show your **Client ID** and **Client Secret**
   - Click **"Download JSON"** to save the credentials
   - Also copy the values manually - you'll need them immediately
   - **Note:** The client secret is only shown once. If you lose it, you'll need to reset it.

---

## Step 4: Configure Environment Variables

1. Open your `.env.local` file:
   ```bash
   code /home/nochaserz/Documents/Coding\ Projects/panda/apps/web/.env.local
   ```

2. Add your actual credentials:
   ```env
   # Google OAuth 2.0 (from Google Cloud Console)
   AUTH_GOOGLE_ID=123456789-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
   AUTH_GOOGLE_SECRET=GOCSPX-youractualsecretstringhere
   
   # Convex Auth Secret (generate with OpenSSL)
   CONVEX_AUTH_SECRET=your-32-character-random-secret-here
   ```

3. **Generate CONVEX_AUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and paste it as your `CONVEX_AUTH_SECRET`

4. **Save the file** (Ctrl+S or Cmd+S)

---

## Step 5: Deploy to Convex

Deploy the Convex functions to make the auth endpoints live:

```bash
cd /home/nochaserz/Documents/Coding\ Projects/panda
bunx convex dev
```

For production deployment:
```bash
bunx convex deploy
```

---

## Step 6: Test the Authentication Flow

1. **Start your Next.js dev server:**
   ```bash
   cd /home/nochaserz/Documents/Coding\ Projects/panda/apps/web
   bun run dev
   ```

2. **Open** `http://localhost:3000/login`

3. **Click** "Sign in with Google"

4. **Expected flow:**
   - Redirect to Google's OAuth consent screen
   - Select your Google account
   - Grant permissions (email, profile)
   - Redirect back to `/projects` (authenticated!)

---

## OAuth 2.0 Flow Overview

According to [Google's official documentation](https://developers.google.com/identity/protocols/oauth2/web-server), the OAuth 2.0 flow works like this:

```
1. Your App          → Redirects user to Google OAuth server
2. Google            → Authenticates user, asks for consent
3. User              → Grants/denies permission
4. Google            → Redirects back with authorization code
5. Your App (Convex) → Exchanges code for access & refresh tokens
6. Your App          → Uses tokens to identify the user
```

**@convex-dev/auth handles steps 4-6 automatically for you!**

---

## Required OAuth 2.0 Scopes

| Scope | Purpose | Required |
|-------|---------|----------|
| `openid` | OpenID Connect authentication | ✅ Yes |
| `email` | Access user's email address | ✅ Yes |
| `profile` | Access user's basic profile info | ✅ Yes |

**Note:** Panda.ai uses these scopes to:
- Authenticate the user (openid)
- Store user's email (email)
- Display user's name/avatar (profile)

---

## Troubleshooting Common Issues

### Issue: "redirect_uri_mismatch" Error
**Cause:** The redirect URI in your Google Cloud Console doesn't match what Convex is sending.

**Fix:**
1. Go to Credentials → Your Web Client
2. Check **"Authorized redirect URIs"**
3. Must exactly match: `https://YOUR_DEPLOYMENT.convex.site/api/auth/callback/google`
4. Check for typos, missing/extra slashes, or wrong protocol (must be https)

### Issue: "Access blocked" or "Unverified App"
**Cause:** Your app is in testing mode and the user isn't a test user.

**Fix:**
1. Go to **"OAuth consent screen"**
2. Add the user's email to **"Test users"**
3. Or submit for verification (not needed for development)

### Issue: "This app isn't verified"
**Cause:** Google hasn't verified your app yet.

**Fix:** Click "Advanced" → "Go to [your app] (unsafe)" during testing. Verification is only required for production apps with many users.

### Issue: Environment variables not loading
**Cause:** Next.js caches environment variables at build time.

**Fix:**
1. Ensure `.env.local` is in `apps/web/` directory
2. Restart your dev server: `Ctrl+C` then `bun run dev`
3. Check variables: `cat apps/web/.env.local | grep AUTH`

### Issue: Convex auth endpoints not found (404)
**Cause:** Convex functions haven't been deployed.

**Fix:**
```bash
cd /home/nochaserz/Documents/Coding\ Projects/panda
bunx convex dev
```

---

## Security Best Practices

Per [Google's OAuth 2.0 Security Guidelines](https://developers.google.com/identity/protocols/oauth2/web-server):

1. **✅ DO:** Store `AUTH_GOOGLE_SECRET` in environment variables (not code)
2. **✅ DO:** Use `https://` for production redirect URIs (never http)
3. **✅ DO:** Verify the `state` parameter to prevent CSRF attacks (handled by @convex-dev/auth)
4. **❌ DON'T:** Commit `client_secret.json` to Git
5. **❌ DON'T:** Share your client secret in code repositories

---

## Complete Environment Variables Reference

Your `apps/web/.env.local` should contain:

```env
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site

# Google OAuth 2.0 Credentials (from Google Cloud Console)
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
CONVEX_AUTH_SECRET=your-random-32-char-secret
```

---

## Next Steps

1. ✅ Set up Google Cloud project
2. ✅ Configure OAuth consent screen
3. ✅ Create OAuth client credentials
4. ✅ Add environment variables
5. ✅ Deploy Convex functions
6. ✅ Test authentication flow
7. 🔄 [Optional] Submit for Google app verification (for production)

**Need help?** Check the [official Google OAuth 2.0 troubleshooting guide](https://developers.google.com/identity/protocols/oauth2/web-server#troubleshooting)
