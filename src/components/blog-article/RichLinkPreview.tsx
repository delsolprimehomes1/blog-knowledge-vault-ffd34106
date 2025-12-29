import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, ExternalLink, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface RichLinkProps {
  link: {
    url: string;
    title: string;
    text?: string;
    question?: string;
    snippet?: string;
    funnel_stage?: string;
    purpose?: string;
    relevance_score?: number;
    type?: string;
    rel?: string;
  };
}

export function RichLinkPreview({ link }: RichLinkProps) {
  const isExternal = link.type === 'external_authority';
  
  const content = (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/30 cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {link.funnel_stage && (
            <Badge variant="secondary" className="text-xs">
              {link.funnel_stage === 'TOFU' ? 'Discovery' :
               link.funnel_stage === 'MOFU' ? 'Research' :
               'Decision'}
            </Badge>
          )}
          
          {link.purpose === 'conversion' && (
            <Badge variant="default" className="text-xs bg-primary/90">
              <TrendingUp className="w-3 h-3 mr-1" />
              Next Step
            </Badge>
          )}
          
          {link.purpose === 'funnel_progression' && (
            <Badge variant="outline" className="text-xs text-primary border-primary/50">
              <ArrowRight className="w-3 h-3 mr-1" />
              Continue
            </Badge>
          )}
          
          {isExternal && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
              <ExternalLink className="w-3 h-3 mr-1" />
              Authority
            </Badge>
          )}
          
          {link.relevance_score && link.relevance_score > 50 && (
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-400">
              <Sparkles className="w-3 h-3 mr-1" />
              {link.relevance_score}% match
            </Badge>
          )}
        </div>
        
        <h4 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {link.question || link.title || link.text}
        </h4>
      </CardHeader>
      
      <CardContent className="pt-0">
        {link.snippet && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {link.snippet}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (isExternal) {
    return (
      <a 
        href={link.url} 
        target="_blank" 
        rel={link.rel || "noopener noreferrer nofollow"}
        title={link.title}
      >
        {content}
      </a>
    );
  }

  return (
    <Link to={link.url} title={link.title}>
      {content}
    </Link>
  );
}