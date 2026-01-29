// Translations for the Landing Page Form component
// All 10 supported languages: EN, NL, DE, FR, ES, PL, SV, DA, HU, FI, NO

export interface LandingFormTranslations {
  headline: string;
  fullName: string;
  fullNamePlaceholder: string;
  phone: string;
  interestedIn: string;
  interestOptions: {
    both: string;
    buying: string;
    renting: string;
  };
  consent: string;
  submit: string;
  submitting: string;
  success: string;
  successSubtext: string;
  error: string;
  priceOnRequest: string;
}

export const landingFormTranslations: Record<string, LandingFormTranslations> = {
  en: {
    headline: "Tell us about your interest and we will contact you",
    fullName: "Full name",
    fullNamePlaceholder: "Your full name",
    phone: "Phone / WhatsApp",
    interestedIn: "I am interested in",
    interestOptions: {
      both: "Both",
      buying: "Buying",
      renting: "Renting"
    },
    consent: "I agree to receive information about Costa del Sol properties",
    submit: "Get in touch",
    submitting: "Sending...",
    success: "Thank you.",
    successSubtext: "We'll be in touch shortly.",
    error: "Something went wrong. Please try again.",
    priceOnRequest: "Price on request"
  },
  nl: {
    headline: "Vertel ons over uw interesse en wij nemen contact op",
    fullName: "Volledige naam",
    fullNamePlaceholder: "Uw volledige naam",
    phone: "Telefoon / WhatsApp",
    interestedIn: "Ik ben geïnteresseerd in",
    interestOptions: {
      both: "Beide",
      buying: "Kopen",
      renting: "Huren"
    },
    consent: "Ik ga akkoord om informatie over Costa del Sol woningen te ontvangen",
    submit: "Neem contact op",
    submitting: "Verzenden...",
    success: "Dank u.",
    successSubtext: "We nemen binnenkort contact op.",
    error: "Er ging iets mis. Probeer het opnieuw.",
    priceOnRequest: "Prijs op aanvraag"
  },
  de: {
    headline: "Teilen Sie uns Ihr Interesse mit und wir kontaktieren Sie",
    fullName: "Vollständiger Name",
    fullNamePlaceholder: "Ihr vollständiger Name",
    phone: "Telefon / WhatsApp",
    interestedIn: "Ich interessiere mich für",
    interestOptions: {
      both: "Beides",
      buying: "Kaufen",
      renting: "Mieten"
    },
    consent: "Ich stimme zu, Informationen über Costa del Sol Immobilien zu erhalten",
    submit: "Kontakt aufnehmen",
    submitting: "Wird gesendet...",
    success: "Vielen Dank.",
    successSubtext: "Wir melden uns in Kürze.",
    error: "Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.",
    priceOnRequest: "Preis auf Anfrage"
  },
  fr: {
    headline: "Parlez-nous de votre intérêt et nous vous contacterons",
    fullName: "Nom complet",
    fullNamePlaceholder: "Votre nom complet",
    phone: "Téléphone / WhatsApp",
    interestedIn: "Je suis intéressé par",
    interestOptions: {
      both: "Les deux",
      buying: "Acheter",
      renting: "Louer"
    },
    consent: "J'accepte de recevoir des informations sur les propriétés de la Costa del Sol",
    submit: "Nous contacter",
    submitting: "Envoi en cours...",
    success: "Merci.",
    successSubtext: "Nous vous contacterons bientôt.",
    error: "Une erreur s'est produite. Veuillez réessayer.",
    priceOnRequest: "Prix sur demande"
  },
  es: {
    headline: "Cuéntenos su interés y nos pondremos en contacto",
    fullName: "Nombre completo",
    fullNamePlaceholder: "Su nombre completo",
    phone: "Teléfono / WhatsApp",
    interestedIn: "Estoy interesado en",
    interestOptions: {
      both: "Ambos",
      buying: "Comprar",
      renting: "Alquilar"
    },
    consent: "Acepto recibir información sobre propiedades en la Costa del Sol",
    submit: "Contactar",
    submitting: "Enviando...",
    success: "Gracias.",
    successSubtext: "Nos pondremos en contacto pronto.",
    error: "Algo salió mal. Por favor, inténtelo de nuevo.",
    priceOnRequest: "Precio a consultar"
  },
  pl: {
    headline: "Opowiedz nam o swoim zainteresowaniu, a my się skontaktujemy",
    fullName: "Imię i nazwisko",
    fullNamePlaceholder: "Twoje imię i nazwisko",
    phone: "Telefon / WhatsApp",
    interestedIn: "Jestem zainteresowany",
    interestOptions: {
      both: "Oba",
      buying: "Kupno",
      renting: "Wynajem"
    },
    consent: "Wyrażam zgodę na otrzymywanie informacji o nieruchomościach na Costa del Sol",
    submit: "Skontaktuj się",
    submitting: "Wysyłanie...",
    success: "Dziękujemy.",
    successSubtext: "Wkrótce się z Tobą skontaktujemy.",
    error: "Coś poszło nie tak. Spróbuj ponownie.",
    priceOnRequest: "Cena na zapytanie"
  },
  sv: {
    headline: "Berätta om ditt intresse så kontaktar vi dig",
    fullName: "Fullständigt namn",
    fullNamePlaceholder: "Ditt fullständiga namn",
    phone: "Telefon / WhatsApp",
    interestedIn: "Jag är intresserad av",
    interestOptions: {
      both: "Båda",
      buying: "Köpa",
      renting: "Hyra"
    },
    consent: "Jag godkänner att ta emot information om Costa del Sol fastigheter",
    submit: "Kontakta oss",
    submitting: "Skickar...",
    success: "Tack.",
    successSubtext: "Vi hör av oss snart.",
    error: "Något gick fel. Försök igen.",
    priceOnRequest: "Pris på förfrågan"
  },
  da: {
    headline: "Fortæl os om din interesse, og vi kontakter dig",
    fullName: "Fulde navn",
    fullNamePlaceholder: "Dit fulde navn",
    phone: "Telefon / WhatsApp",
    interestedIn: "Jeg er interesseret i",
    interestOptions: {
      both: "Begge",
      buying: "Køb",
      renting: "Leje"
    },
    consent: "Jeg accepterer at modtage information om Costa del Sol ejendomme",
    submit: "Kontakt os",
    submitting: "Sender...",
    success: "Tak.",
    successSubtext: "Vi kontakter dig snart.",
    error: "Noget gik galt. Prøv venligst igen.",
    priceOnRequest: "Pris på forespørgsel"
  },
  hu: {
    headline: "Mondja el érdeklődését és felvesszük Önnel a kapcsolatot",
    fullName: "Teljes név",
    fullNamePlaceholder: "Az Ön teljes neve",
    phone: "Telefon / WhatsApp",
    interestedIn: "Érdekel engem",
    interestOptions: {
      both: "Mindkettő",
      buying: "Vásárlás",
      renting: "Bérlés"
    },
    consent: "Hozzájárulok, hogy információkat kapjak a Costa del Sol ingatlanokról",
    submit: "Kapcsolatfelvétel",
    submitting: "Küldés...",
    success: "Köszönjük.",
    successSubtext: "Hamarosan felvesszük Önnel a kapcsolatot.",
    error: "Valami hiba történt. Kérjük, próbálja újra.",
    priceOnRequest: "Ár kérésre"
  },
  fi: {
    headline: "Kerro kiinnostuksestasi ja otamme sinuun yhteyttä",
    fullName: "Koko nimi",
    fullNamePlaceholder: "Koko nimesi",
    phone: "Puhelin / WhatsApp",
    interestedIn: "Olen kiinnostunut",
    interestOptions: {
      both: "Molemmat",
      buying: "Ostaminen",
      renting: "Vuokraus"
    },
    consent: "Hyväksyn vastaanottavani tietoa Costa del Sol -kiinteistöistä",
    submit: "Ota yhteyttä",
    submitting: "Lähetetään...",
    success: "Kiitos.",
    successSubtext: "Otamme sinuun yhteyttä pian.",
    error: "Jokin meni pieleen. Yritä uudelleen.",
    priceOnRequest: "Hinta pyynnöstä"
  },
  no: {
    headline: "Fortell oss om din interesse, så kontakter vi deg",
    fullName: "Fullt navn",
    fullNamePlaceholder: "Ditt fulle navn",
    phone: "Telefon / WhatsApp",
    interestedIn: "Jeg er interessert i",
    interestOptions: {
      both: "Begge",
      buying: "Kjøp",
      renting: "Leie"
    },
    consent: "Jeg godtar å motta informasjon om Costa del Sol eiendommer",
    submit: "Kontakt oss",
    submitting: "Sender...",
    success: "Takk.",
    successSubtext: "Vi tar kontakt snart.",
    error: "Noe gikk galt. Vennligst prøv igjen.",
    priceOnRequest: "Pris på forespørsel"
  }
};

export const getLandingFormTranslations = (language: string): LandingFormTranslations => {
  return landingFormTranslations[language] || landingFormTranslations.en;
};
