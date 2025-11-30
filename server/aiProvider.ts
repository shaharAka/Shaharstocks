/**
 * AI Provider Interface
 * Abstracts AI model providers (OpenAI, Gemini) for stock analysis
 * Allows switching between providers via admin settings
 */

import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

export interface AIProviderConfig {
  provider: "openai" | "gemini";
  model?: string; // Optional model override
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json" | "text";
}

export interface AIProvider {
  generateCompletion(
    messages: ChatMessage[],
    options?: AICompletionOptions
  ): Promise<string>;
  
  getName(): string;
  getModel(): string;
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(model?: string) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = model || "gpt-4o";
  }

  async generateCompletion(
    messages: ChatMessage[],
    options?: AICompletionOptions
  ): Promise<string> {
    console.log(`[OpenAIProvider] 🚀 Making API call with model: ${this.model}`);
    
    const startTime = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4000,
      response_format: options?.responseFormat === "json" 
        ? { type: "json_object" } 
        : undefined
    });
    const duration = Date.now() - startTime;
    
    console.log(`[OpenAIProvider] ✅ API call completed in ${duration}ms using model: ${this.model}`);

    return response.choices[0]?.message?.content || "";
  }

  getName(): string {
    return "OpenAI";
  }

  getModel(): string {
    return this.model;
  }
}

class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor(model?: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = model || "gemini-2.5-flash";
  }

  async generateCompletion(
    messages: ChatMessage[],
    options?: AICompletionOptions
  ): Promise<string> {
    console.log(`[GeminiProvider] 🚀 Making API call with model: ${this.model}`);
    
    const systemMessage = messages.find(m => m.role === "system");
    const userMessages = messages.filter(m => m.role !== "system");
    
    // Build contents array with proper structure for Gemini API
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = userMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    // Build the request object with parameters at top level (not nested in config)
    const request: any = {
      model: this.model,
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

    const startTime = Date.now();
    const response = await this.client.models.generateContent(request);
    const duration = Date.now() - startTime;
    
    console.log(`[GeminiProvider] ✅ API call completed in ${duration}ms using model: ${this.model}`);

    // Extract text from response properly
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      return candidate.content.parts.map((p: any) => p.text || "").join("");
    }
    
    // Fallback to response.text if available
    if (typeof (response as any).text === "function") {
      return (response as any).text() || "";
    }
    
    return "";
  }

  getName(): string {
    return "Gemini";
  }

  getModel(): string {
    return this.model;
  }
}

let cachedProvider: AIProvider | null = null;
let cachedConfig: AIProviderConfig | null = null;

export function getAIProvider(config: AIProviderConfig): AIProvider {
  if (cachedProvider && 
      cachedConfig?.provider === config.provider && 
      cachedConfig?.model === config.model) {
    return cachedProvider;
  }

  console.log(`[AIProvider] Initializing ${config.provider} provider${config.model ? ` with model ${config.model}` : ""}`);

  switch (config.provider) {
    case "gemini":
      cachedProvider = new GeminiProvider(config.model);
      break;
    case "openai":
    default:
      cachedProvider = new OpenAIProvider(config.model);
      break;
  }

  cachedConfig = config;
  return cachedProvider;
}

export function clearProviderCache(): void {
  cachedProvider = null;
  cachedConfig = null;
}

export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function getAvailableProviders(): { id: string; name: string; available: boolean; models: string[] }[] {
  return [
    {
      id: "openai",
      name: "OpenAI",
      available: isOpenAIAvailable(),
      models: ["gpt-5.1", "gpt-4o", "gpt-4o-mini"]
    },
    {
      id: "gemini",
      name: "Google Gemini",
      available: isGeminiAvailable(),
      models: ["gemini-2.5-pro", "gemini-2.5-flash"]
    }
  ];
}

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface GeminiModel {
  name: string;
  displayName: string;
  description: string;
  supportedGenerationMethods: string[];
}

