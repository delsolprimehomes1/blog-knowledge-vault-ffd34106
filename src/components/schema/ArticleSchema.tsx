import React from 'react';

interface ArticleSchemaProps {
    headline: string;
    description: string;
    datePublished: string; // ISO 8601 format
    dateModified: string;  // ISO 8601 format
    articleUrl: string;
    imageUrl?: string;
    imageCaption?: string;
    imageAlt?: string;
    context: 'blog' | 'qa';
}

const ArticleSchema: React.FC<ArticleSchemaProps> = ({
    headline,
    description,
    datePublished,
    dateModified,
    articleUrl,
    imageUrl,
    imageCaption,
    imageAlt,
    context
}) => {
    const articleType = context === 'qa' ? 'FAQPage' : 'Article';

    const articleSchema = {
        "@context": "https://schema.org",
        "@type": articleType,
        "headline": headline,
        "description": description,
        "datePublished": datePublished,
        "dateModified": dateModified,
        "author": {
            "@id": "https://www.delsolprimehomes.com/#hans-beeckman"
        },
        "publisher": {
            "@id": "https://www.delsolprimehomes.com/#organization"
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": articleUrl
        },
        ...(imageUrl && {
            "image": {
                "@type": "ImageObject",
                "url": imageUrl,
                ...(imageCaption && { "caption": imageCaption }),
                ...(imageAlt && { "description": imageAlt })
            }
        })
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
    );
};

export default ArticleSchema;
