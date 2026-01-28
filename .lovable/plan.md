

# Fix Emma Q&A Capture: Capture Both Conversation Directions

## Problem Summary

The Emma chatbot is capturing Q&A pairs incorrectly. Looking at Morgan's conversation:

| What's Being Saved | What Should Be Saved |
|-------------------|---------------------|
| Q1: "What is currently the main thing on your mind?" | Q1: "how much is property taxes?" |
| A1: "how much is property taxes" | A1: [Emma's property tax explanation] |

**Only 1 pair captured instead of 10+**

The extraction logic assumes Emma asks questions and users answer, but in the content phase, **users ask questions to Emma**.

---

## Root Cause Analysis

### Issue 1: Wrong Q&A Direction Detection

The current logic (lines 1050-1082) captures `Assistant → User` pairs:
```typescript
if (msg.role === 'assistant' && nextMsg && nextMsg.role === 'user') {
    // Captures Emma asking, user replying
}
```

But Morgan's conversation has **User → Emma** content flow:
- User: "how much is property taxes" → Emma: [detailed answer]
- User: "what are the schools like" → Emma: [detailed answer]
- User: "how is the weather in summer" → Emma: [detailed answer]

### Issue 2: Short Answer Filter Not Working Properly

The filter `userAnswer.length < 10` should skip short confirmations, but:
- "yes it is" = 9 chars (should skip) - but this is in the wrong position anyway
- "yes it does" = 11 chars (captured when it shouldn't be)
- The actual questions like "how much is property taxes" (24 chars) are being placed in the wrong field

### Issue 3: Transition Pattern Ends Capture Too Early

When Emma says "personalized selection", the extraction stops, missing:
- Location preference: "Estepona"
- Sea view: "Essential"
- Budget: "500k-750k"
- Bedrooms: "4"
- Property type: "apartment"
- Purpose: "winter"
- Timeframe: "6 months"

---

## Solution: Capture Both Directions

### Phase 1: Detect Conversation Flow Direction

Add logic to detect which pattern the conversation follows:
1. **User asks, Emma answers** (Morgan's case - user initiates questions)
2. **Emma asks, User answers** (property criteria intake phase)

### Phase 2: Capture User→Emma Pairs

For the content phase where users ask questions:
```typescript
// User asks a question, Emma responds
if (msg.role === 'user' && nextMsg && nextMsg.role === 'assistant') {
    const userQuestion = msg.content.trim();
    const emmaAnswer = nextMsg.content.trim();
    
    // Skip short confirmations like "yes", "ok"
    if (userQuestion.length < 15) continue;
    
    // This is a real question from user to Emma
    turnCount++;
    qa[`question_${turnCount}`] = userQuestion;
    qa[`answer_${turnCount}`] = emmaAnswer;
}
```

### Phase 3: Also Capture Emma→User Pairs

For the property criteria intake phase (Emma's guided questions):
```typescript
// Emma asks structured question, User responds with preference
if (msg.role === 'assistant' && nextMsg && nextMsg.role === 'user') {
    // Skip short Emma messages that aren't real questions
    if (emmaContent.length < 30 && !emmaContent.includes('?')) continue;
    
    // This is Emma's intake question
    turnCount++;
    qa[`question_${turnCount}`] = emmaContent;
    qa[`answer_${turnCount}`] = userAnswer;
}
```

### Phase 4: Remove Transition Cut-Off

Allow capturing to continue through the entire conversation, including the property criteria phase.

---

## Expected Capture for Morgan's Conversation

After fix, the database should show:

| Field | Value |
|-------|-------|
| question_1 | "how much is property taxes" |
| answer_1 | "Property taxes in Spain, specifically on the Costa del Sol, vary depending on..." |
| question_2 | "what are the schools like" |
| answer_2 | "Schools in the Costa del Sol area are diverse, with a range of options..." |
| question_3 | "how is the weather is summer" |
| answer_3 | "The summer weather on the Costa del Sol is typically warm and sunny..." |
| question_4 | "Are there specific locations you already have in mind?" |
| answer_4 | "Estepona" |
| question_5 | "How important is sea view for you?" |
| answer_5 | "Essential" |
| question_6 | "Which budget range are you most comfortable with?" |
| answer_6 | "500k-750k" |
| question_7 | "How many bedrooms are you looking for?" |
| answer_7 | "4" |
| question_8 | "What type of property are you mainly considering?" |
| answer_8 | "apartment" |
| question_9 | "What would be the primary purpose of the property?" |
| answer_9 | "winter" |
| question_10 | "What kind of timeframe are you looking at?" |
| answer_10 | "6 months" |
| questions_answered | 10 |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/landing/EmmaChat.tsx` | Rewrite `extractQAFromHistory()` to capture both User→Emma and Emma→User pairs |

---

## Technical Implementation

### Updated extractQAFromHistory Function

```typescript
const extractQAFromHistory = (msgs: Message[]): Record<string, string> => {
    const qa: Record<string, string> = {};
    let turnCount = 0;
    const maxTurns = 10;
    
    // Skip patterns for short confirmations
    const skipPatterns = ['yes', 'ok', 'sure', 'yeah', 'no', 'great', 'perfect', 'thanks'];
    
    // Start capturing after contact info collection (first 8-10 messages typically)
    const startIndex = findContentPhaseStart(msgs);
    
    for (let i = startIndex; i < msgs.length - 1 && turnCount < maxTurns; i++) {
        const msg = msgs[i];
        const nextMsg = msgs[i + 1];
        
        // Case 1: USER asks question → EMMA answers (content phase)
        if (msg.role === 'user' && nextMsg.role === 'assistant') {
            const userQuestion = msg.content.trim();
            const emmaAnswer = nextMsg.content.trim();
            
            // Skip short confirmations
            if (userQuestion.length < 15 || skipPatterns.some(p => 
                userQuestion.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).includes(p)
            )) {
                continue;
            }
            
            // Capture the Q&A pair
            turnCount++;
            qa[`question_${turnCount}`] = userQuestion.substring(0, 500);
            qa[`answer_${turnCount}`] = emmaAnswer.substring(0, 2000); // Emma's answers are longer
            i++; // Skip the answer message
        }
        // Case 2: EMMA asks structured question → USER answers (intake phase)
        else if (msg.role === 'assistant' && nextMsg.role === 'user') {
            const emmaQuestion = msg.content.trim();
            const userAnswer = nextMsg.content.trim();
            
            // Skip setup messages
            if (setupPhasePatterns.some(p => emmaQuestion.toLowerCase().includes(p))) {
                continue;
            }
            
            // Must contain a question mark and be substantial
            if (!emmaQuestion.includes('?') || emmaQuestion.length < 30) {
                continue;
            }
            
            // Skip short user responses that are just confirmations
            if (userAnswer.length < 3) continue;
            
            turnCount++;
            qa[`question_${turnCount}`] = emmaQuestion.substring(0, 500);
            qa[`answer_${turnCount}`] = userAnswer.substring(0, 500);
            i++; // Skip the answer message
        }
    }
    
    qa.questions_answered = turnCount.toString();
    return qa;
};
```

---

## Verification After Implementation

1. Test with a new Emma conversation that includes:
   - At least 3 user questions (property taxes, schools, weather, etc.)
   - Full property criteria intake (location, budget, bedrooms, etc.)
   
2. Check `/admin/emma` - should show all 10 Q&A pairs
3. Check CRM lead detail - `EmmaConversationCard` should display all pairs
4. Verify `emma_leads` table has correct Q1-Q10 populated
5. Verify `crm_leads.qa_pairs` JSONB has all pairs

