import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { generateImagesFromPrompt } from '../services/geminiService';
import { saveImages } from '../services/storageService';
import ImageGrid from './ImageGrid';
import { SparklesIcon, CheckCircleIcon } from './Icons';

interface ImageGeneratorProps {
  session: Session | null;
  onAuthClick: () => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  images: string[];
  setImages: (images: string[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  justGenerated: boolean;
  setJustGenerated: (justGenerated: boolean) => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ 
  session, 
  onAuthClick,
  prompt,
  setPrompt,
  images,
  setImages,
  loading,
  setLoading,
  error,
  setError,
  justGenerated,
  setJustGenerated
}) => {
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setLoading(true);
    setError(null);
    setImages([]);
    setJustGenerated(false);

    try {
      const generatedImages = await generateImagesFromPrompt(prompt);
      setImages(generatedImages);
      setJustGenerated(true);
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
              <h2 className="text-2xl font-bold text-white">Create from Prompt</h2>
              <p className="text-gray-400">Describe the image you want to create. Be as specific as you can for the best results.</p>
          </div>
          <div className="flex flex-col space-y-4 flex-grow">
            <label htmlFor="prompt" className="font-medium text-gray-300">Your Prompt</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A cinematic shot of a raccoon astronaut commandeering a pirate ship in a cosmic nebula"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 resize-none flex-grow min-h-[150px]"
              rows={6}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400/50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? 'Generating...' : 'Generate'}
            <SparklesIcon className="h-5 w-5" />
          </button>
          {error && <p className="text-red-400 text-center">{error}</p>}
        </div>

        {/* Right Column: Image Display */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col">
          {justGenerated && !session && (
            <div className="p-4 bg-indigo-900/50 text-center rounded-t-lg border-b border-gray-700">
              <p className="text-indigo-200 text-sm">
                Want to keep these images?{' '}
                <button onClick={onAuthClick} className="font-bold underline hover:text-white transition-colors">
                  Sign in
                </button>
                {' '}to save them to your gallery.
              </p>
            </div>
          )}
          <div className="flex-grow">
            <ImageGrid images={images} loading={loading} session={session} onSave={handleSaveImage} />
          </div>
        </div>
      </div>
    </>
  );
};

export default ImageGenerator;