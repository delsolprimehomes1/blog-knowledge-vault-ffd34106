import React from 'react';
import { useParams } from 'react-router-dom';

const ExplainerVideo: React.FC = () => {
    const { lang } = useParams();

    const content = {
        en: {
            heading: "How our guided, pressure-free approach works",
            subheading: "In 60 seconds, you'll understand our process and what happens next.",
            microcopy: "Emma answers your questions and carefully records your criteria — before any call takes place."
        },
        nl: {
            heading: "Hoe onze begeleide, ongedwongen aanpak werkt",
            subheading: "In 60 seconden begrijpt u ons proces en wat er daarna gebeurt.",
            microcopy: "Emma beantwoordt uw vragen en legt uw criteria zorgvuldig vast — voordat er een telefoongesprek plaatsvindt."
        },
        fr: {
            heading: "Comment fonctionne notre approche guidée et sans pression",
            subheading: "En 60 secondes, vous comprendrez notre processus et ce qui se passe ensuite.",
            microcopy: "Emma répond à vos questions et enregistre soigneusement vos critères — avant tout appel."
        },
        de: {
            heading: "Wie unser geführter, druckfreier Ansatz funktioniert",
            subheading: "In 60 Sekunden verstehen Sie unseren Prozess und was als nächstes passiert.",
            microcopy: "Emma beantwortet Ihre Fragen und zeichnet sorgfältig Ihre Kriterien auf — bevor ein Anruf stattfindet."
        },
        pl: {
            heading: "Jak działa nasze kierowane, pozbawione presji podejście",
            subheading: "W 60 sekund zrozumiesz nasz proces i co się dzieje dalej.",
            microcopy: "Emma odpowiada na Twoje pytania i starannie zapisuje Twoje kryteria — zanim odbędzie się jakikolwiek telefon."
        },
        sv: {
            heading: "Hur vårt vägledda, tryckfria tillvägagångssätt fungerar",
            subheading: "På 60 sekunder förstår du vår process och vad som händer härnäst.",
            microcopy: "Emma svarar på dina frågor och registrerar noggrant dina kriterier — innan något samtal äger rum."
        },
        da: {
            heading: "Sådan fungerer vores vejledede, trykfri tilgang",
            subheading: "På 60 sekunder forstår du vores proces og hvad der sker næste gang.",
            microcopy: "Emma besvarer dine spørgsmål og registrerer omhyggeligt dine kriterier — før der finder et opkald sted."
        },
        fi: {
            heading: "Miten ohjattu, paineeton lähestymistapamme toimii",
            subheading: "60 sekunnissa ymmärrät prosessimme ja mitä tapahtuu seuraavaksi.",
            microcopy: "Emma vastaa kysymyksiisi ja tallentaa huolellisesti kriteerisi — ennen kuin yhtään puhelua tapahtuu."
        },
        hu: {
            heading: "Hogyan működik vezetett, nyomásmentes megközelítésünk",
            subheading: "60 másodperc alatt megérted folyamatunkat és mi történik ezután.",
            microcopy: "Emma válaszol kérdéseire és gondosan rögzíti kritériumait — mielőtt bármilyen hívás megtörténne."
        },
        no: {
            heading: "Slik fungerer vår veiledede, trykkfrie tilnærming",
            subheading: "På 60 sekunder forstår du vår prosess og hva som skjer neste gang.",
            microcopy: "Emma svarer på spørsmålene dine og registrerer nøye kriteriene dine — før noen samtale finner sted."
        }
    };

    const currentContent = content[lang as keyof typeof content] || content.en;

    return (
        <section id="explainer-video" className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
                            {currentContent.heading}
                        </h2>
                        <p className="text-gray-600">
                            {currentContent.subheading}
                        </p>
                    </div>

                    <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-900 aspect-video">
                        <video className="w-full h-full" controls poster="/images/video-poster.jpg">
                            <source src="/videos/intro-video.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>

                    <p className="text-sm text-gray-600 text-center mt-6">
                        {currentContent.microcopy}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default ExplainerVideo;
