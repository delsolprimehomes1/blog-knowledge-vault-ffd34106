

# Remove "Team obtains API License" Timeline Entry

## Location Found

The timeline milestone is hardcoded in `src/components/about/OurStory.tsx`:

```typescript
// Lines 24-27
const milestones = [
  { year: "2016", event: "Steven founds Sentinel Estates", icon: Lightbulb },
  { year: "2020", event: "Hans Beeckman joins the team", icon: TrendingUp },
  { year: "2025", event: "Team obtains API License", icon: TrendingUp }  // ← REMOVE THIS
];
```

## Solution

Remove line 26 from the `milestones` array in `src/components/about/OurStory.tsx`.

**Before:**
```typescript
const milestones = [
  { year: "2016", event: "Steven founds Sentinel Estates", icon: Lightbulb },
  { year: "2020", event: "Hans Beeckman joins the team", icon: TrendingUp },
  { year: "2025", event: "Team obtains API License", icon: TrendingUp }
];
```

**After:**
```typescript
const milestones = [
  { year: "2016", event: "Steven founds Sentinel Estates", icon: Lightbulb },
  { year: "2020", event: "Hans Beeckman joins the team", icon: TrendingUp }
];
```

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/about/OurStory.tsx` | Remove line 26 (2025 API License entry) |

---

## Result

The About page timeline will show only:
- **2016** - Steven founds Sentinel Estates
- **2020** - Hans Beeckman joins the team

The "2025 - Team obtains API License" entry will be removed from the visible timeline.

