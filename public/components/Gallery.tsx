import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { getImages, UserImageData } from '../services/storageService';
import ImageGrid from './ImageGrid';
import Spinner from './Spinner';
import { RectangleStackIcon } from './Icons';

interface GalleryProps {
  session: Session;
}

const Gallery: React.FC<GalleryProps> = ({ session }) => {
  const [images, setImages] = useState<UserImageData>({ generated: [], edited: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      setError(null);
      try {
        const imageData = await getImages(session.user.id);
        setImages(imageData);
      } catch (err) {
        console.error("Gallery fetch error:", err);
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unknown error occurred while loading your gallery.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [session.user.id]);
  
  const hasImages = images.generated.length > 0 || images.edited.length > 0;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">My Gallery</h2>
          <p className="text-gray-400">All your generated and uploaded images are saved here for you to view and download.</p>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Spinner />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-96 text-center text-red-400 p-6 bg-red-900/20 rounded-lg border border-red-800/50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <h3 className="font-bold text-lg text-red-300 mb-2">Error Loading Gallery</h3>
            <p className="text-sm max-w-2xl">{error}</p>
        </div>
      ) : !hasImages ? (
         <div className="flex flex-col items-center justify-center h-96 text-center text-gray-500 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <RectangleStackIcon className="h-16 w-16 mb-4" />
            <h3 className="font-bold text-lg text-gray-400">Your gallery is empty</h3>
            <p className="text-sm">Start creating images and use the 'Download & Save' button to add them here.</p>
        </div>
      ) : (
        <div className="space-y-12">
            {images.generated.length > 0 && (
                <section>
                    <h3 className="text-xl font-semibold text-white mb-4">Generated Images</h3>
                    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
                        <ImageGrid images={images.generated} loading={false} session={session} />
                    </div>
                </section>
            )}

            {images.edited.length > 0 && (
                <section>
                    <h3 className="text-xl font-semibold text-white mb-4">Uploaded for Editing</h3>
                     <div className="bg-gray-800/50 rounded-lg border border-gray-700">
                        <ImageGrid images={images.edited} loading={false} session={session} />
                    </div>
                </section>
            )}
        </div>
      )}
    </div>
  );
};

export default Gallery;