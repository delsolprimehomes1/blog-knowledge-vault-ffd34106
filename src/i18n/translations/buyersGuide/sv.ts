export const buyersGuideSv = {
  meta: {
    title: "Komplett Köparguide för Costa del Sol | Del Sol Prime Homes",
    description: "Din kompletta guide för att köpa fastighet på Costa del Sol. Steg-för-steg-process, kostnader, juridiska krav och expertråd."
  },
  hero: {
    badge: "Komplett Guide 2026",
    headline: "Den Kompletta Guiden för att Köpa Fastighet på",
    headlineHighlight: "Costa del Sol",
    subheadline: "Allt du behöver veta om att köpa ditt drömhem i Spaniens mest eftertraktade region. Från juridiska krav till dolda kostnader — vi har det täckt.",
    scrollText: "Scrolla för att utforska",
    stats: {
      steps: { value: "8", label: "Enkla Steg" },
      timeline: { value: "6-12", label: "Veckors Tidslinje" },
      locations: { value: "15+", label: "Premiumlägen" },
      languages: { value: "10+", label: "Språk" }
    }
  },
  speakable: {
    badge: "Snabbt Svar",
    title: "AI-redo Sammanfattning",
    extraCosts: "Extra Kostnader",
    months: "Månader",
    visaIncome: "Visuminkomst",
    paragraph1: "Att köpa fastighet på Costa del Sol är en enkel process för internationella köpare. Du behöver ett NIE (skatteidentifikationsnummer), ett spanskt bankkonto och vanligtvis 10-13% av köpeskillingen för att täcka skatter och avgifter.",
    paragraph2: "Processen tar 3-6 månader från att hitta din fastighet till att få nycklarna. Distansarbetare och digitala nomader kan kvalificera sig för Spaniens Digital Nomad Visum, vilket låter dig bo och arbeta från den vackra Costa del Sol samtidigt som du behåller din internationella karriär.",
    optimizedFor: "Optimerad för röstassistenter och AI-sökning"
  },
  process: {
    badge: "Steg-för-Steg-Process",
    headline: "Din Resa till Ägande",
    subheadline: "Följ dessa åtta väsentliga steg för att framgångsrikt köpa din fastighet på Costa del Sol.",
    requiredDocuments: "Nödvändiga Dokument",
    steps: [
      { title: "Definiera Dina Krav", description: "Fastställ din budgetram, fastighetstyp (lägenhet, penthouse, radhus, villa), platspreferenser och måste-ha vs önskvärt. Överväg din tidslinje för köp.", documents: [], cta: { text: "Börja med vår Fastighetssökare", link: "/sv/find-property" } },
      { title: "Fastighetssökning", description: "Arbeta med Del Sol Prime Homes för att besöka lämpliga fastigheter. Vi erbjuder virtuella turer, personliga visningar och områdesbekantskapsresor.", documents: [], cta: { text: "Sök Fastigheter", link: "/sv/find-property" } },
      { title: "Reservation", description: "När du hittat din fastighet, lägg ett bud. Efter godkännande, signera ett reservationsavtal och betala en deposition (vanligtvis €6 000-€10 000) för att säkra fastigheten i 2-4 veckor.", documents: ["Reservationsavtal", "Passkopia", "Bevis på medel"] },
      { title: "Anlita en Advokat (Fullmakt)", description: "Anlita en spansk advokat som representerar dina intressen. Ge dem Fullmakt (Poder Notarial) så de kan hantera den juridiska processen för din räkning — även om du inte är i Spanien.", documents: ["Fullmaktsdokument", "Passkopia", "Advokatuppdragsbrev"] },
      { title: "Erhåll Ditt NIE-nummer", description: "Din advokat erhåller din NIE (Número de Identificación de Extranjero) — det spanska skatte-ID som krävs för alla fastighetstransaktioner. Detta tar vanligtvis 1-3 veckor.", documents: ["Passkopia", "NIE-ansökningsformulär (EX-15)", "Anledning för ansökan"] },
      { title: "Öppna Spanskt Bankkonto", description: "Din advokat ordnar ett spanskt bankkonto i ditt namn — krävs för fastighetsköpet och löpande betalningar. Detta kan göras på distans med din Fullmakt.", documents: ["NIE-nummer", "Passkopia", "Adressbevis", "Inkomstbevis"] },
      { title: "Privat Köpekontrakt", description: "Signera Contrato Privado de Compraventa. Betala 10% av köpeskillingen (minus reservationsdeposition). Kontraktet anger slutförandedatum och binder båda parter juridiskt.", documents: ["Contrato Privado", "10% handpenning", "Due diligence-rapport från advokat"] },
      { title: "Slutförande hos Notarie", description: "Signera Escritura (lagfart) hos notariekontoret, betala slutsaldot och få dina nycklar! Notarien registrerar fastigheten i ditt namn i Fastighetsregistret.", documents: ["Escritura", "Slutbetalning", "All tidigare dokumentation"] }
    ]
  },
  costs: {
    badge: "Transparenta Priser",
    headline: "Alla Kostnader Förklarade",
    subheadline: "Inga dolda avgifter. Beräkna exakt vad du betalar när du köper fastighet i Spanien.",
    calculator: { title: "Kostnadskalkylator", subtitle: "Justera värden för att se dina kostnader", propertyPrice: "Fastighetspris", propertyType: "Fastighetstyp", resale: "Återförsäljning", newBuild: "Nybygge", totalCosts: "Totala Extra Kostnader", ofPurchasePrice: "av köpeskillingen" },
    understanding: "Förstå Varje Kostnad",
    items: [
      { name: "Överlåtelseskatt (ITP)", percentage: "7%", description: "Betalas på återförsäljningsfastigheter i Andalusien" },
      { name: "Moms (IVA) - Nybyggen", percentage: "10%", description: "Moms på nybyggda fastigheter direkt från byggherrar" },
      { name: "Stämpelskatt (AJD)", percentage: "1,2%", description: "Ytterligare skatt på nybyggnadsköp" },
      { name: "Notarieavgifter", percentage: "0,5-1%", description: "Avgifter för notarien att bevittna köpebrevet" },
      { name: "Fastighetsregisteravgifter", percentage: "0,5-1%", description: "Avgifter för att registrera fastigheten i ditt namn" },
      { name: "Juridiska Avgifter", percentage: "1-1,5%", description: "Oberoende advokatarvoden för due diligence" },
      { name: "Bankavgifter", amount: "€200-500", description: "Överföringsavgifter och kontoinställningskostnader" },
      { name: "Bolånekostnader", percentage: "1-2%", description: "Uppläggningsavgifter och värdering" }
    ],
    breakdownLabels: { transferTax: "Överlåtelseskatt 7%", vat: "Moms 10%", stampDuty: "Stämpelskatt 1,2%", notaryFees: "Notarieavgifter ~0,75%", registryFees: "Registeravgifter ~0,75%", legalFees: "Juridiska Avgifter ~1,25%", bankCharges: "Bankavgifter" }
  },
  locations: {
    badge: "Utforska Platser",
    headline: "Premiumlägen på Costa del Sol",
    viewAll: "Visa alla platser",
    areas: {
      marbella: { name: "Marbella", description: "Lyxhuvudstaden på Costa del Sol" },
      puertoBanus: { name: "Puerto Banús", description: "Världsberömd marina och nattliv" },
      estepona: { name: "Estepona", description: "Costa del Sols trädgård" },
      fuengirola: { name: "Fuengirola", description: "Familjevänlig badort" },
      benalmadena: { name: "Benalmádena", description: "Marina och charmig by" },
      mijas: { name: "Mijas", description: "Vit by med havsutsikt" }
    }
  },
  legal: {
    badge: "Juridiska Krav",
    headline: "Din Juridiska Checklista",
    subheadline: "Allt du behöver förbereda före och under ditt fastighetsköp i Spanien.",
    essential: "nödvändig",
    optional: "valfri",
    timeline: "Tidslinje",
    proTips: "Profftips",
    items: [
      { title: "NIE-nummer", description: "Ditt spanska skatteidentifikationsnummer - krävs för alla finansiella transaktioner", status: "essential", timeline: "1-2 veckor", tips: ["Ansök vid spanskt konsulat eller i Spanien"] },
      { title: "Spanskt Bankkonto", description: "Krävs för att betala skatter och avgifter", status: "essential", timeline: "1 vecka", tips: ["Många banker erbjuder konton för icke-residenter"] },
      { title: "Bevis på Medel", description: "Kontoutdrag som visar tillräckliga medel", status: "essential", timeline: "Omedelbart", tips: ["Senaste 6 månaders utdrag"] },
      { title: "Fullmakt (Valfritt)", description: "Tillåter en representant att agera för din räkning", status: "optional", timeline: "1-2 dagar", tips: ["Måste vara notarierad"] },
      { title: "Oberoende Advokat", description: "Väsentligt för att skydda dina intressen", status: "essential", timeline: "Före bud", tips: ["Välj engelsktalande fastighetsspecialist"] }
    ],
    dueDiligence: {
      title: "Due Diligence Checklista",
      description: "Din advokat bör verifiera allt detta innan du skriver under kontrakt.",
      checks: ["Verifiera att säljaren äger fastigheten", "Kontrollera utestående skulder", "Bekräfta att fastigheten är fri från inteckningar", "Verifiera bygglov", "Kontrollera första inflyttningslicens (för nybyggen)", "Bekräfta att samfällighetsavgifter är betalda", "Granska IBI-kvitton", "Kontrollera stadsplaneåtgärder", "Verifiera gränser mot fastighetsregistret", "Granska energicertifikat"],
      helpText: "Behöver du hjälp att hitta en pålitlig advokat?",
      ctaText: "Få Våra Rekommenderade Juridiska Partners"
    }
  },
  digitalNomad: {
    badge: "Distansarbete Uppehållstillstånd",
    headline: "Spaniens Digital Nomad Visum",
    subheadline: "Spaniens Digital Nomad Visum tillåter distansarbetare och frilansare att bo lagligt i Spanien medan de arbetar för företag utanför Spanien.",
    lifestyleTitle: "Ditt Kontor med Utsikt",
    lifestyleDescription: "Föreställ dig att arbeta från en soldränkt terrass med utsikt över Medelhavet.",
    fastInternet: "Snabb Fiber Internet",
    airports: "3 Int'l Flygplatser",
    benefits: {
      title: "Nyckelfördelar",
      items: [
        { title: "Arbeta på Distans från Spanien", description: "Arbeta lagligt för icke-spanska företag" },
        { title: "Schengenområde Tillgång", description: "Res fritt i 26 europeiska länder" },
        { title: "Familjeinkludering", description: "Ta med make/maka och barn under 18" },
        { title: "Väg till Permanent Uppehållstillstånd", description: "Förnybart upp till 5 år" }
      ]
    },
    income: { amount: "€2 520", label: "Minsta Månadsinkomst", sublabel: "Från icke-spansk anställning" },
    requirements: {
      title: "Krav",
      items: ["Minsta månadsinkomst €2 520", "Distansarbetskontrakt med icke-spanskt företag", "Minst 3 års yrkeserfarenhet", "Giltig privat sjukförsäkring", "Rent belastningsregister", "Bevis på anställningskontrakt"]
    },
    timeline: { title: "Handläggningstid", items: [{ label: "Ansökningsgranskning", value: "20 arbetsdagar" }, { label: "Initial visumgiltighet", value: "3 år" }, { label: "Förnyelseperiod", value: "Ytterligare 2 år" }, { label: "Permanent uppehållstillstånd", value: "Efter 5 år" }] },
    learnMore: "Läs mer om Digital Nomad Visum"
  },
  faq: {
    badge: "Vanliga Frågor",
    headline: "Vanliga Frågor",
    subheadline: "Få snabba svar på de vanligaste frågorna om att köpa fastighet i Spanien.",
    searchPlaceholder: "Sök frågor...",
    noResults: "Inga frågor hittades för",
    stillQuestions: "Har du fortfarande frågor?",
    teamHelp: "Vårt team finns här för att hjälpa dig.",
    contactUs: "Kontakta Oss",
    items: [
      { question: "Kan utlänningar köpa fastighet i Spanien?", answer: "Ja, det finns inga begränsningar för utlänningar som köper fastighet i Spanien. Du behöver ett NIE (skatteidentifikationsnummer) för att slutföra köpet." },
      { question: "Vad är ett NIE och hur får jag ett?", answer: "Ett NIE är ett skatteidentifikationsnummer som krävs för alla finansiella transaktioner i Spanien. Processen tar vanligtvis 1-2 veckor." },
      { question: "Vilka är de totala kostnaderna för att köpa fastighet?", answer: "Totala köpkostnader ligger vanligtvis på 10-13% av köpeskillingen." },
      { question: "Vad är det spanska Digital Nomad Visumet?", answer: "Digital Nomad Visumet ger uppehållstillstånd till distansarbetare som tjänar minst €2 520/månad från icke-spanska företag." },
      { question: "Måste jag vara i Spanien för att köpa fastighet?", answer: "Nej, du kan ge fullmakt till en pålitlig representant som kan slutföra köpet för din räkning." },
      { question: "Hur lång tid tar köpprocessen?", answer: "Ett typiskt fastighetsköp i Spanien tar 2-3 månader från accepterat bud till slutförande." },
      { question: "Kan jag få bolån i Spanien som utlänning?", answer: "Ja, spanska banker erbjuder bolån till icke-residenter, vanligtvis upp till 60-70% av fastighetsvärdet." },
      { question: "Vilka löpande kostnader bör jag förvänta mig?", answer: "Årliga kostnader inkluderar IBI fastighetsskatt, samfällighetsavgifter och hemförsäkring." }
    ]
  },
  cta: {
    badge: "Redo att Börja?",
    headline: "Låt Oss Guida Dig",
    headlineHighlight: "Hem",
    subheadline: "Vårt flerspråkiga team har hjälpt hundratals internationella köpare hitta sin perfekta fastighet på Costa del Sol.",
    trustSignals: { api: "API Ackrediterad", experience: "15+ Års Erfarenhet", buyers: "500+ Nöjda Köpare" },
    phone: { label: "Ring eller WhatsApp", number: "+34 630 03 90 90" },
    email: { label: "Maila oss", address: "info@delsolprimehomes.com" },
    testimonial: { quote: "Del Sol Prime Homes gjorde vår dröm om ett hem i Spanien till verklighet.", author: "Michael & Sarah Thompson" },
    form: { title: "Starta Din Kostnadsfria Konsultation", description: "Diskutera dina krav med våra fastighetsexperter.", schedule: "Chatta med Emma", browse: "Bläddra Tillgängliga Fastigheter", download: "Ladda ner PDF Guide", secure: "Din information är säker", freeConsultation: "Kostnadsfri Konsultation" }
  }
};
