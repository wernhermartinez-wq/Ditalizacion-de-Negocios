import { geminiVisibilityProvider } from "./gemini";
import { openAIVisibilityProvider } from "./openai";
import { perplexityVisibilityProvider } from "./perplexity";

export const providerAdapters = [openAIVisibilityProvider, geminiVisibilityProvider, perplexityVisibilityProvider];

export function providerConfiguration() {
  return providerAdapters.map((provider) => ({ provider: provider.name, configured: provider.configured() }));
}
