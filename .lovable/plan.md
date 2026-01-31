
# Fix Property Pagination - Show All 421 Properties

## Problem Analysis

The property search has mismatched pagination:
- **Edge Function**: Requests `pageSize: 500` from the API
- **Frontend UI**: Displays pagination assuming 20 items per page
- **Result**: Only showing the first batch of properties, no way to see all 421

The current pagination buttons exist but are broken because:
1. They calculate pages based on 20-item pages
2. Clicking "Next" triggers a new API call that **replaces** all properties instead of **appending**
3. The API is already returning all properties in one 500-item page, but they're all being displayed

After reviewing the code, the actual issue is that the frontend is displaying all properties from the response array. The pagination is purely visual but broken. Users should be able to see all 421 properties either by:
- Option A: "Load More" button (progressive loading)
- Option B: Display all properties at once (simple fix)

Since we're already fetching up to 500 properties per request and the API total is 421, we can display all at once.

---

## Changes Overview

### 1. Edge Function: Return QueryId for Multi-Page Support

**File**: `supabase/functions/search-properties/index.ts`

Capture and return `QueryId` from API response for future pagination:

```javascript
// In callProxySearch function, also return queryId
return {
  properties: data.Property || data.properties || [],
  total: data.QueryInfo?.PropertyCount || data.total || 0,
  queryId: data.QueryInfo?.QueryId || null,
};

// In response, include queryId
return new Response(
  JSON.stringify({
    properties,
    total: total,
    page,
    pageSize: limit,
    queryId: queryId,
  }),
  ...
);
```

---

### 2. Frontend: Implement "Load More" Button

**File**: `src/pages/PropertyFinder.tsx`

Replace the broken page-based pagination with a "Load More" button that appends results:

#### State Changes:
```javascript
const [properties, setProperties] = useState<Property[]>([]);
const [isLoadingMore, setIsLoadingMore] = useState(false);
const [hasMore, setHasMore] = useState(false);
const [currentQueryId, setCurrentQueryId] = useState<string | null>(null);
```

#### New loadMore Function:
```javascript
const loadMoreProperties = async () => {
  if (!hasMore || isLoadingMore) return;
  
  setIsLoadingMore(true);
  try {
    const params = getInitialParams();
    const nextPage = page + 1;
    
    const { data, error } = await supabase.functions.invoke("search-properties", {
      body: {
        ...params,
        page: nextPage,
        queryId: currentQueryId,
        lang: validCurrentLanguage,
      },
    });
    
    if (error) throw error;
    
    // APPEND to existing properties
    setProperties(prev => [...prev, ...(data.properties || [])]);
    setPage(nextPage);
    setHasMore(properties.length + data.properties.length < total);
  } catch (error) {
    console.error("Error loading more properties:", error);
  } finally {
    setIsLoadingMore(false);
  }
};
```

#### Update searchProperties to Set hasMore:
```javascript
const searchProperties = async (params: PropertySearchParams, pageNum: number = 1) => {
  // ... existing code ...
  
  // After setting properties:
  setHasMore(data.properties.length < data.total);
  setCurrentQueryId(data.queryId || null);
};
```

---

### 3. Replace Pagination UI with "Load More" Button

**File**: `src/pages/PropertyFinder.tsx`

Replace the pagination section (lines 397-460) with:

```jsx
{/* Load More Button */}
{hasMore && !isLoading && (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="flex flex-col items-center gap-4 mt-12"
  >
    <p className="text-sm text-muted-foreground">
      {t.results.showing} {properties.length} {t.results.of} {total.toLocaleString()} {t.results.properties}
    </p>
    <Button
      onClick={loadMoreProperties}
      disabled={isLoadingMore}
      className="rounded-xl px-8 py-3 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
    >
      {isLoadingMore ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Loading...
        </span>
      ) : (
        `Load More Properties (${total - properties.length} remaining)`
      )}
    </Button>
  </motion.div>
)}

{/* All Loaded State */}
{!hasMore && properties.length > 0 && (
  <div className="text-center mt-12">
    <p className="text-sm text-muted-foreground">
      ✓ Showing all {properties.length.toLocaleString()} {t.results.properties}
    </p>
  </div>
)}
```

---

### 4. Add Translation Keys for Load More

**File**: `src/i18n/translations/propertyFinder/en.ts` (and all language files)

Add to `pagination` section:
```javascript
pagination: {
  previous: "Previous",
  next: "Next",
  page: "Page",
  loadMore: "Load More Properties",
  remaining: "remaining",
  showingAll: "Showing all"
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `search-properties/index.ts` | Return queryId for pagination continuity |
| `PropertyFinder.tsx` | Add Load More logic, replace page navigation |
| `src/i18n/translations/propertyFinder/*.ts` | Add loadMore translation keys |

---

## Expected Behavior After Changes

1. **Initial load** shows first batch of properties (up to 500)
2. **"Load More" button** appears if total > loaded count
3. Clicking "Load More" **appends** more properties to the list
4. **Progress indicator** shows "Showing X of Y properties"
5. When all loaded, shows "Showing all 421 properties"
6. Users can now access all 421 available properties
