
import { GoogleGenAI } from "@google/genai";
import { ProcessedImage } from '../types';

const MODEL_NAME = 'gemini-3-pro-image-preview';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface GenerationResult {
  imageUrl: string;
  promptTokens: number;
  candidateTokens: number;
}

/**
 * Generates a new image that synthesizes the stylistic "DNA" of reference images.
 */
export const generateStyledImage = async (
  prompt: string,
  referenceImages: ProcessedImage[]
): Promise<GenerationResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found. Please select an API key first.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];

  // Add reference images
  for (const img of referenceImages) {
    if (img.base64 && img.mimeType) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64
        }
      });
    }
  }

  const systemInstruction = `You are a world-class visual synthesizer. 
  Extract the color theory, composition, lighting, and textures from the provided reference images.
  Generate a SINGLE high-quality image of the user subject strictly following that style.
  Output ONLY the image data. No collage, no text in the image.`;

  parts.push({ text: `Subject: ${prompt}` });

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: parts },
        config: {
          systemInstruction: systemInstruction,
          imageConfig: {
              aspectRatio: "1:1", 
              imageSize: "1K" 
          }
        },
      });

      const usage = response.usageMetadata;
      if (usage) {
        console.log('--- AI Usage Tracking ---');
        console.log(`Prompt Tokens: ${usage.promptTokenCount}`);
        console.log(`Candidates Tokens: ${usage.candidatesTokenCount}`);
        console.log(`Total Tokens: ${usage.totalTokenCount}`);
        console.log('-------------------------');
      }

      // Robust extraction: iterate through candidates and parts
      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) {
            return {
              imageUrl: `data:image/png;base64,${part.inlineData.data}`,
              promptTokens: usage?.promptTokenCount || 0,
              candidateTokens: usage?.candidatesTokenCount || 0
            };
          }
        }
      }
      
      // If we got here, no image was found in parts
      console.warn("No image found in response parts. Response content:", JSON.stringify(candidate?.content));
      throw new Error("The model did not return an image part. This can happen if the references are too complex or trigger safety filters.");

    } catch (error: any) {
      const msg = error.message || JSON.stringify(error);
      const isRetryable = msg.includes('503') || msg.toLowerCase().includes('overloaded') || msg.includes('429');

      if (isRetryable && attempts < maxAttempts - 1) {
        attempts++;
        const waitTime = 2000 * Math.pow(2, attempts - 1);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }

  throw new Error("Service unavailable. Please try again later.");
};
