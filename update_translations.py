import json
import os

base_path = '/Users/johnmelvin/Test Project 1/DEL SOL Prime Homes 2.0/src/translations/landing'

translations = {
    'nl': {
        "hero": {
            "headline": "Eerst duidelijkheid — voordat u naar vastgoed kijkt.",
            "subheadline": "Onafhankelijke, drukvrije begeleiding voor nieuwbouwvastgoed aan de Costa del Sol.",
            "primaryCTA": "Bekijk de introductie van 60 seconden",
            "primaryCTAIcon": "play",
            "microcopy": "Geen druk · Vrijblijvend",
            "secondaryCTA": "Of begin met duidelijke antwoorden"
        },
        "video": {
            "softLine": "In één minuut begrijpt u hoe wij beslissingen begeleiden — rustig en onafhankelijk.",
            "bullets": [
                "Emma beantwoordt eerst vragen",
                "Menselijke experts beoordelen alles",
                "U beslist of en hoe u verder gaat"
            ],
            "reassurance": "U blijft bij elke stap in controle."
        },
        "emma": {
            "statement": "Begin met duidelijkheid, niet met aanbiedingen.",
            "explanation": "Emma begeleidt u door vragen over levensstijl, juridische stappen, documenten en het aankoopproces — voordat er projecten worden besproken.",
            "cta": "Krijg duidelijkheid met Emma",
            "microcopy": "Privé · Drukvrij"
        },
        "fallback": {
            "headline": "Liever eerst verkennen? U kunt hieronder een kleine geselecteerde selectie bekijken.",
            "apartments": {
                "subtitle": "6 zorgvuldig geselecteerde nieuwbouwprojecten",
                "cta": "Bekijk appartementen & penthouses"
            },
            "villas": {
                "subtitle": "6 zorgvuldig geselecteerde nieuwbouwprojecten",
                "cta": "Bekijk herenhuizen & villa's"
            }
        },
        "classicOptin": {
            "headline": "Ontvang projectdetails via WhatsApp of SMS — op uw gemak.",
            "fields": {
                "fullName": "Volledige naam",
                "phone": "WhatsApp / SMS-nummer",
                "interest": "Ik ben geïnteresseerd in",
                "interestOptions": {
                    "apartments": "Appartementen & Penthouses",
                    "villas": "Herenhuizen & Villa's",
                    "both": "Beide"
                }
            },
            "checkbox": "Ik ga akkoord met het ontvangen van vastgoedupdates via WhatsApp/SMS",
            "button": "Stuur me de details",
            "success": "Dank u! U ontvangt binnen 24 uur details."
        },
        "footer": {
            "privacy": "Privacybeleid",
            "terms": "Servicevoorwaarden"
        },
        "header": {
            "apartments": "Appartementen & Penthouses",
            "villas": "Herenhuizen & Villa's",
            "cta": "Spreek met Emma"
        }
    },
    'de': {
        "hero": {
            "headline": "Erst Klarheit — bevor Sie sich Immobilien ansehen.",
            "subheadline": "Unabhängige, druckfreie Beratung für Neubauimmobilien an der Costa del Sol.",
            "primaryCTA": "Sehen Sie sich die 60-Sekunden-Einführung an",
            "primaryCTAIcon": "play",
            "microcopy": "Kein Druck · Unverbindlich",
            "secondaryCTA": "Oder beginnen Sie mit klaren Antworten"
        },
        "video": {
            "softLine": "In einer Minute verstehen Sie, wie wir Entscheidungen begleiten — ruhig und unabhängig.",
            "bullets": [
                "Emma beantwortet zuerst Fragen",
                "Menschliche Experten prüfen alles",
                "Sie entscheiden, ob und wie Sie fortfahren"
            ],
            "reassurance": "Sie behalten bei jedem Schritt die Kontrolle."
        },
        "emma": {
            "statement": "Beginnen Sie mit Klarheit, nicht mit Angeboten.",
            "explanation": "Emma führt Sie durch Fragen zu Lebensstil, rechtlichen Schritten, Dokumenten und dem Kaufprozess — bevor Projekte besprochen werden.",
            "cta": "Erhalten Sie Klarheit mit Emma",
            "microcopy": "Privat · Druckfrei"
        },
        "fallback": {
            "headline": "Möchten Sie zuerst erkunden? Sie können unten eine kleine kuratierte Auswahl durchsuchen.",
            "apartments": {
                "subtitle": "6 sorgfältig ausgewählte Neubauprojekte",
                "cta": "Wohnungen & Penthäuser ansehen"
            },
            "villas": {
                "subtitle": "6 sorgfältig ausgewählte Neubauprojekte",
                "cta": "Reihenhäuser & Villen ansehen"
            }
        },
        "classicOptin": {
            "headline": "Erhalten Sie Projektdetails per WhatsApp oder SMS — zu Ihrer Verfügung.",
            "fields": {
                "fullName": "Vollständiger Name",
                "phone": "WhatsApp / SMS-Nummer",
                "interest": "Ich interessiere mich für",
                "interestOptions": {
                    "apartments": "Wohnungen & Penthäuser",
                    "villas": "Reihenhäuser & Villen",
                    "both": "Beides"
                }
            },
            "checkbox": "Ich stimme zu, Immobilien-Updates per WhatsApp/SMS zu erhalten",
            "button": "Senden Sie mir die Details",
            "success": "Vielen Dank! Sie erhalten innerhalb von 24 Stunden Details."
        },
        "footer": {
            "privacy": "Datenschutzrichtlinie",
            "terms": "Nutzungsbedingungen"
        },
        "header": {
            "apartments": "Wohnungen & Penthäuser",
            "villas": "Reihenhäuser & Villen",
            "cta": "Sprechen Sie mit Emma"
        }
    },
    'fr': {
        "hero": {
            "headline": "D'abord la clarté — avant de regarder des biens.",
            "subheadline": "Accompagnement indépendant et sans pression pour les biens neufs sur la Costa del Sol.",
            "primaryCTA": "Regardez l'introduction de 60 secondes",
            "primaryCTAIcon": "play",
            "microcopy": "Sans pression · Sans engagement",
            "secondaryCTA": "Ou commencez avec des réponses claires"
        },
        "video": {
            "softLine": "En une minute, vous comprendrez comment nous guidons les décisions — calmement et indépendamment.",
            "bullets": [
                "Emma répond d'abord aux questions",
                "Des experts humains examinent tout",
                "Vous décidez si et comment continuer"
            ],
            "reassurance": "Vous gardez le contrôle à chaque étape."
        },
        "emma": {
            "statement": "Commencez par la clarté, pas par les annonces.",
            "explanation": "Emma vous guide à travers des questions sur le mode de vie, les démarches légales, les documents et le processus d'achat — avant que les projets ne soient discutés.",
            "cta": "Obtenez de la clarté avec Emma",
            "microcopy": "Privé · Sans pression"
        },
        "fallback": {
            "headline": "Vous préférez explorer d'abord ? Vous pouvez parcourir une petite sélection ci-dessous.",
            "apartments": {
                "subtitle": "6 projets neufs soigneusement sélectionnés",
                "cta": "Voir appartements & penthouses"
            },
            "villas": {
                "subtitle": "6 projets neufs soigneusement sélectionnés",
                "cta": "Voir maisons de ville & villas"
            }
        },
        "classicOptin": {
            "headline": "Recevez les détails du projet par WhatsApp ou SMS — à votre convenance.",
            "fields": {
                "fullName": "Nom complet",
                "phone": "Numéro WhatsApp / SMS",
                "interest": "Je suis intéressé par",
                "interestOptions": {
                    "apartments": "Appartements & Penthouses",
                    "villas": "Maisons de ville & Villas",
                    "both": "Les deux"
                }
            },
            "checkbox": "J'accepte de recevoir des mises à jour immobilières par WhatsApp/SMS",
            "button": "Envoyez-moi les détails",
            "success": "Merci ! Vous recevrez les détails dans les 24 heures."
        },
        "footer": {
            "privacy": "Politique de confidentialité",
            "terms": "Conditions d'utilisation"
        },
        "header": {
            "apartments": "Appartements & Penthouses",
            "villas": "Maisons de ville & Villas",
            "cta": "Parler à Emma"
        }
    },
    'fi': {
        "hero": {
            "headline": "Ensin selkeys — ennen kuin katsot kiinteistöjä.",
            "subheadline": "Riippumaton, paineetón neuvonta uudiskohteisiin Costa del Solilla.",
            "primaryCTA": "Katso 60 sekunnin esittely",
            "primaryCTAIcon": "play",
            "microcopy": "Ei painetta · Sitoutumaton",
            "secondaryCTA": "Tai aloita selkeillä vastauksilla"
        },
        "video": {
            "softLine": "Yhdessä minuutissa ymmärrät, kuinka ohjaamme päätöksiä — rauhallisesti ja riippumattomasti.",
            "bullets": [
                "Emma vastaa ensin kysymyksiin",
                "Ihmisasiantuntijat tarkistavat kaiken",
                "Sinä päätät, jatkatko ja miten"
            ],
            "reassurance": "Sinä olet hallinnassa joka vaiheessa."
        },
        "emma": {
            "statement": "Aloita selkeydestä, ei kohteista.",
            "explanation": "Emma ohjaa sinua kysymysten läpi elämäntavasta, oikeudellisista vaiheista, asiakirjoista ja ostoprosessista — ennen kuin hankkeista keskustellaan.",
            "cta": "Saa selkeyttä Emman kanssa",
            "microcopy": "Yksityinen · Paineetón"
        },
        "fallback": {
            "headline": "Haluatko tutkia ensin? Voit selata pientä valikoitua valikoimaa alla.",
            "apartments": {
                "subtitle": "6 huolellisesti valittua uudiskohde",
                "cta": "Katso huoneistot & kattohuoneistot"
            },
            "villas": {
                "subtitle": "6 huolellisesti valittua uudiskohde",
                "cta": "Katso rivitalot & huvilat"
            }
        },
        "classicOptin": {
            "headline": "Vastaanota hanketiedot WhatsAppilla tai tekstiviestillä — omaan tahtiisi.",
            "fields": {
                "fullName": "Koko nimi",
                "phone": "WhatsApp / SMS-numero",
                "interest": "Olen kiinnostunut",
                "interestOptions": {
                    "apartments": "Huoneistot & Kattohuoneistot",
                    "villas": "Rivitalot & Huvilat",
                    "both": "Molemmat"
                }
            },
            "checkbox": "Hyväksyn kiinteistöpäivitysten vastaanottamisen WhatsAppilla/tekstiviestillä",
            "button": "Lähetä minulle tiedot",
            "success": "Kiitos! Saat tiedot 24 tunnin kuluessa."
        },
        "footer": {
            "privacy": "Tietosuojakäytäntö",
            "terms": "Käyttöehdot"
        },
        "header": {
            "apartments": "Huoneistot & Kattohuoneistot",
            "villas": "Rivitalot & Huvilat",
            "cta": "Keskustele Emman kanssa"
        }
    },
    'pl': {
        "hero": {
            "headline": "Najpierw jasność — zanim zobaczysz nieruchomość.",
            "subheadline": "Niezależne doradztwo bez presji dotyczące nowych inwestycji na Costa del Sol.",
            "primaryCTA": "Zobacz 60-sekundowe wprowadzenie",
            "primaryCTAIcon": "play",
            "microcopy": "Bez presji · Bez zobowiązań",
            "secondaryCTA": "Lub zacznij od jasnych odpowiedzi"
        },
        "video": {
            "softLine": "W jedną minutę zrozumiesz, jak prowadzimy decyzje — spokojnie i niezależnie.",
            "bullets": [
                "Emma najpierw odpowiada na pytania",
                "Ludzcy eksperci sprawdzają wszystko",
                "Ty decydujesz, czy i jak kontynuować"
            ],
            "reassurance": "Zachowujesz kontrolę na każdym etapie."
        },
        "emma": {
            "statement": "Zacznij od jasności, a nie od ofert.",
            "explanation": "Emma prowadzi cię przez pytania dotyczące stylu życia, kroków prawnych, dokumentów i procesu zakupu — zanim omówione zostaną jakiekolwiek projekty.",
            "cta": "Uzyskaj jasność z Emmą",
            "microcopy": "Prywatne · Bez presji"
        },
        "fallback": {
            "headline": "Wolisz najpierw zbadać? Możesz przejrzeć małą wyselekcjonowaną kolekcję poniżej.",
            "apartments": {
                "subtitle": "6 starannie wyselekcjonowanych projektów nowych inwestycji",
                "cta": "Zobacz apartamenty i penthouse'y"
            },
            "villas": {
                "subtitle": "6 starannie wyselekcjonowanych projektów nowych inwestycji",
                "cta": "Zobacz domy szeregowe i wille"
            }
        },
        "classicOptin": {
            "headline": "Otrzymuj szczegóły projektu przez WhatsApp lub SMS — w dogodnym dla Ciebie czasie.",
            "fields": {
                "fullName": "Imię i nazwisko",
                "phone": "Numer WhatsApp / SMS",
                "interest": "Jestem zainteresowany/a",
                "interestOptions": {
                    "apartments": "Apartamenty i Penthouse'y",
                    "villas": "Domy szeregowe i Wille",
                    "both": "Oba"
                }
            },
            "checkbox": "Zgadzam się na otrzymywanie aktualizacji nieruchomości przez WhatsApp/SMS",
            "button": "Wyślij mi szczegóły",
            "success": "Dziękujemy! Otrzymasz szczegóły w ciągu 24 godzin."
        },
        "footer": {
            "privacy": "Polityka prywatności",
            "terms": "Warunki korzystania"
        },
        "header": {
            "apartments": "Apartamenty i Penthouse'y",
            "villas": "Domy szeregowe i Wille",
            "cta": "Porozmawiaj z Emmą"
        }
    },
    'da': {
        "hero": {
            "headline": "Få klarhed først — før du ser på ejendomme.",
            "subheadline": "Uafhængig, pressionsfri vejledning om nybyggeri på Costa del Sol.",
            "primaryCTA": "Se 60-sekunders introduktionen",
            "primaryCTAIcon": "play",
            "microcopy": "Ingen pres · Ingen forpligtelse",
            "secondaryCTA": "Eller start med klare svar"
        },
        "video": {
            "softLine": "På et minut forstår du, hvordan vi guider beslutninger — roligt og uafhængigt.",
            "bullets": [
                "Emma svarer først på spørgsmål",
                "Menneskelige eksperter gennemgår alt",
                "Du bestemmer, om og hvordan du fortsætter"
            ],
            "reassurance": "Du har kontrol ved hvert skridt."
        },
        "emma": {
            "statement": "Start med klarhed, ikke fortegnelser.",
            "explanation": "Emma guider dig gennem spørgsmål om livsstil, juridiske trin, dokumenter og købsprocessen — før projekter diskuteres.",
            "cta": "Få klarhed med Emma",
            "microcopy": "Privat · Pressionsfri"
        },
        "fallback": {
            "headline": "Foretrækker du at udforske først? Du kan gennemse et lille udvalg nedenfor.",
            "apartments": {
                "subtitle": "6 omhyggeligt udvalgte nybyggeriprojekter",
                "cta": "Se lejligheder & penthouselejligheder"
            },
            "villas": {
                "subtitle": "6 omhyggeligt udvalgte nybyggeriprojekter",
                "cta": "Se rækkehuse & villaer"
            }
        },
        "classicOptin": {
            "headline": "Modtag projektdetaljer via WhatsApp eller SMS — i dit tempo.",
            "fields": {
                "fullName": "Fuldt navn",
                "phone": "WhatsApp / SMS-nummer",
                "interest": "Jeg er interesseret i",
                "interestOptions": {
                    "apartments": "Lejligheder & Penthouselejligheder",
                    "villas": "Rækkehuse & Villaer",
                    "both": "Begge"
                }
            },
            "checkbox": "Jeg accepterer at modtage ejendomsopdateringer via WhatsApp/SMS",
            "button": "Send mig detaljerne",
            "success": "Tak! Du modtager detaljer inden for 24 timer."
        },
        "footer": {
            "privacy": "Privatlivspolitik",
            "terms": "Servicevilkår"
        },
        "header": {
            "apartments": "Lejligheder & Penthouselejligheder",
            "villas": "Rækkehuse & Villaer",
            "cta": "Tal med Emma"
        }
    },
    'hu': {
        "hero": {
            "headline": "Először tisztázás — mielőtt ingatlant néznél.",
            "subheadline": "Független, nyomásmentes útmutatás új építésű ingatlanokhoz a Costa del Solon.",
            "primaryCTA": "Nézd meg a 60 másodperces bemutatót",
            "primaryCTAIcon": "play",
            "microcopy": "Nincs nyomás · Kötelezettség nélkül",
            "secondaryCTA": "Vagy kezdj világos válaszokkal"
        },
        "video": {
            "softLine": "Egy perc alatt megérted, hogyan vezetjük a döntéseket — nyugodtan és függetlenül.",
            "bullets": [
                "Emma először válaszol a kérdésekre",
                "Emberi szakértők mindent átnéznek",
                "Te döntöd el, hogy és hogyan folytatsz"
            ],
            "reassurance": "Minden lépésnél te irányítasz."
        },
        "emma": {
            "statement": "Kezdd a tisztázással, ne az ajánlatokkal.",
            "explanation": "Emma végigvezet téged az életmóddal, jogi lépésekkel, dokumentumokkal és a vásárlási folyamattal kapcsolatos kérdéseken — mielőtt a projektekről beszélnénk.",
            "cta": "Tisztázd Emmával",
            "microcopy": "Privát · Nyomás nélkül"
        },
        "fallback": {
            "headline": "Inkább először felfedeznél? Böngészhetsz egy kis válogatott kollekciót lent.",
            "apartments": {
                "subtitle": "6 gondosan kiválasztott új építésű projekt",
                "cta": "Lakások és penthouse-ok megtekintése"
            },
            "villas": {
                "subtitle": "6 gondosan kiválasztott új építésű projekt",
                "cta": "Sorházak és villák megtekintése"
            }
        },
        "classicOptin": {
            "headline": "Fogadj projektrészleteket WhatsAppon vagy SMS-ben — a saját tempódban.",
            "fields": {
                "fullName": "Teljes név",
                "phone": "WhatsApp / SMS szám",
                "interest": "Érdekel",
                "interestOptions": {
                    "apartments": "Apartmanok és Penthouse-ok",
                    "villas": "Sorházak és Villák",
                    "both": "Mindkettő"
                }
            },
            "checkbox": "Elfogadom az ingatlanfrissítések fogadását WhatsAppon/SMS-ben",
            "button": "Küldd el a részleteket",
            "success": "Köszönjük! 24 órán belül megkapod a részleteket."
        },
        "footer": {
            "privacy": "Adatvédelmi irányelvek",
            "terms": "Szolgáltatási feltételek"
        },
        "header": {
            "apartments": "Apartmanok és Penthouse-ok",
            "villas": "Sorházak és Villák",
            "cta": "Beszélj Emmával"
        }
    },
    'sv': {
        "hero": {
            "headline": "Få klarhet först — innan du tittar på fastigheter.",
            "subheadline": "Oberoende, trycklös vägledning för nybyggda fastigheter på Costa del Sol.",
            "primaryCTA": "Se 60-sekundersintroduktionen",
            "primaryCTAIcon": "play",
            "microcopy": "Ingen press · Ingen förpliktelse",
            "secondaryCTA": "Eller börja med tydliga svar"
        },
        "video": {
            "softLine": "På en minut förstår du hur vi vägleder beslut — lugnt och oberoende.",
            "bullets": [
                "Emma svarar först på frågor",
                "Mänskliga experter granskar allt",
                "Du bestämmer om och hur du fortsätter"
            ],
            "reassurance": "Du har kontroll vid varje steg."
        },
        "emma": {
            "statement": "Börja med klarhet, inte listor.",
            "explanation": "Emma guidar dig genom frågor om livsstil, juridiska steg, dokument och köpprocessen — innan projekt diskuteras.",
            "cta": "Få klarhet med Emma",
            "microcopy": "Privat · Trycklös"
        },
        "fallback": {
            "headline": "Föredrar du att utforska först? Du kan bläddra i ett litet urval nedan.",
            "apartments": {
                "subtitle": "6 noggrant utvalda nybyggnadsprojekt",
                "cta": "Se lägenheter & takvåningar"
            },
            "villas": {
                "subtitle": "6 noggrant utvalda nybyggnadsprojekt",
                "cta": "Se radhus & villor"
            }
        },
        "classicOptin": {
            "headline": "Ta emot projektdetaljer via WhatsApp eller SMS — i din egen takt.",
            "fields": {
                "fullName": "Fullständigt namn",
                "phone": "WhatsApp / SMS-nummer",
                "interest": "Jag är intresserad av",
                "interestOptions": {
                    "apartments": "Lägenheter & Takvåningar",
                    "villas": "Radhus & Villor",
                    "both": "Båda"
                }
            },
            "checkbox": "Jag godkänner att ta emot fastighetsuppdateringar via WhatsApp/SMS",
            "button": "Skicka mig detaljerna",
            "success": "Tack! Du får detaljer inom 24 timmar."
        },
        "footer": {
            "privacy": "Integritetspolicy",
            "terms": "Användarvillkor"
        },
        "header": {
            "apartments": "Lägenheter & Takvåningar",
            "villas": "Radhus & Villor",
            "cta": "Prata med Emma"
        }
    },
    'no': {
        "hero": {
            "headline": "Få klarhet først — før du ser på eiendom.",
            "subheadline": "Uavhengig, trykklös veiledning for nybygg på Costa del Sol.",
            "primaryCTA": "Se 60-sekunders introduksjonen",
            "primaryCTAIcon": "play",
            "microcopy": "Ingen press · Ingen forpliktelse",
            "secondaryCTA": "Eller start med klare svar"
        },
        "video": {
            "softLine": "På ett minutt forstår du hvordan vi veileder beslutninger — rolig og uavhengig.",
            "bullets": [
                "Emma svarer først på spørsmål",
                "Menneskelige eksperter vurderer alt",
                "Du bestemmer om og hvordan du fortsetter"
            ],
            "reassurance": "Du har kontroll ved hvert trinn."
        },
        "emma": {
            "statement": "Start med klarhet, ikke oppføringer.",
            "explanation": "Emma veileder deg gjennom spørsmål om livsstil, juridiske trinn, dokumenter og kjøpsprosessen — før prosjekter diskuteres.",
            "cta": "Få klarhet med Emma",
            "microcopy": "Privat · Trykklös"
        },
        "fallback": {
            "headline": "Foretrekker du å utforske først? Du kan bla gjennom et lite utvalg nedenfor.",
            "apartments": {
                "subtitle": "6 nøye utvalgte nybyggprosjekter",
                "cta": "Se leiligheter & penthouse"
            },
            "villas": {
                "subtitle": "6 nøye utvalgte nybyggprosjekter",
                "cta": "Se rekkehus & villaer"
            }
        },
        "classicOptin": {
            "headline": "Motta prosjektdetaljer via WhatsApp eller SMS — i ditt eget tempo.",
            "fields": {
                "fullName": "Fullt navn",
                "phone": "WhatsApp / SMS-nummer",
                "interest": "Jeg er interessert i",
                "interestOptions": {
                    "apartments": "Leiligheter & Penthouse",
                    "villas": "Rekkehus & Villaer",
                    "both": "Begge"
                }
            },
            "checkbox": "Jeg godtar å motta eiendomsoppdateringer via WhatsApp/SMS",
            "button": "Send meg detaljene",
            "success": "Takk! Du mottar detaljer innen 24 timer."
        },
        "footer": {
            "privacy": "Personvernregler",
            "terms": "Vilkår for bruk"
        },
        "header": {
            "apartments": "Leiligheter & Penthouse",
            "villas": "Rekkehus & Villaer",
            "cta": "Snakk med Emma"
        }
    }
}

for lang, content in translations.items():
    file_path = f"{base_path}/{lang}.json"
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)
        print(f"Updated {lang}.json")
    except Exception as e:
        print(f"Error updating {lang}: {e}")
