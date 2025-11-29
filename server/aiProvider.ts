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

    const response = await this.client.models.generateContent(request);

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
      models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]
    },
    {
      id: "gemini",
      name: "Google Gemini",
      available: isGeminiAvailable(),
      models: ["gemini-2.5-flash", "gemini-2.5-pro"]
    }
  ];
}
