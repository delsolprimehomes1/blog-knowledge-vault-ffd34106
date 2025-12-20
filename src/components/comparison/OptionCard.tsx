import { CollapsibleDetails } from "./CollapsibleDetails";

interface OptionCardProps {
  title: string;
  content: string;
  variant: 'primary' | 'secondary';
}

export function OptionCard({ title, content, variant }: OptionCardProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <div className={`rounded-2xl p-6 border-2 transition-all hover:shadow-lg ${
      isPrimary 
        ? 'bg-primary/5 border-primary/20 hover:border-primary/40' 
        : 'bg-secondary/5 border-secondary/20 hover:border-secondary/40'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${isPrimary ? 'bg-primary' : 'bg-secondary'}`} />
        <h2 className={`text-xl font-bold ${isPrimary ? 'text-primary' : 'text-secondary-foreground'}`}>
          {title}: Overview
        </h2>
      </div>
      
      {/* Divider */}
      <div className={`h-1 w-16 rounded-full mb-4 ${isPrimary ? 'bg-primary/50' : 'bg-secondary/50'}`} />
      
      {/* Content with collapsible sections */}
      <CollapsibleDetails content={content} variant={variant} />
    </div>
  );
}
