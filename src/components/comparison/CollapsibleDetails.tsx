import { useState } from "react";
import { ChevronDown, AlertTriangle, XCircle } from "lucide-react";
import { markdownToHtml } from "@/lib/markdownToHtml";
import { cn } from "@/lib/utils";

interface CollapsibleDetailsProps {
  content: string;
  variant?: 'primary' | 'secondary';
}

interface ExtractedSections {
  mainContent: string;
  commonMistakes: string | null;
  hiddenRisks: string | null;
}

// Extract "Common mistakes" and "Hidden risks" sections from content
function extractCollapsibleSections(html: string): ExtractedSections {
  // Patterns to match these sections (case-insensitive)
  const mistakesPattern = /<h3[^>]*>\s*Common\s+mistakes?\s*<\/h3>\s*([\s\S]*?)(?=<h3|$)/i;
  const risksPattern = /<h3[^>]*>\s*Hidden\s+risks?\s*<\/h3>\s*([\s\S]*?)(?=<h3|$)/i;

  let mainContent = html;
  let commonMistakes: string | null = null;
  let hiddenRisks: string | null = null;

  // Extract common mistakes
  const mistakesMatch = html.match(mistakesPattern);
  if (mistakesMatch) {
    commonMistakes = mistakesMatch[1].trim();
    mainContent = mainContent.replace(mistakesPattern, '');
  }

  // Extract hidden risks
  const risksMatch = html.match(risksPattern);
  if (risksMatch) {
    hiddenRisks = risksMatch[1].trim();
    mainContent = mainContent.replace(risksPattern, '');
  }

  return { mainContent, commonMistakes, hiddenRisks };
}

interface AccordionItemProps {
  title: string;
  content: string;
  icon: React.ReactNode;
  variant: 'primary' | 'secondary';
}

function AccordionItem({ title, content, icon, variant }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isPrimary = variant === 'primary';

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-all",
      isPrimary ? "border-primary/20" : "border-secondary/20"
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-3 text-left text-sm font-medium transition-colors",
          isPrimary 
            ? "bg-primary/5 hover:bg-primary/10 text-primary" 
            : "bg-secondary/5 hover:bg-secondary/10 text-secondary-foreground"
        )}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div 
          className="p-4 text-sm text-muted-foreground prose prose-sm max-w-none
            prose-ul:my-2 prose-li:my-0.5
            prose-p:my-2 prose-p:leading-relaxed
            prose-strong:text-foreground"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
}

export function CollapsibleDetails({ content, variant = 'primary' }: CollapsibleDetailsProps) {
  const htmlContent = markdownToHtml(content);
  const { mainContent, commonMistakes, hiddenRisks } = extractCollapsibleSections(htmlContent);

  const hasCollapsible = commonMistakes || hiddenRisks;

  return (
    <div>
      {/* Main content - always visible */}
      <div 
        className="prose prose-lg max-w-none text-muted-foreground 
          prose-headings:text-foreground prose-headings:font-semibold 
          prose-strong:text-foreground prose-strong:font-semibold
          prose-ul:my-4 prose-li:my-1
          prose-p:my-3 prose-p:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: mainContent }}
      />

      {/* Collapsible sections */}
      {hasCollapsible && (
        <div className="mt-4 space-y-2">
          {commonMistakes && (
            <AccordionItem
              title="Common Mistakes to Avoid"
              content={commonMistakes}
              icon={<XCircle className="h-4 w-4" />}
              variant={variant}
            />
          )}
          {hiddenRisks && (
            <AccordionItem
              title="Hidden Risks to Consider"
              content={hiddenRisks}
              icon={<AlertTriangle className="h-4 w-4" />}
              variant={variant}
            />
          )}
        </div>
      )}
    </div>
  );
}
