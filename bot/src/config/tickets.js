import { TextInputStyle } from "discord.js";

/**
 * Configuration centralisée des 3 filières de tickets BUREAU 23.
 * Tous les IDs Discord sont ici (surchargeables par variables d'environnement).
 */

const id = (key, fallback) => process.env[key]?.trim() || fallback;

export const SUPPORT_CHANNEL_ID = id("SUPPORT_CHANNEL_ID", "1544717113288167574");

/** Diagnostic gratuit jusqu'au 20/09/2026 inclus (heure de Paris), 4,99 € ensuite. */
export const DIAGNOSTIC_SWITCH_MS = Date.UTC(2026, 8, 20, 21, 59, 59, 999);

export function diagnosticInfo(now = Date.now()) {
  const free = now <= DIAGNOSTIC_SWITCH_MS;
  return {
    free,
    price: free ? "Gratuit" : "4,99 €",
    text: free
      ? "🎁 Diagnostic **gratuit** jusqu'au 20/09/2026 inclus (4,99 € à partir du 21/09/2026)."
      : "💶 Diagnostic à **4,99 €** (la gratuité s'est terminée le 20/09/2026).",
  };
}

const SERVICES = [
  { label: "01 Communautés — Discord, bots, tickets", value: "communautes" },
  { label: "02 RP-Writing — lore, personnages, règlements", value: "rp-writing" },
  { label: "03 Marketing — réseaux, visuel, publicité", value: "marketing" },
  { label: "04 IA-Content — images, vidéos, audio", value: "ia-content" },
  { label: "05 Digital — sites, dev, API, automatisation", value: "digital" },
  { label: "Autre (préciser dans le formulaire)", value: "autre" },
];

