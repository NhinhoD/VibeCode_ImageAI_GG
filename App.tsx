import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import ImageGenerator from './components/ImageGenerator';
import ImageEditor from './components/ImageEditor';
import Gallery from './components/Gallery';
import Auth from './components/Auth';
import { SparklesIcon, PhotoIcon, PencilSquareIcon, RectangleStackIcon, ArrowLeftStartOnRectangleIcon, UserCircleIcon } from './components/Icons';
import { SourceImage } from './types';

type Mode = 'generate' | 'edit' | 'gallery';

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const NavButton: React.FC<NavButtonProps> = ({
  active,
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 ${
      active
        ? 'bg-indigo-600 text-white shadow-lg'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
  >
    {children}
  </button>
);

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('generate');
  const [session, setSession] = useState<Session | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  // State for ImageGenerator
  const [generatorPrompt, setGeneratorPrompt] = useState('');
  const [generatorImages, setGeneratorImages] = useState<string[]>([]);
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [generatorJustGenerated, setGeneratorJustGenerated] = useState(false);

  // State for ImageEditor
  const [editorPrompt, setEditorPrompt] = useState('');
  const [editorSourceImages, setEditorSourceImages] = useState<SourceImage[]>([]);
  const [editorGeneratedImages, setEditorGeneratedImages] = useState<string[]>([]);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);


  useEffect(() => {
    setLoadingSession(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
       // Close modal on successful auth change
      if (session) {
          setShowAuthModal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  
  if (loadingSession) {
    return <div className="min-h-screen bg-gray-900" />;
  }


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <SparklesIcon className="h-8 w-8 text-indigo-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">AI Image Studio</h1>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-2 p-1 bg-gray-900/50 rounded-lg">
                <NavButton active={mode === 'generate'} onClick={() => setMode('generate')}>
                  <PhotoIcon className="h-5 w-5" />
                  Generate
                </NavButton>
                <NavButton active={mode === 'edit'} onClick={() => setMode('edit')}>
                  <PencilSquareIcon className="h-5 w-5" />
                  Edit
                </NavButton>
                 <NavButton active={mode === 'gallery'} onClick={() => setMode('gallery')}>
                  <RectangleStackIcon className="h-5 w-5" />
                  My Gallery
                </NavButton>
              </nav>
               <div className="flex items-center gap-3 text-sm text-gray-300">
               {session ? (
                 <>
                   <span className="hidden sm:inline">{session.user.email}</span>
                   <button 
                     onClick={handleLogout} 
                     className="p-2 rounded-md hover:bg-gray-700 transition-colors"
                     aria-label="Logout"
                   >
                     <ArrowLeftStartOnRectangleIcon className="h-5 w-5" />
                   </button>
                 </>
               ) : (
                 <button 
                   onClick={() => setShowAuthModal(true)} 
                   className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                   aria-label="Login or Sign up"
                 >
                    <UserCircleIcon className="h-5 w-5" />
                   <span className="hidden sm:inline">Sign In</span>
                 </button>
               )}
             </div>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
         {(!session && (mode === 'edit' || mode === 'gallery')) ? (
         <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center text-gray-500 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
           <UserCircleIcon className="h-16 w-16 mb-4" />
           <h3 className="font-bold text-lg text-gray-400">Please sign in to continue</h3>
           <p className="text-sm max-w-sm mb-6">
             {mode === 'edit' 
               ? "You need to be logged in to edit images and save your work to your personal gallery."
               : "You need to be logged in to view your personal gallery of generated and edited images."}
           </p>
           <button
             onClick={() => setShowAuthModal(true)}
             className="bg-indigo-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
           >
             Sign In / Sign Up
           </button>
         </div>
       ) : (
         <>
           {mode === 'generate' && (
            <ImageGenerator 
              session={session} 
              onAuthClick={() => setShowAuthModal(true)}
              prompt={generatorPrompt}
              setPrompt={setGeneratorPrompt}
              images={generatorImages}
              setImages={setGeneratorImages}
              loading={generatorLoading}
              setLoading={setGeneratorLoading}
              error={generatorError}
              setError={setGeneratorError}
              justGenerated={generatorJustGenerated}
              setJustGenerated={setGeneratorJustGenerated}
            />
           )}
           {mode === 'edit' && (
            <ImageEditor 
                session={session!}
                prompt={editorPrompt}
                setPrompt={setEditorPrompt}
                sourceImages={editorSourceImages}
                setSourceImages={setEditorSourceImages}
                generatedImages={editorGeneratedImages}
                setGeneratedImages={setEditorGeneratedImages}
                loading={editorLoading}
                setLoading={setEditorLoading}
                error={editorError}
                setError={setEditorError}
            />
           )}
           {mode === 'gallery' && <Gallery session={session!} />}
         </>
       )}
      </main>
      {showAuthModal && <Auth onClose={() => setShowAuthModal(false)} />}
    </div>
  );
};

export default App;
