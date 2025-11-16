import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { editAndGenerateImages } from '../services/geminiService';
import { saveImages } from '../services/storageService';
import ImageGrid from './ImageGrid';
import { SourceImage } from '../types';
import { fileToSourceImage } from '../utils';
import { ArrowUpTrayIcon, SparklesIcon, XCircleIcon, CheckCircleIcon } from './Icons';

interface ImageEditorProps {
  session: Session;
  prompt: string;
  setPrompt: (prompt: string) => void;
  sourceImages: SourceImage[];
  setSourceImages: (images: SourceImage[]) => void;
  generatedImages: string[];
  setGeneratedImages: (images: string[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ 
    session,
    prompt,
    setPrompt,
    sourceImages,
    setSourceImages,
    generatedImages,
    setGeneratedImages,
    loading,
    setLoading,
    error,
    setError
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleFileChange = async (files: FileList | null) => {
    if (files && files.length > 0) {
      try {
        // We can keep a local loading state for file processing as it's quick and contained
        setError(null);
        const imagePromises = Array.from(files).map(fileToSourceImage);
        const newImages = await Promise.all(imagePromises);
        setSourceImages([...sourceImages, ...newImages]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load one or more images");
      }
    }
  };
  
  const handleRemoveImage = (indexToRemove: number) => {
    setSourceImages(sourceImages.filter((_, index) => index !== indexToRemove));
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || sourceImages.length === 0) {
      setError('Please upload at least one image and enter a prompt.');
      return;
    }
    setLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const newImages = await editAndGenerateImages(prompt, sourceImages);
      setGeneratedImages(newImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = async (imageUrl: string) => {
    if (!session) return;
    setSaveSuccess(false);
    try {
        await saveImages(session.user.id, [imageUrl], 'generated');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save image.');
        console.error(e);
    }
  };


  return (
    <>
      {saveSuccess && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-600 text-white font-semibold py-3 px-5 rounded-xl shadow-lg flex items-center gap-3 z-20 animate-toast-in-out">
            <CheckCircleIcon className="h-6 w-6" />
            <span>Image saved to your gallery!</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[calc(100vh-12rem)]">
        {/* Left Column: Controls */}
        <div className="flex flex-col space-y-6">
          <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Edit with AI</h2>
              <p className="text-gray-400">Upload one or more images and describe the changes you want to make.</p>
          </div>
          
          <div className="space-y-4">
            {sourceImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {sourceImages.map((image, index) => (
                  <div key={`${image.name}-${index}`} className="relative group aspect-square">
                    <img src={`data:${image.mimeType};base64,${image.base64}`} alt={`Upload preview ${index + 1}`} className="w-full h-full object-cover rounded-lg bg-gray-800" />
                    <button onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors opacity-50 group-hover:opacity-100">
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                htmlFor="file-upload" 
                className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-indigo-500 bg-gray-800' : 'border-gray-600 bg-gray-800/50 hover:bg-gray-800'} ${sourceImages.length > 0 ? 'h-28' : 'h-48'}`}>
                <div className="flex flex-col items-center justify-center text-center p-2">
                    <ArrowUpTrayIcon className={`w-8 h-8 mb-2 text-gray-400 ${sourceImages.length > 0 ? 'w-6 h-6' : 'w-8 h-8'}`} />
                    <p className="text-sm text-gray-400"><span className="font-semibold text-indigo-400">{sourceImages.length > 0 ? 'Add more images' : 'Click to upload'}</span> or drag and drop</p>
                    {sourceImages.length === 0 && <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>}
                </div>
                <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" multiple onChange={(e) => handleFileChange(e.target.files)} />
            </label>
          </div>
          
          <div className="flex flex-col space-y-4 flex-grow">
            <label htmlFor="edit-prompt" className="font-medium text-gray-300">Your Edit Prompt</label>
            <textarea
              id="edit-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Combine these images into a surreal landscape"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 resize-none flex-grow min-h-[100px]"
              rows={4}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt || sourceImages.length === 0}
            className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400/50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? 'Generating...' : 'Generate'}
            <SparklesIcon className="h-5 w-5" />
          </button>
          {error && <p className="text-red-400 text-center">{error}</p>}
        </div>

        {/* Right Column: Image Display */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700">
          <ImageGrid images={generatedImages} loading={loading} session={session} onSave={handleSaveImage} />
        </div>
      </div>
    </>
  );
};

export default ImageEditor;
