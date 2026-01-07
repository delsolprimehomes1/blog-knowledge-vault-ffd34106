import React from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface PrePropertiesActionProps {
    onOpenChat: () => void;
}

const PrePropertiesAction: React.FC<PrePropertiesActionProps> = ({ onOpenChat }) => {
    const { lang } = useParams();

    const content = {
        en: {
            heading: "Start with clarity — then explore the right properties",
            body: "Emma can answer your questions (lifestyle, legal steps, documents) and carefully record your criteria for our team.",
            cta: "Get clarity & a personal shortlist with Emma",
            microcopy: "Ask questions · Share your preferences · No obligation"
        },
        nl: {
            heading: "Begin met duidelijkheid — verken dan de juiste woningen",
            body: "Emma kan uw vragen beantwoorden (levensstijl, juridische stappen, documenten) en uw criteria zorgvuldig vastleggen voor ons team.",
            cta: "Krijg duidelijkheid en een persoonlijke selectie met Emma",
            microcopy: "Stel vragen · Deel uw voorkeuren · Geen verplichting"
        },
        fr: {
            heading: "Commencez par la clarté — puis explorez les bonnes propriétés",
            body: "Emma peut répondre à vos questions (style de vie, démarches juridiques, documents) et enregistrer soigneusement vos critères pour notre équipe.",
            cta: "Obtenez de la clarté et une liste personnalisée avec Emma",
            microcopy: "Posez des questions · Partagez vos préférences · Aucune obligation"
        },
        de: {
            heading: "Beginnen Sie mit Klarheit — erkunden Sie dann die richtigen Immobilien",
            body: "Emma kann Ihre Fragen beantworten (Lebensstil, rechtliche Schritte, Dokumente) und Ihre Kriterien sorgfältig für unser Team aufzeichnen.",
            cta: "Erhalten Sie Klarheit und eine persönliche Auswahl mit Emma",
            microcopy: "Fragen stellen · Ihre Präferenzen teilen · Keine Verpflichtung"
        },
        pl: {
            heading: "Zacznij od jasności — a potem poznaj odpowiednie nieruchomości",
            body: "Emma może odpowiedzieć na Twoje pytania (styl życia, kroki prawne, dokumenty) i starannie zapisać Twoje kryteria dla naszego zespołu.",
            cta: "Uzyskaj jasność i osobistą listę z Emmą",
            microcopy: "Zadawaj pytania · Podziel się preferencjami · Bez zobowiązań"
        },
        sv: {
            heading: "Börja med klarhet — utforska sedan rätt fastigheter",
            body: "Emma kan svara på dina frågor (livsstil, juridiska steg, dokument) och noggrant registrera dina kriterier för vårt team.",
            cta: "Få klarhet och en personlig lista med Emma",
            microcopy: "Ställ frågor · Dela dina preferenser · Ingen förpliktelse"
        },
        da: {
            heading: "Start med klarhed — og udforsk derefter de rigtige ejendomme",
            body: "Emma kan besvare dine spørgsmål (livsstil, juridiske trin, dokumenter) og omhyggeligt registrere dine kriterier for vores team.",
            cta: "Få klarhed og en personlig liste med Emma",
            microcopy: "Stil spørgsmål · Del dine præferencer · Ingen forpligtelse"
        },
        fi: {
            heading: "Aloita selkeydellä — ja tutustu sitten oikeisiin kiinteistöihin",
            body: "Emma voi vastata kysymyksiisi (elämäntapa, oikeudelliset vaiheet, asiakirjat) ja tallentaa huolellisesti kriteerisi tiimillemme.",
            cta: "Saa selkeyttä ja henkilökohtainen lista Emman kanssa",
            microcopy: "Kysy kysymyksiä · Jaa mieltymyksesi · Ei velvoitetta"
        },
        hu: {
            heading: "Kezdje a tisztánlátással — majd fedezze fel a megfelelő ingatlanokat",
            body: "Emma válaszolhat kérdéseire (életmód, jogi lépések, dokumentumok) és gondosan rögzítheti kritériumait csapatunk számára.",
            cta: "Szerezzen tisztánlátást és személyes listát Emmával",
            microcopy: "Tegyen fel kérdéseket · Ossza meg preferenciáit · Nincs kötelezettség"
        },
        no: {
            heading: "Start med klarhet — og utforsk deretter de riktige eiendommene",
            body: "Emma kan svare på spørsmålene dine (livsstil, juridiske trinn, dokumenter) og nøye registrere kriteriene dine for teamet vårt.",
            cta: "Få klarhet og en personlig liste med Emma",
            microcopy: "Still spørsmål · Del preferansene dine · Ingen forpliktelse"
        }
    };

    const currentContent = content[lang as keyof typeof content] || content.en;

    return (
        <section className="py-12 md:py-16 bg-white">
            <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto text-center space-y-6">
                    <h2 className="text-2xl md:text-3xl font-serif text-gray-900">
                        {currentContent.heading}
                    </h2>

                    <p className="text-gray-700 text-lg">
                        {currentContent.body}
                    </p>

                    <Button
                        onClick={onOpenChat}
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-lg shadow-xl text-lg"
                    >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        {currentContent.cta}
                    </Button>

                    <p className="text-sm text-gray-600">
                        {currentContent.microcopy}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default PrePropertiesAction;
