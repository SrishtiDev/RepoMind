"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function LiquidGlassHero() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center text-white">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        src="/hero-video.mp4"
      />
      
      {/* Navbar / Login / Signup */}
      <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
        <div className="font-bold text-xl">RepoMind</div>
        <div className="space-x-4">
          <button 
            onClick={() => router.push('/app')}
            className="px-4 py-2 hover:bg-white/10 rounded backdrop-blur-sm transition-all"
          >
            Login
          </button>
          <Link href="/app" className="px-4 py-2 bg-white text-black rounded hover:bg-white/90 transition-all">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 text-center space-y-6 max-w-2xl px-4 p-12 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-2xl">
        <h1 className="text-5xl font-extrabold tracking-tight">Liquid Glass Hero</h1>
        <p className="text-xl text-gray-300">
          (Placeholder - paste the real 21st.dev code here)
        </p>
        
        {/* Email Signup Form (Visual only) */}
        <form className="flex max-w-md mx-auto gap-2" onSubmit={e => e.preventDefault()}>
          <input 
            type="email" 
            placeholder="Enter your email" 
            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-gray-400"
          />
          <button type="submit" className="px-6 py-2 bg-white text-black font-medium rounded hover:bg-gray-200">
            Join Waitlist
          </button>
        </form>

        {/* Manifesto / Footer Icons */}
        <div className="pt-8 flex justify-center gap-6 text-gray-400">
          <span>Icon 1</span>
          <span>Icon 2</span>
          <span>Icon 3</span>
        </div>
      </div>
    </div>
  );
}
