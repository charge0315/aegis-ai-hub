# Evaluation Rubric: Image Enrichment System

This rubric is used to evaluate the implementation of the image scraping and caching system.

## 1. Design & Visual Quality (30%)
- [ ] Most articles (80%+) in a typical feed display a relevant image.
- [ ] Fallback gradients are only seen for truly unreachable/imageless content.
- [ ] Image aspect ratios are handled correctly in the UI (no stretching).
- [ ] The dashboard feels "full" and visually engaging compared to the text-only state.

## 2. Scraping Reliability (30%)
- [ ] Extracts `og:image` correctly from major platforms.
- [ ] Falls back to `twitter:image` or other meta tags if `og:image` is missing.
- [ ] Successfully resolves relative image URLs to absolute ones.
- [ ] Heuristics for body images work for sites without proper OGP tags.

## 3. Performance & Efficiency (20%)
- [ ] Subsequent dashboard loads are significantly faster due to the image cache.
- [ ] Scraping is done in parallel with a defined concurrency limit (e.g., via `p-limit`).
- [ ] The `image_cache.json` is correctly persisted to the filesystem.

## 4. Technical Craft & Resilience (20%)
- [ ] Network errors (404, 500, timeouts) are handled gracefully without crashing the server.
- [ ] User-Agent spoofing is implemented to avoid basic bot detection.
- [ ] Code is modular (e.g., dedicated `ImageCacheManager` or clean `EnrichmentService` methods).
- [ ] Linting and type checks pass (no `any` abuse where avoidable).

## 5. Critical User Flows
1. **First-time Load**: Scraper runs, extracts images, populates cache.
2. **Reload**: Dashboard loads instantly using cached images.
3. **Broken Link**: Scraper fails gracefully, placeholder image is shown.
4. **Relative Path**: Scraper correctly prepends the base URL.
