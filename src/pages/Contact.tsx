import React from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { ContactHero } from '@/components/contact/ContactHero';
import { ContactOptions } from '@/components/contact/ContactOptions';
import { ContactForm } from '@/components/contact/ContactForm';
import { OfficeInfo } from '@/components/contact/OfficeInfo';
import { ContactFAQ } from '@/components/contact/ContactFAQ';
import { EmmaCallout } from '@/components/contact/EmmaCallout';
import { MobileStickyContact } from '@/components/contact/MobileStickyContact';
import { useTranslation } from '@/i18n';
import BlogEmmaChat from '@/components/blog-article/BlogEmmaChat';
import { COMPANY_ADDRESS, COMPANY_CONTACT, COMPANY_FACTS } from '@/constants/company';

const Contact: React.FC = () => {
  const { lang } = useParams<{ lang: string }>();
  const { t } = useTranslation();
  const language = lang || 'en';

  // Type-safe access to contact translations
  const contactT = (t as any).contact || getDefaultContactTranslations();

  // LocalBusiness JSON-LD schema
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'Del Sol Prime Homes',
    description: contactT.meta?.description || 'Expert real estate services on the Costa del Sol',
    url: `https://delsolprimehomes.com/${language}/contact`,
    telephone: COMPANY_CONTACT.phone,
    email: COMPANY_CONTACT.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${COMPANY_ADDRESS.building}, ${COMPANY_ADDRESS.street}, ${COMPANY_ADDRESS.floor}`,
      addressLocality: COMPANY_ADDRESS.city,
      addressRegion: COMPANY_ADDRESS.province,
      postalCode: COMPANY_ADDRESS.postalCode,
      addressCountry: 'ES'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 36.5432,
      longitude: -4.6234
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00'
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '10:00',
        closes: '14:00'
      }
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: COMPANY_FACTS.happyClients
    },
    areaServed: {
      '@type': 'Place',
      name: 'Costa del Sol, Spain'
    }
  };

  return (
    <>
      <Helmet>
        <title>{contactT.meta?.title || 'Contact Del Sol Prime Homes | Costa del Sol Real Estate'}</title>
        <meta name="description" content={contactT.meta?.description || 'Get in touch with our expert real estate team.'} />
        <link rel="canonical" href={`https://delsolprimehomes.com/${language}/contact`} />
        <meta property="og:title" content={contactT.meta?.title} />
        <meta property="og:description" content={contactT.meta?.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://delsolprimehomes.com/${language}/contact`} />
        <script type="application/ld+json">
          {JSON.stringify(localBusinessSchema)}
        </script>
      </Helmet>

      <Header />
      
      <main className="min-h-screen">
        <ContactHero t={contactT} />
        <ContactOptions t={contactT} />
        <ContactForm t={contactT} language={language} />
        <OfficeInfo t={contactT} />
        <ContactFAQ t={contactT} />
        <EmmaCallout t={contactT} />
      </main>

      <Footer />

      <BlogEmmaChat language={language} />

      {/* Mobile sticky WhatsApp bar */}
      <MobileStickyContact 
        whatsappMessage={contactT.options?.whatsapp?.prefill || "Hi, I'm interested in Costa del Sol properties. Can you help me?"}
        whatsappLabel={contactT.options?.whatsapp?.cta || "Open WhatsApp"}
      />

      {/* Add bottom padding on mobile for sticky bar */}
      <div className="lg:hidden h-24" />
    </>
  );
};

// Default translations fallback
function getDefaultContactTranslations() {
  return {
    meta: {
      title: "Contact Del Sol Prime Homes | Costa del Sol Real Estate",
      description: "Get in touch with our expert real estate team. WhatsApp, email, or call us for personalized property guidance on the Costa del Sol."
    },
    hero: {
      headline: "Get in Touch",
      subheadline: "We're here to help you find your perfect Costa del Sol property"
    },
    options: {
      whatsapp: {
        title: "Chat on WhatsApp",
        description: "Get instant responses from our team",
        cta: "Open WhatsApp",
        prefill: "Hi, I'm interested in Costa del Sol properties. Can you help me?"
      },
      email: {
        title: "Send Us an Email",
        description: "We'll respond within 24 hours",
        cta: "Send Email"
      },
      phone: {
        title: "Call Our Office",
        description: "Speak directly with an advisor",
        cta: "Call Now"
      }
    },
    form: {
      headline: "Send Us a Message",
      subheadline: "Fill out the form and we'll get back to you shortly",
      fields: {
        fullName: "Full Name",
        email: "Email Address",
        phone: "Phone Number (Optional)",
        language: "Preferred Language",
        subject: "Subject",
        message: "Your Message",
        referral: "How did you hear about us? (Optional)",
        privacy: "I agree to the Privacy Policy and consent to processing of my data."
      },
      subjects: {
        general: "General Inquiry",
        property: "Property Inquiry",
        selling: "Selling My Property",
        viewing: "Schedule a Viewing",
        other: "Other"
      },
      referrals: {
        google: "Google Search",
        socialMedia: "Social Media",
        referral: "Friend/Family Referral",
        advertisement: "Online Advertisement",
        other: "Other"
      },
      submit: "Send Message",
      submitting: "Sending...",
      success: {
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll respond within 24 hours."
      }
    },
    office: {
      headline: "Visit Our Office",
      hours: {
        title: "Office Hours",
        weekdays: "Monday - Friday",
        saturday: "Saturday",
        sunday: "Sunday",
        closed: "Closed",
        timezone: "Central European Time (CET)"
      },
      directions: "Get Directions"
    },
    faq: {
      headline: "Frequently Asked Questions",
      items: [
        {
          question: "How quickly will you respond?",
          answer: "We aim to respond to all inquiries within 24 hours during business days. WhatsApp messages typically receive faster responses."
        },
        {
          question: "Do you speak my language?",
          answer: "Yes! Our team speaks 10+ languages including English, Dutch, German, French, Swedish, Norwegian, Danish, Finnish, Polish, and Hungarian."
        },
        {
          question: "Can I schedule a video call?",
          answer: "Absolutely! Contact us via WhatsApp or email to arrange a convenient time for a video consultation with one of our property experts."
        },
        {
          question: "What areas do you cover?",
          answer: "We specialize in the entire Costa del Sol region, from Málaga to Sotogrande, including Marbella, Estepona, Fuengirola, Benalmádena, and Mijas."
        }
      ]
    },
    emma: {
      callout: "Prefer instant answers?",
      cta: "Chat with Emma, our AI assistant"
    }
  };
}

export default Contact;