export const TICKET_TYPES = {
  testeur: {
    key: "testeur",
    emoji: "🧪",
    label: "Devenir Testeur",
    buttonLabel: "🧪 Devenir Testeur",
    prefix: "🧪・testeur",
    entryChannelId: id("TESTER_CHANNEL_ID", "1546502927773081620"),
    categoryId: id("TESTER_CATEGORY_ID", "1546957061361770516"),
    panel: {
      title: "🧪 Devenir Testeur BUREAU 23",
      description:
        "Tu testes des serveurs de jeux et tu rédiges un **compte rendu ultra détaillé** selon les critères demandés.\n" +
        "Un simple « oui le serveur est bien » n'est **pas** un compte rendu acceptable.\n\n" +
        "**Profil** : ouvert à tous, 16 ans minimum souhaité, rigueur, autonomie, analyse et rédaction détaillée.\n" +
        "💰 **Rémunération : 0,50 € par test validé par BUREAU 23.**\n\n" +
        "Clique sur le bouton pour ouvrir ta candidature.",
    },
    intro:
      "Merci pour ta candidature 🧪\n" +
      "💰 **Rémunération : 0,50 € par test validé par BUREAU 23.**\n" +
      "Les comptes rendus doivent être **détaillés, argumentés et exploitables**.",
    selects: [
      {
        key: "niveau",
        placeholder: "Niveau d'expérience (référence : Intermédiaire)",
        label: "Niveau d'expérience",
        options: [
          { label: "Débutant", value: "Débutant" },
          { label: "Intermédiaire (référence)", value: "Intermédiaire", default: true },
          { label: "Expérimenté", value: "Expérimenté" },
        ],
      },
      {
        key: "deja_tests",
        placeholder: "As-tu déjà réalisé des tests de serveurs ?",
        label: "Déjà réalisé des tests",
        options: [
          { label: "Oui", value: "Oui" },
          { label: "Non", value: "Non" },
        ],
      },
      {
        key: "dispos",
        placeholder: "Disponibilités (plusieurs choix possibles)",
        label: "Disponibilités",
        multi: true,
        options: [
          { label: "Matin", value: "Matin" },
          { label: "Après-midi", value: "Après-midi" },
          { label: "Soir", value: "Soir" },
          { label: "Week-end", value: "Week-end" },
        ],
      },
    ],
    steps: [
      {
        title: "Candidature testeur (1/2)",
        fields: [
          { id: "pseudo", label: "Prénom / pseudo (facultatif)", required: false, max: 60 },
          { id: "age", label: "Âge", required: true, max: 3 },
          { id: "experience", label: "Expérience dans les serveurs de jeux", long: true, required: true, max: 1000 },
          { id: "tests", label: "Si oui, décris ton expérience de test", long: true, required: false, max: 1000 },
          { id: "dispos_precision", label: "Précision sur tes disponibilités", required: false, max: 200 },
        ],
      },
      {
        title: "Candidature testeur (2/2)",
        fields: [
          { id: "motivation", label: "Pourquoi devenir testeur BUREAU 23 ?", long: true, required: true, max: 1000 },
          {
            id: "comptes_rendus",
            label: "Pourquoi des comptes rendus exploitables ?",
            long: true,
            required: true,
            max: 1000,
          },
        ],
      },
    ],
  },

  partenaire: {
    key: "partenaire",
    emoji: "🤝",
    label: "Devenir Partenaire",
    buttonLabel: "🤝 Devenir Partenaire",
    prefix: "🤝・partenaire",
    entryChannelId: id("PARTNER_CHANNEL_ID", "1544718774886731906"),
    categoryId: id("PARTNER_CATEGORY_ID", "1546957081138044978"),
    panel: {
      title: "🤝 Devenir Partenaire BUREAU 23",
      description:
        "Nous recherchons des partenaires : hébergement web, protection & sécurité, graphisme, " +
        "développement de bots Discord, ressources FiveM ou autres jeux.\n\n" +
        "Aucune statistique minimale exigée. Présente ta structure, on étudie chaque demande.",
    },
    intro: "Merci pour ta proposition de partenariat 🤝 L'équipe revient vers toi rapidement.",
    selects: [
      {
        key: "domaine",
        placeholder: "Domaine / type de partenaire",
        label: "Domaine",
        options: [
          { label: "Hébergeur Web", value: "Hébergeur Web" },
          { label: "Protection & sécurité", value: "Protection & sécurité" },
          { label: "Graphisme", value: "Graphisme" },
          { label: "Développeur bot Discord", value: "Développeur bot Discord" },
          { label: "Développeur de ressources FiveM", value: "Ressources FiveM" },
          { label: "Développeur de ressources autres jeux", value: "Ressources autres jeux" },
          { label: "Autre", value: "Autre" },
        ],
      },
    ],
    steps: [
      {
        title: "Partenariat (1/2)",
        fields: [
          { id: "pseudo", label: "Prénom / pseudo (facultatif)", required: false, max: 60 },
          { id: "structure", label: "Nom de la structure", required: true, max: 100 },
          { id: "presentation", label: "Présentation de la structure", long: true, required: true, max: 1000 },
          { id: "lien", label: "Lien vers la structure", required: true, max: 300 },
          { id: "proposition", label: "Que proposez-vous à BUREAU 23 ?", long: true, required: true, max: 1000 },
        ],
      },
      {
        title: "Partenariat (2/2)",
        fields: [
          {
            id: "recherche",
            label: "Que recherchez-vous auprès de BUREAU 23 ?",
            long: true,
            required: true,
            max: 1000,
          },
          { id: "complements", label: "Informations complémentaires", long: true, required: false, max: 1000 },
        ],
      },
    ],
  },

  projet: {
    key: "projet",
    emoji: "🚀",
    label: "Démarrer un projet",
    buttonLabel: "🚀 Démarrer un projet",
    prefix: "🚀・projet",
    entryChannelId: id("PROJECT_CHANNEL_ID", "1544692139248582739"),
    categoryId: id("PROJECT_CATEGORY_ID", "1546957112905699449"),
    panel: {
      title: "🚀 Démarrer un projet avec BUREAU 23",
      description:
        "BUREAU 23 accompagne les responsables de serveurs de jeux : communautés, RP-writing, marketing, " +
        "contenus IA et digital.\n\n" +
        "Décris ton besoin, on te répond avec une proposition adaptée.",
    },
    intro:
      "Merci 🚀 Le prix final dépend de la production, de la complexité, de la personnalisation, " +
      "des corrections, de l'urgence et des options de la grille tarifaire officielle BUREAU 23.",
    selects: [
      {
        key: "etat",
        placeholder: "État du projet",
        label: "État du projet",
        options: [
          { label: "💡 Simple idée", value: "💡 Simple idée" },
          { label: "🛠️ En développement", value: "🛠️ En développement" },
          { label: "🟢 Déjà ouvert", value: "🟢 Déjà ouvert" },
        ],
      },
      {
        key: "services",
        placeholder: "Services recherchés (plusieurs choix)",
        label: "Services recherchés",
        multi: true,
        options: SERVICES,
      },
      {
        key: "budget",
        placeholder: "Budget estimé",
        label: "Budget",
        options: [
          { label: "Moins de 50 €", value: "Moins de 50 €" },
          { label: "50 – 100 €", value: "50 – 100 €" },
          { label: "100 – 250 €", value: "100 – 250 €" },
          { label: "250 – 500 €", value: "250 – 500 €" },
          { label: "500 – 1 000 €", value: "500 – 1 000 €" },
          { label: "1 000 € et plus", value: "1 000 € et plus" },
          { label: "Je ne sais pas encore", value: "Je ne sais pas encore" },
        ],
      },
      {
        key: "diagnostic",
        placeholder: "Souhaitez-vous un diagnostic ?",
        label: "Diagnostic",
        options: [
          { label: "Oui", value: "Oui" },
          { label: "Non", value: "Non" },
        ],
      },
    ],
    steps: [
      {
        title: "Projet (1/2)",
        fields: [
          { id: "pseudo", label: "Prénom / pseudo (facultatif)", required: false, max: 60 },
          { id: "nom_projet", label: "Nom du projet / serveur", required: true, max: 100 },
          { id: "jeu", label: "Jeu concerné", required: true, max: 100 },
          { id: "presentation", label: "Présentez votre projet en détail", long: true, required: true, max: 1500 },
          { id: "liens", label: "Liens / fichiers (facultatif)", required: false, max: 300 },
        ],
      },
      {
        title: "Projet (2/2)",
        fields: [
          { id: "connu_via", label: "Comment avez-vous connu BUREAU 23 ?", required: true, max: 200 },
          { id: "autre_service", label: "Autre service souhaité (facultatif)", required: false, max: 200 },
        ],
      },
    ],
  },
};

export const TICKET_TYPE_LIST = Object.values(TICKET_TYPES);

export function inputStyle(field) {
  return field.long ? TextInputStyle.Paragraph : TextInputStyle.Short;
}
