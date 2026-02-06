
# Update CRM Lead Cards to Display Country Information

## Overview

Add country information visibility across the CRM interface so agents can immediately see which country each lead is from (e.g., distinguish French leads from France vs. Belgium). This complements the email notification updates already deployed.

---

## Files to Modify

| File | Purpose |
|------|---------|
| `src/hooks/useAgentLeadsTable.ts` | Add country fields to AgentLead interface and query |
| `src/components/crm/MobileLeadCard.tsx` | Add country badge to mobile cards |
| `src/components/crm/LeadsTable.tsx` | Add country display in desktop table |
| `src/components/crm/detail/LeadDetailHeader.tsx` | Add country badge in lead detail header |
| `src/components/crm/detail/ContactInfoCard.tsx` | Add country/origin row in contact details |

---

## Changes Required

### 1. Update AgentLead Interface (useAgentLeadsTable.ts)

Add country fields to the interface (lines 6-33):

```typescript
export interface AgentLead {
  // ... existing fields ...
  country_name: string | null;      // NEW
  country_code: string | null;      // NEW
  country_flag: string | null;      // NEW
  country_prefix: string | null;    // NEW
}
```

Update the Supabase query to include these fields in the select statement.

---

### 2. Update MobileLeadCard.tsx

**Add to interface (lines 90-113):**
```typescript
lead: {
  // ... existing fields ...
  country_name?: string | null;
  country_code?: string | null;
  country_flag?: string | null;
  country_prefix?: string | null;
}
```

**Add country badge in the info section (around line 225-226):**
Replace the current language display:
```typescript
// Before
<span>{languageFlag} {(lead.language || "en").toUpperCase()}</span>

// After - Show country + language badges
<span className="flex items-center gap-1">
  {lead.country_flag && lead.country_name && (
    <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
      {lead.country_flag} {lead.country_name}
    </span>
  )}
  <span>{languageFlag} {(lead.language || "en").toUpperCase()}</span>
</span>
```

---

### 3. Update LeadsTable.tsx

**Modify the Language column (lines 343-353):**
```typescript
{/* Language */}
{visibleColumns.language && (
  <TableCell onClick={() => navigate(`/crm/agent/leads/${lead.id}`)}>
    <div className="flex flex-col gap-0.5">
      {/* Country badge - if available */}
      {lead.country_flag && lead.country_name && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{lead.country_flag}</span>
          <span>{lead.country_name}</span>
        </div>
      )}
      {/* Language */}
      <div className="flex items-center gap-1">
        <span>{getLanguageFlag(lead.language)}</span>
        <span className="text-xs font-medium">
          {lead.language.toUpperCase()}
        </span>
      </div>
    </div>
  </TableCell>
)}
```

Also add country fields to `AgentLead` type import if needed.

---

### 4. Update LeadDetailHeader.tsx

**Add country badge next to language (around line 134-137):**
```typescript
<h1 className="text-xl font-bold flex items-center gap-2">
  {lead.first_name} {lead.last_name}
  {/* Country badge */}
  {lead.country_flag && lead.country_name && (
    <Badge variant="secondary" className="text-sm font-normal">
      {lead.country_flag} {lead.country_name}
    </Badge>
  )}
  {/* Language badge */}
  <Badge variant="outline" className="text-sm font-normal">
    {getLanguageFlag(lead.language)} {lead.language.toUpperCase()}
  </Badge>
</h1>
```

---

### 5. Update ContactInfoCard.tsx

**Add Country/Origin section after Language (around line 178):**
```typescript
{/* Country/Origin */}
<div>
  <dt className="text-xs text-muted-foreground mb-1">Country/Origin</dt>
  <dd className="flex items-center gap-2 text-sm font-medium">
    {lead.country_name && lead.country_name !== 'Unknown' ? (
      <>
        <span className="text-lg">{lead.country_flag || '🌍'}</span>
        {lead.country_name}
        {lead.country_prefix && (
          <span className="text-muted-foreground">({lead.country_prefix})</span>
        )}
      </>
    ) : (
      <span className="text-muted-foreground">Not specified</span>
    )}
  </dd>
</div>
```

---

## Visual Preview

### Mobile Card
```text
┌────────────────────────────────────┐
│ ☑ John Smith                [📞][💬]│
│   [🇧🇪 Belgium] 🇫🇷 FR • Villa        │
│   🏠 THE KOS - Fuengirola           │
└────────────────────────────────────┘
```

### Desktop Table (Language Column)
```text
| Language    |
|-------------|
| 🇧🇪 Belgium  |
| 🇫🇷 FR       |
```

### Lead Detail Header
```text
John Smith [🇧🇪 Belgium] [🇫🇷 FR]
Created 2 hours ago
```

---

## Data Flow

The country data is now stored in `crm_leads` table and flows from:
1. `emma-chat` extracts from phone prefix
2. `EmmaChat.tsx` passes to `send-emma-lead`  
3. `send-emma-lead` passes to `register-crm-lead`
4. `register-crm-lead` saves to database
5. CRM UI components read from database and display

---

## Technical Notes

- Country fields are nullable since existing leads won't have this data
- Fallback displays "Not specified" for missing country data
- Uses existing `Badge` component from shadcn for consistent styling
- No database changes needed - fields already exist in `crm_leads`
