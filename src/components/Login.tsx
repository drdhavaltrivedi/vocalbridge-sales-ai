import React from 'react';
import { LogIn, Beaker } from 'lucide-react';
import { signInAnonymously, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Login() {
  const handleLogin = async () => {
    /* 
    // Google Auth - Disabled for Testing Mode
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
    }
    */
    
    // Testing Mode: Anonymous Login
    try {
      await signInAnonymously(auth);
      console.log("Logged in anonymously for testing");
    } catch (error) {
      console.error("Anonymous login failed:", error);
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
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#F27D26] text-[#1a1a1a] rounded-2xl font-bold hover:opacity-90 transition-all group"
          >
            <Beaker className="w-5 h-5 group-hover:animate-pulse" />
            Enter Testing Mode
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#1a1a1a]/5"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-[#8E9299]">Production login disabled</span></div>
          </div>
        </div>
        
        <p className="text-[10px] text-[#8E9299] uppercase tracking-widest mt-12">
          Enterprise Security Enabled
        </p>
      </div>
    </div>
  );
}
