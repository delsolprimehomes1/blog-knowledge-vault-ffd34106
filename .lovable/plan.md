
## Move Villas Under Apartments in Admin Sidebar

### Change
In `src/components/AdminLayout.tsx`, add the Villas admin links (Page Content and Properties) as additional items inside the existing "Apartments" nav group, rather than creating a separate "Villas" section.

### Updated "Apartments" group

The nav group will become:

```
{
  label: "Apartments",
  items: [
    { name: "Page Content", href: "/admin/apartments-content", icon: FileText },
    { name: "Properties", href: "/admin/apartments-properties", icon: Building2 },
    { name: "Editors", href: "/admin/apartments-editors", icon: Users },
    { name: "Villas Content", href: "/admin/villas-content", icon: FileText },
    { name: "Villas Properties", href: "/admin/villas-properties", icon: Building2 },
  ],
}
```

### File changed
- `src/components/AdminLayout.tsx` -- add two Villas items into the existing Apartments group (lines 67-73)

No other files affected.
