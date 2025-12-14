interface GooglePreviewProps {
  title: string;
  description: string;
  slug: string;
}

export const GooglePreview = ({ title, description, slug }: GooglePreviewProps) => {
  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-1">
      <div className="text-xs text-muted-foreground">
        https://www.delsolprimehomes.com › blog › {slug || 'your-slug'}
      </div>
      <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
        {title || "Your Meta Title Here"}
      </div>
      <div className="text-sm text-muted-foreground line-clamp-2">
        {description || "Your meta description will appear here..."}
      </div>
    </div>
  );
};
