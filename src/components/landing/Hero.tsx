import React from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlayCircle, Check } from 'lucide-react';

interface HeroProps {
    onStartChat: () => void;
    onOpenVideo: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStartChat, onOpenVideo }) => {
    const { lang } = useParams();

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

    return (
        <section className="relative bg-gradient-to-br from-primary/10 via-blue-50 to-white py-12 md:py-24">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row md:items-center md:gap-12 lg:gap-16">

                    {/* LEFT COLUMN */}
                    <div className="flex-1 space-y-6 md:space-y-8">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-gray-900 leading-tight">
                            {currentContent.headline}
                        </h1>

                        <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                            {currentContent.subheadline}
                        </p>

                        {/* Bullets - Desktop only */}
                        <div className="hidden md:flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                <span className="text-gray-700">{currentContent.bullet1}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                <span className="text-gray-700">{currentContent.bullet2}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                <span className="text-gray-700">{currentContent.bullet3}</span>
                            </div>
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 sm:flex-initial">
                                <Button
                                    onClick={onStartChat}
                                    size="lg"
                                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-lg shadow-xl"
                                >
                                    <span className="mr-2">👉</span>
                                    {currentContent.primaryCTA}
                                </Button>
                                <p className="text-sm text-gray-600 mt-2 text-center sm:text-left">
                                    {currentContent.primaryMicro}
                                </p>
                            </div>

                            <Button
                                onClick={onOpenVideo}
                                size="lg"
                                variant="outline"
                                className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-6 text-lg rounded-lg"
                            >
                                <PlayCircle className="w-5 h-5 mr-2" />
                                {currentContent.secondaryCTA}
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - Desktop only */}
                    <div className="hidden md:block flex-1 mt-8 md:mt-0">
                        <div className="rounded-3xl shadow-2xl w-full aspect-[4/3] bg-gradient-to-br from-primary/20 via-blue-100 to-primary/10 flex items-center justify-center overflow-hidden">
                            <img
                                src="/images/hero-desktop.jpg"
                                alt="Luxury Costa del Sol lifestyle"
                                className="w-full h-full object-cover"
                                onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
