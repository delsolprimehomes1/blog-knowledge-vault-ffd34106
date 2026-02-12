

# Fix Schema.org QAPage Nesting Error

## Problem
The microdata from the previous fix has incorrect nesting. The Question (`mainEntity`) closes in the hero section (line 295), while the Answer (`acceptedAnswer`) is rendered in the content section (line 358) -- completely outside the Question scope. Google's Rich Results Test requires this hierarchy:

```text
QAPage
  └── mainEntity (Question)
        ├── name (h1)
        ├── answerCount (meta)
        └── acceptedAnswer (Answer)
              └── text (answer content)
```

Currently it looks like:

```text
QAPage
  ├── mainEntity (Question)  ← closes in hero
  │     ├── name
  │     └── answerCount
  └── acceptedAnswer (Answer) ← orphaned, outside Question
        └── text
```

## Solution

Move the `mainEntity` Question wrapper so it opens on the `<main>` tag level and closes after the answer content. This keeps the Question scope spanning both the hero (where the H1 lives) and the content area (where the answer lives).

### Changes to `src/pages/QAPage.tsx`

1. **Remove** the narrow `<div itemProp="mainEntity">` wrapper around just the H1 in the hero (lines 290-295). Keep the H1 with `itemProp="name"` and the `answerCount` meta, but remove the wrapper div.

2. **Add** `itemProp="mainEntity" itemScope itemType="https://schema.org/Question"` to an element that wraps both the hero H1 and the answer content section. The simplest approach: add a new wrapper div right after `<main>` opens, closing it after the `acceptedAnswer` div.

3. **No visual changes** -- only microdata attributes move. All CSS classes, animations, and layout remain identical.

### Resulting structure

```text
<main itemScope itemType="QAPage">
  <div itemProp="mainEntity" itemScope itemType="Question">
    <section> (hero)
      <h1 itemProp="name">...</h1>
      <meta itemProp="answerCount" content="1" />
    </section>
    <div> (content area)
      <div itemProp="acceptedAnswer" itemScope itemType="Answer">
        <article itemProp="text">...</article>
      </div>
    </div>
  </div>  ← Question closes AFTER Answer
</main>
```

This produces valid QAPage markup that will pass the Google Rich Results Test across all 10 languages.

## Files Modified
- `src/pages/QAPage.tsx` (microdata attribute repositioning only)

## Verification
After deployment, paste any Q&A URL into Google Rich Results Test to confirm zero errors.
