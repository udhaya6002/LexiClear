"use client";

import { useState, useRef } from "react";
import { UploadCloud, AlertTriangle, ShieldCheck, Info, Loader2, FileText, CheckCircle2 } from "lucide-react";


export default function Home() {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [results, setResults] = useState<{ summary: string[]; risk_score: number } | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsPdfLoading(true);
    setError("");
    
    try {
      // Dynamically import pdfjs-dist only on the client side
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      
      // Limit extraction to first 20 pages to avoid performance freezing
      const maxPages = Math.min(pdf.numPages, 20);
      
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // @ts-ignore
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      
      if(fullText.length > 20000) {
          fullText = fullText.substring(0, 20000) + "\n\n...[Document Truncated to 20,000 characters]";
      }
      
      setText(fullText);
    } catch (err: any) {
      console.error(err);
      setError("Failed to parse PDF. Please try copying and pasting the text instead.");
    } finally {
      setIsPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError("Please paste a document or upload a PDF first.");
      return;
    }
    
    let submitText = text;
    if (submitText.length > 25000) {
      submitText = submitText.substring(0, 25000);
    }
    
    setError("");
    setIsLoading(true);
    setResults(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: submitText }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Analysis failed. Please try again.");
      }
      
      if(data.error) {
         throw new Error(data.error);
      }
      setResults({
        summary: data.summary || [],
        risk_score: data.risk_score || 1
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskDetails = (score: number) => {
    if (score <= 3) return { color: "text-emerald-500", bg: "bg-emerald-500", label: "Low Risk", icon: ShieldCheck };
    if (score <= 6) return { color: "text-amber-500", bg: "bg-amber-500", label: "Moderate Risk", icon: Info };
    return { color: "text-rose-500", bg: "bg-rose-500", label: "High Risk", icon: AlertTriangle };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30">
      {/* Decorative Gradient Background */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[500px] overflow-hidden opacity-30 dark:opacity-20 blur-3xl pointer-events-none">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-[1000px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-full mix-blend-multiply filter" />
      </div>

      <main className="max-w-6xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
        
        {/* Header section */}
        <div className="text-center mb-16 space-y-4 max-w-2xl">
          <div className="inline-flex items-center justify-center p-3 bg-white dark:bg-slate-900 shadow-xl shadow-indigo-500/10 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 dark:from-white dark:via-indigo-300 dark:to-white">
            LexiClear
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium">
            Understand contracts in seconds. AI translates complex legalese and exposes hidden risks automatically.
          </p>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-7 w-full flex flex-col space-y-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 transition-all">
            
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-300 uppercase">
                Paste Legal Text
              </label>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPdfLoading || isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isPdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  Upload PDF
                </button>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste terms of service, privacy policy, or contract text here..."
              className="w-full h-[400px] p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base resize-none transition-all"
            />
            
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {text.length.toLocaleString()} / 20,000 chars
              </span>
              
              <button
                onClick={handleAnalyze}
                disabled={isLoading || isPdfLoading}
                className="flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Analyze Document
                  </>
                )}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Results */}
          <div className="lg:col-span-5 w-full flex flex-col space-y-6">
            
            {/* Empty State */}
            {!results && !isLoading && (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-slate-200 dark:bg-transparent dark:border-slate-800 rounded-3xl text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Awaiting Document</h3>
                <p className="text-slate-500 dark:text-slate-500 mt-2 max-w-sm">
                  Paste text or upload a document to generate a plain-English summary and risk analysis.
                </p>
              </div>
            )}

            {/* Loading Pulse */}
            {isLoading && (
              <div className="h-full min-h-[500px] animate-pulse flex flex-col space-y-6">
                <div className="bg-slate-200 dark:bg-slate-800 h-48 rounded-3xl w-full"></div>
                <div className="bg-slate-200 dark:bg-slate-800 h-64 rounded-3xl w-full"></div>
              </div>
            )}

            {/* AI Results */}
            {results && !isLoading && (() => {
              const details = getRiskDetails(results.risk_score);
              const Icon = details.icon;
              
              return (
                <>
                  {/* Risk Score Card */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                     {/* Card Graphic */}
                    <div className={`absolute -right-12 -top-12 w-40 h-40 opacity-10 blur-2xl rounded-full ${details.bg}`} />
                    
                    <h3 className="text-sm font-bold tracking-widest text-slate-500 uppercase overflow-visible">Risk Assessment</h3>
                    <div className="mt-6 flex items-end gap-4">
                      <span className={`text-6xl font-black ${details.color} tabular-nums leading-none tracking-tighter`}>
                        {results.risk_score}
                      </span>
                      <span className="text-xl text-slate-400 font-bold mb-1">/ 10</span>
                    </div>

                    <div className="mt-4 flex items-center gap-2 font-bold text-lg">
                      <Icon className={`w-5 h-5 ${details.color}`} />
                      <span className={details.color}>{details.label}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6 h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${results.risk_score <= 3 ? 'from-emerald-400 to-emerald-500' : results.risk_score <= 6 ? 'from-amber-400 to-amber-500' : 'from-rose-400 to-rose-500'}`}
                        style={{ width: `${(results.risk_score / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold tracking-widest text-slate-500 uppercase mb-6 overflow-visible">Plain English Summary</h3>
                    
                    <ul className="space-y-4">
                      {results.summary.map((point, index) => (
                        <li key={index} className="flex gap-4">
                          <CheckCircle2 className="w-6 h-6 shrink-0 text-indigo-500" />
                          <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{point}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              );
            })()}

          </div>
        </div>
      </main>
    </div>
  );
}
