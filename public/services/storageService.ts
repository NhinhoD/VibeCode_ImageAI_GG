import { supabase } from './supabaseClient';
import { base64ToBlob } from '../utils';
import { GalleryImage } from '../types';

export interface UserImageData {
  generated: GalleryImage[];
  edited: GalleryImage[];
}

/**
 * Retrieves all image URLs for a given user from Supabase.
 * @param userId The ID of the user.
 * @returns An object with 'generated' and 'edited' image URL arrays.
 */
export const getImages = async (userId: string): Promise<UserImageData> => {
  if (!userId) return { generated: [], edited: [] };
  
  const { data, error } = await supabase
    .from('images')
    .select('image_url, type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error);
    throw new Error(`Failed to fetch images. Reason: ${error.message}. Please check your RLS policies for the 'images' table.`);
  }

  const imageData: UserImageData = { generated: [], edited: [] };
  if (data) {
      for (const image of data) {
          const galleryImage: GalleryImage = { url: image.image_url, createdAt: image.created_at };
          if (image.type === 'generated') {
              imageData.generated.push(galleryImage);
          } else if (image.type === 'edited') {
              imageData.edited.push(galleryImage);
          }
      }
  }
  return imageData;
};

/**
 * Saves a set of images for a user to Supabase Storage and database.
 * @param userId The ID of the user.
 * @param newImages An array of base64 image strings to save.
 * @param type The type of images ('generated' or 'edited').
 */
export const saveImages = async (userId: string, newImages: string[], type: 'generated' | 'edited'): Promise<void> => {
  if (!userId || newImages.length === 0) return;

  try {
    const uploadPromises = newImages.map(async (imageString) => {
        const blob = base64ToBlob(imageString);
        const fileName = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.png`;
        const filePath = `${userId}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('user_images')
            .upload(filePath, blob);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('user_images')
            .getPublicUrl(filePath);

        if (!publicUrl) {
            throw new Error('Could not get public URL for uploaded image.');
        }

        // Return metadata for batch insert
        return {
            user_id: userId,
            image_url: publicUrl,
            type: type
        };
    });

    const imageDataToInsert = await Promise.all(uploadPromises);

    // Batch insert metadata into the database
    if (imageDataToInsert.length > 0) {
        const { error: insertError } = await supabase
            .from('images')
            .insert(imageDataToInsert);
        
        if (insertError) throw insertError;
    }

  } catch (e) {
    console.error("Failed to save images to Supabase", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to save images. Reason: ${errorMessage}. Please check your storage bucket permissions and database RLS policies.`);
  }
};