export async function fetchOpenAIModels(): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return ["gpt-5.1", "gpt-4o", "gpt-4o-mini"];
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      console.error("[AIProvider] Failed to fetch OpenAI models:", response.statusText);
      return ["gpt-5.1", "gpt-4o", "gpt-4o-mini"];
    }

    const data = await response.json() as { data: OpenAIModel[] };
    
    const chatModels = data.data
      .filter((m: OpenAIModel) => {
        const id = m.id.toLowerCase();
        const isGPT = id.startsWith("gpt-4") || id.startsWith("gpt-5");
        const isNotSpecialized = !id.includes("vision") &&
               !id.includes("realtime") &&
               !id.includes("audio") &&
               !id.includes("instruct") &&
               !id.includes("codex") &&
               !id.includes("embedding");
        const isValidOwner = m.owned_by === "openai" || m.owned_by === "system";
        return isGPT && isNotSpecialized && isValidOwner;
      })
      .map((m: OpenAIModel) => m.id)
      .sort((a: string, b: string) => {
        const priority = (id: string) => {
          if (id === "gpt-5.1") return 0;
          if (id.startsWith("gpt-5.1") && !id.includes("mini") && !id.includes("nano")) return 1;
          if (id === "gpt-4o") return 2;
          if (id === "gpt-4o-mini") return 3;
          if (id === "gpt-4") return 4;
          if (id.includes("gpt-5")) return 5;
          if (id.includes("gpt-4o")) return 6;
          if (id.includes("gpt-4")) return 7;
          return 10;
        };
        return priority(a) - priority(b);
      });

    console.log("[AIProvider] Fetched OpenAI models:", chatModels);
    return chatModels.length > 0 ? chatModels : ["gpt-5.1", "gpt-4o", "gpt-4o-mini"];
  } catch (error) {
    console.error("[AIProvider] Error fetching OpenAI models:", error);
    return ["gpt-5.1", "gpt-4o", "gpt-4o-mini"];
  }
}

export async function fetchGeminiModels(): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return ["gemini-2.5-pro", "gemini-2.5-flash"];
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      console.error("[AIProvider] Failed to fetch Gemini models:", response.statusText);
      return ["gemini-2.5-pro", "gemini-2.5-flash"];
    }

    const data = await response.json() as { models: GeminiModel[] };
    
    const chatModels = data.models
      .filter((m: GeminiModel) => {
        const name = m.name.replace("models/", "");
        const isGemini = name.startsWith("gemini-2") || name.startsWith("gemini-3");
        const supportsChat = m.supportedGenerationMethods?.includes("generateContent");
        const isNotSpecialized = !name.includes("image") &&
               !name.includes("audio") &&
               !name.includes("vision") &&
               !name.includes("embedding") &&
               !name.includes("exp") &&
               !name.includes("thinking");
        return isGemini && supportsChat && isNotSpecialized;
      })
      .map((m: GeminiModel) => m.name.replace("models/", ""))
      .sort((a: string, b: string) => {
        const priority = (id: string) => {
          if (id === "gemini-2.5-pro") return 0;
          if (id === "gemini-2.5-flash") return 1;
          if (id.includes("gemini-3") && id.includes("pro")) return 2;
          if (id.includes("gemini-2.5-pro")) return 3;
          if (id.includes("gemini-2.5-flash") && !id.includes("lite")) return 4;
          if (id.includes("gemini-2.5-flash-lite")) return 5;
          if (id.includes("gemini-3")) return 6;
          return 10;
        };
        return priority(a) - priority(b);
      });

    console.log("[AIProvider] Fetched Gemini models:", chatModels);
    return chatModels.length > 0 ? chatModels : ["gemini-2.5-pro", "gemini-2.5-flash"];
  } catch (error) {
    console.error("[AIProvider] Error fetching Gemini models:", error);
    return ["gemini-2.5-pro", "gemini-2.5-flash"];
  }
}

export async function fetchAvailableModels(provider: "openai" | "gemini"): Promise<string[]> {
  if (provider === "openai") {
    return fetchOpenAIModels();
  } else {
    return fetchGeminiModels();
  }
}
