import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import Spinner from './Spinner';
import { PhotoIcon, CloudArrowDownIcon, MagnifyingGlassPlusIcon, XMarkIcon } from './Icons';
import { GalleryImage } from '../types';
import { base64ToBlob } from '../utils';

interface ImageGridProps {
  images: (string | GalleryImage)[];
  loading: boolean;
  session: Session | null;
  onSave?: (imageUrl: string) => Promise<void>;
}

interface ProcessedImage {
    displayUrl: string;
    originalSrc: string;
    createdAt: string | null;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, loading, session, onSave }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);

  useEffect(() => {
    // Create a list of blob URLs that need to be revoked on cleanup
    const blobUrls: string[] = [];

    const newProcessedImages = images.map(img => {
      const imgSrc = typeof img === 'string' ? img : img.url;
      const createdAt = typeof img === 'object' ? img.createdAt : null;

      if (imgSrc.startsWith('data:image')) {
        const blob = base64ToBlob(imgSrc);
        const objectUrl = URL.createObjectURL(blob);
        blobUrls.push(objectUrl);
        return { displayUrl: objectUrl, originalSrc: imgSrc, createdAt };
      }
      return { displayUrl: imgSrc, originalSrc: imgSrc, createdAt };
    });

    setProcessedImages(newProcessedImages);

    return () => {
      // Revoke all created blob URLs when the component unmounts or `images` changes
      blobUrls.forEach(URL.revokeObjectURL);
    };
  }, [images]);

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ai-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAndSave = async (imageUrl: string) => {
    handleDownload(imageUrl); // imageUrl is the displayUrl, which is fine for download.
    if (onSave && session) {
        const imageToSave = processedImages.find(p => p.displayUrl === imageUrl);
        if (!imageToSave) {
            console.error("Could not find original image source to save.");
            return;
        }

        setSaving(true);
        try {
            await onSave(imageToSave.originalSrc); // Pass the original base64 src
        } catch (error) {
            console.error("Failed to save image from ImageGrid", error);
        } finally {
            setSaving(false);
        }
    }
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 p-4 h-full">
        {Array(4)
          .fill(0)
          .map((_, index) => (
            <div
              key={index}
              className="aspect-square bg-gray-700/50 rounded-lg flex items-center justify-center animate-pulse"
            >
              <Spinner />
            </div>
          ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
        <PhotoIcon className="h-16 w-16 mb-4" />
        <h3 className="font-bold text-lg text-gray-400">Your generated images will appear here</h3>
        <p className="text-sm">Enter a prompt and click "Generate" to start.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 p-4">
        {processedImages.map((pImg, index) => {
            return (
              <div key={index} className="aspect-square bg-gray-900 rounded-lg overflow-hidden group relative">
                <img
                  src={pImg.displayUrl}
                  alt={`Generated image ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                 {pImg.createdAt && (
                  <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-xs font-medium">
                      {new Date(pImg.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                )}
                <div 
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer"
                    onClick={() => setSelectedImage(pImg.displayUrl)}
                >
                   <div
                      className="flex items-center gap-2 p-3 bg-indigo-600/80 text-white rounded-full"
                      aria-label="Preview image"
                    >
                     <MagnifyingGlassPlusIcon className="h-6 w-6" />
                   </div>
                </div>
              </div>
            )
        })}
      </div>

      {selectedImage && (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={handleCloseModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-preview-title"
        >
          <div 
            className="bg-gray-800 rounded-lg shadow-2xl relative max-w-4xl w-full max-h-[90vh] flex flex-col" 
            onClick={(e) => e.stopPropagation()}
          >
             <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 id="image-preview-title" className="text-lg font-medium text-white">Image Preview</h3>
                <button 
                    onClick={handleCloseModal} 
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Close preview"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>
             </div>

             <div className="p-4 flex-grow overflow-auto flex items-center justify-center bg-gray-900/50">
               <img src={selectedImage} alt="Enlarged preview" className="max-w-full max-h-full object-contain rounded-md" />
             </div>

             <div className="flex justify-end p-4 border-t border-gray-700 bg-gray-800 rounded-b-lg">
                  <button 
                    onClick={() => handleDownloadAndSave(selectedImage)} 
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:bg-indigo-400/50 disabled:cursor-wait"
                  >
                      <CloudArrowDownIcon className="h-5 w-5" />
                      {saving ? 'Saving...' : (onSave && session ? 'Download & Save' : 'Download Image')}
                  </button>
             </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in {
            animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default ImageGrid;