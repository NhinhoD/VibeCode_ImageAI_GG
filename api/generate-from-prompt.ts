import { GoogleGenAI } from "@google/genai";

// Vercel Serverless Function signature
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }

    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ message: 'A valid text prompt is required.' });
    }
    
    if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set.");
        return res.status(500).json({ message: "Server configuration error. The API_KEY is missing." });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 4,
                outputMimeType: 'image/png',
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            return res.status(500).json({ message: "API did not return any images." });
        }
        
        const images = response.generatedImages.map(img => {
            const base64ImageBytes: string = img.image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        });

        return res.status(200).json({ images });

    } catch (error: any) {
        console.error("Error generating images via API proxy:", error);
        return res.status(500).json({ message: "Failed to generate images. Please try again later." });
    }
}
