import {
  lexicalBulletList,
  lexicalDocument,
  lexicalHeading,
  lexicalParagraph,
} from '@/lib/legal/buildLexicalDoc'

export const DATENSCHUTZ_LAST_REVISED_EN = '23 June 2026'
export const DATENSCHUTZ_LAST_REVISED_DE = '23. Juni 2026'

/** @deprecated Use DATENSCHUTZ_LAST_REVISED_EN */
export const DATENSCHUTZ_LAST_REVISED = DATENSCHUTZ_LAST_REVISED_EN

const CONTROLLER = {
  name: 'Bernard John Bolter IV',
  street: 'Charlottenburgerstr. 8a',
  postal: '14169 Berlin',
  country: 'Germany',
  countryDe: 'Deutschland',
  email: 'bernardbolter@gmail.com',
  site: 'https://bernardbolter.com',
} as const

export function buildDatenschutzLexicalEn() {
  return lexicalDocument([
    lexicalParagraph([
      'This privacy policy explains how personal data is handled when you visit ',
      { url: CONTROLLER.site, label: 'bernardbolter.com' },
      ' (the “Site”). The Site is the online portfolio and archive of Bernard Bolter. It is operated from Germany and processed in accordance with the EU General Data Protection Regulation (GDPR) and applicable German data-protection law.',
    ]),
    lexicalParagraph([`Last revised: ${DATENSCHUTZ_LAST_REVISED_EN}.`]),

    lexicalHeading('1. Controller'),
    lexicalParagraph(['The controller responsible for data processing on this Site is:']),
    lexicalBulletList([
      CONTROLLER.name,
      CONTROLLER.street,
      `${CONTROLLER.postal}, ${CONTROLLER.country}`,
      `Email: ${CONTROLLER.email}`,
    ]),

    lexicalHeading('2. Summary'),
    lexicalParagraph([
      'The Site does not use Google Analytics, advertising trackers, or a cookie-consent banner. Video works are played from our own media storage; links to YouTube open on YouTube’s website — we do not embed YouTube players on the Site.',
    ]),
    lexicalParagraph([
      'We only process personal data where it is necessary to operate the Site, respond to enquiries, or where you choose to contact us.',
    ]),

    lexicalHeading('3. Hosting and server logs'),
    lexicalParagraph([
      'The Site is hosted by Vercel Inc. (USA/EU). When you open a page, the host may process technical data such as your IP address, browser type, operating system, referring URL, date and time of access, and error logs. This processing is necessary to deliver the Site securely and to diagnose faults.',
    ]),
    lexicalParagraph([
      'Legal basis: Art. 6(1)(f) GDPR (legitimate interest in reliable, secure operation). Where required, standard contractual clauses apply to transfers outside the EU.',
    ]),

    lexicalHeading('4. Media delivery (Cloudflare R2)'),
    lexicalParagraph([
      'Images and video files are stored on Cloudflare R2 and delivered through our content network. When you view artwork media, Cloudflare may process your IP address and technical request data to transmit the file. We do not use this delivery for profiling or advertising.',
    ]),
    lexicalParagraph(['Legal basis: Art. 6(1)(f) GDPR (legitimate interest in efficient media delivery).']),

    lexicalHeading('5. Contact form'),
    lexicalParagraph([
      'If you use the contact form, we collect the information you enter: subject, name, email address, and message. Optional pre-filled text may appear when you arrive from an ownership-registration link on an artwork page.',
    ]),
    lexicalParagraph([
      'Submissions are transmitted to Formcarry (Formcarry Inc.) so that your message can be delivered to us by email. Formcarry processes data as our processor. Their privacy information is available at ',
      { url: 'https://formcarry.com/legal/privacy-policy', label: 'formcarry.com/legal/privacy-policy' },
      '.',
    ]),
    lexicalParagraph([
      'We use your details only to read and respond to your enquiry. We do not add contact-form data to a marketing mailing list.',
    ]),
    lexicalParagraph([
      'Legal basis: Art. 6(1)(b) GDPR (steps prior to entering a contract or at your request) and Art. 6(1)(f) GDPR (handling general correspondence).',
    ]),

    lexicalHeading('6. Local storage on your device'),
    lexicalParagraph([
      'The artworks overview can remember whether you prefer the timeline or grid view. That choice is stored locally in your browser (localStorage key “bb-view-preference”). It is not sent to us and is not used for tracking.',
    ]),
    lexicalParagraph([
      'Legal basis: Art. 6(1)(f) GDPR (legitimate interest in a consistent browsing experience). You can clear it at any time through your browser settings.',
    ]),

    lexicalHeading('7. External links'),
    lexicalParagraph([
      'The Site may link to third-party services such as Instagram, YouTube, or other platforms listed on the contact page. If you follow those links, the respective provider’s terms and privacy policies apply. We do not control data processing on external sites.',
    ]),

    lexicalHeading('8. Cookies'),
    lexicalParagraph([
      'We do not set analytics or advertising cookies on the public Site. Essential session mechanics for the password-protected admin area (not available to visitors) may use cookies required for authentication.',
    ]),

    lexicalHeading('9. Retention'),
    lexicalBulletList([
      'Server and CDN logs: retained by our providers according to their policies, typically for a limited operational period.',
      'Contact messages: retained as long as needed to handle your enquiry and any follow-up, then deleted unless we must keep a copy for legal reasons.',
    ]),

    lexicalHeading('10. Your rights'),
    lexicalParagraph(['Under the GDPR you have the right to:']),
    lexicalBulletList([
      'access the personal data we hold about you;',
      'request correction of inaccurate data;',
      'request erasure where applicable;',
      'request restriction of processing;',
      'data portability where applicable;',
      'object to processing based on legitimate interests;',
      'withdraw consent at any time where processing is consent-based (not generally applicable to this Site);',
      'lodge a complaint with a supervisory authority.',
    ]),
    lexicalParagraph([
      'The supervisory authority for Berlin is the Berlin Commissioner for Data Protection and Freedom of Information (Berliner Beauftragte für Datenschutz und Informationsfreiheit). Contact us at ',
      { url: `mailto:${CONTROLLER.email}`, label: CONTROLLER.email },
      ' to exercise your rights.',
    ]),

    lexicalHeading('11. Security'),
    lexicalParagraph([
      'The Site is served over HTTPS. Access to the content management system is restricted to authorised users.',
    ]),

    lexicalHeading('12. Changes'),
    lexicalParagraph([
      'We may update this policy when the Site or legal requirements change. The “Last revised” date at the top indicates the current version.',
    ]),
  ])
}

