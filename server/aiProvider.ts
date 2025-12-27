/**
 * AI Provider - Simplified
 * 
 * Fallback chain (in order):
 * 1. gemini-3-pro-preview
 * 2. gpt-5.2
 * 3. gemini-3-flash-preview
 * 4. gpt-5
 */

import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json" | "text";
}

// Supported models in fallback order
export const SUPPORTED_MODELS = [
  { id: "gemini-3-pro-preview", provider: "gemini", name: "Gemini 3 Pro" },
  { id: "gpt-5.2", provider: "openai", name: "GPT-5.2" },
  { id: "gemini-3-flash-preview", provider: "gemini", name: "Gemini 3 Flash" },
  { id: "gpt-5", provider: "openai", name: "GPT-5" },
] as const;

export type SupportedModel = typeof SUPPORTED_MODELS[number]["id"];

// For backwards compatibility with admin config
export interface AIProviderConfig {
  provider: "openai" | "gemini";
  model?: string;
}

/**
 * Check if an error indicates a quota/rate limit issue
 */
function isQuotaOrRateLimitError(error: any): boolean {
  const errorMessage = error?.message || String(error);
  if (
    errorMessage.includes("429") ||
    errorMessage.includes("quota") ||
    errorMessage.includes("RESOURCE_EXHAUSTED") ||
    errorMessage.includes("rate") ||
    errorMessage.includes("exceeded")
  ) {
    return true;
  }
  
  if (error?.status === 429 || error?.code === 429) return true;
  if (error?.code === "RESOURCE_EXHAUSTED") return true;
  if (error?.error?.code === 429) return true;
  if (error?.error?.status === "RESOURCE_EXHAUSTED") return true;
  if (error?.response?.status === 429) return true;
  
  return false;
}

/**
 * Call OpenAI model
 */
async function callOpenAI(
  model: string,
  messages: ChatMessage[],
  options?: AICompletionOptions
): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await client.chat.completions.create({
    model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 4000,
    response_format: options?.responseFormat === "json" ? { type: "json_object" } : undefined
  });
  
  return response.choices[0]?.message?.content || "";
}

/**
 * Call Gemini model
 */
async function callGemini(
  model: string,
  messages: ChatMessage[],
  options?: AICompletionOptions
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  
  const client = new GoogleGenAI({ apiKey });
  const systemMessage = messages.find(m => m.role === "system");
  const userMessages = messages.filter(m => m.role !== "system");
  
  const contents = userMessages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const request: any = {
    model,
    contents,
    generationConfig: {
      temperature: options?.temperature ?? 0.3,
      maxOutputTokens: options?.maxTokens ?? 4000,
    }
  };

  if (options?.responseFormat === "json") {
    request.generationConfig.responseMimeType = "application/json";
  }

  if (systemMessage) {
    request.systemInstruction = { parts: [{ text: systemMessage.content }] };
  }

  const response = await client.models.generateContent(request);
  const candidate = response.candidates?.[0];
  
  if (candidate?.content?.parts) {
    return candidate.content.parts.map((p: any) => p.text || "").join("");
  }
  
  return "";
}

/**
 * Generate AI completion with automatic fallback through the model chain
 * 
 * Fallback order:
 * 1. gemini-3-pro-preview
 * 2. gpt-5.2
 * 3. gemini-3-flash-preview
 * 4. gpt-5
 */
export async function generateWithFallback(
  _config: AIProviderConfig, // Kept for backwards compatibility but ignored
  messages: ChatMessage[],
  options?: AICompletionOptions
): Promise<{ content: string; usedFallback: boolean; provider: string; model: string }> {
  
  const errors: string[] = [];
  
  for (let i = 0; i < SUPPORTED_MODELS.length; i++) {
    const modelConfig = SUPPORTED_MODELS[i];
    const isFirstAttempt = i === 0;
    
    try {
      console.log(`[AIProvider] ${isFirstAttempt ? '🚀' : '🔄'} Trying ${modelConfig.name} (${modelConfig.id})`);
      const startTime = Date.now();
      
      let content: string;
      if (modelConfig.provider === "openai") {
        content = await callOpenAI(modelConfig.id, messages, options);
      } else {
        content = await callGemini(modelConfig.id, messages, options);
      }
      
      const duration = Date.now() - startTime;
      console.log(`[AIProvider] ✅ Success with ${modelConfig.name} in ${duration}ms`);
      
      return {
        content,
        usedFallback: !isFirstAttempt,
        provider: modelConfig.provider,
        model: modelConfig.id
      };
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      errors.push(`${modelConfig.id}: ${errorMsg.substring(0, 100)}`);
      
      if (isQuotaOrRateLimitError(error)) {
        console.log(`[AIProvider] ⚠️ ${modelConfig.name} quota/rate limited, trying next...`);
        continue;
      }
      
      // For non-quota errors, also try next model
      console.log(`[AIProvider] ⚠️ ${modelConfig.name} failed: ${errorMsg.substring(0, 100)}, trying next...`);
      continue;
    }
  }
  
  // All models failed
  throw new Error(`All AI models failed. Errors: ${errors.join(' | ')}`);
}

// Backwards compatibility exports
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function getAvailableProviders() {
  return [
    {
      id: "gemini",
      name: "Google Gemini",
      available: isGeminiAvailable(),
      models: ["gemini-3-pro-preview", "gemini-3-flash-preview"]
    },
    {
      id: "openai",
      name: "OpenAI",
      available: isOpenAIAvailable(),
      models: ["gpt-5.2", "gpt-5"]
    }
  ];
}

// Legacy exports for backwards compatibility
export function getAIProvider(config: AIProviderConfig) {
  return {
    getName: () => config.provider === "gemini" ? "Gemini" : "OpenAI",
    getModel: () => config.model || SUPPORTED_MODELS[0].id,
    generateCompletion: async (messages: ChatMessage[], options?: AICompletionOptions) => {
      const result = await generateWithFallback(config, messages, options);
      return result.content;
    }
  };
}

export function clearProviderCache(): void {
  // No-op - caching removed for simplicity
}

export async function fetchAvailableModels(_provider: "openai" | "gemini"): Promise<string[]> {
  // Return only supported models
  return SUPPORTED_MODELS.map(m => m.id);
}
