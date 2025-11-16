import { SourceImage } from "./types";

/**
 * Converts a File object to a SourceImage object containing base64 data.
 * @param file The file to convert.
 * @returns A promise that resolves to a SourceImage object.
 */
export const fileToSourceImage = (file: File): Promise<SourceImage> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
        return reject(new Error('File is not an image.'));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (base64) {
        resolve({
          base64,
          mimeType: file.type,
          name: file.name
        });
      } else {
        reject(new Error('Failed to read file as base64.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};


/**
 * Converts a base64 data URI to a Blob object.
 * @param dataURI The base64 data URI string.
 * @returns A Blob object.
 */
export const base64ToBlob = (dataURI: string): Blob => {
    const splitDataURI = dataURI.split(',');
    const byteString = atob(splitDataURI[1]);
    const mimeString = splitDataURI[0].split(':')[1].split(';')[0];

    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], { type: mimeString });
}