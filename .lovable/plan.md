
# Add Date and Time to Call History

## Overview

Add the actual date and time to the Salestrail Call History card, showing both the absolute timestamp and the relative time for better clarity.

---

## Current vs Proposed

| Current | Proposed |
|---------|----------|
| `1 minute ago` | `Feb 3, 2026 at 1:49 PM · 1 minute ago` |

---

## Implementation

### File to Modify

`src/components/crm/detail/SalestrailCallsCard.tsx`

### Changes

1. **Import `format` from date-fns** (already using `formatDistanceToNow`)

2. **Update timestamp display** (lines 96-98):
   - Show formatted date/time: `Feb 3, 2026 at 1:49 PM`
   - Keep relative time in parentheses or with separator: `· 1 minute ago`

### Code Change

```tsx
// Line 16 - Add format import
import { formatDistanceToNow, format } from "date-fns";

// Lines 96-98 - Update timestamp display
<p className="text-xs text-muted-foreground mt-1">
  {format(new Date(call.created_at), "MMM d, yyyy 'at' h:mm a")} · {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
</p>
```

---

## Result

The call history will show:

```
📞 Outbound | Missed
Feb 3, 2026 at 1:49 PM · 1 minute ago
```

This gives agents both the exact timestamp for record-keeping and the relative time for quick context.
