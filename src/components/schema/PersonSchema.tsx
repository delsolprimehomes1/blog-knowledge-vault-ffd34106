import React from 'react';

interface PersonSchemaProps {
    context: 'blog' | 'qa';
}

const PersonSchema: React.FC<PersonSchemaProps> = ({ context }) => {
    const photoUrl = context === 'blog'
        ? 'https://www.delsolprimehomes.com/images/hans-blog.jpg'
        : 'https://www.delsolprimehomes.com/images/hans-qa.jpg';

    const personSchema = {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": "https://www.delsolprimehomes.com/#hans-beeckman",
        "name": "Hans Beeckman",
        "jobTitle": "Senior Real Estate Advisor",
        "description": "Expert in Costa del Sol luxury real estate with over 35 years of experience helping international clients find their dream properties in Southern Spain.",
        "image": photoUrl,
        "sameAs": [
            "https://www.linkedin.com/in/hansbeeckman/"
        ],
        "worksFor": {
            "@type": "Organization",
            "@id": "https://www.delsolprimehomes.com/#organization",
            "name": "Del Sol Prime Homes",
            "url": "https://www.delsolprimehomes.com"
        },
        "knowsAbout": [
            "Costa del Sol Real Estate",
            "Luxury Property Sales",
            "International Property Investment",
            "Spanish Property Law",
            "Expat Relocation Services"
        ]
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
    );
};

export default PersonSchema;
