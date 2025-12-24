import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { OptimizedImage } from "@/components/OptimizedImage";
import { prefetchArticle, prefetchImage } from "@/lib/prefetch";
import { ArrowRight } from "lucide-react";

interface ArticleCardProps {
  article: {
    id: string;
    slug: string;
    headline: string;
    category: string;
    language: string;
    featured_image_url: string;
    date_published: string;
    read_time: number;
    meta_description: string;
  };
  author: {
    name: string;
    photo_url: string;
  } | null;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
  nl: "🇳🇱",
  fr: "🇫🇷",
  pl: "🇵🇱",
  sv: "🇸🇪",
  da: "🇩🇰",
  hu: "🇭🇺",
};

export const ArticleCard = ({ article, author }: ArticleCardProps) => {
  const imageUrl = article.featured_image_url || 
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=338&fit=crop';

  const handleMouseEnter = () => {
    // Prefetch article and featured image on hover
    prefetchArticle(article.slug);
    if (article.featured_image_url) {
      prefetchImage(article.featured_image_url);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=338&fit=crop';
  };

  return (
    <Card 
      className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 group bg-card rounded-2xl active:scale-[0.98]"
      onMouseEnter={handleMouseEnter}
    >
      <CardContent className="p-0">
        <Link to={`/${article.language}/blog/${article.slug}`} className="block">
          <div className="relative overflow-hidden aspect-[16/10]">
            <OptimizedImage
              src={imageUrl}
              alt={article.headline}
              width={600}
              height={375}
              className="w-full h-full object-cover group-hover:scale-105 active:scale-95 transition-transform duration-300"
              onError={handleImageError}
            />
          </div>

          <div className="p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2 text-base text-muted-foreground">
              <Calendar className="h-5 w-5" />
              <span>{new Date(article.date_published).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}</span>
            </div>

            <h3 className="font-serif text-2xl md:text-xl font-semibold tracking-tight line-clamp-2 text-foreground leading-tight">
              {article.headline}
            </h3>

            <div className="flex items-center justify-center md:justify-start gap-2 text-primary hover:gap-3 transition-all w-full md:w-auto py-3 px-4 md:py-0 md:px-0 bg-primary/5 md:bg-transparent hover:bg-primary/10 rounded-lg active:scale-95 min-h-[44px]">
              <span className="font-medium">Discover more</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
};
