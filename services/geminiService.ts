
import { GoogleGenAI, Modality } from "@google/genai";
import { SourceImage } from "../types";

// Helper function to determine if we are in a production (Vercel) environment.
const isProduction = () => window.location.hostname.includes('vercel.app');

// --- Direct API call for non-production environments (like AI Studio Preview) ---
const callApiDirectly = async (prompt: string): Promise<string[]> => {
    // This will only be called in environments where the API_KEY is available client-side, like AI Studio.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY is not available. This method is only for preview environments like AI Studio.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 4,
            outputMimeType: 'image/png',
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("API did not return any images.");
    }

    return response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
};

const editApiDirectly = async (prompt: string, images: SourceImage[]): Promise<string[]> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY is not available. This method is only for preview environments like AI Studio.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const generateSingleImage = async (): Promise<string> => {
        const imageParts = images.map(image => ({
            inlineData: { data: image.base64, mimeType: image.mimeType },
        }));
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [...imageParts, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image generated from the model.");
    }

    const promises = Array(4).fill(0).map(() => generateSingleImage());
    return await Promise.all(promises);
};


// --- Vercel Proxy call for production environment ---
const callApiViaProxy = async (prompt: string): Promise<string[]> => {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate images from server.');
    }
    const data = await response.json();
    return data.images;
};

const editApiViaProxy = async (prompt: string, images: SourceImage[]): Promise<string[]> => {
    const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, images }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit images from server.');
    }
    const data = await response.json();
    return data.images;
};


/**
 * Generates 4 images from a text prompt.
 * It automatically decides whether to use the direct API call (for previews)
 * or the secure server proxy (for production).
 */
export const generateImagesFromPrompt = async (prompt: string): Promise<string[]> => {
  try {
    if (isProduction()) {
      return await callApiViaProxy(prompt);
    } else {
      return await callApiDirectly(prompt);
    }
  } catch (error) {
    console.error("Error generating images:", error);
    throw new Error(error instanceof Error ? error.message : "An unexpected error occurred.");
  }
};

/**
 * Generates 4 new images by editing source images with a text prompt.
 * It automatically decides whether to use the direct API call (for previews)
 * or the secure server proxy (for production).
 */
export const editAndGenerateImages = async (prompt: string, images: SourceImage[]): Promise<string[]> => {
    try {
        if (isProduction()) {
            return await editApiViaProxy(prompt, images);
        } else {
            return await editApiDirectly(prompt, images);
        }
    } catch (error) {
        console.error("Error editing images:", error);
        throw new Error(error instanceof Error ? error.message : "An unexpected error occurred.");
    }
};
