"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquarePlus, Clock, Settings, LogOut, Menu, X, ShieldCheck } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 w-72 border-r border-slate-200 dark:border-slate-800 transition-all p-4">
      
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8 mt-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-indigo-500" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-zinc-100">LexiClear</span>
      </div>

      {/* New Chat Button */}
      <button 
        onClick={() => router.push("/")}
        className="flex items-center gap-3 w-full bg-slate-900 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-slate-700 text-white dark:text-zinc-200 px-4 py-3 rounded-2xl transition-all shadow-md group"
      >
        <MessageSquarePlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span className="font-semibold">New Analysis</span>
      </button>

      {/* History List */}
      <div className="flex-1 overflow-y-auto mt-8 pr-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-4">Recent Scans</h3>
        
        {user ? (
          <div className="space-y-1">
            {/* Placeholder for Firestore items */}
            <button className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl truncate flex items-center gap-3 transition-colors">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">Sample Uber ToS...</span>
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl truncate flex items-center gap-3 transition-colors">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">Lease Agreement 2024</span>
            </button>
          </div>
        ) : (
          <div className="px-2 py-4 text-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
            <p className="text-sm text-slate-500 mb-3">Sign in to save your history.</p>
            <Link href="/login" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1 mt-auto">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="font-medium">Settings</span>
        </button>
        
        {user && (
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        )}
      </div>

    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-zinc-200"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden md:block h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative z-50 h-full shadow-2xl animate-in slide-in-from-left">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 -right-12 p-2 bg-slate-900 text-white w-10 h-10 flex items-center justify-center rounded-lg shadow-md"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
