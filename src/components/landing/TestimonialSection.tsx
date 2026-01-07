import React from 'react';
import { useParams } from 'react-router-dom';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const TestimonialSection: React.FC = () => {
    const { lang } = useParams();

    const content = {
        en: {
            heading: "A calm, pressure-free experience — according to our clients",
            testimonials: [
                {
                    rating: 5,
                    text: "Emma really understood our needs and offered us clear choices.",
                    author: "Peter & Anne",
                    location: "Netherlands"
                },
                {
                    rating: 5,
                    text: "The process was smooth and we never felt pressured.",
                    author: "Lars & Ingrid",
                    location: "Sweden"
                },
                {
                    rating: 5,
                    text: "Highly recommended for anyone wanting a guided property search.",
                    author: "Thomas & Marie",
                    location: "France"
                }
            ]
        },
        nl: {
            heading: "Een kalme, ongedwongen ervaring — volgens onze klanten",
            testimonials: [
                {
                    rating: 5,
                    text: "Emma begreep onze behoeften echt en bood ons duidelijke keuzes.",
                    author: "Peter & Anne",
                    location: "Nederland"
                },
                {
                    rating: 5,
                    text: "Het proces verliep soepel en we voelden ons nooit onder druk gezet.",
                    author: "Lars & Ingrid",
                    location: "Zweden"
                },
                {
                    rating: 5,
                    text: "Sterk aanbevolen voor iedereen die een begeleide vastgoedzoektocht wil.",
                    author: "Thomas & Marie",
                    location: "Frankrijk"
                }
            ]
        },
        fr: {
            heading: "Une expérience calme et sans pression — selon nos clients",
            testimonials: [
                {
                    rating: 5,
                    text: "Emma a vraiment compris nos besoins et nous a offert des choix clairs.",
                    author: "Peter & Anne",
                    location: "Pays-Bas"
                },
                {
                    rating: 5,
                    text: "Le processus s'est déroulé sans heurts et nous ne nous sommes jamais sentis pressés.",
                    author: "Lars & Ingrid",
                    location: "Suède"
                },
                {
                    rating: 5,
                    text: "Hautement recommandé pour tous ceux qui souhaitent une recherche immobilière guidée.",
                    author: "Thomas & Marie",
                    location: "France"
                }
            ]
        },
        de: {
            heading: "Eine ruhige, druckfreie Erfahrung — laut unseren Kunden",
            testimonials: [
                {
                    rating: 5,
                    text: "Emma verstand unsere Bedürfnisse wirklich und bot uns klare Auswahlmöglichkeiten.",
                    author: "Peter & Anne",
                    location: "Niederlande"
                },
                {
                    rating: 5,
                    text: "Der Prozess verlief reibungslos und wir fühlten uns nie unter Druck gesetzt.",
                    author: "Lars & Ingrid",
                    location: "Schweden"
                },
                {
                    rating: 5,
                    text: "Sehr empfehlenswert für alle, die eine geführte Immobiliensuche wünschen.",
                    author: "Thomas & Marie",
                    location: "Frankreich"
                }
            ]
        },
        pl: {
            heading: "Spokojna, pozbawiona presji doświadczenie — według naszych klientów",
            testimonials: [
                {
                    rating: 5,
                    text: "Emma naprawdę zrozumiała nasze potrzeby i zaoferowała nam jasne wybory.",
                    author: "Peter & Anne",
                    location: "Holandia"
                },
                {
                    rating: 5,
                    text: "Proces przebiegał płynnie i nigdy nie czuliśmy się pod presją.",
                    author: "Lars & Ingrid",
                    location: "Szwecja"
                },
                {
                    rating: 5,
                    text: "Gorąco polecane dla każdego, kto chce kierowanego poszukiwania nieruchomości.",
                    author: "Thomas & Marie",
                    location: "Francja"
                }
            ]
        },
        sv: {
            heading: "En lugn, tryckfri upplevelse — enligt våra kunder",
            testimonials: [
                {
                    rating: 5,
                    text: "Emma förstod verkligen våra behov och erbjöd oss tydliga val.",
                    author: "Peter & Anne",
                    location: "Nederländerna"
                },
                {
                    rating: 5,
                    text: "Processen gick smidigt och vi kände oss aldrig pressade.",
                    author: "Lars & Ingrid",
                    location: "Sverige"
                },
                {
                    rating: 5,
                    text: "Starkt rekommenderat för alla som vill ha en guidad fastighetssökning.",
                    author: "Thomas & Marie",
                    location: "Frankrike"
                }
            ]
        },
        da: {
            heading: "En rolig, trykfri oplevelse — ifølge vores kunder",
            testimonials: [
                {
                    rating: 5,
                    text: "Emma forstod virkelig vores behov og tilbød os klare valg.",
                    author: "Peter & Anne",
                    location: "Holland"
                },
                {
                    rating: 5,
                    text: "Processen gik glat, og vi følte os aldrig presset.",
                    author: "Lars & Ingrid",
                    location: "Sverige"
                },
                {
                    rating: 5,
                    text: "Stærkt anbefalet til alle, der ønsker en vejledt ejendomssøgning.",
                    author: "Thomas & Marie",
                    location: "Frankrig"
                }
            ]
        },
        fi: {
            heading: "Rauhallinen, paineetonta kokemus — asiakkaidemme mukaan",
            testimonials: [
                {
                    rating: 5,
                    text: "Emma ymmärsi todella tarpeemme ja tarjosi meille selkeitä vaihtoehtoja.",
                    author: "Peter & Anne",
                    location: "Alankomaat"
                },
                {
                    rating: 5,
                    text: "Prosessi sujui sujuvasti, emmekä koskaan tunteneet painetta.",
                    author: "Lars & Ingrid",
                    location: "Ruotsi"
                },
                {
                    rating: 5,
                    text: "Erittäin suositeltavaa kaikille, jotka haluavat ohjattua kiinteistöhakua.",
                    author: "Thomas & Marie",
                    location: "Ranska"
                }
            ]
        },
        hu: {
            heading: "Nyugodt, nyomásmentes élmény — ügyfeleink szerint",
            testimonials: [
                {
                    rating: 5,
                    text: "Emma valóban megértette igényeinket és világos választási lehetőségeket kínált.",
                    author: "Peter & Anne",
                    location: "Hollandia"
                },
                {
                    rating: 5,
                    text: "A folyamat zökkenőmentes volt, és soha nem éreztük nyomás alatt magunkat.",
                    author: "Lars & Ingrid",
                    location: "Svédország"
                },
                {
                    rating: 5,
                    text: "Erősen ajánlott mindenkinek, aki vezetett ingatlankeresést szeretne.",
                    author: "Thomas & Marie",
                    location: "Franciaország"
                }
            ]
        },
        no: {
            heading: "En rolig, trykkfri opplevelse — ifølge våre klienter",
            testimonials: [
                {
                    rating: 5,
                    text: "Emma forsto virkelig våre behov og tilbød oss klare valg.",
                    author: "Peter & Anne",
                    location: "Nederland"
                },
                {
                    rating: 5,
                    text: "Prosessen gikk smidig og vi følte oss aldri presset.",
                    author: "Lars & Ingrid",
                    location: "Sverige"
                },
                {
                    rating: 5,
                    text: "Sterkt anbefalt for alle som ønsker en veiledet eiendomssøk.",
                    author: "Thomas & Marie",
                    location: "Frankrike"
                }
            ]
        }
    };

    const currentContent = content[lang as keyof typeof content] || content.en;

    return (
        <section className="py-16 md:py-24 bg-gray-50">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-center text-gray-900 mb-12 md:mb-16">
                    {currentContent.heading}
                </h2>

                {/* MOBILE: Carousel */}
                <div className="md:hidden">
                    <Carousel opts={{ loop: true }}>
                        <CarouselContent>
                            {currentContent.testimonials.map((testimonial, index) => (
                                <CarouselItem key={index}>
                                    <TestimonialCard testimonial={testimonial} />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <div className="flex justify-center gap-2 mt-6">
                            <CarouselPrevious className="relative left-0 translate-x-0" />
                            <CarouselNext className="relative right-0 translate-x-0" />
                        </div>
                    </Carousel>
                </div>

                {/* DESKTOP: Grid */}
                <div className="hidden md:grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {currentContent.testimonials.map((testimonial, index) => (
                        <TestimonialCard key={index} testimonial={testimonial} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const TestimonialCard: React.FC<{ testimonial: any }> = ({ testimonial }) => (
    <div className="bg-white rounded-2xl p-8 shadow-lg h-full flex flex-col">
        <div className="flex gap-1 mb-4">
            {[...Array(testimonial.rating)].map((_, i) => (
                <span key={i} className="text-primary text-xl">★</span>
            ))}
        </div>
        <p className="text-gray-700 mb-6 italic flex-1">
            "{testimonial.text}"
        </p>
        <div className="border-t pt-4">
            <p className="font-semibold text-gray-900">{testimonial.author}</p>
            <p className="text-sm text-gray-600">{testimonial.location}</p>
        </div>
    </div>
);

export default TestimonialSection;
