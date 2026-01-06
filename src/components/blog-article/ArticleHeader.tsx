import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Clock, Calendar, RefreshCw, Languages } from "lucide-react";
import { BlogArticle, Author } from "@/types/blog";
import { useNavigate } from "react-router-dom";

type TranslationValue = string | { id: string; slug: string };

const getSlug = (translation: TranslationValue): string => {
  if (typeof translation === 'string') return translation;
  return translation?.slug || '';
};

interface ArticleHeaderProps {
  article: BlogArticle;
  author: Author | null;
  reviewer: Author | null;
  translations: Record<string, TranslationValue>;
}

const LANGUAGE_FLAGS: Record<string, { flag: string; name: string }> = {
  en: { flag: "🇬🇧", name: "English" },
  es: { flag: "🇪🇸", name: "Spanish" },
  de: { flag: "🇩🇪", name: "German" },
  nl: { flag: "🇳🇱", name: "Dutch" },
  fr: { flag: "🇫🇷", name: "French" },
  pl: { flag: "🇵🇱", name: "Polish" },
  sv: { flag: "🇸🇪", name: "Swedish" },
  da: { flag: "🇩🇰", name: "Danish" },
  hu: { flag: "🇭🇺", name: "Hungarian" },
};

export const ArticleHeader = ({ article, author, reviewer, translations }: ArticleHeaderProps) => {
  const navigate = useNavigate();
  const currentLang = LANGUAGE_FLAGS[article.language];

  return (
    <header className="space-y-6 md:space-y-8 mb-16 animate-fade-in-up">
      {/* Breadcrumb + Language Row */}
      <div className="flex items-center justify-between gap-4">
        {/* Breadcrumb - left side, hidden on mobile */}
        <Breadcrumb className="hidden md:block flex-1 min-w-0">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/blog">Blog</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/blog/category/${article.category.toLowerCase()}`}>
                {article.category}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">{article.headline}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Language selector - right side, always visible when translations exist */}
        {Object.keys(translations).length > 0 && (
          <div className="shrink-0 ml-auto backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 rounded-2xl px-3 py-2 shadow-lg">
            <Select value={article.language} onValueChange={(lang) => navigate(`/blog/${getSlug(translations[lang])}`)}>
              <SelectTrigger className="w-[140px] border-0 bg-transparent h-8">
                <SelectValue>
                  <span className="text-sm font-medium">{currentLang?.flag}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={article.language}>
                  {currentLang?.flag} {currentLang?.name}
                </SelectItem>
                {Object.entries(translations).map(([lang, slug]) => {
                  const langData = LANGUAGE_FLAGS[lang];
                  return (
                    <SelectItem key={lang} value={lang}>
                      {langData?.flag} {langData?.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Title - Large and flowing, full width */}
      <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        {article.headline}
      </h1>

      {/* Simplified Meta Row */}
      <div className="flex flex-wrap items-center gap-3">
        {article.date_published && (
          <Badge variant="outline" className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-white/30 shadow-md gap-2 px-4 py-2">
            <Calendar className="h-4 w-4" style={{ color: 'hsl(42 58% 50%)' }} />
            <span className="text-sm font-medium">{new Date(article.date_published).toLocaleDateString()}</span>
          </Badge>
        )}
        {article.read_time && (
          <Badge variant="outline" className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-white/30 shadow-md gap-2 px-4 py-2">
            <Clock className="h-4 w-4" style={{ color: 'hsl(42 58% 50%)' }} />
            <span className="text-sm font-medium">{article.read_time} min read</span>
          </Badge>
        )}
      </div>

      {/* Reviewer Card - Separate prominent element */}
      {reviewer && (
        <div className="backdrop-blur-md bg-primary/10 border-2 border-primary/20 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/30">
              <AvatarImage src={reviewer.photo_url} alt={reviewer.name} />
              <AvatarFallback className="text-sm bg-primary/20">{reviewer.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Reviewed by</p>
              <p className="font-semibold text-base">{reviewer.name}</p>
              <p className="text-sm text-muted-foreground">{reviewer.job_title}</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