export function buildDatenschutzLexicalDe() {
  return lexicalDocument([
    lexicalParagraph([
      'Diese Datenschutzerklärung informiert Sie darüber, wie personenbezogene Daten verarbeitet werden, wenn Sie ',
      { url: CONTROLLER.site, label: 'bernardbolter.com' },
      ' (die „Website“) besuchen. Die Website ist das Online-Portfolio und Archiv von Bernard Bolter. Sie wird aus Deutschland betrieben und entspricht der Datenschutz-Grundverordnung (DSGVO) sowie dem geltenden deutschen Datenschutzrecht.',
    ]),
    lexicalParagraph([`Stand: ${DATENSCHUTZ_LAST_REVISED_DE}.`]),

    lexicalHeading('1. Verantwortlicher'),
    lexicalParagraph([
      'Verantwortlicher für die Datenverarbeitung auf dieser Website ist:',
    ]),
    lexicalBulletList([
      CONTROLLER.name,
      CONTROLLER.street,
      `${CONTROLLER.postal}, ${CONTROLLER.countryDe}`,
      `E-Mail: ${CONTROLLER.email}`,
    ]),

    lexicalHeading('2. Kurzfassung'),
    lexicalParagraph([
      'Die Website verwendet kein Google Analytics, keine Werbe-Tracker und kein Cookie-Einwilligungsbanner. Videowerke werden aus unserem eigenen Medienspeicher abgespielt; Links zu YouTube führen auf die Website von YouTube — wir binden keine YouTube-Player auf der Website ein.',
    ]),
    lexicalParagraph([
      'Personenbezogene Daten verarbeiten wir nur, soweit dies für den Betrieb der Website, die Beantwortung von Anfragen oder auf Ihre Initiative hin erforderlich ist.',
    ]),

    lexicalHeading('3. Hosting und Server-Logdateien'),
    lexicalParagraph([
      'Die Website wird bei Vercel Inc. (USA/EU) gehostet. Beim Aufruf einer Seite kann der Hoster technische Daten verarbeiten, etwa Ihre IP-Adresse, Browsertyp, Betriebssystem, verweisende URL, Datum und Uhrzeit des Zugriffs sowie Fehlerprotokolle. Diese Verarbeitung ist erforderlich, um die Website sicher bereitzustellen und Störungen zu beheben.',
    ]),
    lexicalParagraph([
      'Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem zuverlässigen und sicheren Betrieb). Soweit erforderlich, gelten Standardvertragsklauseln für Übermittlungen außerhalb der EU.',
    ]),

    lexicalHeading('4. Medienbereitstellung (Cloudflare R2)'),
    lexicalParagraph([
      'Bilder und Videodateien werden in Cloudflare R2 gespeichert und über unser Content-Netzwerk ausgeliefert. Beim Abruf von Werkmedien kann Cloudflare Ihre IP-Adresse und technische Anfragedaten verarbeiten, um die Datei zu übertragen. Diese Bereitstellung nutzen wir nicht für Profiling oder Werbung.',
    ]),
    lexicalParagraph([
      'Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer effizienten Medienauslieferung).',
    ]),

    lexicalHeading('5. Kontaktformular'),
    lexicalParagraph([
      'Wenn Sie das Kontaktformular nutzen, erheben wir die von Ihnen eingegebenen Angaben: Betreff, Name, E-Mail-Adresse und Nachricht. Optional kann vorausgefüllter Text erscheinen, wenn Sie über einen Eigentumsregistrierungslink auf einer Werkseite gelangen.',
    ]),
    lexicalParagraph([
      'Die Übermittlung erfolgt an Formcarry (Formcarry Inc.), damit Ihre Nachricht uns per E-Mail zugestellt werden kann. Formcarry verarbeitet die Daten als Auftragsverarbeiter. Informationen zum Datenschutz bei Formcarry finden Sie unter ',
      { url: 'https://formcarry.com/legal/privacy-policy', label: 'formcarry.com/legal/privacy-policy' },
      '.',
    ]),
    lexicalParagraph([
      'Ihre Angaben verwenden wir ausschließlich zum Lesen und Beantworten Ihrer Anfrage. Daten aus dem Kontaktformular nehmen wir nicht in einen Marketing-Verteiler auf.',
    ]),
    lexicalParagraph([
      'Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Schritte vor Vertragsschluss oder auf Ihre Anfrage) sowie Art. 6 Abs. 1 lit. f DSGVO (Bearbeitung allgemeiner Korrespondenz).',
    ]),

    lexicalHeading('6. Lokale Speicherung auf Ihrem Gerät'),
    lexicalParagraph([
      'Die Werkübersicht kann sich merken, ob Sie die Timeline- oder Rasteransicht bevorzugen. Diese Einstellung wird lokal in Ihrem Browser gespeichert (localStorage-Schlüssel „bb-view-preference“). Sie wird nicht an uns übermittelt und nicht für Tracking verwendet.',
    ]),
    lexicalParagraph([
      'Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer konsistenten Nutzererfahrung). Sie können den Eintrag jederzeit in Ihren Browsereinstellungen löschen.',
    ]),

    lexicalHeading('7. Externe Links'),
    lexicalParagraph([
      'Die Website kann auf Dienste Dritter verlinken, etwa Instagram, YouTube oder andere auf der Kontaktseite genannte Plattformen. Wenn Sie diesen Links folgen, gelten die Bedingungen und Datenschutzhinweise des jeweiligen Anbieters. Für die Datenverarbeitung auf externen Websites sind wir nicht verantwortlich.',
    ]),

    lexicalHeading('8. Cookies'),
    lexicalParagraph([
      'Auf der öffentlichen Website setzen wir keine Analyse- oder Werbe-Cookies. Für den passwortgeschützten Administrationsbereich (für Besucher nicht zugänglich) können technisch erforderliche Cookies zur Authentifizierung verwendet werden.',
    ]),

    lexicalHeading('9. Speicherdauer'),
    lexicalBulletList([
      'Server- und CDN-Protokolle: werden von unseren Dienstleistern gemäß deren Richtlinien gespeichert, in der Regel für einen begrenzten betrieblichen Zeitraum.',
      'Kontaktnachrichten: werden so lange aufbewahrt, wie für die Bearbeitung Ihrer Anfrage und etwaiger Folgekorrespondenz erforderlich, danach gelöscht, sofern keine gesetzliche Aufbewahrungspflicht entgegensteht.',
    ]),

    lexicalHeading('10. Ihre Rechte'),
    lexicalParagraph(['Nach der DSGVO haben Sie insbesondere folgende Rechte:']),
    lexicalBulletList([
      'Auskunft über die bei uns gespeicherten personenbezogenen Daten;',
      'Berichtigung unrichtiger Daten;',
      'Löschung, soweit anwendbar;',
      'Einschränkung der Verarbeitung;',
      'Datenübertragbarkeit, soweit anwendbar;',
      'Widerspruch gegen Verarbeitung auf Grundlage berechtigter Interessen;',
      'Widerruf erteilter Einwilligungen jederzeit, soweit die Verarbeitung darauf beruht (auf dieser Website in der Regel nicht einschlägig);',
      'Beschwerde bei einer Aufsichtsbehörde.',
    ]),
    lexicalParagraph([
      'Zuständige Aufsichtsbehörde in Berlin ist die Berliner Beauftragte für Datenschutz und Informationsfreiheit. Wenden Sie sich zur Ausübung Ihrer Rechte an ',
      { url: `mailto:${CONTROLLER.email}`, label: CONTROLLER.email },
      '.',
    ]),

    lexicalHeading('11. Sicherheit'),
    lexicalParagraph([
      'Die Website wird über HTTPS bereitgestellt. Der Zugang zum Content-Management-System ist auf autorisierte Nutzer beschränkt.',
    ]),

    lexicalHeading('12. Änderungen'),
    lexicalParagraph([
      'Wir können diese Datenschutzerklärung anpassen, wenn sich die Website oder rechtliche Anforderungen ändern. Das Datum „Stand“ oben kennzeichnet die jeweils gültige Fassung.',
    ]),
  ])
}

/** @deprecated Use buildDatenschutzLexicalEn */
export function buildDatenschutzLexical() {
  return buildDatenschutzLexicalEn()
}
