import CulturalContextService from './CulturalContextService';
import SpeechCacheService from './SpeechCacheService';

export { default as CulturalContextService } from './CulturalContextService';
export { default as SpeechCacheService } from './SpeechCacheService';

export type {
  CulturalResponseTemplate,
  CulturalDetectionMetrics,
  CulturalAdaptationConfig
} from './CulturalContextService';

export type {
  CacheUsageAnalytics,
  CacheWarmingConfig,
  CulturalPhraseSet
} from './SpeechCacheService';

// Convenience function to get singleton instances
export const getCulturalServices = () => ({
  culturalContext: CulturalContextService.getInstance(),
  speechCache: SpeechCacheService.getInstance()
});

// Cultural service initialization helper
export const initializeCulturalServices = async (userId: string, _culturalGroup: string) => {
  const services = getCulturalServices();
  
  // Load user's cultural profile
  const profile = await services.culturalContext.getCulturalProfile(userId);
  
  // Warm the cache for the user's cultural group
  if (profile) {
    await services.speechCache.warmCacheForUser(profile.culturalGroup, userId);
  }
  
  return services;
};