

# Fix: Internal Link Generator Failing with "Generated 0 links"

## Problem Identified

The bulk internal link generator is returning **"Generated links for 0 articles"** because:

1. **Perplexity API is returning HTML error responses** (likely rate limiting or service issues)
2. **No error handling for non-200 responses** - The code tries to parse HTML as JSON, causing failures
3. **Errors are silently swallowed** - The catch block just sets `suggestions = []` without logging

---

## Solution

Add proper error handling to the Perplexity API call in the edge function:

### Changes to `supabase/functions/find-internal-links/index.ts`

**Add HTTP status check before JSON parsing (around line 398):**

```typescript
const aiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
  // ... existing code
});

// ADD: Check for API errors before parsing
if (!aiResponse.ok) {
  const errorText = await aiResponse.text();
  console.error(`Perplexity API error for "${article.headline}": ${aiResponse.status} - ${errorText.substring(0, 200)}`);
  
  // Handle rate limiting specifically
  if (aiResponse.status === 429) {
    results.push({
      articleId: article.id,
      success: false,
      error: 'Rate limited by Perplexity API - try again in a few minutes',
      linkCount: 0
    });
    continue;
  }
  
  throw new Error(`Perplexity API returned ${aiResponse.status}`);
}

const aiData = await aiResponse.json();
// ... rest of existing code
```

**Also add to single mode (around line 194):**

```typescript
if (!aiResponse.ok) {
  const errorText = await aiResponse.text();
  console.error('Perplexity API error:', aiResponse.status, errorText.substring(0, 200));
  throw new Error(`Perplexity API error: ${aiResponse.status}`);
}
```

---

## Additional Improvements

1. **Better logging** - Log the full Perplexity response status
2. **Rate limit handling** - Add delay between batch API calls
3. **User feedback** - Show specific error message on frontend when rate limited

### Optional: Add delay between batch items

```typescript
// Add small delay between API calls to avoid rate limiting
if (index > 0) {
  await new Promise(resolve => setTimeout(resolve, 500));
}
```

---

## Why This Is Happening Now

The Perplexity API has rate limits. When processing multiple articles quickly:
- Each article = 1 API call
- Rapid-fire calls trigger rate limiting
- API returns HTML error page instead of JSON
- Code tries to parse HTML as JSON → crashes
- Result: `success: false` for all articles

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/find-internal-links/index.ts` | Add HTTP status checks, rate limit handling, and delays |

---

## Testing After Fix

1. Navigate to `/admin/bulk-internal-links`
2. Select 2-3 French articles
3. Click "Generate Links"
4. Should now either:
   - Generate links successfully, OR
   - Show meaningful error message if rate limited

