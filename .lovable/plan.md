
# Fix Reference Search in Property Finder

## Problem

When a user searches by property reference (e.g., "R4922596") using the Advanced Filters, the search returns ALL properties (6,933) instead of filtering to just that one property.

## Root Cause

The issue is in the `search-properties` edge function. Currently:

1. The frontend correctly passes the reference parameter to the edge function
2. The edge function passes the reference to the proxy `/search` endpoint
3. **The proxy's `/search` endpoint ignores the reference parameter** - it only supports bulk property filtering, not single-property lookups

The proxy server has a **separate endpoint** `/property/:reference` that works for reference lookups (confirmed by user: `curl http://localhost:3000/property/R4922596` works).

## Solution

Modify the `search-properties` edge function to detect when a reference is provided and use the `/property/:reference` endpoint instead of `/search`.

## Technical Changes

### File: `supabase/functions/search-properties/index.ts`

**Change 1: Add a new function to call the property details endpoint**

Reuse the existing pattern from `get-property-details` function to call `/property/:reference`:

```text
// Add function to call proxy for single property by reference
async function callProxyPropertyByReference(reference: string, langNum: number): Promise<any> {
  const requestUrl = `${PROXY_BASE_URL}/property/${encodeURIComponent(reference)}?lang=${langNum}`;
  
  console.log('🔄 Calling Proxy Server (GET) - /property/:reference');
  console.log('📤 Request URL:', requestUrl);
  
  const response = await fetch(requestUrl, { method: 'GET' });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // Property not found
    }
    throw new Error(`Proxy error: ${response.status}`);
  }
  
  const data = await response.json();
  // Extract property from various response formats
  return data.Property || data.property || (data.Reference ? data : null);
}
```

**Change 2: Update the main serve handler to check for reference first**

Before calling the general search, check if `filters.reference` is provided:

```text
serve(async (req) => {
  // ... CORS handling ...
  
  try {
    const body = await req.json();
    const { lang = 'en', page = 1, limit = 500, ...filters } = body;
    const langNum = LANGUAGE_MAP[lang] || 1;
    
    // NEW: If reference is provided, use property lookup endpoint
    if (filters.reference && filters.reference.trim()) {
      console.log('🔍 Reference search detected, using /property/:reference endpoint');
      const rawProperty = await callProxyPropertyByReference(filters.reference.trim(), langNum);
      
      if (rawProperty) {
        // Verify it's a residential property
        if (isResidentialProperty(rawProperty)) {
          const property = normalizeProperty(rawProperty);
          return new Response(JSON.stringify({
            properties: [property],
            total: 1,
            page: 1,
            pageSize: 1,
            queryId: null,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      
      // Reference not found or not residential
      return new Response(JSON.stringify({
        properties: [],
        total: 0,
        page: 1,
        pageSize: 0,
        queryId: null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Existing search logic continues here...
  }
});
```

## Flow Diagram

```text
User enters "R4922596" in Reference field
                    │
                    ▼
        PropertyFilters.handleSearch()
        builds params: { reference: "R4922596", ... }
                    │
                    ▼
        PropertyFinder.searchProperties()
        calls edge function with body
                    │
                    ▼
     search-properties edge function
                    │
          ┌─────────┴─────────┐
          │                   │
   reference provided?    No reference?
          │                   │
          ▼                   ▼
   /property/R4922596     /search (bulk)
          │                   │
          ▼                   ▼
     Return 1 property   Return all matches
```

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/search-properties/index.ts` | Add reference lookup logic before general search |

## Expected Result

After the fix:
- User types "R4922596" in the Reference field
- Clicks Search
- API calls `/property/R4922596` endpoint instead of `/search`
- Returns exactly 1 property (or 0 if not found)
- UI displays just that property
