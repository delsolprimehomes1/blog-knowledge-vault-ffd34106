

# Gmail Email Sync Edge Function Implementation

## Overview

Create a Gmail API polling edge function that syncs emails directly from Gmail into the `email_tracking` table without third-party services like Zapier or Mailgun.

## Prerequisites - Secrets Required

The function needs Google OAuth credentials that are **not currently configured**:

| Secret | Status | Purpose |
|--------|--------|---------|
| `GOOGLE_CLIENT_ID` | Missing | OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Missing | OAuth 2.0 Client Secret |

You'll need to:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable the Gmail API
4. Create OAuth 2.0 credentials (Web application type)
5. Provide these credentials when I request them

## Database Changes

Add Gmail OAuth columns to `crm_agents` table (note: your table is `crm_agents`, not `agents`):

```sql
ALTER TABLE crm_agents ADD COLUMN IF NOT EXISTS gmail_access_token TEXT;
ALTER TABLE crm_agents ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT;
ALTER TABLE crm_agents ADD COLUMN IF NOT EXISTS last_gmail_sync TIMESTAMPTZ;
```

## Edge Function Implementation

### File: `supabase/functions/sync-gmail-emails/index.ts`

The function will:

1. **Query agents** with Gmail OAuth tokens from `crm_agents` table
2. **Fetch emails** from Gmail API for each agent since their last sync
3. **Match leads** by email address against `crm_leads` table
4. **Detect direction** (incoming/outgoing) based on `@delsolprimehomes.com` domain
5. **Store emails** in `email_tracking` table with deduplication
6. **Handle token refresh** automatically when access tokens expire
7. **Update sync timestamp** after successful sync

### Key Features:
- Uses service role key for database operations (bypasses RLS)
- Automatic OAuth token refresh when expired
- Deduplication prevents duplicate email entries
- Proper base64 decoding for email content (Gmail uses URL-safe base64)
- Error handling per-agent (one failure doesn't stop others)

### Config: `supabase/config.toml`

Add function configuration:
```toml
[functions.sync-gmail-emails]
verify_jwt = false
```

## Technical Details

### Gmail API Flow:
```text
┌─────────────────────────────────────────────────────────────┐
│                   sync-gmail-emails                         │
├─────────────────────────────────────────────────────────────┤
│  1. Query crm_agents with gmail_access_token IS NOT NULL    │
│                           │                                 │
│                           ▼                                 │
│  2. For each agent:                                         │
│     ├── Build query: after:{last_gmail_sync}                │
│     ├── Call Gmail API: /users/me/messages                  │
│     ├── Handle 401 → Refresh token                          │
│     └── For each message:                                   │
│         ├── Fetch full message details                      │
│         ├── Parse headers (From, To, Subject)               │
│         ├── Decode body (base64url → UTF-8)                 │
│         ├── Determine direction (incoming/outgoing)         │
│         ├── Match lead_id by email                          │
│         ├── Check deduplication                             │
│         └── Insert into email_tracking                      │
│                           │                                 │
│                           ▼                                 │
│  3. Update last_gmail_sync for each agent                   │
│                           │                                 │
│                           ▼                                 │
│  4. Return: { agents_synced, emails_synced }                │
└─────────────────────────────────────────────────────────────┘
```

### Email Direction Detection:
- If `from_email` contains `@delsolprimehomes.com` → **outgoing**
- Otherwise → **incoming**

### Lead Matching:
- For **outgoing** emails: match `to_email` against `crm_leads.email`
- For **incoming** emails: match `from_email` against `crm_leads.email`

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/functions/sync-gmail-emails/index.ts` | Main edge function |
| Modify | `supabase/config.toml` | Add function config |
| Migrate | `crm_agents` table | Add Gmail OAuth columns |

## Usage

Invoke manually or via cron:
```bash
curl https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/sync-gmail-emails
```

Expected response:
```json
{
  "success": true,
  "agents_synced": 3,
  "emails_synced": 47
}
```

## Future Enhancements (Not in This Implementation)

1. **Gmail OAuth UI** - Frontend for agents to connect their Gmail accounts
2. **Webhook-based sync** - Use Gmail Push Notifications instead of polling
3. **Scheduled sync** - Cron job to run sync every 5 minutes

