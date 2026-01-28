
# Add Full Conversation Transcript to Agent CRM Lead Detail

## Current State

| Location | Full Transcript Available? |
|----------|---------------------------|
| Admin (`/admin/emma`) | ✅ Yes - shows all messages from `emma_leads.conversation_transcript` |
| Agent CRM (`/crm/agent/leads/:id`) | ❌ No - only shows extracted Q&A pairs from `crm_leads.qa_pairs` |

The transcript is stored in `emma_leads` but never copied to `crm_leads` for agents.

---

## Solution Overview

### Step 1: Add `conversation_transcript` Column to `crm_leads`

```sql
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS conversation_transcript JSONB;
```

### Step 2: Update `send-emma-lead` to Pass Transcript to CRM

Modify the CRM registration payload to include the transcript:

```typescript
// In registerInCRM function
const crmPayload = {
    // ... existing fields ...
    conversationTranscript: payload.conversation_transcript || null,
};
```

### Step 3: Update `register-crm-lead` to Store Transcript

Add the transcript field to the lead insert:

```typescript
// In LeadPayload interface
conversationTranscript?: Array<{ role: string; content: string; timestamp: string }>;

// In the insert
conversation_transcript: payload.conversationTranscript || null,
```

### Step 4: Update `EmmaConversationCard.tsx` for Full Display

Transform the component to show the complete chat history:

```tsx
// Add transcript interface
interface TranscriptMessage {
    role: 'assistant' | 'user';
    content: string;
    timestamp: string;
}

// Display full conversation with role-based styling
{transcript.map((msg, i) => (
    <div className={msg.role === 'assistant' ? 'bg-blue-50' : 'bg-gray-50'}>
        <span>{msg.role === 'assistant' ? '🤖 Emma' : '👤 User'}</span>
        <p>{msg.content}</p>
    </div>
))}
```

---

## Files to Change

| File | Changes |
|------|---------|
| **Database Migration** | Add `conversation_transcript JSONB` to `crm_leads` |
| `supabase/functions/send-emma-lead/index.ts` | Pass transcript in `registerInCRM` payload |
| `supabase/functions/register-crm-lead/index.ts` | Accept and store `conversationTranscript` |
| `src/components/crm/detail/EmmaConversationCard.tsx` | Display full transcript with scrollable chat UI |

---

## Technical Details

### Updated EmmaConversationCard Component

The agent-facing component will be enhanced to:

1. **Show full transcript first** - All messages in chat-bubble format
2. **Keep Q&A summary below** - For quick reference
3. **Add message count badge** - "32 messages" indicator
4. **Scrollable area** - For long conversations
5. **Role-based styling**:
   - Emma (assistant): Blue background, left-aligned
   - User: Gray background, right-aligned
6. **Timestamps** - Show time for each message

### Data Flow After Implementation

```text
Emma Chat → send-emma-lead → register-crm-lead → crm_leads.conversation_transcript
                ↓
         emma_leads.conversation_transcript (backup)
                ↓
       EmmaConversationCard displays full history to agent
```

---

## Expected Result

When an agent views a lead detail page for an Emma chatbot lead, they will see:

1. **Header**: "Emma Conversation History" with "32 messages" badge
2. **Full Chat**: Scrollable area showing every message exchanged
3. **Q&A Summary**: Extracted key pairs for quick reference (optional, collapsible)
4. **Status Badges**: Complete/Incomplete, duration, questions answered

Both admins (at `/admin/emma`) and agents (at `/crm/agent/leads/:id`) will have full visibility into the complete conversation.
