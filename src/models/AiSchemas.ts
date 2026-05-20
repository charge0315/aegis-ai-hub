import { z } from 'zod';

/**
 * Zod schemas for Gemini AI responses
 */

// 1. Curation
export const CurateResponseSchema = z.object({
  selections: z.array(z.object({
    id: z.number(),
    reason: z.string()
  }))
});

// 2. Evolution Proposals
export const EvolutionProposalSchema = z.object({
  sites: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.string(),
    reason: z.string()
  })),
  brands: z.array(z.object({
    value: z.string(),
    category: z.string(),
    reason: z.string()
  })),
  keywords: z.array(z.object({
    value: z.string(),
    category: z.string(),
    reason: z.string()
  }))
});

// 3. Fallback Evolution
export const FallbackEvolutionSchema = z.object({
  sites: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.string(),
    reason: z.string()
  }))
});

// 4. Restructure
export const RestructureResponseSchema = z.object({
  categories: z.array(z.object({
    name: z.string(),
    emoji: z.string(),
    brands: z.array(z.string()),
    keywords: z.array(z.string()),
    score: z.number(),
    reason: z.string()
  })),
  feedMapping: z.array(z.object({
    url: z.string().url(),
    newCategory: z.string()
  })),
  newSuggestedFeeds: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.string()
  }))
});

// 5. Discover Sites
export const DiscoverSitesSchema = z.object({
  sites: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.string()
  }))
});

// 6. Discover English Sites
export const DiscoverEnglishSitesSchema = z.object({
  sites: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.string(),
    lang: z.string()
  }))
});

// 7. Translate Articles
export const TranslateArticlesSchema = z.object({
  translations: z.array(z.object({
    title: z.string(),
    desc: z.string()
  }))
});

// 8. Analyze Trends
export const AnalyzeTrendsSchema = z.object({
  suggestions: z.array(z.object({
    value: z.string(),
    category: z.string(),
    reason: z.string(),
    type: z.enum(["emerging", "breakthrough", "niche", "mainstream"]),
    confidence: z.number().min(0).max(100),
    context: z.string()
  }))
});

// 9. Suggest Category Details
export const SuggestCategoryDetailsSchema = z.object({
  brands: z.array(z.string()),
  keywords: z.array(z.string()),
  emoji: z.string(),
  reason: z.string()
});

// 10. Translate Interests
export const TranslateInterestsSchema = z.object({
  categories: z.array(z.object({
    originalName: z.string(),
    name: z.string(),
    emoji: z.string(),
    brands: z.array(z.string()),
    keywords: z.array(z.string()),
    score: z.number(),
    reason: z.string()
  }))
});
