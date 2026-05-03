import React from 'react';
import { LogIn, Beaker } from 'lucide-react';
import { signInAnonymously, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Login() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          role: 'agent',
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please ensure you have added your domain to Firebase Authorized Domains.");
    }
  };

  const handleTestingMode = async () => {
    try {
      localStorage.setItem('vocalbridge_test_mode', 'true');
      await signInAnonymously(auth).catch(() => console.warn("Firebase Anonymous Auth disabled, using local bypass"));
      window.location.reload(); 
    } catch (error) {
      console.error("Bypass failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl border border-[#1a1a1a]/5 shadow-xl text-center">
        <div className="w-16 h-16 mx-auto mb-6">
          <img src="/logo.png" alt="VocalBridge Logo" className="w-full h-full object-contain rounded-2xl" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">VocalBridge AI</h2>
        <p className="text-[#8E9299]">The future of automated sales calls.<br/>Sign in to access your dashboard.</p>
        
        <div className="space-y-4 mt-8">
          {/* Main Login Option */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#1a1a1a] text-white rounded-2xl font-bold hover:opacity-90 transition-all group"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Sign in with Google
          </button>

          {/* Testing Mode - Always available as fallback, but labeled differently */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#1a1a1a]/5"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-white px-2 text-[#8E9299]">Or for testing</span></div>
          </div>

          <button
            onClick={handleTestingMode}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gray-50 text-[#8E9299] border border-gray-100 rounded-2xl font-bold hover:bg-gray-100 transition-all group"
          >
            <Beaker className="w-4 h-4" />
            {isLocal ? 'Enter Testing Mode (Local)' : 'Anonymous Demo Access'}
          </button>
        </div>
        
        <p className="text-[10px] text-[#8E9299] uppercase tracking-widest mt-12">
          Enterprise Security Enabled
        </p>
      </div>
    </div>
  );
}
