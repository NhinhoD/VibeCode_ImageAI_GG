
import { GoogleGenAI } from "@google/genai";

// This file configures a Vercel serverless function.
// It's essential to export a default handler function.
// We configure this to run on the Edge runtime for performance.
export const config = {
  runtime: 'edge',
};

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
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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
    
    const images = response.generatedImages.map(img => {
        const base64ImageBytes: string = img.image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    });

    return new Response(JSON.stringify({ images }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in /api/generate:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return new Response(JSON.stringify({ error: `Server error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
