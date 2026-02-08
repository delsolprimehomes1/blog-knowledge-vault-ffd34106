

# Fix: Gmail OAuth "Error Page" on Connect

## Root Cause Identified

The `gmail-auth-url` edge function is working correctly. The error page you're seeing is **from Google**, not from your app. This happens because the **redirect URI** being used is not authorized in Google Cloud Console.

**What's happening:**
1. Agent clicks "Connect Gmail"
2. Edge function generates OAuth URL with `redirect_uri=https://8cbd0f4b-f95f-4e66-b71d-a9cc047a12e7.lovableproject.com/auth/gmail/callback`
3. User is redirected to Google
4. Google rejects the request because this redirect URI is not in the authorized list
5. Google shows an error page

---

## The Fix

There are **TWO required changes**:

### Part 1: Add Redirect URIs in Google Cloud Console (Manual Step)

You need to authorize these redirect URIs in Google Cloud Console:

**OAuth Consent Configuration → Credentials → Web Client → Authorized redirect URIs:**

```
https://8cbd0f4b-f95f-4e66-b71d-a9cc047a12e7.lovableproject.com/auth/gmail/callback
https://id-preview--8cbd0f4b-f95f-4e66-b71d-a9cc047a12e7.lovable.app/auth/gmail/callback
https://blog-knowledge-vault.lovable.app/auth/gmail/callback
https://www.delsolprimehomes.com/auth/gmail/callback
```

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services → Credentials**
4. Click on your OAuth 2.0 Client ID (Web application)
5. Under **Authorized redirect URIs**, add all URLs above
6. Click **Save**

### Part 2: Code Improvement (Recommended)

Update the `ConnectGmail` component to use the **production domain** instead of `window.location.origin`. This ensures a consistent redirect URI is used regardless of which domain the agent is currently on.

| File | Change |
|------|--------|
| `src/components/crm/ConnectGmail.tsx` | Use production URL for redirect |

**Before:**
```typescript
const redirectUrl = `${window.location.origin}/auth/gmail/callback`;
```

**After:**
```typescript
// Use production domain for consistent OAuth redirect
const redirectUrl = `https://www.delsolprimehomes.com/auth/gmail/callback`;
```

This way, you only need to authorize ONE redirect URI in Google Cloud Console.

---

## Summary

| Action | Type | Who |
|--------|------|-----|
| Add redirect URIs to Google Cloud Console | Manual | You |
| Update ConnectGmail to use production URL | Code | I'll do this |

---

## Technical Notes

- The edge functions are working correctly (verified from network logs)
- The GmailCallback page route is correctly set up at `/auth/gmail/callback`
- The OAuth state parameter is correctly encoding the agentId
- Only the redirect URI authorization is missing

