
# Fix Emma Q&A Capture: Store All Conversation Turns

## Problem Identified

From the database query, I can see that:
1. **Only 1 Q&A pair is being saved** - and it's the wrong one (Emma's intro + "yes")
2. **Database schema limitation**: `emma_leads` table only has columns for 3 Q&A pairs
3. **Admin page limitation**: Only displays Q1-Q3

### What's Being Captured (Wrong)
| Question 1 | Answer 1 |
|------------|----------|
| "Before we go into your questions, I want to briefly explain how this works..." | "yes" |

### What Should Be Captured (Correct)
The actual content questions Emma asks during the conversation, like:
- "What is your budget range?"
- "What areas are you considering?"
- "What type of property are you looking for?"

---

## Root Causes

### 1. Q&A Extraction Logic Issue (`EmmaChat.tsx`)

The `extractQAFromHistory()` function captures Emma's **intro message** as Question 1 instead of skipping it. The content phase start patterns are too broad.

**Current behavior** (lines 918-922):
```typescript
// If no content phase found via patterns, capture ANY assistant-user exchanges after greeting
if (contentPhaseStart === -1) {
  contentPhaseStart = Math.min(1, msgs.length - 1); // Starts too early
}
```

### 2. Database Schema (`emma_leads` table)

Only 3 Q&A columns exist:
- `question_1`, `answer_1`
- `question_2`, `answer_2`
- `question_3`, `answer_3`

But the code attempts to capture up to 10 pairs.

### 3. Admin Page Display (`EmmaConversations.tsx`)

Only loops through 3 pairs:
```typescript
{[1, 2, 3].map((num) => { ... })}
```

---

## Solution

### Phase 1: Fix Q&A Extraction Logic

Update `extractQAFromHistory()` to:
1. **Skip intro/setup messages** - Add patterns to identify Emma's setup phase (name collection, phone collection)
2. **Start capturing AFTER contact info phase** - Only capture Q&A that happen after the user provides their phone number
3. **Filter out short confirmations** - Already exists but threshold too low (15 chars)

### Phase 2: Expand Database Schema

Add migration to add columns for Q&A pairs 4-10:
```sql
ALTER TABLE emma_leads 
ADD COLUMN IF NOT EXISTS question_4 TEXT,
ADD COLUMN IF NOT EXISTS answer_4 TEXT,
ADD COLUMN IF NOT EXISTS question_5 TEXT,
ADD COLUMN IF NOT EXISTS answer_5 TEXT,
-- ... up to question_10, answer_10
```

### Phase 3: Update Edge Function (`send-emma-lead`)

Modify `updateLeadRecord()` to save all 10 Q&A pairs:
```typescript
question_4: payload.content_phase.question_4,
answer_4: payload.content_phase.answer_4,
// ... up to 10
```

### Phase 4: Update Admin Page Display

Update `EmmaConversations.tsx` to display all 10 Q&A pairs:
```typescript
{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => { ... })}
```

### Phase 5: CRM Already Correct

The `crm_leads.qa_pairs` JSONB column can store unlimited pairs, and `EmmaConversationCard.tsx` already displays all pairs correctly.

---

## Technical Implementation

### File Changes

| File | Action | Changes |
|------|--------|---------|
| `src/components/landing/EmmaChat.tsx` | **MODIFY** | Fix `extractQAFromHistory()` to skip intro/setup phase |
| Database migration | **CREATE** | Add `question_4` through `question_10` and `answer_4` through `answer_10` columns |
| `supabase/functions/send-emma-lead/index.ts` | **MODIFY** | Save all 10 Q&A pairs to database |
| `src/pages/admin/EmmaConversations.tsx` | **MODIFY** | Display all 10 Q&A pairs, update TypeScript interface |

---

## Key Fix: Q&A Extraction Pattern Update

The critical fix is in `extractQAFromHistory()`:

```typescript
// NEW: Patterns that indicate SETUP PHASE (should be SKIPPED)
const setupPhasePatterns = [
  'before we go into your questions',
  'i first need a few details',
  'is that okay for you',
  'how may i address you',
  'what is your name',
  'which number may i send',
  'country prefix',
  // ... multilingual variants
];

// Skip messages that are part of setup/contact collection
for (let i = contentPhaseStart; i < transitionPoint && turnCount < maxTurns; i++) {
  const msg = msgs[i];
  const nextMsg = msgs[i + 1];
  
  if (msg.role === 'assistant' && nextMsg?.role === 'user') {
    const emmaContent = msg.content.toLowerCase();
    
    // SKIP setup phase messages
    if (setupPhasePatterns.some(p => emmaContent.includes(p))) {
      continue;
    }
    
    // Capture actual content Q&A
    turnCount++;
    qa[`question_${turnCount}`] = msg.content.trim();
    qa[`answer_${turnCount}`] = nextMsg.content.trim();
  }
}
```

---

## Expected Result After Fix

| emma_leads Table | crm_leads.qa_pairs | Admin /admin/emma | Agent CRM Dashboard |
|------------------|-------------------|-------------------|---------------------|
| Q1-Q10 populated with actual content questions | All Q&A pairs in JSONB array | Displays all 10 Q&A pairs | Displays all Q&A pairs via `EmmaConversationCard` |

All Emma conversations will now capture the **actual questions** Emma asks (budget, location, timeframe, etc.) rather than the intro confirmation.
