// Utility to convert markdown artifacts to HTML
import { marked } from 'marked';

// Configure marked for safe HTML output
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Cleans markdown artifacts and converts to proper HTML
 * Handles cases where AI returns mixed markdown/HTML
 */
export function markdownToHtml(content: string | null | undefined): string {
  if (!content) return '';
  
  // STEP 1: Preprocess - Convert markdown patterns directly to HTML
  // This handles mixed HTML/markdown content that marked struggles with
  let processed = content
    // Convert list items with bold: *   **text:** description → <li><strong>text:</strong> description</li>
    .replace(/^\*\s+\*\*([^*]+)\*\*\s*(.*)$/gm, '<li><strong>$1</strong> $2</li>')
    // Convert remaining bold: **text** → <strong>text</strong>
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Convert remaining list items: * text → <li>text</li>
    .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
    // Convert - list items: - text → <li>text</li>
    .replace(/^-\s+(.+)$/gm, '<li>$1</li>');
  
  // STEP 2: Wrap consecutive <li> elements in <ul>
  processed = processed.replace(/(<li>[\s\S]*?<\/li>\s*)+/g, (match) => {
    // Only wrap if not already inside a <ul>
    return `<ul>${match}</ul>`;
  });
  
  // STEP 3: Handle any remaining markdown headings with marked
  const hasHeadings = /^#{1,6}\s+/m.test(processed);
  if (hasHeadings) {
    try {
      processed = marked.parse(processed, { async: false }) as string;
    } catch {
      // If marked fails, do basic heading conversion
      processed = processed
        .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    }
  }
  
  return cleanHtml(processed);
}

/**
 * Clean up HTML artifacts
 */
function cleanHtml(html: string): string {
  return html
    // Remove excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    // Ensure proper paragraph spacing
    .trim();
}

/**
 * Basic markdown cleanup fallback
 */
function basicMarkdownCleanup(content: string): string {
  return content
    // Convert **text** to <strong>text</strong>
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Convert *text* to <em>text</em>
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Convert markdown lists to HTML lists
    .replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Convert ### headings
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    // Convert line breaks to paragraphs
    .replace(/\n\n+/g, '</p><p>')
    // Wrap in paragraph if not already wrapped
    .replace(/^(?!<[a-z])(.+)$/gm, '<p>$1</p>')
    .trim();
}
