
import { GoogleGenAI, Modality } from "@google/genai";
import { SourceImage } from "../types";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Generates 4 images from a text prompt using the imagen-4.0 model.
 * @param prompt The text prompt to generate images from.
 * @returns A promise that resolves to an array of 4 base64 encoded image strings.
 */
export const generateImagesFromPrompt = async (prompt: string): Promise<string[]> => {
  try {
    const ai = getAiClient();
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
    
    return response.generatedImages.map(img => {
        const base64ImageBytes: string = img.image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    });
  } catch (error) {
    console.error("Error generating images from prompt:", error);
    throw new Error("Failed to generate images. Please check your prompt or API key.");
  }
};


/**
 * Generates a single new image based on a source image and a text prompt.
 * This is a helper function for editAndGenerateImages.
 */
const generateSingleImageFromImage = async (prompt: string, images: SourceImage[]): Promise<string> => {
    const ai = getAiClient();

    const imageParts = images.map(image => ({
        inlineData: {
            data: image.base64,
            mimeType: image.mimeType,
        },
    }));

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                ...imageParts,
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated from the model.");
}

/**
 * Generates 4 new images by editing a source image with a text prompt.
 * It makes 4 parallel calls to the Gemini API.
 * @param prompt The text prompt describing the edits.
 * @param images An array of source images.
 * @returns A promise that resolves to an array of 4 base64 encoded image strings.
 */
export const editAndGenerateImages = async (prompt: string, images: SourceImage[]): Promise<string[]> => {
    try {
        const promises = Array(4).fill(0).map(() => generateSingleImageFromImage(prompt, images));
        const results = await Promise.all(promises);
        return results;
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit image. Please check your inputs or API key.");
    }
};
