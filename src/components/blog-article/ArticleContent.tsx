import { useEffect, useRef } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { MermaidPreview } from "@/components/MermaidPreview";
import { ExternalCitation } from "@/types/blog";
import { injectExternalLinks, addCitationMarkers, processInternalLinks } from "@/lib/linkInjection";
import { PricingTable, PricingItem, PriceExample } from "@/components/blog-article/PricingTable";

export interface PricingData {
  title: string;
  items: PricingItem[];
  totalLabel?: string;
  totalAmount?: string;
  priceExamples?: PriceExample[];
}

interface ArticleContentProps {
  content: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  featuredImageCaption?: string;
  diagramUrl?: string;
  diagramDescription?: string;
  externalCitations?: ExternalCitation[];
  midArticleCTA?: React.ReactNode;
  pricingData?: PricingData;
  language?: string;
}

// Helper function to split content at midpoint for CTA insertion
const splitContentAtMidpoint = (htmlContent: string): { firstHalf: string; secondHalf: string } => {
  // Find all block-level elements (p, h2, h3, h4, ul, ol, blockquote, div, table, figure)
  const blockElementPattern = /<(p|h2|h3|h4|ul|ol|blockquote|div|table|figure|section|article)[\s>][^]*?<\/\1>/gi;
  const matches = Array.from(htmlContent.matchAll(blockElementPattern));
  
  if (matches.length === 0) {
    // No block elements found, split at half character count
    const midPoint = Math.floor(htmlContent.length / 2);
    return {
      firstHalf: htmlContent.slice(0, midPoint),
      secondHalf: htmlContent.slice(midPoint)
    };
  }
  
  // Calculate target split point (55% of content)
  const targetIndex = Math.floor(matches.length * 0.55);
  const targetMatch = matches[targetIndex];
  
  if (!targetMatch) {
    // Fallback to middle match
    const middleIndex = Math.floor(matches.length / 2);
    const middleMatch = matches[middleIndex];
    const splitPoint = middleMatch ? middleMatch.index! + middleMatch[0].length : Math.floor(htmlContent.length / 2);
    return {
      firstHalf: htmlContent.slice(0, splitPoint),
      secondHalf: htmlContent.slice(splitPoint)
    };
  }
  
  // Split after the target block element
  const splitPoint = targetMatch.index! + targetMatch[0].length;
  
  return {
    firstHalf: htmlContent.slice(0, splitPoint),
    secondHalf: htmlContent.slice(splitPoint)
  };
};

