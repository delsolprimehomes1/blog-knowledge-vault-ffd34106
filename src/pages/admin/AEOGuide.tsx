import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertTriangle, XCircle, BookOpen, Code, FileText, Lightbulb } from "lucide-react";

const AEOGuide = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">🤖 AEO/SGE Content Structure Guide</h1>
          <p className="text-muted-foreground">
            Comprehensive guide for optimizing blog content for AI engines and search generative experiences
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="reference">Quick Reference</TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  What is AEO/SGE?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">AEO (Answer Engine Optimization)</h3>
                  <p className="text-muted-foreground">
                    Content structured specifically for AI assistants like ChatGPT, Claude, and Perplexity. 
                    When users ask questions, these AI engines search for well-structured content that provides 
                    clear, direct answers they can cite as authoritative sources.
                  </p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">SGE (Search Generative Experience)</h3>
                  <p className="text-muted-foreground">
                    Google's AI-powered search layer that generates comprehensive answers at the top of search results. 
                    SGE prioritizes content in Q&A format with clear questions and concise answers, moving beyond 
                    traditional keyword optimization.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Why Optimize for AI Engines?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Increased Visibility</p>
                    <p className="text-sm text-muted-foreground">AI engines cite well-structured sources in their responses, exposing your content to millions of users</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Authority & Trust</p>
                    <p className="text-sm text-muted-foreground">Being cited by ChatGPT, Claude, or Google SGE establishes your brand as an authoritative source</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Higher CTR</p>
                    <p className="text-sm text-muted-foreground">Featured snippets and AI citations drive 2-3x higher click-through rates than standard search results</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Future-Proof SEO</p>
                    <p className="text-sm text-muted-foreground">As search evolves toward conversational AI, AEO/SGE optimization ensures long-term discoverability</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <BookOpen className="h-4 w-4" />
              <AlertTitle>Key Principle</AlertTitle>
              <AlertDescription>
                Structure your content to answer specific questions clearly and concisely. AI engines prefer 
                content that explicitly states questions and provides self-contained answers with concrete data.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* TAB 2: REQUIREMENTS */}
          <TabsContent value="requirements" className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                All 5 requirements are mandatory for AEO/SGE compliance. System Check Phase 19 validates these automatically.
              </AlertDescription>
            </Alert>

            {/* Requirement 1: JSON Front Matter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-8 h-8 flex items-center justify-center">1</Badge>
                  JSON Front Matter
                </CardTitle>
                <CardDescription>Structured metadata for AI context and discovery</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">🎯 Purpose</h4>
                  <p className="text-sm text-muted-foreground">
                    Provides AI engines with structured metadata about your article's topic, author, keywords, 
                    and relationships to other content. This helps AI understand context and authority.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">📋 Example Structure</h4>
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`{
  "type": "blog",
  "lang": "en",
  "title": "Why Is New-Build Property Attractive for Investors?",
  "slug": "new-build-property-investors",
  "summary": "New-build developments combine energy efficiency...",
  "author": "Hans Beeckman",
  "brand": "Del Sol Prime Homes",
  "published_at": "2025-01-15T10:00:00Z",
  "topics": ["Investment", "New Build", "Costa del Sol"],
  "geo": ["Costa del Sol", "Spain", "Marbella"],
  "keywords": ["new-build investment", "rental yields"],
  "reading_time_min": 8,
  "qa_refs": [
    "Why is new-build property attractive?",
    "What are the tax benefits?"
  ],
  "related_posts": ["golden-visa-guide"],
  "hero_image": "https://example.com/image.jpg",
  "canonical": "https://www.delsolprimehomes.com/blog/..."
}`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">✓ Auto-Generated</h4>
                  <p className="text-sm text-muted-foreground">
                    This metadata is automatically generated by the system after content creation. 
                    View in Schema Preview → Front Matter tab.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Requirement 2: H2 as Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-8 h-8 flex items-center justify-center">2</Badge>
                  H2 Headings as Questions
                </CardTitle>
                <CardDescription>Every H2 must be phrased as a question</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">📜 Rules</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>MUST start with question words: <strong>Why, How, What, When, Where, Who, Which</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>MUST end with a question mark <strong>(?)</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>MUST include target keyword or semantic variation</span>
                    </li>
                  </ul>
                </div>
                <Separator />
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2 text-green-600 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      ✅ Correct Examples
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        "Why is Costa del Sol attractive for investors?"
                      </li>
                      <li className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        "How does the Golden Visa process work?"
                      </li>
                      <li className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        "What are the tax benefits of buying new-build?"
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      ❌ Incorrect Examples
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        "Costa del Sol property market" <span className="text-xs">(not a question)</span>
                      </li>
                      <li className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        "Benefits of new-build investment" <span className="text-xs">(not a question)</span>
                      </li>
                      <li className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        "Why invest in Costa del Sol" <span className="text-xs">(no ?)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requirement 3: Short Answer Format */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-8 h-8 flex items-center justify-center">3</Badge>
                  Short Answer Format
                </CardTitle>
                <CardDescription>Concise answer immediately after each H2</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">📐 Criteria</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>2-4 sentences</strong> (40-70 words)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Self-contained</strong> (no pronouns like "this" or "it")</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Include <strong>1-2 specific data points</strong> (numbers, percentages, timeframes)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Present tense, active voice</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Begin with <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;strong&gt;Short Answer:&lt;/strong&gt;</code></span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">💻 Template</h4>
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`<h2>Why is new-build property attractive for investors?</h2>
<div class="short-answer">
  <p><strong>Short Answer:</strong> New-build developments 
  in Costa del Sol combine A-rated energy efficiency, 
  10-year structural warranties, and 5-7% annual rental 
  yields in areas like Estepona and Marbella East. 
  Investors avoid renovation costs while accessing modern 
  amenities that command €200-€400/month rent premiums.</p>
</div>`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Requirement 4: Mini-FAQ Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-8 h-8 flex items-center justify-center">4</Badge>
                  Mini-FAQ Section
                </CardTitle>
                <CardDescription>3-5 additional quick Q&As before conclusion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">📝 Requirements</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>3-5 questions</strong> (different from main H2s)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Focus on <strong>tactical, quick-answer queries</strong> ("How much...", "How long...", "What's the difference...")</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Each answer: <strong>1-2 sentences (20-40 words)</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Use <strong>H3 tags</strong> for questions in this section</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">💻 Example Structure</h4>
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`<h2>Quick Q&A: Costa del Sol Property Essentials</h2>
<div class="mini-faq">
  <h3>What amenities increase rental appeal?</h3>
  <p>Properties with swimming pools, gyms, and co-working 
  spaces achieve 15-20% higher occupancy rates.</p>
  
  <h3>How long does the NIE process take?</h3>
  <p>EU citizens can obtain their NIE in 2-4 weeks, while 
  non-EU buyers should allow 6-8 weeks.</p>
  
  <h3>When is the best time to buy?</h3>
  <p>Late autumn (Oct-Nov) and early spring (Feb-Mar) 
  offer the best negotiating power.</p>
</div>`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Requirement 5: Dual Schema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-8 h-8 flex items-center justify-center">5</Badge>
                  Dual Schema Generation
                </CardTitle>
                <CardDescription>Automatic BlogPosting + FAQPage schemas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">🤖 Auto-Generated Schemas</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    The system automatically generates two JSON-LD schemas for every article:
                  </p>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <p className="font-medium text-sm mb-1">1. BlogPosting Schema</p>
                      <p className="text-xs text-muted-foreground">
                        Main article metadata including title, author, publication date, and description
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="font-medium text-sm mb-1">2. FAQPage Schema</p>
                      <p className="text-xs text-muted-foreground">
                        Combines all H2 questions + short answers, Mini-FAQ questions + answers, 
                        and any manually added FAQ entities from the editor
                      </p>
                    </div>
                  </div>
                </div>
                <Alert>
                  <Code className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    You don't need to create schemas manually—just follow the content structure requirements. 
                    View generated schemas in the Schema Preview section of the article editor.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: EXAMPLES */}
          <TabsContent value="examples" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Before AEO/SGE Optimization</CardTitle>
                <CardDescription className="text-red-600">❌ Not optimized for AI discovery</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg text-xs overflow-x-auto border-2 border-red-200">
{`<h2>New Build Investment Benefits</h2>
<p>There are many benefits to investing in new-build 
property in Costa del Sol. These properties offer modern 
amenities and energy efficiency. They are popular with 
international buyers.</p>

<h2>Tax Advantages</h2>
<p>Tax benefits include various deductions that can save 
you money. Spain offers favorable tax treatment for property 
investors.</p>

<h2>Location Benefits</h2>
<p>Costa del Sol is a prime location with excellent weather 
and lifestyle. Many areas are growing rapidly.</p>`}
                </pre>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-red-600">❌ Issues:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• H2 headings are not questions</li>
                    <li>• No short answer boxes</li>
                    <li>• Vague, generic content without data</li>
                    <li>• No Mini-FAQ section</li>
                    <li>• AI engines cannot extract clear answers</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>After AEO/SGE Optimization</CardTitle>
                <CardDescription className="text-green-600">✅ Optimized for AI citations</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-xs overflow-x-auto border-2 border-green-200">
{`<h2>Why is new-build property attractive for investors 
in Costa del Sol?</h2>
<div class="short-answer">
  <p><strong>Short Answer:</strong> New-build developments 
  in Costa del Sol combine A-rated energy efficiency, 
  10-year structural warranties, and 5-7% annual rental 
  yields in areas like Estepona and Marbella East. 
  Investors avoid renovation costs while accessing modern 
  amenities that command €200-€400/month rent premiums.</p>
</div>
<p>[Detailed explanation continues with data, examples, 
and expert insights...]</p>

<h2>What are the tax benefits of buying new-build 
property in Spain?</h2>
<div class="short-answer">
  <p><strong>Short Answer:</strong> New-build buyers pay 
  reduced IVA (10% vs 21% for resale) and can claim IVA 
  refunds for business use. Properties built after 2013 
  qualify for energy-efficiency tax deductions up to 
  €5,000 annually through Spain's IRPF system.</p>
</div>
<p>[Detailed tax breakdown continues...]</p>

<!-- After main content -->
<h2>Quick Q&A: New Build Investment Essentials</h2>
<div class="mini-faq">
  <h3>How long does construction typically take?</h3>
  <p>Standard developments take 18-24 months from 
  groundbreaking to completion, while luxury villas 
  may require 24-36 months.</p>
  
  <h3>What warranty coverage comes with new builds?</h3>
  <p>Spain's LOE law mandates 1-year finish warranty, 
  3-year installation warranty, and 10-year structural 
  warranty backed by insurance.</p>
  
  <h3>Can foreign buyers access Spanish mortgages?</h3>
  <p>Yes, non-resident buyers typically qualify for 
  60-70% LTV mortgages with 30-40% down payment required.</p>
</div>`}
                </pre>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-green-600">✅ Improvements:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• H2 headings are clear questions with keywords</li>
                    <li>• Short answer boxes provide immediate, data-rich responses</li>
                    <li>• Specific numbers and percentages (5-7%, €200-€400, 10-year)</li>
                    <li>• Mini-FAQ section adds 3 additional quick Q&As</li>
                    <li>• AI engines can easily extract and cite information</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: VALIDATION */}
          <TabsContent value="validation" className="space-y-6">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>Automated Validation</AlertTitle>
              <AlertDescription>
                Phase 19 of System Check automatically validates AEO/SGE compliance for all published articles.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>What Phase 19 Checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge className="mt-1">1</Badge>
                    <div>
                      <p className="font-medium">H2 Question Rate</p>
                      <p className="text-sm text-muted-foreground">
                        Verifies 80%+ of H2 headings are properly formatted questions 
                        (start with question word AND end with ?)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="mt-1">2</Badge>
                    <div>
                      <p className="font-medium">Short Answer Presence</p>
                      <p className="text-sm text-muted-foreground">
                        Checks for <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;strong&gt;Short Answer:&lt;/strong&gt;</code> pattern 
                        within 200 characters of each H2
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="mt-1">3</Badge>
                    <div>
                      <p className="font-medium">Mini-FAQ Section</p>
                      <p className="text-sm text-muted-foreground">
                        Validates presence of mini-FAQ structure or FAQ entities in database
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Criteria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border-2 border-green-500 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-700 dark:text-green-300">PASS Criteria</h4>
                  </div>
                  <ul className="text-sm space-y-1 text-green-900 dark:text-green-100">
                    <li>• All 3 checks pass (67%+ threshold for multi-article validation)</li>
                    <li>• H2 question rate ≥ 80%</li>
                    <li>• Short answers present in 67%+ of articles</li>
                    <li>• Mini-FAQ section in 67%+ of articles</li>
                  </ul>
                </div>

                <div className="p-4 border-2 border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-300">WARNING Criteria</h4>
                  </div>
                  <ul className="text-sm space-y-1 text-yellow-900 dark:text-yellow-100">
                    <li>• 2 out of 3 checks pass</li>
                    <li>• H2 question rate 60-79%</li>
                    <li>• Missing Mini-FAQ in some articles</li>
                  </ul>
                </div>

                <div className="p-4 border-2 border-red-500 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-red-700 dark:text-red-300">FAIL Criteria</h4>
                  </div>
                  <ul className="text-sm space-y-1 text-red-900 dark:text-red-100">
                    <li>• 0-1 checks pass</li>
                    <li>• H2 question rate &lt; 60%</li>
                    <li>• No short answer structure</li>
                    <li>• No Mini-FAQ sections</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Example Validation Output</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`✓ AEO/SGE Content Structure - PASS
  Content follows AEO/SGE best practices (3/3 checks pass)
  
  Validated 3 published articles
  
  Checks:
  ✓ H2 headings as questions: 95% (19/20 H2s)
  ✓ Short Answer format: 100% of articles
  ✓ Mini-FAQ section: 100% of articles
  
  H2 Examples from sample article:
    "Why is Costa del Sol attractive for investors?"
    "How does the Golden Visa work in Spain?"
    "What are the tax benefits of buying new-build?"
  
  ✓ Structure is optimal for AI discovery and citations`}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: QUICK REFERENCE */}
          <TabsContent value="reference" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>✅ DO</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Start every H2 with <strong>Why, How, What, When, Where, Who, Which</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>End every H2 with a <strong>question mark (?)</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Add short answer box after each H2 <strong>(40-70 words)</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Include <strong>1-2 specific data points</strong> in short answers (numbers, percentages, timeframes)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Create Mini-FAQ section with <strong>3-5 quick Q&As</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Use <strong>H3 tags</strong> for Mini-FAQ questions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Keep Mini-FAQ answers to <strong>1-2 sentences (20-40 words)</strong></span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>❌ DON'T</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Write declarative H2 headings <span className="text-muted-foreground">("Benefits of X")</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Forget question marks on H2s</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Skip short answer boxes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Use pronouns <span className="text-muted-foreground">("this", "it")</span> in short answers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Duplicate main H2 questions in Mini-FAQ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Make Mini-FAQ answers too long or vague</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📋 Content Template</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`<h2>[Question word] [keyword phrase]?</h2>
<div class="short-answer">
  <p><strong>Short Answer:</strong> [2-4 sentences with 
  1-2 specific data points: numbers, percentages, 
  timeframes, locations]</p>
</div>
<p>[Detailed explanation with examples, context, 
and expert insights...]</p>

<!-- After main content sections -->
<h2>Quick Q&A: [Topic] Essentials</h2>
<div class="mini-faq">
  <h3>[Quick tactical question with specifics]?</h3>
  <p>[1-2 sentence answer with concrete data]</p>
  
  <h3>[Quick tactical question with specifics]?</h3>
  <p>[1-2 sentence answer with concrete data]</p>
  
  <h3>[Quick tactical question with specifics]?</h3>
  <p>[1-2 sentence answer with concrete data]</p>
</div>`}
                </pre>
              </CardContent>
            </Card>

            <Alert>
              <BookOpen className="h-4 w-4" />
              <AlertTitle>Need Help?</AlertTitle>
              <AlertDescription>
                Run System Check Phase 19 to validate your content. If validation fails, 
                review this guide and adjust your H2 structure, short answers, or Mini-FAQ section.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AEOGuide;
