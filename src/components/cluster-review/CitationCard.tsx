import { ExternalCitation } from "@/types/blog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface CitationCardProps {
  citation: ExternalCitation;
  index: number;
  onRemove: () => void;
}

export const CitationCard = ({ citation, onRemove }: CitationCardProps) => {
  const isOfficial = citation.url.includes('.gov') || citation.url.includes('.gob');
  const verified = citation.verified;
  
  // Determine verification badge
  const getVerificationBadge = () => {
    if (verified === true) {
      return <Badge variant="secondary" className="text-green-600">✅ Verified</Badge>;
    }
    if (verified === false) {
      return <Badge variant="destructive">❌ Failed</Badge>;
    }
    if (isOfficial) {
      return <Badge variant="secondary">⚠️ Gov Source</Badge>;
    }
    return null;
  };
  
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold">{citation.source}</h4>
            {isOfficial && <Badge variant="secondary">🔒 Official</Badge>}
            {getVerificationBadge()}
          </div>
          <a 
            href={citation.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all block"
          >
            {citation.url}
          </a>
          <p className="text-sm text-muted-foreground">
            <strong>Anchor:</strong> "{citation.text}"
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onRemove}
          className="text-destructive hover:text-destructive shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
