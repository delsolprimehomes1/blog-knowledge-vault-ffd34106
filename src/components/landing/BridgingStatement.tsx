import React from 'react';
import { useParams } from 'react-router-dom';

const BridgingStatement: React.FC = () => {
    const { lang } = useParams();

    const content = {
        en: "Get clear answers to all your questions — and have your criteria carefully recorded, so we can guide you properly from the very first step.",
        nl: "Krijg duidelijke antwoorden op al uw vragen — en laat uw criteria zorgvuldig vastleggen, zodat we u vanaf de allereerste stap goed kunnen begeleiden.",
        fr: "Obtenez des réponses claires à toutes vos questions — et faites enregistrer vos critères avec soin, afin que nous puissions vous guider correctement dès la première étape.",
        de: "Erhalten Sie klare Antworten auf all Ihre Fragen — und lassen Sie Ihre Kriterien sorgfältig aufzeichnen, damit wir Sie vom allerersten Schritt an richtig begleiten können.",
        pl: "Uzyskaj jasne odpowiedzi na wszystkie swoje pytania — i pozwól nam starannie zapisać Twoje kryteria, abyśmy mogli właściwie prowadzić Cię od samego pierwszego kroku.",
        sv: "Få tydliga svar på alla dina frågor — och låt dina kriterier noggrant registreras, så att vi kan vägleda dig korrekt från första steg.",
        da: "Få klare svar på alle dine spørgsmål — og få dine kriterier omhyggeligt registreret, så vi kan guide dig korrekt fra allerførste skridt.",
        fi: "Saa selkeät vastaukset kaikkiin kysymyksiisi — ja anna kriteerisi tallentaa huolellisesti, jotta voimme opastaa sinua oikein ensimmäisestä vaiheesta alkaen.",
        hu: "Kapjon világos válaszokat minden kérdésére — és rögzítsük gondosan kritériumait, hogy az első lépéstől kezdve megfelelően tudja vezetni Önt.",
        no: "Få klare svar på alle spørsmålene dine — og få kriteriene dine nøye registrert, slik at vi kan veilede deg riktig fra det aller første trinnet."
    };

    const currentContent = content[lang as keyof typeof content] || content.en;

    return (
        <section className="py-12 md:py-16 bg-gradient-to-br from-primary/5 to-blue-50">
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-light">
                        {currentContent}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default BridgingStatement;
