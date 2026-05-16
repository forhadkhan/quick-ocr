import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Clipboard, Copy, Check, Image as ImageIcon, Loader2, X, FileText, Settings, Plus, Cpu, Zap, Hash, Globe, Shield, History, Trash2, Clock, ZoomIn, ZoomOut, Command, Github } from 'lucide-react';
import { createWorker } from 'tesseract.js';

interface HistoryItem {
  id: string;
  timestamp: number;
  text: string;
  image: string;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [autoExtract, setAutoExtract] = useState<boolean>(() => {
    const saved = localStorage.getItem('ocr_autoExtract');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [allowEdit, setAllowEdit] = useState<boolean>(() => {
    const saved = localStorage.getItem('ocr_allowEdit');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('ocr_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('ocr_theme') as 'light' | 'dark' | 'system') || 'system';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Setup theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'dark' || (theme === 'system' && isDarkSystem)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('ocr_theme', theme);
  }, [theme]);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('ocr_autoExtract', JSON.stringify(autoExtract));
  }, [autoExtract]);

  useEffect(() => {
    localStorage.setItem('ocr_allowEdit', JSON.stringify(allowEdit));
  }, [allowEdit]);

  // Stats for the "High Density" aesthetic
  const [stats, setStats] = useState({
    confidence: '0.0%',
    wordCount: 0,
    engineTime: '0ms'
  });

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('ocr_history', JSON.stringify(history));
  }, [history]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      processFile(droppedFile);
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            processFile(blob);
            if (autoExtract) {
              // Use a small timeout to ensure state (image) is updated or just use the blob directly if we refactored
              // But extractText depends on 'image' state, so we trigger it in the next tick
              setTimeout(() => {
                const btn = document.getElementById('extract-trigger');
                if (btn) btn.click();
              }, 100);
            }
          }
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener('paste', (handlePaste as unknown as EventListener));
    return () => window.removeEventListener('paste', (handlePaste as unknown as EventListener));
  }, [autoExtract]);

  const processFile = (file: File) => {
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setExtractedText('');
    setStats({ confidence: '0.0%', wordCount: 0, engineTime: '0ms' });
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const runLocalOCR = async () => {
    const worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          setProgress(Math.floor(m.progress * 100));
        }
      },
    });

    try {
      const { data: { text, confidence } } = await worker.recognize(image!);
      return { text, confidence: `${confidence.toFixed(1)}%` };
    } finally {
      await worker.terminate();
    }
  };

  const extractText = async () => {
    if (!image) return;

    const startTime = Date.now();
    setIsLoading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await runLocalOCR();
      const duration = Date.now() - startTime;
      const wordCount = result.text.split(/\s+/).filter(Boolean).length;

      setExtractedText(result.text);
      setStats({
        confidence: result.confidence,
        wordCount,
        engineTime: `${duration}ms`
      });

      // Add to history (limit to 10 to save memory)
      setHistory(prev => [
        {
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
          text: result.text,
          image: image!
        },
        ...prev.slice(0, 9) // Keep last 10
      ]);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  const copyToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const reset = () => {
    setImage(null);
    setFile(null);
    setExtractedText('');
    setStats({ confidence: '0.0%', wordCount: 0, engineTime: '0ms' });
    setError(null);
    setProgress(0);
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (confirm("Clear all scan history?")) {
      setHistory([]);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setImage(item.image);
    setExtractedText(item.text);
    setShowHistory(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-200">
      {/* Header */}
      <header className="min-h-14 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between px-3 lg:px-6 shrink-0 shadow-sm z-10 gap-3 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-sm lg:text-lg font-bold tracking-tight hidden sm:block">quick<span className="text-indigo-600 dark:text-indigo-400">OCR</span></h1>
        </div>
        <div className="flex items-center gap-2 lg:gap-4 flex-nowrap shrink-0 ml-auto py-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors shrink-0"
            title="Upload Image"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span className="text-[9px] font-bold uppercase tracking-wider hidden lg:block">Upload</span>
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`relative p-1.5 lg:px-2.5 lg:py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${showHistory ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            title="History"
          >
            <History size={14} className="stroke-[2.5]" />
            <span className="text-[9px] font-bold uppercase tracking-wider hidden lg:block">History</span>
            {history.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold px-1 min-w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {history.length > 9 ? '9+' : history.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0 ${showSettings ? 'text-indigo-600 dark:text-indigo-300 bg-slate-50 dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Lightbox */}
      <AnimatePresence>
        {isLightboxOpen && image && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center overflow-auto"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div className="absolute top-4 right-4 flex gap-2 z-[110]">
              <button
                onClick={(e) => { e.stopPropagation(); setZoomLevel(1); }}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center justify-center text-xs font-mono w-12"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setZoomLevel(z => Math.max(0.5, z - 0.25)); }}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={20} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setZoomLevel(z => Math.min(4, z + 0.25)); }}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={20} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors ml-2 md:ml-4"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="min-h-full min-w-full flex items-center justify-center p-4 md:p-8 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                src={image}
                alt="Enlarged preview"
                animate={{ scale: zoomLevel }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="max-w-[90vw] max-h-[90vh] object-contain origin-center cursor-grab active:cursor-grabbing"
                drag
                dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
                dragElastic={0.1}
                whileTap={{ cursor: "grabbing" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 right-6 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-4"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold dark:text-slate-200">Theme</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">UI Appearance</p>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setTheme('light')} className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${theme === 'light' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Light</button>
                    <button onClick={() => setTheme('system')} className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${theme === 'system' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Auto</button>
                    <button onClick={() => setTheme('dark')} className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${theme === 'dark' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Dark</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold dark:text-slate-200">Auto-Extract</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Trigger OCR on paste</p>
                  </div>
                  <button
                    onClick={() => setAutoExtract(!autoExtract)}
                    className={`w-8 h-4 rounded-full cursor-pointer relative transition-colors ${autoExtract ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <motion.div
                      animate={{ left: autoExtract ? '1.125rem' : '0.125rem' }}
                      className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold dark:text-slate-200">Allow Editing</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Edit extracted text</p>
                  </div>
                  <button
                    onClick={() => setAllowEdit(!allowEdit)}
                    className={`w-8 h-4 rounded-full cursor-pointer relative transition-colors ${allowEdit ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <motion.div
                      animate={{ left: allowEdit ? '1.125rem' : '0.125rem' }}
                      className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold dark:text-slate-200">View Source</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">View source code on github</p>
                  </div>
                  <button
                    onClick={() => window.open('https://github.com/forhadkhan/quick-ocr', '_blank')}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                    title="Github Repository"
                  >
                    <Github size={16} />
                  </button>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => { clearHistory(); setShowSettings(false); }}
                    className="w-full py-2 flex items-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer rounded-lg px-2 transition-colors"
                  >
                    <Trash2 size={14} /> Clear Scan History
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto lg:overflow-hidden p-4 gap-4 relative grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] lg:grid-rows-[1fr_auto]">
        {/* History Slide-over */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ x: -350 }}
              animate={{ x: 0 }}
              exit={{ x: -350 }}
              className="absolute left-0 top-0 bottom-0 w-full md:w-80 lg:left-4 lg:top-4 lg:bottom-4 md:border md:rounded-xl md:shadow-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 z-40 flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <History size={14} /> Scan History
                </h2>
                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded transition-colors text-slate-400 dark:text-slate-500">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-2">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2 opacity-50">
                    <Clock size={32} strokeWidth={1.5} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No previous scans</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="group p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all cursor-pointer relative"
                      onClick={() => loadFromHistory(item)}
                    >
                      <div className="flex gap-3">
                        <img src={item.image} className="w-12 h-12 object-cover rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 flex font-medium mb-1">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 font-mono">{item.text}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                        className="absolute top-2 right-2 p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Left Side: Upload */}
        <div className="flex flex-col gap-4 overflow-visible lg:overflow-hidden min-h-[500px] lg:min-h-0 order-1 lg:col-start-1 lg:row-start-1 lg:row-end-2">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden min-h-0 transition-all group
              ${image ? 'border-transparent shadow-sm' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/50'}`}
          >
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <span className="px-2 py-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700 uppercase text-slate-400 dark:text-slate-500">
                Isolated Buffer
              </span>
            </div>

            {image ? (
              <div className="absolute inset-0 p-4 sm:p-8 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
                <img
                  src={image}
                  alt="Preview"
                  onClick={() => { setZoomLevel(1); setIsLightboxOpen(true); }}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm cursor-zoom-in hover:opacity-95 transition-opacity"
                />
                <button
                  onClick={reset}
                  className="absolute top-4 right-4 p-2 bg-slate-900/10 dark:bg-white/10 hover:bg-red-500 hover:text-white rounded-lg text-slate-600 dark:text-slate-300 backdrop-blur-sm transition-colors z-20 shadow-sm"
                >
                  <X size={18} />
                </button>
                {isLoading && (
                  <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-30">
                    <div className="w-48 text-center">
                      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-indigo-600 dark:bg-indigo-500"
                        />
                      </div>
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{progress}% Neural Processing</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Drop your image here</p>
                <p className="text-sm text-slate-400 flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                  <span>or paste with</span>
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono text-slate-500 shadow-sm flex items-center gap-1">
                    <Command size={10} /> V
                  </kbd>
                  <span>/</span>
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono text-slate-500 shadow-sm">
                    Ctrl V
                  </kbd>
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 px-8 h-11 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-sm active:scale-[0.98] transition-all uppercase tracking-wider"
                >
                  Select Files
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Stats Panel */}
        <div className="order-3 lg:col-start-1 lg:row-start-2 lg:row-end-3 h-auto lg:h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors duration-200">
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Cpu size={12} /> Diagnostic Matrix
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                <Check size={10} /> Confidence
              </p>
              <p className="text-xl font-light text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">{stats.confidence}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                <Hash size={10} /> Word Count
              </p>
              <p className="text-xl font-light text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">{stats.wordCount}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center col-span-2 sm:col-span-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                <Zap size={10} /> Latency
              </p>
              <p className="text-xl font-light text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">{stats.engineTime}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Results */}
        <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm min-h-[500px] lg:min-h-0 order-2 lg:col-start-2 lg:row-start-1 lg:row-end-3 transition-colors duration-200">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText size={12} /> Extracted Metadata
            </span>
            <div className="flex gap-2">
              <button
                disabled={!extractedText || isLoading}
                onClick={() => copyToClipboard(extractedText)}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-0"
              >
                {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 relative overflow-hidden bg-slate-50/20 dark:bg-black/20 flex flex-col">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-indigo-600/40 dark:text-indigo-400/40">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Running OCR Engine...</p>
                </div>
              ) : extractedText ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-mono text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 h-full flex flex-col"
                >
                  <p className="mb-4 text-indigo-400 select-none text-[9px] uppercase font-bold tracking-widest flex items-center gap-2 shrink-0">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                    LOCAL_NEURAL_ENGINE ACTIVE
                  </p>
                  {allowEdit ? (
                    <textarea
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      className="w-full flex-1 bg-transparent border-none outline-none resize-none overflow-auto"
                      spellCheck={false}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap flex-1 overflow-auto">{extractedText}</div>
                  )}
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 filter grayscale select-none">
                  <Globe size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
                  <p className="text-[10px] font-bold uppercase tracking-widest dark:text-slate-400">Awaiting input stream</p>
                </div>
              )}
            </AnimatePresence>

            {error && (
              <div className="absolute bottom-4 left-4 right-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-[10px] font-bold uppercase">
                CRITICAL_ERR: {error}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <button
              id="extract-trigger"
              disabled={!image || isLoading}
              onClick={extractText}
              className={`w-full h-12 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:shadow-none bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600`}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              {isLoading ? 'Processing Neural Model...' : 'Run Local Extraction'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

