import { InternalLink } from "@/types/blog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ExternalLink, Compass } from "lucide-react";
import { RichLinkPreview } from "./RichLinkPreview";

interface InternalLinksSectionProps {
  links: InternalLink[];
}

export const InternalLinksSection = ({ links }: InternalLinksSectionProps) => {
  if (!links || links.length === 0) return null;

  // Separate internal blog links from external authority links
  const internalLinks = links.filter(link => link.type !== 'external_authority');
  const authorityLinks = links.filter(link => link.type === 'external_authority');
  
  // Check if we have enriched links (with relevance_score or purpose)
  const hasEnrichedLinks = links.some(link => link.relevance_score || link.purpose);

  // If we have enriched links, use the rich display
  if (hasEnrichedLinks) {
    return (
      <section className="my-12 space-y-8">
        <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Compass className="h-6 w-6 text-primary" />
              Continue Your Journey
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Internal Blog Links */}
            {internalLinks.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Related Articles
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {internalLinks.map((link, index) => (
                    <RichLinkPreview key={index} link={link} />
                  ))}
                </div>
              </div>
            )}
            
            {/* External Authority Links */}
            {authorityLinks.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Official Resources
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {authorityLinks.map((link, index) => (
                    <RichLinkPreview key={index} link={link} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  // Fallback to simple display for non-enriched links
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Related Reading
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {links.map((link, index) => (
            <li key={index}>
              <a
                href={link.url}
                title={link.title}
                className="text-primary hover:underline font-medium flex items-start gap-2 transition-colors"
              >
                <span className="text-muted-foreground mt-1">→</span>
                <span>{link.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};