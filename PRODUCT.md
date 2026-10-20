# ArtAround

<!-- impeccable:product-schema 1 -->
<!-- Durable product context confirmed during init; planned capabilities below are requirements, not claims of shipped functionality. -->

## Platform

web

## Users

Museum visitors and museum staff have equal priority. Visitors use the app during a museum visit to discover, understand, and navigate exhibits. Staff create and manage the content, tours, and museum maps that support those visits.

Tour guides, teachers with visiting classes, and other groups are intended users of shared tour navigation.

## Product Purpose

ArtAround adapts the museum experience to a visitor's changing needs. Visitors can search tours, contents, and objects, and change language, content difficulty, and reading time at any point, including during a visit. They can change their minds about what to see without losing continuity.

Success means visitors can shape their own visit and staff can provide the content and navigation needed to support it.

## Positioning

The central promise is adaptability throughout the visit: content preferences and exploration choices remain changeable while discovery, marketplace browsing, and museum navigation form one continuous experience.

## Operating Context

- Visitors explore museums through tours, object and content pages, QR entry, and interactive maps on mobile and desktop browsers.
- Staff author museum content and tours and manage spatial maps and object models. Existing editor documentation describes model generation with preview, revision, and approval before placement.
- The marketplace is intended to support discovering free and paid contents and tours, filtering options, and buying paid offerings.
- Marketplace and navigator must connect seamlessly. A free or already-owned content or tour page should provide a CTA into the navigator.
- Shared navigation: users can visit a tour together. The group's creator (the host) leads, and because a group moves together, guests always follow the host's steps, destination and opened content, while their language, accessibility route and reading choices stay their own. This supports guided groups and classrooms as well as other group visits (see `docs/group-tours.md`).
- Tours may optionally offer an end-of-tour quiz; this is not limited to classroom use.

## Capabilities and Constraints

### Existing documented behavior to preserve

- Museum tours, QR routes, multilingual editorial content, and interactive maps are documented in the repository. Those documents describe the current working tree, not proof of production deployment.
- Desktop and mobile use the ordinary map view.
- Visitor position changes only through an explicit position confirmation. Opening content or a QR link must not silently change it.
- Optional GPS adds a separate, device-local *estimated progress* along the current route (confirmed position + movement since it). It advances the shown direction step and drives nearby suggestions, but never replaces the confirmed, shareable position. Indoor GPS inaccuracy is an accepted limitation.
- Tour contents retain their authored order while visitors may independently explore other objects and contents or choose another destination.
- Canonical QR values are ordinary localized object and content routes. Contextual navigation modals must remain reloadable and shareable.

### Confirmed product direction

- Language, difficulty, and reading-time preferences must remain adjustable during a visit.
- Museum navigation must adapt to visitors' disabilities and accessibility needs. The map must find a suitable path and provide directions based on both those needs and whatever the visitor chooses to see next; route guidance must adapt when the destination or access needs change.
- Navigation should feel seamless and native app-like while remaining a web application.
- Represent UI states in shareable URLs wherever possible. A link should be able to preserve the museum, tour step, and opened content modal so a companion can open that same context.
- AI assistance is mainly opt-in and should feel like a natural capability rather than requiring visitors to understand AI terminology. This is an interaction principle, not authorization to make misleading claims about how a feature works.
- Planned assistance includes voice commands, speech-to-text input for questions, content expansion, answers during tours, and help locating museum services while navigating.
- AI is also intended to support background tasks such as tag generation and localization. Existing editorial translation is lazy and cached; future UI should reuse the documented localized-read contract.

### Open decisions

Detailed marketplace filters, payment and entitlement rules, and the scope and factual grounding of visitor assistance remain to be specified. Do not present these planned capabilities as shipped without checking the implementation.

Accessibility-aware routing is a confirmed requirement. Supported access needs, museum accessibility data and its maintenance, direction formats, and behavior when no suitable route is available remain to be specified.

## Brand Commitments

The product name is ArtAround. The user supplied a specific interaction reference for the optional assistance affordance: a crystallized ball that can remain inactive or react to the user's voice. Preserve this reference for later design work rather than expanding it into a global visual system during init.

[User-supplied crystallized-ball reference](https://reactbits.dev/animations/crystalized-ball?preset=ember&color=FF8A2A&crackle=0.9&flares=0.5&particleCount=12000&fill=0.35&depth=0.7&sway=0.3&twinkle=0.7&haze=1.05&dustSpeed=1.6&strands=5&glow=1&sparks=0.8&particleShape=round&speed=0)

## Evidence on Hand

- `docs/tour-navigation.md`: intended navigation behavior, route contracts, implementation map, local fixture, and verification status.
- `docs/interactive-object-models.md`: staff object-model creation, preview and approval, persistence, and map placement workflows.
- `AGENTS.md`: project constraints, localized editorial-read contract, and implementation guidance.
- Existing routes include navigator, marketplace, search, museum, object, content, tour, and museum map editing surfaces. A route's existence alone does not establish feature completeness.
- No customer testimonials, adoption metrics, pricing commitments, or measured outcomes were supplied during init; future work must not invent them.

## Product Principles

1. Keep the visit adaptable: content preferences, accessibility needs, and destinations shape the experience and route guidance without forcing a restart.
2. Give visitors and museum staff equal weight when making product tradeoffs.
3. Preserve continuity between discovery, acquisition, content, and navigation, including exact shareable visit states.
4. Keep visitor agency explicit, including position confirmation, optional assistance, and optional group-follow behavior.
5. Let assistance support understanding and practical museum tasks with minimal conceptual overhead.

## Accessibility & Inclusion

Accessibility includes physical navigation through the museum as well as use of the web interface. Visitors with disabilities must be able to receive paths and directions suited to their access needs and chosen next destination. This is a core product requirement, not merely a map display preference.

Language, difficulty, and reading-time adaptation are also core visitor needs. Voice interaction is optional; it must not become the sole way to reach essential visit functionality. A formal accessibility conformance target and specific assistive-technology requirements remain open.
