

# Store Complete Emma Conversation Transcripts

## User Requirement

You want **100% of the conversation** stored and visible to admins and agents - not just the Q&A phase extraction. Looking at Mikey's conversation, there were 32+ messages exchanged, but only 1 pair was captured (incorrectly).

**Current state:** The system tries to extract 10 "meaningful" Q&A pairs but skips setup messages, confirmations, etc.

**What you want:** The ENTIRE conversation transcript stored and visible.

---

## Solution Overview

### 1. Add `conversation_transcript` Column to Database

Add a JSONB column to `emma_leads` table that stores the complete conversation:

```sql
ALTER TABLE emma_leads 
ADD COLUMN conversation_transcript JSONB;
```

This will store every message like:
```json
[
  {"role": "assistant", "content": "Hello, nice to meet you...", "timestamp": "2026-01-28T13:39:00Z"},
  {"role": "user", "content": "yes", "timestamp": "2026-01-28T13:39:05Z"},
  {"role": "assistant", "content": "Thank you. Before we go into your questions...", "timestamp": "2026-01-28T13:39:10Z"},
  ...
]
```

### 2. Send Full Transcript to Edge Function

Modify `EmmaChat.tsx` to include the raw `messages` array in the payload sent to `send-emma-lead`:

```typescript
const unifiedPayload = {
    conversation_id: conversationId,
    // ... existing fields ...
    conversation_transcript: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString()
    }))
};
```

### 3. Update Edge Function to Store Transcript

Modify `send-emma-lead/index.ts` to save the transcript:

```typescript
const updateData = {
    // ... existing fields ...
    conversation_transcript: payload.conversation_transcript
};
```

### 4. Display Full Transcript in Admin UI

Update `EmmaConversations.tsx` to show the full conversation:

```tsx
{/* Full Conversation Transcript */}
<div className="p-4 border-b">
    <h3>Full Conversation ({selectedLead.conversation_transcript?.length || 0} messages)</h3>
    <div className="space-y-2">
        {selectedLead.conversation_transcript?.map((msg, i) => (
            <div key={i} className={msg.role === 'assistant' ? 'bg-blue-50' : 'bg-gray-50'}>
                <span>{msg.role === 'assistant' ? 'Emma' : 'User'}</span>
                <p>{msg.content}</p>
            </div>
        ))}
    </div>
</div>
```

---

## Files to Change

| File | Changes |
|------|---------|
| **Database** | Add `conversation_transcript JSONB` column to `emma_leads` |
| `src/components/landing/EmmaChat.tsx` | Add `conversation_transcript` to payload |
| `supabase/functions/send-emma-lead/index.ts` | Store transcript in database |
| `src/pages/admin/EmmaConversations.tsx` | Display full conversation in admin UI |
| `src/hooks/useEmmaLeadTracking.ts` | Add type for conversation_transcript |

---

## Expected Result for Mikey's Conversation

After implementation, the admin will see:

| Message # | Role | Content |
|-----------|------|---------|
| 1 | Emma | "Hello, nice to meet you..." |
| 2 | User | "yes" |
| 3 | Emma | "Thank you. Before we go into your questions..." |
| 4 | User | "yes" |
| 5 | Emma | "I'm Emma. How may I address you?" |
| 6 | User | "Mikey" |
| 7 | Emma | "Thank you. And for a correct record, what is your family name?" |
| 8 | User | "Mike" |
| ... | ... | ... (all 32 messages) |
| 31 | Emma | "A first personalized selection will be shared within a maximum of 24 hours." |
| 32 | User | "thank you" |

**All 32 messages stored and visible**, not just extracted Q&A pairs.

---

## Keep Q&A Extraction?

I recommend keeping the Q&A extraction logic as well:
- **Full transcript** → For agents to read the complete context
- **Extracted Q&A pairs** → For quick summary and GHL webhook integration

This gives you both: the full conversation AND the structured summary.

