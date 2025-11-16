import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { SparklesIcon, EnvelopeIcon, KeyIcon, XMarkIcon } from './Icons';
import Spinner from './Spinner';

interface AuthProps {
  onClose: () => void;
}

const Auth: React.FC<AuthProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [view, setView] = useState<'form' | 'otp'>('form');
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const clearState = (newMode: 'signIn' | 'signUp') => {
    setMode(newMode);
    setView('form');
    setPassword('');
    setOtp('');
    setMessage('');
    setError('');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // For this to send an OTP, "Enable email OTPs" must be turned on in your Supabase project's auth settings.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else if (data.user?.identities?.length === 0) {
      setError('A user with this email address already exists. Please sign in.');
    } else {
      setMessage('A verification code has been sent to your email.');
      setView('otp');
    }
    setLoading(false);
  };

  const handleVerifySignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });

    if (otpError) {
      setError(otpError.message);
      setLoading(false);
      return;
    }
    
    // OTP is verified, now log the user in.
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (signInError) {
        setError(`Verification successful, but login failed. Please try signing in manually. Error: ${signInError.message}`);
    }
    // On success, onAuthStateChange listener in App.tsx will close the modal.
    setLoading(false);
  };

  const handleSignInSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Don't create a user if they don't exist
      },
    });
    
    if (error) {
        setError(error.message);
    } else {
        setMessage('A login code has been sent to your email.');
        setView('otp');
    }
    setLoading(false);
  };
  
  const handleVerifySignInOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      
      const { error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'email',
      });
      
      if (error) {
          setError(error.message);
      }
      // On success, onAuthStateChange listener in App.tsx will close the modal.
      setLoading(false);
  };

  const currentSubmitHandler = mode === 'signUp' ? handleVerifySignUpOtp : handleVerifySignInOtp;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800/80 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
            onClick={onClose} 
            className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Close"
        >
            <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="p-8">
            <div className="flex flex-col items-center text-center mb-6">
                <SparklesIcon className="h-10 w-10 text-indigo-400 mb-3" />
                <h1 className="text-2xl font-bold text-white tracking-tight">
                {view === 'otp' ? 'Check your email' : 'Welcome!'}
                </h1>
                <p className="text-gray-400 mt-2 text-sm">
                {view === 'otp' 
                    ? `Enter the 6-digit code sent to ${email}` 
                    : 'Sign in or create an account to save and view your gallery.'}
                </p>
            </div>
            
            {view === 'form' && (
                <div className="mb-6 grid grid-cols-2 gap-2 p-1 bg-gray-900/50 rounded-lg">
                    <button onClick={() => clearState('signIn')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${mode === 'signIn' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        Sign In
                    </button>
                    <button onClick={() => clearState('signUp')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${mode === 'signUp' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        Sign Up
                    </button>
                </div>
            )}
            
            {view === 'otp' ? (
                <form onSubmit={currentSubmitHandler} className="space-y-6">
                    <div>
                        <label htmlFor="otp" className="sr-only">One-Time Password</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <KeyIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="otp" type="text" inputMode="numeric" required value={otp} onChange={(e) => setOtp(e.target.value)}
                                className="w-full p-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                                placeholder="123456" autoComplete="one-time-code"
                            />
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    {message && <p className="text-green-400 text-sm text-center">{message}</p>}
                    <button type="submit" disabled={loading || otp.length < 6} className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400/50 disabled:cursor-not-allowed transition-colors duration-200">
                        {loading ? <Spinner /> : (mode === 'signUp' ? 'Verify & Create Account' : 'Sign In')}
                    </button>
                    <div className="text-center">
                      <button type="button" onClick={() => setView('form')} className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                        Back
                      </button>
                    </div>
                </form>
            ) : mode === 'signIn' ? (
                 <form onSubmit={handleSignInSendOtp} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="sr-only">Email address</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                            </div>
                        <input
                            id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                            placeholder="your@email.com" autoComplete="email"
                        />
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <button type="submit" disabled={loading || !email} className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400/50 disabled:cursor-not-allowed transition-colors duration-200">
                        {loading ? <Spinner /> : 'Send Login Code'}
                    </button>
                 </form>
            ) : ( // mode === 'signUp'
                 <form onSubmit={handleSignUp} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="sr-only">Email address</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                            </div>
                        <input
                            id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                            placeholder="your@email.com" autoComplete="email"
                        />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="password" className="sr-only">Password</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <KeyIcon className="h-5 w-5 text-gray-400" />
                            </div>
                        <input
                            id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                            placeholder="••••••••" autoComplete="new-password"
                            minLength={6}
                        />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">By signing up, you agree to our terms. We'll send you an email to verify your account.</p>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <button type="submit" disabled={loading || !email || password.length < 6} className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400/50 disabled:cursor-not-allowed transition-colors duration-200">
                        {loading ? <Spinner /> : 'Sign Up'}
                    </button>
                 </form>
            )}
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in {
            animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Auth;