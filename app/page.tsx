"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, CheckCircle2, Send, Paperclip, Bot, User, Scale, ShieldAlert, Target, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { useSearchParams, useRouter } from "next/navigation";

interface AIResponse {
  summary: string[];
  legal_score: number;
  safety_score: number;
  overall_score: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string; // The original text or a short description of the file uploaded
  analysis?: AIResponse; // Only populated for assistant messages
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scanId");
  const router = useRouter();

  const [documentContext, setDocumentContext] = useState("");
  const [currentScanId, setCurrentScanId] = useState<string | null>(scanId);

  // Load old scan
  useEffect(() => {
    async function loadOldScan() {
      if (scanId && user) {
        setIsAnalyzing(true);
        try {
          const scanRef = doc(db, "users", user.uid, "scans", scanId);
          const scanSnap = await getDoc(scanRef);
          if (scanSnap.exists()) {
            const data = scanSnap.data();
            setDocumentContext(data.textContent || "");
            setCurrentScanId(scanId);
            setMessages(data.messages || [
              {
                id: scanId + "-user",
                role: "user",
                content: data.title || "Analyzed Document",
              },
              {
                id: scanId + "-assistant",
                role: "assistant",
                content: "Analysis complete.",
                analysis: data.analysis,
              }
            ]);
          } else {
            setMessages([]);
            setDocumentContext("");
            setCurrentScanId(null);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsAnalyzing(false);
        }
      } else if (!scanId) {
        setMessages([]);
        setDocumentContext("");
        setCurrentScanId(null);
      }
    }
    loadOldScan();
  }, [scanId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAnalyzing]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsPdfLoading(true);
    try {
      // Dynamically import pdfjs-dist only on the client side
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      
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
      
      // Immediately submit the extracted text as a user message
      await submitAnalysis(fullText, `Analyzed document: ${file.name}`);
      
    } catch (err: any) {
      console.error(err);
      alert("Failed to parse PDF. Please try copying and pasting the text instead.");
    } finally {
      setIsPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTextSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;
    
    const textToAnalyze = inputValue;
    setInputValue("");

    if (messages.length === 0) {
      await submitAnalysis(textToAnalyze, textToAnalyze);
    } else {
      await submitFollowUp(textToAnalyze);
    }
  };

  const submitFollowUp = async (text: string) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, documentContext }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat failed.");

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply
      };
      
      const updatedMessages = [...newMessages, aiMsg];
      setMessages(updatedMessages);