export const ArticleContent = ({
  content,
  featuredImageUrl,
  featuredImageAlt,
  featuredImageCaption,
  diagramUrl,
  diagramDescription,
  externalCitations = [],
  midArticleCTA,
  pricingData,
  language = 'en',
}: ArticleContentProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Sanitize content to remove HTML document wrapper and code fence markers
  const sanitizeContent = (htmlContent: string): string => {
    let content = htmlContent;
    
    // Remove code fence markers at start and end of content
    // Handle triple backticks with optional language identifier
    content = content.replace(/^```[a-z]*\n?/i, '');
    content = content.replace(/\n?```$/i, '');
    
    // Handle triple quotes with optional language identifier
    content = content.replace(/^"""[a-z]*\n?/i, '');
    content = content.replace(/\n?"""$/i, '');
    
    // Check if content contains full HTML document structure
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      // Extract only the body content
      const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        return bodyMatch[1].trim();
      }
      
      // Fallback: remove document structure tags
      return content
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\/?html[^>]*>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '')
        .replace(/<\/?body[^>]*>/gi, '')
        .trim();
    }
    
    return content.trim();
  };

  // Process content: sanitize -> bold markers -> internal links -> external links -> citation markers
  const processContent = (htmlContent: string) => {
    try {
      let processed = sanitizeContent(htmlContent);
      
      // SAFETY: Remove any [CITATION_NEEDED] markers that shouldn't be visible
      processed = processed.replace(/\[CITATION_NEEDED:[^\]]*\]/g, '');
      processed = processed.replace(/\[CITATION_NEEDED\]/g, '');
      
      processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      processed = processInternalLinks(processed);
      processed = injectExternalLinks(processed, externalCitations);
      processed = addCitationMarkers(processed, externalCitations);
      return processed;
    } catch (error) {
      console.error('Error processing article content:', error);
      // Return sanitized content without link processing as fallback
      return sanitizeContent(htmlContent);
    }
  };
  
  const processedContent = processContent(content);
  
  // Split content if midArticleCTA is provided
  const { firstHalf, secondHalf } = midArticleCTA 
    ? splitContentAtMidpoint(processedContent) 
    : { firstHalf: processedContent, secondHalf: '' };

  useEffect(() => {
    if (!contentRef.current) return;

    // Add IDs to H2 headings for TOC
    const headings = contentRef.current.querySelectorAll("h2");
    headings.forEach((heading, index) => {
      heading.id = `heading-${index}`;
    });

    // Style internal links
    const internalLinks = contentRef.current.querySelectorAll('a[href^="/"], a[href^="#"]');
    internalLinks.forEach((link) => {
      link.classList.add("internal-link");
    });

    // Style external links and add icon
    const externalLinks = contentRef.current.querySelectorAll('a[href^="http"]');
    externalLinks.forEach((link) => {
      link.classList.add("external-link");
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
      
      const icon = document.createElement("span");
      icon.innerHTML = '<svg class="inline-block ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>';
      link.appendChild(icon.firstChild as Node);
    });
  }, [content]);

  return (
    <article ref={contentRef} className="space-y-12 md:space-y-16">
      {/* Featured Image Hero - Full prominence before content */}
      {featuredImageUrl && (
        <figure className="my-0 -mx-5 sm:mx-0">
          <OptimizedImage
            src={featuredImageUrl}
            alt={featuredImageAlt}
            width={1200}
            height={675}
            priority
            className="w-full aspect-[16/9] object-cover rounded-none sm:rounded-3xl shadow-2xl"
          />
          {featuredImageCaption && (
            <figcaption className="text-center text-sm italic text-muted-foreground pt-2 pb-4">
              {featuredImageCaption}
            </figcaption>
          )}
        </figure>
      )}

      {/* Pricing Table - rendered after featured image for cost-related articles */}
      {pricingData && (
        <PricingTable
          title={pricingData.title}
          items={pricingData.items}
          totalLabel={pricingData.totalLabel}
          totalAmount={pricingData.totalAmount}
          priceExamples={pricingData.priceExamples}
          language={language}
        />
      )}

      {midArticleCTA ? (
        <>
          <div
            ref={contentRef}
            className="article-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: firstHalf }}
          />
          
          {midArticleCTA}
          
          <div
            className="article-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: secondHalf }}
          />
        </>
      ) : (
        <div
          ref={contentRef}
          className="article-content prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      )}

      {diagramUrl && (
        <figure className="my-12 md:my-16">
          {/* Check if diagramUrl contains Mermaid code (not an actual URL) */}
          {(diagramUrl.startsWith('graph') || 
            diagramUrl.startsWith('flowchart') || 
            diagramUrl.startsWith('sequenceDiagram') ||
            diagramUrl.startsWith('gantt') ||
            diagramUrl.startsWith('pie') ||
            diagramUrl.includes('-->')) ? (
            <MermaidPreview code={diagramUrl} className="w-full rounded-2xl shadow-xl" />
          ) : (
            <OptimizedImage
              src={diagramUrl}
              alt={diagramDescription || "Diagram"}
              width={1200}
              height={800}
              className="w-full rounded-2xl border object-contain shadow-xl"
            />
          )}
          {diagramDescription && (
            <figcaption className="text-center text-sm md:text-base text-muted-foreground mt-4">
              {diagramDescription}
            </figcaption>
          )}
        </figure>
      )}
    </article>
  );
};
