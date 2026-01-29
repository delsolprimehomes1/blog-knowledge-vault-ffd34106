
# Fix: Bedrooms Not Being Captured from Emma Conversations

## Problem

The user answered **"3"** when Emma asked "How many bedrooms are you looking for?" but this value is not being saved to `bedrooms_desired` in the database.

**Root Cause:** The current regex pattern only matches numbers when they're directly followed by bedroom-related words:

```javascript
// Current pattern - FAILS for "3"
const bedroomMatch = content.match(/(\d+)\s*(?:bed|bedroom|br|dormitor)/i);
```

This doesn't capture standalone numeric answers like "3", "4", or "5" which are common user responses to the bedrooms question.

## Solution

Update the extraction logic in `src/hooks/useEmmaLeadTracking.ts` to also consider the **context** from the previous assistant message. If Emma just asked about bedrooms, and the user replies with a number, that number should be captured.

### Implementation

**File: `src/hooks/useEmmaLeadTracking.ts`**

**Change 1:** Modify `extractPropertyCriteriaFromHistory` function to check previous messages for context

```typescript
// Enhanced bedrooms extraction - check context from previous Emma message
if (!criteria.bedrooms_desired) {
  // First try: number followed by bedroom word
  const bedroomMatch = content.match(/(\d+)\s*(?:bed|bedroom|br|dormitor)/i);
  if (bedroomMatch) {
    criteria.bedrooms_desired = bedroomMatch[1];
  } else {
    // Second try: standalone number if previous message asked about bedrooms
    const msgIndex = messages.indexOf(msg);
    if (msgIndex > 0) {
      const prevMsg = messages[msgIndex - 1];
      if (prevMsg.role === 'assistant') {
        const prevContent = prevMsg.content.toLowerCase();
        // Check if Emma asked about bedrooms
        const bedroomQuestionPatterns = [
          'how many bedrooms',
          'bedrooms are you',
          'bedrooms do you',
          'hoeveel slaapkamers',   // Dutch
          'combien de chambres',    // French
          'wie viele schlafzimmer', // German
          'ile sypialni',           // Polish
          'hur många sovrum',       // Swedish
          'hvor mange soveværelser',// Danish
          'kuinka monta makuuhuonetta', // Finnish
          'hány hálószoba'          // Hungarian
        ];
        
        if (bedroomQuestionPatterns.some(p => prevContent.includes(p))) {
          // User's response to bedroom question - extract standalone number
          const standaloneNumber = content.match(/^(\d+)$/);
          if (standaloneNumber) {
            criteria.bedrooms_desired = standaloneNumber[1];
          }
        }
      }
    }
  }
}
```

### Similar Pattern for Purpose

The same issue exists for `property_purpose`. The user answered **"winter"** when Emma asked about the primary purpose, but the current patterns look for phrases like "winter stay" or "escape winter". 

**Change 2:** Add standalone keyword matching with context awareness:

```typescript
// Enhanced purpose extraction - check context
if (!criteria.property_purpose) {
  // First try existing patterns
  for (const pattern of purposePatterns) {
    if (pattern.pattern.test(content)) {
      criteria.property_purpose = pattern.value;
      break;
    }
  }
  
  // Second try: standalone keywords if Emma asked about purpose
  if (!criteria.property_purpose) {
    const msgIndex = messages.indexOf(msg);
    if (msgIndex > 0 && messages[msgIndex - 1].role === 'assistant') {
      const prevContent = messages[msgIndex - 1].content.toLowerCase();
      if (prevContent.includes('primary purpose') || prevContent.includes('purpose of the property')) {
        const purposeKeywords = [
          { pattern: /^winter$/i, value: 'winter_stay' },
          { pattern: /^holiday$/i, value: 'holiday' },
          { pattern: /^investment$/i, value: 'investment' },
          { pattern: /^combination$/i, value: 'combination' }
        ];
        for (const kw of purposeKeywords) {
          if (kw.pattern.test(content.trim())) {
            criteria.property_purpose = kw.value;
            break;
          }
        }
      }
    }
  }
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useEmmaLeadTracking.ts` | Add context-aware extraction for bedrooms and purpose |

## Testing

After implementation:
1. Test a new Emma conversation
2. When asked about bedrooms, answer with just "3"
3. Verify the Property Criteria shows "3" for Bedrooms
4. Similarly test purpose with just "winter"

## Expected Results

| Field | User Answer | Current Result | After Fix |
|-------|-------------|----------------|-----------|
| Bedrooms | "3" | - (empty) | 3 |
| Purpose | "winter" | - (empty) | winter_stay |
