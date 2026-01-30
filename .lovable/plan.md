
# Remove "2025 API License" Paragraph from About Page Content

## Location Found

The text is stored in the **database** in the `about_page_content` table, within the `our_story_content` markdown field:

```markdown
In **2025**, the team achieved a significant milestone by obtaining their 
**API (Agente de la Propiedad Inmobiliaria) License**, the official Spanish 
real estate qualification recognized by the Colegio Oficial.
```

## Solution

Update the database to remove the final paragraph from the `our_story_content` field.

**Before:**
```markdown
## A Journey of Passion and Expertise

What began as individual paths to Spain has become a unified mission...

Steven Roberts first arrived in Spain in 1997...

Cédric Van Hecke made the Costa del Sol his home in 1998...

Hans Beeckman joined the team in 2020... His 2024 training in **Artificial Intelligence** has helped modernize our approach to property matching.

In **2025**, the team achieved a significant milestone by obtaining their **API (Agente de la Propiedad Inmobiliaria) License**...
```

**After:**
```markdown
## A Journey of Passion and Expertise

What began as individual paths to Spain has become a unified mission...

Steven Roberts first arrived in Spain in 1997...

Cédric Van Hecke made the Costa del Sol his home in 1998...

Hans Beeckman joined the team in 2020... His 2024 training in **Artificial Intelligence** has helped modernize our approach to property matching.
```

---

## Database Update Required

Execute SQL to update the `our_story_content` field in `about_page_content` where `slug = 'main'`, removing the 2025 API License paragraph.

---

## Result

The About page "Our Story" section will end with Hans Beeckman's AI training mention, and no longer display any reference to the 2025 API License achievement.
