

# Fix: Perplexity API Authentication + Better Error Reporting for Bulk Internal Links

## Problem Identified

The edge function logs clearly show:

```
PERPLEXITY_WAF_BLOCK
upstreamStatus: 401
contentType: "text/html"  
userMessage: "Perplexity is blocking requests with a security challenge."
```

However, **HTTP 401 is not a WAF block - it's an authentication failure**. The current code incorrectly categorizes any HTML response as a "WAF block", but 401 specifically means the API key is being rejected.

---

## Root Causes

1. **Misclassified error**: The perplexityClient detects HTML and assumes WAF, but 401 = auth failure
2. **API key issue**: The `PERPLEXITY_API_KEY` secret may be:
   - Expired or revoked
   - Has leading/trailing whitespace
   - Incorrectly formatted
3. **Silent UI failures**: Frontend shows "Generated 0 links" without explaining why

---

## Solution

### 1. Fix Error Classification in `perplexityClient.ts`

Prioritize HTTP status codes over content-type detection:

| Current Behavior | Fixed Behavior |
|------------------|----------------|
| 401 + HTML → `PERPLEXITY_WAF_BLOCK` | 401 → `PERPLEXITY_AUTH_FAILED` (regardless of HTML) |
| Any HTML → WAF block | Check status first, then content-type |

```typescript
// Before checking isHtml, check if status code maps to known error
if (errorCodeMap[upstreamStatus]) {
  // Use mapped error code (e.g., 401 → PERPLEXITY_AUTH_FAILED)
  return { 
    success: false,
    error: {
      error_code: errorCodeMap[upstreamStatus],
      userMessage: userMessageMap[upstreamStatus],
      ...
    }
  };
}

// Only fall back to WAF detection for unmapped statuses with HTML
if (isHtml) {
  return { error_code: 'PERPLEXITY_WAF_BLOCK', ... };
}
```

### 2. Trim API Key Whitespace

Add defensive trimming when retrieving the API key:

```typescript
const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')?.trim();
```

### 3. Add Per-Article Error Reporting to Frontend

Update `BulkInternalLinks.tsx` to show:

| Feature | Implementation |
|---------|----------------|
| Error toast on total failure | Show specific error message when all articles fail |
| Per-article status after generation | Display success/failed counts with reasons |
| Collapsible error details | Let users see which articles failed and why |

**New UI elements after generation:**

```tsx
{generationResults && (
  <Card className="border-amber-200 bg-amber-50">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        Generation Results
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex gap-4 mb-4">
        <Badge variant="default">{successCount} succeeded</Badge>
        <Badge variant="destructive">{failedCount} failed</Badge>
      </div>
      {failedArticles.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger>View failed articles →</CollapsibleTrigger>
          <CollapsibleContent>
            {failedArticles.map(f => (
              <div key={f.id} className="py-2 border-b">
                <span className="font-medium">{f.headline}</span>
                <span className="text-red-600 text-sm ml-2">{f.error}</span>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </CardContent>
  </Card>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/shared/perplexityClient.ts` | Fix error classification: check status codes before HTML detection |
| `supabase/functions/find-internal-links/index.ts` | Trim API key whitespace |
| `src/pages/admin/BulkInternalLinks.tsx` | Add per-article error reporting UI |

---

## Immediate Action Required

**Verify your Perplexity API key is valid:**

1. Go to [Perplexity API Dashboard](https://docs.perplexity.ai/) 
2. Check if the key is active and has available credits
3. Copy a fresh API key
4. Update the `PERPLEXITY_API_KEY` secret in your project settings

The 401 error strongly indicates the API key itself is the problem. The code fixes will improve error handling and reporting, but won't work if the key is invalid.

---

## Testing After Fix

1. Update the `PERPLEXITY_API_KEY` secret with a verified working key
2. Navigate to `/admin/bulk-internal-links`
3. Select 2-3 articles and click "Generate Links"
4. Expected outcomes:
   - **If key is valid**: Links generate successfully
   - **If key is still invalid**: UI shows "Authentication failed" error with clear message
   - **If rate limited**: UI shows "Rate limit exceeded" with retry guidance

