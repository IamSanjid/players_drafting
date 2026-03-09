"use client";

import { useState, useEffect } from "react";

export default function AdminAuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Defer to a microtask to avoid synchronous setState in effect body lint rule.
    const timerId = setTimeout(() => {
      if (localStorage.getItem("adminAuth") === "true") {
        setIsAuthenticated(true);
      }
    }, 0);

    return () => {
      clearTimeout(timerId);
    };
  }, []);

  const handleLogin = (e: React.SubmitEvent) => {
    e.preventDefault();
    // Simple hardcoded auth. Since there is no cloud/remote connection requirement,
    // a basic environment/hardcoded check suffices.
    if (password === "admin123") {
      setIsAuthenticated(true);
      localStorage.setItem("adminAuth", "true");
      setError("");
    } else {
      setError("Incorrect Admin Password.");
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-center text-gray-900 mb-2">Admin Portal</h2>
        <p className="text-sm text-center text-gray-500 mb-6 font-medium">Restricted Access</p>
        
        {error && <div className="mb-4 bg-red-50 text-red-600 font-medium text-sm p-3 rounded-lg border border-red-100 text-center">{error}</div>}
        
        <div className="space-y-4">
          <div>
            <input 
              required 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-center tracking-widest focus:ring-red-500 font-mono shadow-inner" 
              placeholder="••••••••" 
            />
          </div>
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold p-3 rounded-lg shadow-md transition transform active:scale-95">
            Authenticate
          </button>
        </div>
      </form>
    </div>
  );
}
