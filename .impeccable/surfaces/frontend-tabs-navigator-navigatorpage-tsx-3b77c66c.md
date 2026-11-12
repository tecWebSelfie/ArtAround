---
version: 1
slug: 'frontend-tabs-navigator-navigatorpage-tsx-3b77c66c'
primary_target: 'src/app/[lng]/(frontend)/(tabs)/navigator/NavigatorPage.tsx'
related_targets: ['src/app/[lng]/(frontend)/(tabs)/navigator/page.tsx']
---

# Navigator home — discover sections (shape, confirmed 2026-11-12)

Mode: Operate. Scope: an extension of the shipped navigator home (start
blocks + group form stay as they are). Established world: Mantine, DESIGN.md.

JOB: the navigator home is where a visit starts now. The first screen keeps
its three ways in (search, Scan / Plan blocks, group form) and stays fixed so
visitors learn it. Below it, at most two rails hint at what the app holds
without becoming the marketplace, which owns browsing, packages and curated
collections.

RAILS (horizontal, scrolled by hand, never auto-rotating; h2 per rail,
cards h3; each ends with "See all in the marketplace", filter preset):

1. Context rail, fixed:
   - museum mode: "Tours in this museum" (museumSearchRestriction);
   - global mode: "Museums near you": sorted by distance (`near` on
     museums.location.latlng) only when geolocation is already granted
     (Permissions API); otherwise the list plus a "Use my location" button.
     Never prompt on load; coordinates rounded (~1 km), never in the URL.
   - "Resume your visit" is a single row (not a rail), only when a tour is
     in progress.
2. Rotating rail, one per new visit, drawn from a pool:
   featured categories (museumCategories.featured), quick visits
   (durationMinutes), step-free (wheelchairAccessible), with an end quiz,
   newest; later "Top rated" (payload-lfrs lfrs.ratingsAverage with a
   minimum ratingsCount) and "Chosen lately" (stats.popularity).
   Rules: a candidate enters only with >= 3 tours; never the same rail two
   visits in a row; stable within a visit (no reshuffle on back navigation);
   the title names the criterion, so the rotation itself shows what exists.

STRUCTURE: page.tsx becomes a server page wrapping the client home; rails
stream in Suspense below the first screen so the ways in paint at once.
Reuse the tour card; add a museum card (MarketplaceCard has no museum kind).
No Payload blocks global for the home (two context-driven rails need no staff
configuration); the blocks idea is kept for the marketplace shape.

SEPARATE FEATURES (own shape, not part of this build):

- Tour-start counter: stats.popularity on Tours, payload.db.updateOne with
  {$inc: weight}, weight = 2^((now - 2026-01-01) / 14 days); Server Action on
  StartTourButton, deduped by a session cookie; int test.
- Ratings entry point at the end of a tour's navigation (today only the quiz
  result asks), so "Top rated" can fill.
- Saving (bookmark + "Save", guest saves merged on login, saved works feed
  Plan my visit and the map); feeds a "Most saved" rail via favouritesCount.

ANTI-GOALS: no third rail, no auto-advancing carousel, no marketplace grid on
the home, no rail with fewer than 3 items, no location prompt on page load.
