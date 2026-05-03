import React from 'react';
import { LogIn } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Initialize user profile in Firestore if it doesn't exist
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          role: 'agent', // Default role
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl border border-[#1a1a1a]/5 shadow-xl text-center">
        <div className="w-16 h-16 bg-[#F27D26] rounded-2xl flex items-center justify-center font-bold text-3xl mx-auto mb-6">
          V
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">VocalBridge AI</h2>
        <p className="text-[#8E9299]">The future of automated sales calls.<br/>Sign in to access your dashboard.</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#1a1a1a] text-white rounded-2xl font-bold hover:bg-black transition-all group mt-8"
        >
          <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          Sign in with Google
        </button>
        
        <p className="text-[10px] text-[#8E9299] uppercase tracking-widest mt-12">
          Enterprise Security Enabled
        </p>
      </div>
    </div>
  );
}
