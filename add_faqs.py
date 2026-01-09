import json
import os

base_path = '/Users/johnmelvin/Test Project 1/DEL SOL Prime Homes 2.0/src/translations/landing'

# FAQ Translations Dictionary
faq_translations = {
    'nl': {
        "questions": [
            {
                "question": "Welke diensten biedt DelSolPrimeHomes aan?",
                "answer": "Wij bieden onafhankelijke, drukvrije begeleiding bij het vinden van nieuwbouwvastgoed aan de Costa del Sol. Onze service omvat het zoeken naar vastgoed, juridische ondersteuning en deskundig advies."
            },
            {
                "question": "Welke gebieden van de Costa del Sol dekt u?",
                "answer": "Wij dekken alle belangrijke gebieden, waaronder Marbella, Estepona, Mijas, Benalmádena, Fuengirola en Sotogrande."
            },
            {
                "question": "Wat is de prijsklasse van de eigendommen?",
                "answer": "Onze samengestelde selectie varieert van €350.000 tot €5.000.000+, gericht op hoogwaardige nieuwbouwprojecten."
            }
        ]
    },
    'de': {
        "questions": [
            {
                "question": "Welche Dienstleistungen bietet DelSolPrimeHomes an?",
                "answer": "Wir bieten unabhängige, druckfreie Beratung bei der Suche nach Neubauimmobilien an der Costa del Sol. Unser Service umfasst Immobiliensuche, rechtliche Unterstützung und Expertenberatung."
            },
            {
                "question": "Welche Bereiche der Costa del Sol decken Sie ab?",
                "answer": "Wir decken alle wichtigen Bereiche ab, einschließlich Marbella, Estepona, Mijas, Benalmádena, Fuengirola und Sotogrande."
            },
            {
                "question": "Wie ist die Preisspanne der Immobilien?",
                "answer": "Unsere kuratierte Auswahl reicht von 350.000 € bis 5.000.000 €+, mit Fokus auf hochwertige Neubauprojekte."
            }
        ]
    },
    'fr': {
        "questions": [
            {
                "question": "Quels services propose DelSolPrimeHomes ?",
                "answer": "Nous fournissons des conseils indépendants et sans pression pour trouver des biens neufs sur la Costa del Sol. Notre service comprend la recherche de biens, le support juridique et la consultation d'experts."
            },
            {
                "question": "Quelles zones de la Costa del Sol couvrez-vous ?",
                "answer": "Nous couvrons toutes les zones principales, y compris Marbella, Estepona, Mijas, Benalmádena, Fuengirola et Sotogrande."
            },
            {
                "question": "Quelle est la fourchette de prix des biens ?",
                "answer": "Notre sélection s'étend de 350 000 € à 5 000 000 €+, en se concentrant sur des projets neufs de haute qualité."
            }
        ]
    },
    'fi': {
        "questions": [
            {
                "question": "Mitä palveluita DelSolPrimeHomes tarjoaa?",
                "answer": "Tarjoamme riippumatonta ja paineetonta ohjausta uudiskohteiden löytämiseen Costa del Solilta. Palvelumme sisältää kiinteistöhaun, oikeudellisen tuen ja asiantuntijakonsultaation."
            },
            {
                "question": "Mitä Costa del Solin alueita katatte?",
                "answer": "Katamme kaikki tärkeimmät alueet mukaan lukien Marbella, Estepona, Mijas, Benalmádena, Fuengirola ja Sotogrande."
            },
            {
                "question": "Mikä on kiinteistöjen hintahaitari?",
                "answer": "Valikoimamme vaihtelee 350 000 eurosta yli 5 000 000 euroon, keskittyen laadukkaisiin uudisrakennuskohteisiin."
            }
        ]
    },
    'pl': {
        "questions": [
            {
                "question": "Jakie usługi oferuje DelSolPrimeHomes?",
                "answer": "Zapewniamy niezależne doradztwo bez presji w zakresie poszukiwania nowych nieruchomości na Costa del Sol. Nasza usługa obejmuje wyszukiwanie nieruchomości, wsparcie prawne i konsultacje eksperckie."
            },
            {
                "question": "Jakie obszary Costa del Sol obejmujecie?",
                "answer": "Obejmujemy wszystkie główne obszary, w tym Marbellę, Esteponę, Mijas, Benalmádenę, Fuengirolę i Sotogrande."
            },
            {
                "question": "Jaki jest przedział cenowy nieruchomości?",
                "answer": "Nasza wyselekcjonowana oferta waha się od 350 000 € do 5 000 000 €+, koncentrując się na wysokiej jakości nowych inwestycjach."
            }
        ]
    },
    'da': {
        "questions": [
            {
                "question": "Hvilke tjenester tilbyder DelSolPrimeHomes?",
                "answer": "Vi tilbyder uafhængig, pressionsfri vejledning til at finde nybyggeri på Costa del Sol. Vores service inkluderer ejendomssøgning, juridisk støtte og ekspertrådgivning."
            },
            {
                "question": "Hvilke områder på Costa del Sol dækker I?",
                "answer": "Vi dækker alle større områder, herunder Marbella, Estepona, Mijas, Benalmádena, Fuengirola og Sotogrande."
            },
            {
                "question": "Hvad er prislejet for ejendomme?",
                "answer": "Vores kuraterede udvalg spænder fra €350.000 til €5.000.000+, med fokus på nybyggeriprojekter af høj kvalitet."
            }
        ]
    },
    'hu': {
        "questions": [
            {
                "question": "Milyen szolgáltatásokat kínál a DelSolPrimeHomes?",
                "answer": "Független, nyomásmentes útmutatást nyújtunk új építésű ingatlanok kereséséhez a Costa del Solon. Szolgáltatásunk magában foglalja az ingatlankeresést, a jogi támogatást és a szakértői konzultációt."
            },
            {
                "question": "A Costa del Sol mely területeit fedik le?",
                "answer": "Lefedjük az összes főbb területet, beleértve Marbellát, Esteponát, Mijast, Benalmádenát, Fuengirolát és Sotograndét."
            },
            {
                "question": "Milyen árkategóriában vannak az ingatlanok?",
                "answer": "Válogatott kínálatunk 350 000 €-tól 5 000 000 €-ig terjed, a magas minőségű új építésű fejlesztésekre összpontosítva."
            }
        ]
    },
    'sv': {
        "questions": [
            {
                "question": "Vilka tjänster erbjuder DelSolPrimeHomes?",
                "answer": "Vi erbjuder oberoende, trycklös vägledning för att hitta nybyggda fastigheter på Costa del Sol. Vår tjänst inkluderar fastighetssökning, juridiskt stöd och expertkonsultation."
            },
            {
                "question": "Vilka områden på Costa del Sol täcker ni?",
                "answer": "Vi täcker alla större områder, inklusive Marbella, Estepona, Mijas, Benalmádena, Fuengirola och Sotogrande."
            },
            {
                "question": "Vad är prisklassen för fastigheter?",
                "answer": "Vårt urval sträcker sig från 350 000 € till 5 000 000 €+, med fokus på högkvalitativa nybyggnadsprojekt."
            }
        ]
    },
    'no': {
        "questions": [
            {
                "question": "Hvilke tjenester tilbyr DelSolPrimeHomes?",
                "answer": "Vi tilbyr uavhengig, trykklös veiledning for å finne nybygg på Costa del Sol. Vår tjeneste inkluderer eiendomssøk, juridisk støtte og ekspertkonsultasjon."
            },
            {
                "question": "Hvilke områder på Costa del Sol dekker dere?",
                "answer": "Vi dekker alle store områder, inkludert Marbella, Estepona, Mijas, Benalmádena, Fuengirola og Sotogrande."
            },
            {
                "question": "Hva er prisklassen for eiendommer?",
                "answer": "Vårt utvalg varierer fra € 350 000 til € 5 000 000+, med fokus på høykvalitets nybyggprosjekter."
            }
        ]
    }
}

for lang, faq_content in faq_translations.items():
    file_path = f"{base_path}/{lang}.json"
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Update/Add FAQ section
            data['faq'] = faq_content
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                
            print(f"Added FAQ to {lang}.json")
        else:
            print(f"File not found: {lang}.json")
            
    except Exception as e:
        print(f"Error updating {lang}: {e}")
