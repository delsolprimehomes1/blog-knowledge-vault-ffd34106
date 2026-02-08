

# Gmail OAuth Authentication Flow Implementation

## Summary
Create a complete Gmail OAuth flow allowing CRM agents to connect their `@delsolprimehomes.com` Gmail accounts. This will populate the `gmail_access_token` and `gmail_refresh_token` columns in the `crm_agents` table, enabling the already-deployed `sync-gmail-emails` edge function to start syncing emails.

## Current State Analysis

| Component | Status |
|-----------|--------|
| `GOOGLE_CLIENT_ID` secret | Already configured |
| `GOOGLE_CLIENT_SECRET` secret | Already configured |
| `gmail_access_token` column | Already exists in `crm_agents` |
| `gmail_refresh_token` column | Already exists in `crm_agents` |
| `last_gmail_sync` column | Already exists in `crm_agents` |
| `sync-gmail-emails` function | Already deployed and working |

**What's Missing:** OAuth UI flow to get agent consent and populate the tokens.

---

## Implementation Plan

### Part 1: Edge Functions (2 new functions)

#### Function 1: `gmail-auth-url`
Generates the Google OAuth authorization URL for agent consent.

```text
Request:  POST { agentId, redirectUrl }
Response: { authUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

Key features:
- Uses `GOOGLE_CLIENT_ID` from environment
- Requests Gmail read/modify and userinfo.email scopes
- Uses `access_type=offline` to get refresh token
- Encodes `agentId` in state parameter for callback

#### Function 2: `gmail-auth-callback`
Handles the OAuth callback and exchanges code for tokens.

```text
Request:  POST { code, state, redirectUri }
Response: { success: true, email: "agent@delsolprimehomes.com" }
```

Key features:
- Exchanges authorization code for access/refresh tokens
- Verifies email ends with `@delsolprimehomes.com`
- Stores tokens in `crm_agents` table
- Returns success/error status

### Part 2: Frontend Components (3 new files)

#### Component 1: `ConnectGmail.tsx`
Button component for agent profile page.

- Shows "Connect Gmail" when not connected
- Shows "Gmail Connected: email@..." when connected
- Handles OAuth redirect initiation

#### Component 2: `GmailCallback.tsx`
OAuth callback page that processes the authorization code.

- Parses `code` and `state` from URL
- Calls `gmail-auth-callback` edge function
- Shows processing/success/error states
- Redirects back to agent profile

### Part 3: Route Configuration

Add new route for OAuth callback:
```
/auth/gmail/callback -> GmailCallback
```

### Part 4: Integration

Modify `AgentProfilePage.tsx` to include the `ConnectGmail` component in a new "Email Integration" card.

---

## OAuth Flow Diagram

```text
Agent clicks "Connect Gmail"
         |
         v
┌─────────────────────────────┐
│   gmail-auth-url function   │
│   Generates OAuth URL       │
└─────────────────────────────┘
         |
         v (redirect)
┌─────────────────────────────┐
│   Google OAuth Consent      │
│   Agent grants access       │
└─────────────────────────────┘
         |
         v (redirect with code)
┌─────────────────────────────┐
│   /auth/gmail/callback      │
│   GmailCallback page        │
└─────────────────────────────┘
         |
         v
┌─────────────────────────────┐
│   gmail-auth-callback fn    │
│   - Exchange code for token │
│   - Verify @delsolprime... │
│   - Store in crm_agents     │
└─────────────────────────────┘
         |
         v
┌─────────────────────────────┐
│   Redirect to Profile       │
│   Show "Gmail Connected"    │
└─────────────────────────────┘
```

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/functions/gmail-auth-url/index.ts` | Generate OAuth URL |
| Create | `supabase/functions/gmail-auth-callback/index.ts` | Handle OAuth callback |
| Create | `src/components/crm/ConnectGmail.tsx` | Gmail connection button |
| Create | `src/pages/auth/GmailCallback.tsx` | OAuth callback page |
| Modify | `src/App.tsx` | Add callback route |
| Modify | `src/pages/crm/agent/AgentProfilePage.tsx` | Add ConnectGmail card |
| Modify | `supabase/config.toml` | Register new functions |

---

## Security Considerations

1. **Domain Restriction**: Only `@delsolprimehomes.com` emails are accepted
2. **State Parameter**: Agent ID is encoded in OAuth state to prevent CSRF
3. **Service Role**: Token storage uses service role key (bypasses RLS)
4. **Token Refresh**: Existing `sync-gmail-emails` already handles token refresh

---

## Technical Details

### Google OAuth Scopes
- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/gmail.modify` - Mark as read/unread
- `https://www.googleapis.com/auth/userinfo.email` - Verify email domain

### Redirect URI
The callback URL must be registered in Google Cloud Console:
```
https://id-preview--8cbd0f4b-f95f-4e66-b71d-a9cc047a12e7.lovable.app/auth/gmail/callback
```
And for production:
```
https://blog-knowledge-vault.lovable.app/auth/gmail/callback
```

---

## Post-Implementation

Once agents connect their Gmail accounts:
1. Their tokens will be stored in `crm_agents`
2. The `sync-gmail-emails` function will automatically sync their emails
3. Emails will appear in the CRM's email tracking system
4. Lead emails will be automatically matched and linked

