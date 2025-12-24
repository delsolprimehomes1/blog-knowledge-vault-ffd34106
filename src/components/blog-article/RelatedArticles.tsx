import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { OptimizedImage } from "@/components/OptimizedImage";
import { prefetchArticle, prefetchImage } from "@/lib/prefetch";

interface Article {
  id: string;
  slug: string;
  headline: string;
  category: string;
  language: string;
  featured_image_url: string;
}

interface RelatedArticlesProps {
  articles: Article[];
}

export const RelatedArticles = ({ articles }: RelatedArticlesProps) => {
  if (articles.length === 0) return null;

  const handleArticleHover = (article: Article) => {
    prefetchArticle(article.slug);
    prefetchImage(article.featured_image_url);
  };

  return (
    <section className="my-12">
      <h2 className="text-2xl font-bold mb-6">People Also Read</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {articles.map((article) => (
          <Link
            key={article.id}
            to={`/${article.language}/blog/${article.slug}`}
            className="flex-shrink-0 w-80 snap-start"
            onMouseEnter={() => handleArticleHover(article)}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <OptimizedImage
                  src={article.featured_image_url}
                  alt={article.headline}
                  width={320}
                  height={192}
                  className="w-full h-48 object-cover rounded-md mb-3"
                />
                <Badge variant="secondary" className="mb-2">
                  {article.category}
                </Badge>
                <h3 className="font-semibold text-lg line-clamp-2">
                  {article.headline}
                </h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};
