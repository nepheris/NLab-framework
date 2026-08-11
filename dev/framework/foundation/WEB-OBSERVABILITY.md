# Web, SEO, analytics et observabilité — Lot 7

## SEOWiz

Le SEO part d'un modèle structuré unique : titre, description, canonical, langue, robots, image de partage, auteur, dates, breadcrumbs et JSON-LD. Le moteur applique ensuite title/meta/canonical/Open Graph/Twitter/JSON-LD.

Cette architecture évite les métadonnées dispersées et dupliquées dans les pages.

## AnalyticsWiz

API provider-neutral :

- `trackPageView()` ;
- `trackEvent()` ;
- `trackSearch()` ;
- `trackFilter()` ;
- `trackDownload()` ;
- `trackShare()` ;
- `trackPrint()`.

Les composants appellent AnalyticsWiz, jamais GA4 directement.

## Providers

- `MemoryAnalyticsProvider` pour tests/démo ;
- `GA4Provider` comme premier adapter concret ;
- Matomo/Plausible/autres pourront suivre le même contrat.

## Consentement

`ConsentAdapter` permet de bloquer tout envoi tant que le consentement requis n'est pas accordé. La politique exacte reste du ressort du site consommateur.

## Monitoring

`RuntimeMonitor` fournit chronométrages, compteurs, capture d'erreurs et snapshot de diagnostic, avec émission optionnelle via EventBus.

## Validation

Contrats et moteurs terminés techniquement. Les métadonnées réelles et l'activation analytics seront exercées dans le crash-test du site.
