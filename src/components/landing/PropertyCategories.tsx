import React from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, Home } from 'lucide-react';

const PropertyCategories: React.FC = () => {
    const { lang } = useParams();

    const content = {
        en: {
            heading: "A small curated selection of projects",
            subheading: "Choose a category below — we only present developments that meet our quality criteria.",
            apartments: {
                title: "Apartments & Penthouses",
                description: "Modern developments with amenities, views and resort lifestyle",
                cta: "View apartments"
            },
            villas: {
                title: "Townhouses & Villas",
                description: "Private homes with space, privacy and architectural character",
                cta: "View villas & houses"
            }
        },
        nl: {
            heading: "Een kleine, zorgvuldig geselecteerde selectie projecten",
            subheading: "Kies hieronder een categorie — we presenteren alleen ontwikkelingen die aan onze kwaliteitscriteria voldoen.",
            apartments: {
                title: "Appartementen & Penthouses",
                description: "Moderne ontwikkelingen met voorzieningen, uitzicht en resort lifestyle",
                cta: "Bekijk appartementen"
            },
            villas: {
                title: "Townhouses & Villa's",
                description: "Privéwoningen met ruimte, privacy en architectonisch karakter",
                cta: "Bekijk villa's en huizen"
            }
        },
        fr: {
            heading: "Une petite sélection soigneusement choisie de projets",
            subheading: "Choisissez une catégorie ci-dessous — nous ne présentons que des développements répondant à nos critères de qualité.",
            apartments: {
                title: "Appartements & Penthouses",
                description: "Développements modernes avec commodités, vues et style de vie resort",
                cta: "Voir les appartements"
            },
            villas: {
                title: "Maisons de ville & Villas",
                description: "Maisons privées avec espace, intimité et caractère architectural",
                cta: "Voir les villas et maisons"
            }
        },
        de: {
            heading: "Eine kleine, sorgfältig ausgewählte Auswahl an Projekten",
            subheading: "Wählen Sie unten eine Kategorie — wir präsentieren nur Entwicklungen, die unseren Qualitätskriterien entsprechen.",
            apartments: {
                title: "Apartments & Penthäuser",
                description: "Moderne Entwicklungen mit Annehmlichkeiten, Aussicht und Resort-Lifestyle",
                cta: "Apartments ansehen"
            },
            villas: {
                title: "Reihenhäuser & Villen",
                description: "Private Häuser mit Raum, Privatsphäre und architektonischem Charakter",
                cta: "Villen und Häuser ansehen"
            }
        },
        pl: {
            heading: "Niewielka, starannie dobrana selekcja projektów",
            subheading: "Wybierz kategorię poniżej — prezentujemy tylko inwestycje spełniające nasze kryteria jakości.",
            apartments: {
                title: "Apartamenty i Penthouse'y",
                description: "Nowoczesne inwestycje z udogodnieniami, widokami i stylem życia resort",
                cta: "Zobacz apartamenty"
            },
            villas: {
                title: "Domy szeregowe i Wille",
                description: "Prywatne domy z przestrzenią, prywatnością i charakterem architektonicznym",
                cta: "Zobacz wille i domy"
            }
        },
        sv: {
            heading: "Ett litet, noggrant utvalt urval av projekt",
            subheading: "Välj en kategori nedan — vi presenterar endast utvecklingar som uppfyller våra kvalitetskriterier.",
            apartments: {
                title: "Lägenheter & Takvåningar",
                description: "Moderna utvecklingar med bekvämligheter, utsikt och resort-livsstil",
                cta: "Se lägenheter"
            },
            villas: {
                title: "Radhus & Villor",
                description: "Privata hem med utrymme, integritet och arkitektonisk karaktär",
                cta: "Se villor och hus"
            }
        },
        da: {
            heading: "Et lille, omhyggeligt udvalgt udvalg af projekter",
            subheading: "Vælg en kategori nedenfor — vi præsenterer kun udviklingsprojekter, der opfylder vores kvalitetskriterier.",
            apartments: {
                title: "Lejligheder & Penthouselejligheder",
                description: "Moderne udviklingsprojekter med faciliteter, udsigt og resort-livsstil",
                cta: "Se lejligheder"
            },
            villas: {
                title: "Rækkehuse & Villaer",
                description: "Private hjem med plads, privatliv og arkitektonisk karakter",
                cta: "Se villaer og huse"
            }
        },
        fi: {
            heading: "Pieni, huolellisesti valikoitu valikoima projekteja",
            subheading: "Valitse kategoria alla — esittelemme vain kehityshankkeita, jotka täyttävät laatukriteerimme.",
            apartments: {
                title: "Huoneistot & Kattohuoneistot",
                description: "Modernit kehityshankkeet mukavuuksilla, näkymillä ja lomakohteen elämäntyyillä",
                cta: "Katso huoneistoja"
            },
            villas: {
                title: "Rivitalot & Huvilat",
                description: "Yksityisiä koteja tilalla, yksityisyydellä ja arkkitehtonisella luonteella",
                cta: "Katso huviloja ja taloja"
            }
        },
        hu: {
            heading: "Egy kis, gondosan válogatott projektek",
            subheading: "Válasszon egy kategóriát alább — csak olyan fejlesztéseket mutatunk be, amelyek megfelelnek minőségi kritériumainknak.",
            apartments: {
                title: "Apartmanok & Penthouse-ok",
                description: "Modern fejlesztések kényelmi szolgáltatásokkal, kilátással és üdülőhely életmóddal",
                cta: "Apartmanok megtekintése"
            },
            villas: {
                title: "Sorházak & Villák",
                description: "Privát otthonok térrel, magánélettel és építészeti jelleggel",
                cta: "Villák és házak megtekintése"
            }
        },
        no: {
            heading: "Et lite, nøye utvalgt utvalg av prosjekter",
            subheading: "Velg en kategori nedenfor — vi presenterer kun utviklingsprosjekter som oppfyller våre kvalitetskriterier.",
            apartments: {
                title: "Leiligheter & Penthouse",
                description: "Moderne utviklingsprosjekter med fasiliteter, utsikt og resort-livsstil",
                cta: "Se leiligheter"
            },
            villas: {
                title: "Rekkehus & Villaer",
                description: "Private hjem med plass, privatliv og arkitektonisk karakter",
                cta: "Se villaer og hus"
            }
        }
    };

    const currentContent = content[lang as keyof typeof content] || content.en;

    const handleCategoryClick = (category: 'apartments' | 'villas') => {
        const sectionId = category === 'apartments' ? 'apartments-section' : 'villas-section';
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12 md:mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-gray-900 mb-4">
                        {currentContent.heading}
                    </h2>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                        {currentContent.subheading}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Apartments Block */}
                    <div
                        className="group relative bg-gradient-to-br from-primary/5 to-blue-50 rounded-3xl p-8 md:p-12 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                        onClick={() => handleCategoryClick('apartments')}
                    >
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <Building2 className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-serif text-gray-900">
                                {currentContent.apartments.title}
                            </h3>
                            <p className="text-gray-700">
                                {currentContent.apartments.description}
                            </p>
                            <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg">
                                {currentContent.apartments.cta}
                            </Button>
                        </div>
                    </div>

                    {/* Villas Block */}
                    <div
                        className="group relative bg-gradient-to-br from-primary/5 to-blue-50 rounded-3xl p-8 md:p-12 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                        onClick={() => handleCategoryClick('villas')}
                    >
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <Home className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-serif text-gray-900">
                                {currentContent.villas.title}
                            </h3>
                            <p className="text-gray-700">
                                {currentContent.villas.description}
                            </p>
                            <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg">
                                {currentContent.villas.cta}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PropertyCategories;
