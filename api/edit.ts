
import { GoogleGenAI, Modality } from "@google/genai";
import { SourceImage } from "../types";

export const config = {
  runtime: 'edge',
};

// Helper function to generate a single image, used to run in parallel.
const generateSingleImageFromImage = async (ai: GoogleGenAI, prompt: string, images: SourceImage[]): Promise<string> => {
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
                { text: prompt },
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


export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key is not configured on the server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt, images } = await req.json();

    if (!prompt || !images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: 'Prompt and at least one source image are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Run 4 generation requests in parallel
    const promises = Array(4).fill(0).map(() => generateSingleImageFromImage(ai, prompt, images));
    const generatedImages = await Promise.all(promises);

    return new Response(JSON.stringify({ images: generatedImages }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in /api/edit:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return new Response(JSON.stringify({ error: `Server error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
