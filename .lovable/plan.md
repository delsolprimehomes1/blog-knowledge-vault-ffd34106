
# Replace BrochureChatbot with Emma Chatbot on City Brochure Pages

## Summary
Replace the basic `BrochureChatbot` component (which has a simple simulated response and no CRM integration) with the full `BlogEmmaChat` component (which uses the real Emma AI chatbot with complete transcript saving, CRM lead registration, and language-based round-robin routing).

---

## Current State

**BrochureChatbot** (the current implementation):
- Basic chat UI with simulated/hardcoded responses
- No AI integration
- No CRM lead capture
- No transcript saving
- No round-robin agent notification

**BlogEmmaChat** (the solution):
- Uses the full `EmmaChat` component with AI-powered responses
- Saves complete conversation transcripts to `emma_leads` and `crm_leads` tables
- Registers leads via `register-crm-lead` edge function
- Routes leads through language-specific round-robin pools
- Notifies agents based on their language assignment
- Emma's floating avatar with pulse indicator

---

## Implementation Plan

### Step 1: Update CityBrochure.tsx

**What changes:**
1. Replace `BrochureChatbot` import with `BlogEmmaChat`
2. Remove the `chatOpen` state and `toggleChat` function (no longer needed as BlogEmmaChat manages its own state)
3. Replace `<BrochureChatbot>` component with `<BlogEmmaChat language={lang || 'en'} />`

**Before:**
```tsx
import { BrochureChatbot } from '@/components/brochures/BrochureChatbot';
// ...
const [chatOpen, setChatOpen] = useState(false);
const toggleChat = () => setChatOpen(!chatOpen);
// ...
<BrochureChatbot cityName={city.name} isOpen={chatOpen} onToggle={toggleChat} />
```

**After:**
```tsx
import BlogEmmaChat from '@/components/blog-article/BlogEmmaChat';
// ...
// Remove chatOpen state and toggleChat function
// ...
<BlogEmmaChat language={lang || 'en'} />
```

### Step 2: Update BrochureHero.tsx (Optional Enhancement)

The `onChat` prop is passed to BrochureHero but the "Speak With Expert" button currently links to WhatsApp instead of opening the chat. If you want a button to trigger Emma:

- Keep the existing WhatsApp link on the "Speak With Expert" button (current behavior)
- Emma's floating button will provide access to the AI chatbot

**No changes required** - the WhatsApp CTA is a valid contact method and Emma's floating button provides the AI chat option.

---

## Data Flow After Implementation

```text
User opens brochure page (e.g., /en/brochure/marbella)
    │
    ├── Emma floating button appears (bottom-right)
    │
    └── User clicks Emma avatar
        │
        ├── EmmaChat opens with localized greeting (based on page language)
        │
        └── User converses with Emma AI
            │
            ├── Transcript saved to emma_leads table
            │
            └── On completion/dormancy (120s timeout):
                │
                ├── Lead registered via register-crm-lead edge function
                │
                ├── Lead saved to crm_leads with full qa_pairs
                │
                └── Round-robin broadcast sent to agents for that language
                    │
                    └── Agent claims lead → Full transcript visible in CRM dashboard
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/CityBrochure.tsx` | Replace BrochureChatbot with BlogEmmaChat |

---

## Technical Notes

- `BlogEmmaChat` already listens for both `openChatbot` and `openEmmaChat` events
- Language is extracted from URL params (`lang`) and passed to Emma
- Emma's styling uses `landing-gold` class which matches the brochure page's gold theme
- The existing "Back to Top" button positioning won't conflict (bottom-24 vs Emma's bottom-6)

---

## Result

After this change:
1. City brochure pages will show Emma's avatar instead of the generic chat icon
2. Users get the full AI-powered Emma experience
3. All conversations are captured and saved to the CRM
4. Leads are routed through round-robin based on the page's language
5. Agents receive notifications and can see full Q&A history when claiming leads
