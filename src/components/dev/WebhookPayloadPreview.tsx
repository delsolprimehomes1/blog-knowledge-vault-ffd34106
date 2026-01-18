import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, FileJson } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function WebhookPayloadPreview() {
  const [selectedScenario, setSelectedScenario] = useState<string>('emma_completed_homepage_en');
  
  // Sample payloads for each scenario
  const payloads: Record<string, Record<string, unknown>> = {
    // EMMA SCENARIOS
    emma_completed_homepage_en: {
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      phone: "+447700900000",
      country_prefix: "+44",
      
      timeline: "within_6_months",
      buyerProfile: "primary_residence",
      budget: "€500k-€750k",
      areasOfInterest: ["Marbella", "Estepona"],
      propertyType: ["villa"],
      specificNeeds: ["Sea view", "3-4 bedrooms", "primary_residence"],
      
      leadSource: "Emma Chatbot",
      leadSourceDetail: "emma_chat_en",
      emmaConversationStatus: "completed",
      emmaQuestionsAnswered: 3,
      emmaIntakeComplete: true,
      emmaConversationDuration: "4m 32s",
      emmaExitPoint: "completed",
      
      pageType: "homepage",
      language: "en",
      pageUrl: "https://www.delsolprimehomes.com/en",
      pageTitle: "Costa del Sol Luxury Real Estate",
      referrer: "https://www.google.com",
      timestamp: new Date().toISOString(),
      
      leadSegment: "Hot_Primary",
      initialLeadScore: 25
    },
    
    emma_completed_location_nl: {
      firstName: "Jan",
      lastName: "de Vries",
      phone: "+31612345678",
      country_prefix: "+31",
      
      timeline: "within_1_year",
      buyerProfile: "holiday",
      budget: "€400k-€600k",
      areasOfInterest: ["Marbella", "Nueva Andalucía"],
      propertyType: ["apartment"],
      specificNeeds: ["Sea view", "2-3 bedrooms"],
      
      leadSource: "Emma Chatbot",
      leadSourceDetail: "emma_chat_nl",
      emmaConversationStatus: "completed",
      emmaQuestionsAnswered: 3,
      emmaIntakeComplete: true,
      emmaConversationDuration: "5m 12s",
      emmaExitPoint: "completed",
      
      pageType: "location_page",
      language: "nl",
      pageUrl: "https://www.delsolprimehomes.com/nl/locations/marbella",
      pageTitle: "Marbella Vastgoed",
      referrer: "https://www.google.nl",
      timestamp: new Date().toISOString(),
      
      leadSegment: "Warm_Holiday",
      initialLeadScore: 25
    },
    
    emma_timeout_blog_de: {
      firstName: "Klaus",
      lastName: "",
      phone: "+4917012345678",
      
      timeline: "within_6_months",
      buyerProfile: "investment",
      budget: "€700k-€1M",
      areasOfInterest: ["Estepona"],
      propertyType: [],
      specificNeeds: [],
      
      leadSource: "Emma Chatbot",
      leadSourceDetail: "emma_chat_de",
      emmaConversationStatus: "abandoned",
      emmaQuestionsAnswered: 2,
      emmaIntakeComplete: false,
      emmaConversationDuration: "2m 15s",
      emmaExitPoint: "property_criteria_location_timeout",
      
      pageType: "blog_page",
      language: "de",
      pageUrl: "https://www.delsolprimehomes.com/de/blog/investieren-marbella",
      pageTitle: "Investieren in Marbella Immobilien",
      referrer: "https://www.google.de",
      timestamp: new Date().toISOString(),
      
      leadSegment: "Hot_Investor",
      initialLeadScore: 15
    },
    
    // TRADITIONAL FORM SCENARIOS
    form_homepage_en: {
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah@example.com",
      phone: "+447700900000",
      message: "Interested in luxury villas",
      
      leadSource: "Website Form",
      leadSourceDetail: "homepage_en",
      pageType: "homepage",
      language: "en",
      pageUrl: "https://www.delsolprimehomes.com/en",
      pageTitle: "Costa del Sol Luxury Real Estate",
      referrer: "https://www.google.com",
      timestamp: new Date().toISOString(),
      initialLeadScore: 20
    },
    
    form_location_nl: {
      firstName: "Pieter",
      lastName: "van der Berg",
      email: "pieter@example.nl",
      phone: "+31612345678",
      message: "Zoek een villa in Marbella",
      
      leadSource: "Website Form",
      leadSourceDetail: "location_page_nl",
      pageType: "location_page",
      language: "nl",
      pageUrl: "https://www.delsolprimehomes.com/nl/locations/marbella",
      pageTitle: "Marbella Vastgoed",
      referrer: "https://www.google.nl",
      timestamp: new Date().toISOString(),
      initialLeadScore: 20
    },
    
    form_blog_fr: {
      firstName: "Marie",
      lastName: "Dubois",
      email: "marie@example.fr",
      phone: "+33612345678",
      message: "Question sur le visa Digital Nomad",
      
      leadSource: "Website Form",
      leadSourceDetail: "blog_page_fr",
      pageType: "blog_page",
      language: "fr",
      pageUrl: "https://www.delsolprimehomes.com/fr/blog/visa-nomade-numerique",
      pageTitle: "Visa Nomade Numérique Espagne",
      referrer: "https://www.google.fr",
      timestamp: new Date().toISOString(),
      initialLeadScore: 20
    },
    
    form_property_es: {
      firstName: "Carlos",
      lastName: "García",
      email: "carlos@example.es",
      phone: "+34612345678",
      message: "Interesado en esta propiedad",
      propertyRef: "R4567890",
      propertyPrice: "€850,000",
      propertyType: "Villa",
      
      leadSource: "Website Form",
      leadSourceDetail: "property_detail_es",
      pageType: "property_detail",
      language: "es",
      pageUrl: "https://www.delsolprimehomes.com/es/properties/R4567890",
      pageTitle: "Villa de Lujo en Marbella",
      referrer: "https://www.google.es",
      timestamp: new Date().toISOString(),
      initialLeadScore: 20
    },
    
    form_brochure_de: {
      firstName: "Hans",
      lastName: "Mueller",
      email: "hans@example.de",
      phone: "+4917012345678",
      message: "Bitte senden Sie mir die Broschüre",
      cityName: "Marbella",
      citySlug: "marbella",
      
      leadSource: "Website Form",
      leadSourceDetail: "brochure_page_de",
      pageType: "brochure_page",
      language: "de",
      pageUrl: "https://www.delsolprimehomes.com/de/brochures/marbella",
      pageTitle: "Marbella Immobilien Broschüre",
      referrer: "https://www.google.de",
      timestamp: new Date().toISOString(),
      initialLeadScore: 20
    },
    
    form_qa_pl: {
      firstName: "Wojciech",
      lastName: "Kowalski",
      email: "wojciech@example.pl",
      phone: "+48123456789",
      message: "Pytanie o podatki w Hiszpanii",
      
      leadSource: "Website Form",
      leadSourceDetail: "qa_page_pl",
      pageType: "qa_page",
      language: "pl",
      pageUrl: "https://www.delsolprimehomes.com/pl/qa/podatki-hiszpania",
      pageTitle: "Podatki w Hiszpanii - FAQ",
      referrer: "https://www.google.pl",
      timestamp: new Date().toISOString(),
      initialLeadScore: 20
    },
    
    form_buyers_guide_sv: {
      firstName: "Erik",
      lastName: "Andersson",
      email: "erik@example.se",
      phone: "+46701234567",
      message: "Vill ha mer information",
      
      leadSource: "Website Form",
      leadSourceDetail: "buyers_guide_sv",
      pageType: "buyers_guide",
      language: "sv",
      pageUrl: "https://www.delsolprimehomes.com/sv/buyers-guide",
      pageTitle: "Köpguide Costa del Sol",
      referrer: "https://www.google.se",
      timestamp: new Date().toISOString(),
      initialLeadScore: 20
    }
  };
  
  const scenarios = [
    { id: 'emma_completed_homepage_en', label: 'Emma Completed - Homepage (EN)', type: 'emma' },
    { id: 'emma_completed_location_nl', label: 'Emma Completed - Location Page (NL)', type: 'emma' },
    { id: 'emma_timeout_blog_de', label: 'Emma 60s Timeout - Blog (DE)', type: 'emma' },
    { id: 'form_homepage_en', label: 'Form - Homepage (EN)', type: 'form' },
    { id: 'form_location_nl', label: 'Form - Location Page (NL)', type: 'form' },
    { id: 'form_blog_fr', label: 'Form - Blog Page (FR)', type: 'form' },
    { id: 'form_property_es', label: 'Form - Property Detail (ES)', type: 'form' },
    { id: 'form_brochure_de', label: 'Form - Brochure Download (DE)', type: 'form' },
    { id: 'form_qa_pl', label: 'Form - QA Page (PL)', type: 'form' },
    { id: 'form_buyers_guide_sv', label: 'Form - Buyers Guide (SV)', type: 'form' }
  ];
  
  const currentPayload = payloads[selectedScenario];
  const currentScenario = scenarios.find(s => s.id === selectedScenario);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(currentPayload, null, 2));
    toast({
      title: "Copied!",
      description: "Payload copied to clipboard",
    });
  };
  
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(currentPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webhook-payload-${selectedScenario}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const downloadAllJSON = () => {
    const blob = new Blob([JSON.stringify(payloads, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all-webhook-payloads.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-6">
      {/* Scenario Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Select Webhook Scenario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger>
              <SelectValue placeholder="Select a scenario" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Emma Chatbot</div>
              {scenarios.filter(s => s.type === 'emma').map(s => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground mt-2">Traditional Forms</div>
              {scenarios.filter(s => s.type === 'form').map(s => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-2 flex-wrap">
            <Badge variant={currentScenario?.type === 'emma' ? 'default' : 'secondary'}>
              {currentScenario?.type === 'emma' ? '🤖 Emma Chatbot' : '📝 Website Form'}
            </Badge>
            <Badge variant="outline">
              {currentPayload.pageType as string}
            </Badge>
            <Badge variant="outline">
              {(currentPayload.language as string).toUpperCase()}
            </Badge>
            {currentPayload.leadSegment && (
              <Badge className="bg-primary/20 text-primary">
                {currentPayload.leadSegment as string}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={copyToClipboard} variant="outline">
          <Copy className="h-4 w-4 mr-2" />
          Copy JSON
        </Button>
        <Button onClick={downloadJSON} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download This
        </Button>
        <Button onClick={downloadAllJSON} variant="secondary">
          <Download className="h-4 w-4 mr-2" />
          Download All Scenarios
        </Button>
      </div>
      
      {/* Payload Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[500px] text-sm font-mono">
            {JSON.stringify(currentPayload, null, 2)}
          </pre>
        </CardContent>
      </Card>
      
      {/* Key Fields Reference - Expanded */}
      <div className="mt-4 text-xs text-muted-foreground space-y-4">
        <div>
          <p className="font-bold text-sm mb-2">📋 Key Fields for GHL Mapping</p>
        </div>

        {/* Lead Source Values */}
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded">
          <p className="font-semibold mb-1 text-foreground">leadSource - Lead Origin</p>
          <p className="mb-2">Possible values:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Emma Chatbot</code> - All Emma conversations</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Website Form</code> - All traditional form submissions</li>
          </ul>
        </div>

        {/* Lead Source Detail Values */}
        <div className="bg-green-50 dark:bg-green-950 p-3 rounded">
          <p className="font-semibold mb-1 text-foreground">leadSourceDetail - Specific Source</p>
          <p className="mb-2">Format: <code className="bg-white dark:bg-muted px-1 rounded">{'{source}_{pageType}_{language}'}</code></p>
          
          <p className="font-semibold mt-3 mb-1 text-foreground">Emma Examples:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">emma_chat_en</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">emma_chat_nl</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">emma_chat_de</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">emma_chat_fr</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">emma_chat_pl</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">emma_chat_sv</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">emma_chat_da</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">emma_chat_fi</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">emma_chat_hu</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">emma_chat_no</code></li>
          </ul>
          <p className="font-semibold mt-3 mb-1 text-foreground">Form Examples:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">homepage_en</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">location_page_nl</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">blog_page_de</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">property_detail_es</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">brochure_page_fr</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">qa_page_pl</code></li>
            <li>...and many more combinations</li>
          </ul>
        </div>

        {/* Page Type Values */}
        <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded">
          <p className="font-semibold mb-1 text-foreground">pageType - Where Submission Originated</p>
          <p className="mb-2">All possible page types:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">homepage</code> - Main homepage</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">location_page</code> - Location pages (e.g., /locations/marbella)</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">brochure_page</code> - Brochure download pages</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">blog_page</code> - Blog article pages</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">qa_page</code> - Q&A pages</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">buyers_guide</code> - Buyers Guide page</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">glossary</code> - Glossary page</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">contact_page</code> - Contact page</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">property_detail</code> - Individual property pages</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">comparison_page</code> - Comparison pages</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">other</code> - Any other page type</li>
          </ul>
        </div>

        {/* Language Values */}
        <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded">
          <p className="font-semibold mb-1 text-foreground">language - Language Version</p>
          <p className="mb-2">All supported languages (2-letter codes):</p>
          <div className="grid grid-cols-2 gap-2">
            <ul className="list-disc ml-4 space-y-1">
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">en</code> - English</li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">nl</code> - Dutch (Nederlands)</li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">de</code> - German (Deutsch)</li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">fr</code> - French (Français)</li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">fi</code> - Finnish (Suomi)</li>
            </ul>
            <ul className="list-disc ml-4 space-y-1">
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">pl</code> - Polish (Polski)</li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">sv</code> - Swedish (Svenska)</li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">da</code> - Danish (Dansk)</li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">hu</code> - Hungarian (Magyar)</li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">no</code> - Norwegian (Norsk)</li>
            </ul>
          </div>
        </div>

        {/* Lead Segment Values (Emma Only) */}
        <div className="bg-red-50 dark:bg-red-950 p-3 rounded">
          <p className="font-semibold mb-1 text-foreground">leadSegment - Calculated Buyer Segment (Emma Only)</p>
          <p className="mb-2">Format: <code className="bg-white dark:bg-muted px-1 rounded">{'{Readiness}_{Profile}'}</code></p>
          
          <p className="font-semibold mt-2 mb-1 text-foreground">Readiness Levels:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Hot</code> - 0-6 months timeline</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Warm</code> - 6-12 months timeline</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cool</code> - 1-2 years timeline</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cold</code> - 2+ years or unsure</li>
          </ul>
          <p className="font-semibold mt-2 mb-1 text-foreground">Buyer Profiles:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Primary</code> - Primary residence</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Holiday</code> - Holiday home</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Investor</code> - Investment property</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Seasonal</code> - Winter stay</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">General</code> - Not specified</li>
          </ul>
          <p className="font-semibold mt-2 mb-1 text-foreground">Example Combinations (20 total):</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <ul className="list-disc ml-4 space-y-1">
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Hot_Primary</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Hot_Holiday</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Hot_Investor</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Hot_Seasonal</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Warm_Primary</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Warm_Holiday</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Warm_Investor</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Warm_Seasonal</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cool_Primary</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cool_Holiday</code></li>
            </ul>
            <ul className="list-disc ml-4 space-y-1">
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cool_Investor</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cool_Seasonal</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cold_Primary</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cold_Holiday</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cold_Investor</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cold_Seasonal</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Hot_General</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Warm_General</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cool_General</code></li>
              <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Cold_General</code></li>
            </ul>
          </div>
        </div>

        {/* Timeline Values (Emma Only) */}
        <div className="bg-indigo-50 dark:bg-indigo-950 p-3 rounded">
          <p className="font-semibold mb-1 text-foreground">timeline - Buyer Timeline (Emma Only)</p>
          <p className="mb-2">Possible values:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">within_6_months</code> - Ready to buy within 6 months</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">within_1_year</code> - Ready within 1 year</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">within_2_years</code> - Ready within 2 years</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">longer_than_2_years</code> - More than 2 years</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">Not sure</code> - Timeline undecided</li>
          </ul>
        </div>

        {/* Buyer Profile Values (Emma Only) */}
        <div className="bg-pink-50 dark:bg-pink-950 p-3 rounded">
          <p className="font-semibold mb-1 text-foreground">buyerProfile - Buyer Type (Emma Only)</p>
          <p className="mb-2">Possible values:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">primary_residence</code> - Primary home</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">holiday</code> - Holiday/vacation home</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">investment</code> - Investment/rental property</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">winter_stay</code> - Seasonal/winter residence</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">General</code> - Not specified</li>
          </ul>
        </div>

        {/* Emma Conversation Status */}
        <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded">
          <p className="font-semibold mb-1 text-foreground">emmaConversationStatus - Conversation Outcome (Emma Only)</p>
          <p className="mb-2">Possible values:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">completed</code> - Full conversation finished</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">abandoned</code> - 60-second timeout occurred</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">declined</code> - User declined to continue</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">partial</code> - Some data collected</li>
          </ul>
        </div>

        {/* Initial Lead Score */}
        <div className="bg-teal-50 dark:bg-teal-950 p-3 rounded">
          <p className="font-semibold mb-1 text-foreground">initialLeadScore - Lead Scoring</p>
          <p className="mb-2">Numeric score values:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">25</code> - Emma completed conversation</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">20</code> - Traditional form submission OR Emma with phone</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">15</code> - Emma abandoned (60s timeout)</li>
          </ul>
        </div>

        {/* Property Type Array (Emma Only) */}
        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded">
          <p className="font-semibold mb-1 text-foreground">propertyType - Property Type Array (Emma Only)</p>
          <p className="mb-2">Possible array values:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">["villa"]</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">["apartment"]</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">["townhouse"]</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">["villa", "apartment"]</code> - Multiple types</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">[]</code> - Not specified yet</li>
          </ul>
        </div>

        {/* Areas of Interest (Emma Only) */}
        <div className="bg-cyan-50 dark:bg-cyan-950 p-3 rounded">
          <p className="font-semibold mb-1 text-foreground">areasOfInterest - Location Array (Emma Only)</p>
          <p className="mb-2">Possible array values (Costa del Sol locations):</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">["Marbella"]</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">["Estepona"]</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">["Nueva Andalucía"]</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">["San Pedro"]</code></li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">["Marbella", "Estepona"]</code> - Multiple areas</li>
            <li><code className="bg-white dark:bg-muted px-2 py-0.5 rounded text-foreground">[]</code> - Not specified yet</li>
          </ul>
        </div>

        {/* Summary Note */}
        <div className="bg-muted p-3 rounded border-2 border-border">
          <p className="font-bold text-sm mb-2 text-foreground">💡 GHL Mapping Summary</p>
          <ul className="list-disc ml-4 space-y-1 text-xs">
            <li><strong className="text-foreground">leadSource:</strong> 2 possible values (Emma Chatbot, Website Form)</li>
            <li><strong className="text-foreground">leadSourceDetail:</strong> 110+ combinations (11 page types × 10 languages)</li>
            <li><strong className="text-foreground">pageType:</strong> 11 possible values</li>
            <li><strong className="text-foreground">language:</strong> 10 possible values (en, nl, de, fr, fi, pl, sv, da, hu, no)</li>
            <li><strong className="text-foreground">leadSegment:</strong> 20 possible combinations (Emma only)</li>
            <li><strong className="text-foreground">timeline:</strong> 5 possible values (Emma only)</li>
            <li><strong className="text-foreground">buyerProfile:</strong> 5 possible values (Emma only)</li>
            <li><strong className="text-foreground">emmaConversationStatus:</strong> 4 possible values (Emma only)</li>
            <li><strong className="text-foreground">initialLeadScore:</strong> 3 possible values (15, 20, 25)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
