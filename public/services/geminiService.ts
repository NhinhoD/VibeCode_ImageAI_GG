
import { SourceImage } from "../types";

/**
 * Generates 4 images from a text prompt by calling the backend proxy.
 * @param prompt The text prompt to generate images from.
 * @returns A promise that resolves to an array of 4 base64 encoded image strings.
 */
export const generateImagesFromPrompt = async (prompt: string): Promise<string[]> => {
  try {
    const response = await fetch('/api/generate-from-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'An unknown server error occurred.' }));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.images) {
      throw new Error('Invalid response from server.');
    }
    return data.images;
  } catch (error) {
    console.error("Error calling generation API proxy:", error);
    throw new Error(error instanceof Error ? error.message : "An error occurred while generating images.");
  }
};


/**
 * Generates 4 new images by calling the backend proxy for editing.
 * @param prompt The text prompt describing the edits.
 * @param images An array of source images.
 * @returns A promise that resolves to an array of 4 base64 encoded image strings.
 */
export const editAndGenerateImages = async (prompt: string, images: SourceImage[]): Promise<string[]> => {
    try {
        const response = await fetch('/api/edit-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, images }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'An unknown server error occurred.' }));
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.images) {
          throw new Error('Invalid response from server.');
        }
        return data.images;
    } catch (error) {
        console.error("Error calling edit API proxy:", error);
        throw new Error(error instanceof Error ? error.message : "An error occurred while editing images.");
    }
};