'use client';

import React from 'react';
import { X, ExternalLink } from 'lucide-react';

export default function FeedbackModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition">
          <X className="w-5 h-5" />
        </button>
        
        <h3 className="text-xl font-bold text-navy mb-2">Feedback</h3>
        <p className="text-slate-500 mb-6">Help us improve — takes about 2 minutes</p>
        
        <a 
          href="https://forms.gle/4cJ5F8B8tdabMSoS8" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-gold hover:bg-yellow-500 text-navy font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
          onClick={onClose}
        >
          Give Feedback
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
