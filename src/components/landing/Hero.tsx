import React from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlayCircle, Check } from 'lucide-react';

interface HeroProps {
    onStartChat: () => void;
    onOpenVideo: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStartChat, onOpenVideo }) => {
    const params = useParams();
    const lang = params.lang || window.location.pathname.split('/')[1] || 'en';

    console.log('Hero - Language detected:', lang);

    const content = {
        en: {
            headline: "Living on the Costa del Sol — guided, personal and pressure-free",
            subheadline: "A curated selection of new-build apartments and villas, matched to your lifestyle, budget and long-term plans — with independent guidance from first conversation to key handover.",
            bullet1: "Independent project selection",
            bullet2: "No pressure · No obligation",
            bullet3: "Service fully paid by developers",
            primaryCTA: "Get your private, pressure-free property shortlist",
            primaryMicro: "Prepared in 2 minutes · No obligation",
            secondaryCTA: "Watch our 60-second introduction"
        },
        nl: {
            headline: "Wonen aan de Costa del Sol — begeleid, persoonlijk en zonder druk",
            subheadline: "Een zorgvuldig geselecteerde selectie van nieuwbouwappartementen en villa's, afgestemd op uw levensstijl, budget en langetermijnplannen — met onafhankelijke begeleiding van het eerste gesprek tot de sleuteloverdracht.",
            bullet1: "Onafhankelijke projectselectie",
            bullet2: "Geen druk · Geen verplichting",
            bullet3: "Service volledig betaald door ontwikkelaars",
            primaryCTA: "Krijg uw persoonlijke woningselectie zonder druk",
            primaryMicro: "Voorbereid in 2 minuten · Geen verplichting",
            secondaryCTA: "Bekijk onze 60-seconden introductie"
        },
        fr: {
            headline: "Vivre sur la Costa del Sol — guidé, personnel et sans pression",
            subheadline: "Une sélection soigneusement choisie d'appartements et de villas neufs, adaptée à votre style de vie, votre budget et vos projets à long terme — avec un accompagnement indépendant de la première conversation à la remise des clés.",
            bullet1: "Sélection de projets indépendante",
            bullet2: "Aucune pression · Aucune obligation",
            bullet3: "Service entièrement payé par les promoteurs",
            primaryCTA: "Obtenez votre sélection de propriétés privée et sans pression",
            primaryMicro: "Préparé en 2 minutes · Sans engagement",
            secondaryCTA: "Regardez notre introduction de 60 secondes"
        },
        de: {
            headline: "Leben an der Costa del Sol — geführt, persönlich und druckfrei",
            subheadline: "Eine sorgfältig ausgewählte Auswahl an Neubauwohnungen und Villen, abgestimmt auf Ihren Lebensstil, Ihr Budget und Ihre langfristigen Pläne — mit unabhängiger Beratung vom ersten Gespräch bis zur Schlüsselübergabe.",
            bullet1: "Unabhängige Projektauswahl",
            bullet2: "Kein Druck · Keine Verpflichtung",
            bullet3: "Service vollständig von Entwicklern bezahlt",
            primaryCTA: "Erhalten Sie Ihre private, druckfreie Immobilienauswahl",
            primaryMicro: "In 2 Minuten vorbereitet · Unverbindlich",
            secondaryCTA: "Sehen Sie unsere 60-Sekunden-Einführung"
        },
        pl: {
            headline: "Życie na Costa del Sol — prowadzone, osobiste i bez presji",
            subheadline: "Starannie dobrana selekcja nowych apartamentów i willi, dopasowana do Twojego stylu życia, budżetu i długoterminowych planów — z niezależnym doradztwem od pierwszej rozmowy do przekazania kluczy.",
            bullet1: "Niezależny wybór projektów",
            bullet2: "Bez presji · Bez zobowiązań",
            bullet3: "Usługa w pełni opłacona przez deweloperów",
            primaryCTA: "Otrzymaj swoją prywatną listę nieruchomości bez presji",
            primaryMicro: "Przygotowane w 2 minuty · Bez zobowiązań",
            secondaryCTA: "Zobacz nasze 60-sekundowe wprowadzenie"
        },
        sv: {
            headline: "Bo på Costa del Sol — vägledd, personlig och tryckfri",
            subheadline: "Ett noggrant utvalt urval av nybyggda lägenheter och villor, anpassade till din livsstil, budget och långsiktiga planer — med oberoende vägledning från första samtalet till nyckelöverlämnandet.",
            bullet1: "Oberoende projektval",
            bullet2: "Ingen press · Ingen förpliktelse",
            bullet3: "Tjänsten helt betald av utvecklare",
            primaryCTA: "Få din privata, tryckfria fastighetslista",
            primaryMicro: "Förberedd på 2 minuter · Ingen förpliktelse",
            secondaryCTA: "Se vår 60-sekunders introduktion"
        },
        da: {
            headline: "Bo på Costa del Sol — vejledt, personlig og trykfri",
            subheadline: "Et omhyggeligt udvalgt udvalg af nybyggede lejligheder og villaer, tilpasset din livsstil, budget og langsigtede planer — med uafhængig vejledning fra første samtale til nøgleoverdragelse.",
            bullet1: "Uafhængigt projektvalg",
            bullet2: "Intet pres · Ingen forpligtelse",
            bullet3: "Service fuldt betalt af udviklere",
            primaryCTA: "Få din private, trykfri ejendomsliste",
            primaryMicro: "Forberedt på 2 minutter · Ingen forpligtelse",
            secondaryCTA: "Se vores 60-sekunders introduktion"
        },
        fi: {
            headline: "Asuminen Costa del Solilla — ohjattua, henkilökohtaista ja paineetonta",
            subheadline: "Huolellisesti valikoitu valikoima uusia asuntoja ja huviloita, räätälöity elämäntapaasi, budjettisi ja pitkän aikavälin suunnitelmia varten — itsenäisellä ohjauksella ensimmäisestä keskustelusta avainten luovutukseen.",
            bullet1: "Riippumaton projektin valinta",
            bullet2: "Ei painetta · Ei velvoitetta",
            bullet3: "Palvelu täysin kehittäjien maksama",
            primaryCTA: "Hanki yksityinen, paineeton kiinteistölistasi",
            primaryMicro: "Valmisteltu 2 minuutissa · Ei velvoitetta",
            secondaryCTA: "Katso 60 sekunnin esittelymme"
        },
        hu: {
            headline: "Élet a Costa del Solon — vezetett, személyes és nyomásmentes",
            subheadline: "Gondosan válogatott új építésű apartmanok és villák, az Ön életstílusához, költségvetéséhez és hosszú távú terveihez igazítva — független tanácsadással az első beszélgetéstől a kulcsátadásig.",
            bullet1: "Független projekt kiválasztás",
            bullet2: "Nincs nyomás · Nincs kötelezettség",
            bullet3: "Szolgáltatást teljes mértékben a fejlesztők fizetik",
            primaryCTA: "Szerezze meg privát, nyomásmentes ingatlanlistáját",
            primaryMicro: "2 perc alatt elkészítve · Kötelezettség nélkül",
            secondaryCTA: "Nézze meg 60 másodperces bemutatónkat"
        },
        no: {
            headline: "Bo på Costa del Sol — veiledet, personlig og trykkfri",
            subheadline: "Et nøye utvalgt utvalg av nybyggede leiligheter og villaer, tilpasset din livsstil, budsjett og langsiktige planer — med uavhengig veiledning fra første samtale til nøkkeloverlevering.",
            bullet1: "Uavhengig prosjektvalg",
            bullet2: "Intet press · Ingen forpliktelse",
            bullet3: "Tjeneste fullt betalt av utviklere",
            primaryCTA: "Få din private, trykkfrie eiendomsliste",
            primaryMicro: "Forberedt på 2 minutter · Ingen forpliktelse",
            secondaryCTA: "Se vår 60-sekunders introduksjon"
        }
    };

    const currentContent = content[lang as keyof typeof content] || content.en;

    // Curated luxury Costa del Sol images
    const heroImages = {
        en: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80', // Marbella luxury villa
        nl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80', // Mediterranean pool
        fr: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', // Modern villa exterior
        de: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80', // Luxury terrace
        pl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80', // Beach villa
        sv: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80', // Infinity pool
        da: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80', // Mediterranean garden
        fi: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1200&q=80', // Coastal view
        hu: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80', // Marina yachts
        no: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80'  // Luxury living
    };

    const currentImage = heroImages[lang as keyof typeof heroImages] || heroImages.en;

    // Translations for alt text
    const altTexts = {
        en: 'Luxury coastal living on Costa del Sol',
        nl: 'Luxe kustleven aan de Costa del Sol',
        fr: 'Vie côtière de luxe sur la Costa del Sol',
        de: 'Luxuriöses Küstenleben an der Costa del Sol',
        pl: 'Luksusowe życie nadmorskie na Costa del Sol',
        sv: 'Lyxigt kustliv på Costa del Sol',
        da: 'Luksus kystliv på Costa del Sol',
        fi: 'Ylellinen rannikkoelämä Costa del Solilla',
        hu: 'Luxus tengerparti élet a Costa del Solon',
        no: 'Luksuriøst kystliv på Costa del Sol'
    };

    const currentAlt = altTexts[lang as keyof typeof altTexts] || altTexts.en;

    return (
        <section className="relative min-h-[600px] md:min-h-[700px] bg-gradient-to-br from-gray-50 to-white overflow-hidden">
            <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12">

                    {/* Left Column - Text Content */}
                    <div className="flex-1 space-y-6 md:space-y-8">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-gray-900 leading-tight">
                            {currentContent.headline}
                        </h1>

                        <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                            {currentContent.subheadline}
                        </p>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 text-gray-700">
                                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                {currentContent.bullet1}
                            </div>
                            <div className="flex items-center gap-3 text-gray-700">
                                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                {currentContent.bullet2}
                            </div>
                            <div className="flex items-center gap-3 text-gray-700">
                                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                {currentContent.bullet3}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Button
                                onClick={onStartChat}
                                size="lg"
                                className="px-8 py-6 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-lg transition-all text-lg h-auto"
                            >
                                <span className="mr-2">👉</span>
                                {currentContent.primaryCTA}
                            </Button>
                            <Button
                                onClick={onOpenVideo}
                                size="lg"
                                variant="outline"
                                className="px-8 py-6 border-2 border-primary text-primary hover:bg-primary/5 font-semibold rounded-lg transition-all text-lg h-auto"
                            >
                                <PlayCircle className="w-5 h-5 mr-2" />
                                {currentContent.secondaryCTA}
                            </Button>
                        </div>

                        <p className="text-sm text-gray-500">
                            {currentContent.primaryMicro}
                        </p>
                    </div>

                    {/* Right Column - Hero Image */}
                    <div className="flex-1 w-full lg:w-auto mt-8 lg:mt-0 relative">
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl transform hover:scale-[1.01] transition-transform duration-500">
                            <div className="aspect-[4/3] w-full relative">
                                <img
                                    src={currentImage}
                                    alt={currentAlt}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    loading="eager"
                                />
                                {/* Gradient overlay for depth */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </div>

                        {/* Decorative elements */}
                        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
                        <div className="absolute -top-6 -left-6 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -z-10" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
