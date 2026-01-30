
# Add Automatic Cleanup of Old Images During Regeneration

## Problem
When regenerating article images, the old image file remains in storage as an orphan. Over time, this leads to:
- Storage bloat with unreferenced files
- Unnecessary storage costs
- Difficulty tracking which files are actually in use

## Solution
Modify the `regenerate-article-image` edge function to:
1. Capture the existing image URL before regeneration
2. After successfully updating the article with the new image, delete the old file from storage

---

## Changes to `regenerate-article-image/index.ts`

### 1. Add Helper Function to Delete Old Image

Create a new function `deleteOldImage` that extracts the filename from the old URL and removes it from storage:

```typescript
/**
 * Delete old image from Supabase Storage
 */
async function deleteOldImage(
  oldImageUrl: string | null,
  supabase: any,
  bucket: string = 'article-images'
): Promise<void> {
  try {
    if (!oldImageUrl) {
      console.log('📭 No old image to delete');
      return;
    }

    // Only delete if it's a Supabase storage URL (not external)
    if (!oldImageUrl.includes('supabase') || !oldImageUrl.includes('/storage/')) {
      console.log('⏭️ Old image is external, skipping deletion');
      return;
    }

    // Extract filename from URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{filename}
    const urlParts = oldImageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];

    if (!filename) {
      console.log('⚠️ Could not extract filename from URL');
      return;
    }

    console.log(`🗑️ Deleting old image: ${filename}`);
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filename]);

    if (error) {
      console.error('⚠️ Failed to delete old image:', error.message);
    } else {
      console.log('✅ Old image deleted successfully');
    }
  } catch (error) {
    // Don't throw - cleanup failure shouldn't break the regeneration
    console.error('⚠️ Error during old image cleanup:', error);
  }
}
```

### 2. Fetch Existing Image URL

Update the article query (line 212-216) to include `featured_image_url`:

```typescript
const { data: article, error: fetchError } = await supabase
  .from('blog_articles')
  .select('id, headline, meta_description, detailed_content, language, funnel_stage, cluster_theme, slug, cluster_id, featured_image_url')  // Added featured_image_url
  .eq('id', articleId)
  .single();
```

### 3. Store Old URL Before Update

Before generating the new image, capture the old URL:

```typescript
const oldImageUrl = article.featured_image_url;
```

### 4. Delete Old Image After Successful Update

After the article update succeeds, call the cleanup function:

```typescript
// After successful DB update
if (updateError) {
  throw new Error(`Failed to update article: ${updateError.message}`);
}

// Cleanup: Delete old image from storage (non-blocking)
await deleteOldImage(oldImageUrl, supabase, 'article-images');
```

---

## Safety Considerations

| Scenario | Behavior |
|----------|----------|
| No existing image | Skip deletion gracefully |
| External URL (not Supabase) | Skip deletion (can't delete external files) |
| Shared image (used by translations) | **Safe** - translations share the English URL reference, not the file |
| Deletion fails | Log warning but don't fail the regeneration |
| New upload fails | Old image preserved (cleanup only runs after success) |

---

## File to Modify

| File | Changes |
|------|---------|
| `supabase/functions/regenerate-article-image/index.ts` | Add `deleteOldImage` helper, fetch existing URL, call cleanup after success |

---

## Result

After this change:
- Old images are automatically deleted when regenerating
- Storage stays clean with only active images
- No manual cleanup required
- Existing functionality remains unchanged
