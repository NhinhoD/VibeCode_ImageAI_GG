import { GoogleGenAI, Modality } from "@google/genai";

interface SourceImage {
  base64: string;
  mimeType: string;
  name: string;
}

const generateSingleImageFromImage = async (prompt: string, images: SourceImage[], apiKey: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });

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

// Vercel Serverless Function signature
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }
    
    const { prompt, images } = req.body;

    if (!prompt || typeof prompt !== 'string' || !images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ message: 'A valid prompt and at least one source image are required.' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY environment variable not set.");
        return res.status(500).json({ message: "Server configuration error. The API_KEY is missing." });
    }
    
    try {
        const promises = Array(4).fill(0).map(() => generateSingleImageFromImage(prompt, images, apiKey));
        const results = await Promise.all(promises);
        return res.status(200).json({ images: results });
    } catch (error: any) {
        console.error("Error editing image via API proxy:", error);
        return res.status(500).json({ message: "Failed to edit images. Please try again later." });
    }
}