      if (user && currentScanId) {
        try {
          await updateDoc(doc(db, "users", user.uid, "scans", currentScanId), {
            messages: updatedMessages
          });
        } catch (e) {
          console.error("Failed to update Firestore", e);
        }
      }

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${err.message || "An unexpected error occurred."}`
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitAnalysis = async (rawText: string, displayMessage: string) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    // 1. Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayMessage
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // 2. Call API
      let submitText = rawText;
      if (submitText.length > 25000) {
        submitText = submitText.substring(0, 25000);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: submitText }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      
      // 3. Add AI Response message
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Analysis complete.",
        analysis: data
      };
      setMessages(prev => [...prev, aiMsg]);

      // 4. Save to Firestore if logged in
      if (user) {
        try {
          let shortTitle = displayMessage.replace("Analyzed document: ", "");
          shortTitle = shortTitle.substring(0, 40) + (shortTitle.length > 40 ? "..." : "");
          
          const newScanData = {
            title: shortTitle,
            textContent: submitText,
            analysis: data,
            messages: [...messages, userMsg, aiMsg],
            createdAt: serverTimestamp()
          };

          const docRef = await addDoc(collection(db, "users", user.uid, "scans"), newScanData);
          setCurrentScanId(docRef.id);
          setDocumentContext(submitText);
        } catch (e) {
          console.error("Failed to save to Firestore", e);
        }
      }

    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${err.message || "An unexpected error occurred."}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Score Color Helper
  const getScoreColor = (score: number, type: "safety" | "legal" | "overall") => {
    if (type === "safety") {
      if (score >= 8) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      if (score >= 5) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    }
    // Blue/Indigo scale for legal and overall
    if (score >= 8) return "text-indigo-500 bg-indigo-500/10 border-indigo-500/20";
    if (score >= 5) return "text-cyan-500 bg-cyan-500/10 border-cyan-500/20";
    return "text-slate-500 bg-slate-500/10 border-slate-500/20";
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 font-sans w-full relative">
      
      {/* Top Gradient Fade */}
      <div className="absolute top-0 w-full h-24 bg-gradient-to-b from-white dark:from-slate-950 to-transparent z-10 pointer-events-none" />

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-0 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-8 pb-32">
          
          {/* Empty State Welcome */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-20 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-8 transform -rotate-12">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
                What can I analyze for you today?
              </h1>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl">
                Paste a contract, Terms of Service, or upload a PDF document. I'll translate the legalese and expose hidden risks.
              </p>
            </div>
          )}

          {/* Messages List */}
          {messages.map((message) => (
            <div key={message.id} className="flex gap-4 md:gap-6 animate-in slide-in-from-bottom-4">
              
              {/* Avatar */}
              <div className="shrink-0 mt-1">
                {message.role === "user" ? (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {message.role === "user" ? "You" : "LexiClear AI"}
                </div>
                
                {/* User Message */}
                {message.role === "user" && (
                  <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-base leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800/50 inline-block max-w-full break-words">
                    {message.content && message.content.length > 600 && !message.content.startsWith("Analyzed document:") 
                      ? message.content.substring(0, 600) + "..." 
                      : message.content}
                  </div>
                )}

                {/* AI Error */}
                {message.role === "assistant" && !message.analysis && message.content && message.content.startsWith("Error:") && (
                  <div className="text-rose-500 dark:text-rose-400 py-2">
                    {message.content}
                  </div>
                )}

                {/* AI Text Reply (Follow up chat) */}
                {message.role === "assistant" && !message.analysis && !message.content.startsWith("Error:") && (
                  <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-base leading-relaxed font-normal">
                    {message.content}
                  </div>
                )}

                {/* AI Analysis View */}
                {message.role === "assistant" && message.analysis && (
                  <div className="space-y-6">
                    
                    {/* Scores Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div className={`flex items-center gap-4 p-4 rounded-2xl border ${getScoreColor(message.analysis.legal_score, "legal")}`}>
                        <div className="p-3 bg-white dark:bg-black rounded-xl shadow-sm">
                          <Scale className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Precision</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black">{message.analysis.legal_score}</span>
                            <span className="text-sm opacity-60">/10</span>
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center gap-4 p-4 rounded-2xl border ${getScoreColor(message.analysis.safety_score, "safety")}`}>
                        <div className="p-3 bg-white dark:bg-black rounded-xl shadow-sm">
                          <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Safety</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black">{message.analysis.safety_score}</span>
                            <span className="text-sm opacity-60">/10</span>
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center gap-4 p-4 rounded-2xl border ${getScoreColor(message.analysis.overall_score, "overall")}`}>
                        <div className="p-3 bg-white dark:bg-black rounded-xl shadow-sm">
                          <Target className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Overall</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black">{message.analysis.overall_score}</span>
                            <span className="text-sm opacity-60">/10</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Bullet Points */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-bold tracking-widest text-slate-500 uppercase mb-6">Key Takeaways</h3>
                      <ul className="space-y-4">
                        {message.analysis.summary.map((point, idx) => (
                          <li key={idx} className="flex gap-4">
                            <CheckCircle2 className="w-6 h-6 shrink-0 text-indigo-500 mt-0.5" />
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{point}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isAnalyzing && (
            <div className="flex gap-4 md:gap-6 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div className="space-y-3 w-full max-w-md">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-3/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-1/2"></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Bottom Input Area */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-white via-white dark:from-slate-950 dark:via-slate-950 to-transparent pb-6 pt-12 px-4 md:px-0 z-20">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={handleTextSubmit}
            className="flex items-end gap-2 bg-slate-100 dark:bg-slate-900 rounded-3xl p-2 pl-4 shadow-lg border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all"
          >
            {/* File Upload Hidden Input */}
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />

            {/* Attachment Button */}
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing || isPdfLoading}
              className="p-3 text-slate-400 hover:text-indigo-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 disabled:opacity-50"
              title="Upload PDF document"
            >
              {isPdfLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Paperclip className="w-6 h-6" />}
            </button>

            {/* Text Area */}
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
              placeholder="Paste contract text or ask for an analysis..."
              className="w-full max-h-48 min-h-[56px] py-4 bg-transparent outline-none resize-none text-slate-700 dark:text-slate-200 text-base"
              rows={1}
            />

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={!inputValue.trim() || isAnalyzing || isPdfLoading}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 shrink-0 shadow-sm"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide">
            LexiClear can make mistakes. Consider verifying critical legal information.
          </div>
        </div>
      </div>

    </div>
  );
}
