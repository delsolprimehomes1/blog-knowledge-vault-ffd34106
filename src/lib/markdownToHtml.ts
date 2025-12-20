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
  
  // Check for any markdown artifacts using regex patterns (handles variable spacing)
  const hasMarkdownPatterns = 
    /^[\*\-]\s+/m.test(content) ||      // List items: * or - with any spacing
    /\*\*[^*]+\*\*/.test(content) ||    // Bold: **text**
    /^#{1,6}\s+/m.test(content);         // Headings: # ## ###
  
  // If content has markdown patterns, always parse with marked
  if (hasMarkdownPatterns) {
    try {
      const html = marked.parse(content, { async: false }) as string;
      return cleanHtml(html);
    } catch {
      return basicMarkdownCleanup(content);
    }
  }
  
  // If content looks like pure HTML (no markdown), return cleaned
  if (content.trim().startsWith('<')) {
    return cleanHtml(content);
  }
  
  // Default: try to parse as markdown
  try {
    const html = marked.parse(content, { async: false }) as string;
    return cleanHtml(html);
  } catch {
    return basicMarkdownCleanup(content);
  }
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
