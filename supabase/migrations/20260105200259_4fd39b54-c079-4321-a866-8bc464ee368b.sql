
-- Update the about_page_content with accurate founder information and timeline
UPDATE public.about_page_content
SET 
  founders = '[
    {
      "name": "Steven Roberts",
      "role": "Co-Founder & Director",
      "bio": "Steven arrived in Spain in 1997 and began his real estate career in 2010. In 2016, he founded Sentinel Estates, which evolved into Del Sol Prime Homes. A Scottish native, Steven brings decades of experience in the Costa del Sol market.",
      "photo": "/team/steven-roberts.jpg",
      "linkedin": "https://linkedin.com/in/stevenroberts",
      "credentials": ["API Licensed Agent (2025)", "Sentinel Estates Founder"],
      "languages": ["English", "Spanish"],
      "years_experience": 15,
      "specialization": "British buyers and market expertise",
      "nationality": "Scottish"
    },
    {
      "name": "Cédric Van Hecke",
      "role": "Co-Founder & Sales Director",
      "bio": "Cédric relocated from Belgium to the Costa del Sol in 1998. Together with Steven Roberts, he co-founded the agency and brings extensive knowledge of the local market. His multilingual capabilities make him invaluable for European buyers.",
      "photo": "/team/cedric-van-hecke.jpg",
      "linkedin": "https://linkedin.com/in/cedricvanhecke",
      "credentials": ["API Licensed Agent (2025)", "Certified Negotiation Expert"],
      "languages": ["Dutch", "French", "English", "Spanish"],
      "years_experience": 26,
      "specialization": "New developments and European buyers",
      "nationality": "Belgian"
    },
    {
      "name": "Hans Beeckman",
      "role": "Property Expert & Technology Lead",
      "bio": "Hans arrived at the Costa del Sol in 2020 and joined as a Property Expert. In 2024, Hans began an intensive course in Artificial Intelligence, bringing cutting-edge technology solutions to enhance the property search experience.",
      "photo": "/team/hans-beeckman.jpg",
      "linkedin": "https://linkedin.com/in/hansbeeckman",
      "credentials": ["API Licensed Agent (2025)", "AI Technology Specialist (2024)"],
      "languages": ["Dutch", "French", "English", "Spanish"],
      "years_experience": 5,
      "specialization": "Technology and AI-enhanced property matching",
      "nationality": "Belgian"
    }
  ]'::jsonb,
  our_story_content = '## A Journey of Passion and Expertise

What began as individual paths to Spain has become a unified mission to help others find their perfect Mediterranean home.

Steven Roberts first arrived in Spain in 1997, captivated by the lifestyle and opportunities. He began his real estate career in 2010 and founded **Sentinel Estates in 2016**, laying the foundation for what would become Del Sol Prime Homes.

Cédric Van Hecke made the Costa del Sol his home in 1998, bringing Belgian precision and multilingual expertise to the Spanish property market. Together with Steven, they built a reputation for honest, client-focused service.

Hans Beeckman joined the team in 2020, bringing fresh perspectives and a passion for technology. His 2024 training in **Artificial Intelligence** has helped modernize our approach to property matching.

In **2025**, the team achieved a significant milestone by obtaining their **API (Agente de la Propiedad Inmobiliaria) License**, the official Spanish real estate qualification recognized by the Colegio Oficial.',
  years_in_business = 9,
  faq_entities = '[
    {
      "question": "Who founded Del Sol Prime Homes?",
      "answer": "Del Sol Prime Homes was founded by Steven Roberts and Cédric Van Hecke. Steven arrived in Spain in 1997 and founded Sentinel Estates in 2016, which evolved into Del Sol Prime Homes. Cédric joined from Belgium, having relocated to Costa del Sol in 1998. Hans Beeckman joined the team in 2020 as Property Expert and Technology Lead."
    },
    {
      "question": "Are your agents licensed?",
      "answer": "Yes, all our agents hold the API (Agente de la Propiedad Inmobiliaria) license, obtained in 2025. This is the official Spanish real estate qualification recognized by the Colegio Oficial de Agentes de la Propiedad Inmobiliaria."
    },
    {
      "question": "What languages do you speak?",
      "answer": "Our multilingual team speaks English, Spanish, Dutch, and French, allowing us to serve clients from across Europe and beyond."
    },
    {
      "question": "How long have you been in the Costa del Sol?",
      "answer": "Our founders have deep roots in the Costa del Sol. Steven Roberts arrived in 1997, Cédric Van Hecke in 1998, and Hans Beeckman in 2020. Combined, our team has over 45 years of experience in the region."
    }
  ]'::jsonb,
  updated_at = NOW()
WHERE id IS NOT NULL;
