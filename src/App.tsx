/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Camera, 
  Upload, 
  History, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Trash2,
  Calendar,
  Clock,
  Hash,
  ArrowRight,
  User,
  CreditCard,
  Search,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeMeterImage, TOUReading } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SavedReading extends TOUReading {
  id: string;
  dateAdded: string;
  imageUrl: string;
  mimeType: string;
  fileName?: string;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>("image/jpeg");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TOUReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedReading[]>([]);
  const [activeTab, setActiveTab] = useState<'reader' | 'history'>('reader');
  const [selectedItem, setSelectedItem] = useState<SavedReading | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  // Check for API key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true); // Assume success as per guidelines
    }
  };
  
  // Editable fields
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [peaMeterId, setPeaMeterId] = useState('');
  
  // Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tou_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('tou_history', JSON.stringify(history));
  }, [history]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFileMimeType(file.type);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
        setCustomerName('');
        setCustomerId('');
        setPeaMeterId('');
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'image/*': [],
      'application/pdf': ['.pdf']
    },
    multiple: false
  } as any);

  const handleAnalyze = async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const data = await analyzeMeterImage(image, fileMimeType);
      setResult(data);
      // Pre-fill fields if AI found them
      setCustomerName(data.customerName || '');
      setCustomerId(data.customerId || '');
      setPeaMeterId(data.peaMeterId || '');
    } catch (err: any) {
      const errorMessage = err.message || "";
      if (errorMessage.includes("API key is missing") || errorMessage.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("กรุณาเลือก API Key ก่อนเริ่มการวิเคราะห์");
      } else {
        setError(errorMessage || "เกิดข้อผิดพลาดในการประมวลผล");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveReading = () => {
    if (!result || !image) return;
    
    const newReading: SavedReading = {
      ...result,
      customerName: customerName.trim() || result.customerName,
      customerId: customerId.trim() || result.customerId,
      peaMeterId: peaMeterId.trim() || result.peaMeterId,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString(),
      imageUrl: image,
      mimeType: fileMimeType,
      fileName: fileName || undefined
    };
    
    setHistory(prev => [newReading, ...prev]);
    setResult(null);
    setImage(null);
    setCustomerName('');
    setCustomerId('');
    setPeaMeterId('');
    setActiveTab('history');
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const filteredHistory = history.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.customerName?.toLowerCase().includes(query) ||
      item.customerId?.toLowerCase().includes(query) ||
      item.peaMeterId?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Zap size={24} fill="currentColor" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">TOU Meter Reader</h1>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Smart Energy Tracking</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8">
        {/* Tab Navigation */}
        <div className="flex p-1 bg-zinc-100 rounded-xl mb-8">
          <button
            onClick={() => setActiveTab('reader')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'reader' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Camera size={18} />
            อ่านมิเตอร์
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'history' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <History size={18} />
            ประวัติการอ่าน
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'reader' ? (
            <motion.div
              key="reader"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Upload Section */}
              {!image ? (
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer",
                    isDragActive ? "border-emerald-500 bg-emerald-50/50" : "border-zinc-200 hover:border-emerald-400 hover:bg-zinc-50"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4 text-zinc-400">
                    <Upload size={32} />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">อัปโหลดรูปภาพหรือ PDF มิเตอร์</h3>
                  <p className="text-sm text-zinc-500 text-center max-w-xs">
                    ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกรูปภาพหรือไฟล์ PDF มิเตอร์ TOU ของคุณ
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-3xl overflow-hidden border border-zinc-200 shadow-sm bg-zinc-50 aspect-[4/3] flex items-center justify-center">
                    {fileMimeType === 'application/pdf' ? (
                      <div className="flex flex-col items-center gap-4 text-zinc-400 p-8">
                        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-sm">
                          <FileText size={48} />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-zinc-900 truncate max-w-[250px]">{fileName}</p>
                          <p className="text-xs uppercase font-bold tracking-wider mt-1">PDF Document</p>
                        </div>
                      </div>
                    ) : (
                      <img src={image} alt="Meter" className="max-h-full object-contain" />
                    )}
                    <button 
                      onClick={() => { setImage(null); setFileName(null); setResult(null); }}
                      className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  
                  {!result && !isAnalyzing && (
                    <button
                      onClick={handleAnalyze}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap size={20} fill="currentColor" />
                      วิเคราะห์ข้อมูลด้วย AI
                    </button>
                  )}
                </div>
              )}

              {/* Loading State */}
              {isAnalyzing && (
                <div className="glass-card p-8 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="animate-spin text-emerald-500" size={40} />
                  <div className="text-center">
                    <p className="font-semibold">กำลังวิเคราะห์ไฟล์...</p>
                    <p className="text-sm text-zinc-500">Gemini AI กำลังอ่านค่าหน่วยไฟฟ้าจากไฟล์ของคุณ</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col gap-3 text-red-600">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-semibold text-sm">เกิดข้อผิดพลาด</p>
                      <p className="text-xs opacity-80">{error}</p>
                    </div>
                  </div>
                  {!hasApiKey && (
                    <button
                      onClick={handleOpenKeyDialog}
                      className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-xl transition-all"
                    >
                      เลือก API Key
                    </button>
                  )}
                </div>
              )}

              {/* Result Section */}
              {result && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="glass-card overflow-hidden">
                    <div className="bg-emerald-50 px-6 py-4 flex items-center justify-between border-b border-emerald-100">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 size={20} />
                        <span className="font-bold">วิเคราะห์สำเร็จ</span>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60">
                        Confidence: {(result.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <div className="flex items-center gap-2 text-zinc-400 mb-1">
                          <User size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">ข้อมูลผู้ใช้ไฟฟ้า</span>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">ชื่อผู้ใช้ไฟฟ้า</label>
                            <input 
                              type="text" 
                              value={customerName} 
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="กรอกชื่อผู้ใช้ไฟฟ้า"
                              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">หมายเลขผู้ใช้ไฟฟ้า</label>
                              <input 
                                type="text" 
                                value={customerId} 
                                onChange={(e) => setCustomerId(e.target.value)}
                                placeholder="Customer ID"
                                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">หมายเลขมิเตอร์ PEA</label>
                              <input 
                                type="text" 
                                value={peaMeterId} 
                                onChange={(e) => setPeaMeterId(e.target.value)}
                                placeholder="PEA Meter ID"
                                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">111: Cumulative (kWh)</p>
                          <p className="text-2xl font-bold text-zinc-700 font-mono">
                            {result.reg111?.toLocaleString() || '---'}
                          </p>
                        </div>
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">118: Other (kWh)</p>
                          <p className="text-2xl font-bold text-zinc-700 font-mono">
                            {result.reg118?.toLocaleString() || '---'}
                          </p>
                        </div>
                      </div>

                      {/* Verification Section */}
                      <div className="col-span-2 p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">การตรวจสอบข้อมูล (Verification)</p>
                          {Math.abs(((result.reg010 || 0) + (result.reg020 || 0) + (result.reg030 || 0)) - (result.reg111 || 0)) < 0.01 ? (
                            <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase">
                              <CheckCircle2 size={12} />
                              ข้อมูลตรงกัน
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold uppercase">
                              <AlertCircle size={12} />
                              ข้อมูลไม่ตรงกัน
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase">010 + 020 + 030</p>
                            <p className="text-xl font-bold font-mono">
                              {((result.reg010 || 0) + (result.reg020 || 0) + (result.reg030 || 0)).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-zinc-700">
                            <ArrowRight size={20} />
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-zinc-500 uppercase">รหัส 111</p>
                            <p className="text-xl font-bold font-mono">
                              {(result.reg111 || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Verification Section 2: 015 Handwritten - 015 Printed = 050 */}
                      <div className="col-span-2 p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">การตรวจสอบข้อมูล 050 (Verification 050)</p>
                          {Math.abs(((result.reg015_handwritten || 0) - (result.reg015_printed || 0)) - (result.reg050 || 0)) < 0.01 ? (
                            <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase">
                              <CheckCircle2 size={12} />
                              ข้อมูลตรงกัน
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold uppercase">
                              <AlertCircle size={12} />
                              ข้อมูลไม่ตรงกัน
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase">015 (ลายมือ) - 015 (พิมพ์)</p>
                            <p className="text-xl font-bold font-mono">
                              {((result.reg015_handwritten || 0) - (result.reg015_printed || 0)).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-zinc-700">
                            <ArrowRight size={20} />
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-zinc-500 uppercase">รหัส 050</p>
                            <p className="text-xl font-bold font-mono">
                              {(result.reg050 || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Verification Section 3: 016 Handwritten - 016 Printed = 060 */}
                      <div className="col-span-2 p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">การตรวจสอบข้อมูล 060 (Verification 060)</p>
                          {Math.abs(((result.reg016_handwritten || 0) - (result.reg016_printed || 0)) - (result.reg060 || 0)) < 0.01 ? (
                            <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase">
                              <CheckCircle2 size={12} />
                              ข้อมูลตรงกัน
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold uppercase">
                              <AlertCircle size={12} />
                              ข้อมูลไม่ตรงกัน
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase">016 (ลายมือ) - 016 (พิมพ์)</p>
                            <p className="text-xl font-bold font-mono">
                              {((result.reg016_handwritten || 0) - (result.reg016_printed || 0)).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-zinc-700">
                            <ArrowRight size={20} />
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-zinc-500 uppercase">รหัส 060</p>
                            <p className="text-xl font-bold font-mono">
                              {(result.reg060 || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Verification Section 4: 017 Handwritten - 017 Printed = 070 */}
                      <div className="col-span-2 p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">การตรวจสอบข้อมูล 070 (Verification 070)</p>
                          {Math.abs(((result.reg017_handwritten || 0) - (result.reg017_printed || 0)) - (result.reg070 || 0)) < 0.01 ? (
                            <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase">
                              <CheckCircle2 size={12} />
                              ข้อมูลตรงกัน
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold uppercase">
                              <AlertCircle size={12} />
                              ข้อมูลไม่ตรงกัน
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase">017 (ลายมือ) - 017 (พิมพ์)</p>
                            <p className="text-xl font-bold font-mono">
                              {((result.reg017_handwritten || 0) - (result.reg017_printed || 0)).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-zinc-700">
                            <ArrowRight size={20} />
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-zinc-500 uppercase">รหัส 070</p>
                            <p className="text-xl font-bold font-mono">
                              {(result.reg070 || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Verification Section 5: 118 Handwritten - 118 Printed = 280 */}
                      <div className="col-span-2 p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">การตรวจสอบข้อมูล 280 (Verification 280)</p>
                          {Math.abs(((result.reg118_handwritten || 0) - (result.reg118_printed || 0)) - (result.reg280 || 0)) < 0.01 ? (
                            <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase">
                              <CheckCircle2 size={12} />
                              ข้อมูลตรงกัน
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold uppercase">
                              <AlertCircle size={12} />
                              ข้อมูลไม่ตรงกัน
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase">118 (ลายมือ) - 118 (พิมพ์)</p>
                            <p className="text-xl font-bold font-mono">
                              {((result.reg118_handwritten || 0) - (result.reg118_printed || 0)).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-zinc-700">
                            <ArrowRight size={20} />
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-zinc-500 uppercase">รหัส 280</p>
                            <p className="text-xl font-bold font-mono">
                              {(result.reg280 || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">010: On-Peak (kWh)</p>
                        <p className="text-2xl font-bold text-emerald-700 font-mono">
                          {result.reg010?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">020: Off-Peak (kWh)</p>
                        <p className="text-2xl font-bold text-blue-700 font-mono">
                          {result.reg020?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">030: Holiday (kWh)</p>
                        <p className="text-2xl font-bold text-amber-700 font-mono">
                          {result.reg030?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">015: Peak Demand (kW)</p>
                        <p className="text-2xl font-bold text-rose-700 font-mono">
                          {result.reg015?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">016: Off Demand (kW)</p>
                        <p className="text-2xl font-bold text-indigo-700 font-mono">
                          {result.reg016?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">017: Hol Demand (kW)</p>
                        <p className="text-2xl font-bold text-orange-700 font-mono">
                          {result.reg017?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">015 (พิมพ์) (kW)</p>
                        <p className="text-2xl font-bold text-zinc-700 font-mono">
                          {result.reg015_printed?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">015 (ลายมือ) (kW)</p>
                        <p className="text-2xl font-bold text-zinc-700 font-mono">
                          {result.reg015_handwritten?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">016 (พิมพ์) (kW)</p>
                        <p className="text-2xl font-bold text-zinc-700 font-mono">
                          {result.reg016_printed?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">016 (ลายมือ) (kW)</p>
                        <p className="text-2xl font-bold text-zinc-700 font-mono">
                          {result.reg016_handwritten?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">017 (พิมพ์) (kW)</p>
                        <p className="text-2xl font-bold text-zinc-700 font-mono">
                          {result.reg017_printed?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">017 (ลายมือ) (kW)</p>
                        <p className="text-2xl font-bold text-zinc-700 font-mono">
                          {result.reg017_handwritten?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">118 (พิมพ์)</p>
                        <p className="text-2xl font-bold text-zinc-700 font-mono">
                          {result.reg118_printed?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">118 (ลายมือ)</p>
                        <p className="text-2xl font-bold text-zinc-700 font-mono">
                          {result.reg118_handwritten?.toLocaleString() || '---'}
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-4 col-span-2">
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">050</p>
                          <p className="text-xl font-bold text-zinc-700 font-mono">
                            {result.reg050?.toLocaleString() || '---'}
                          </p>
                        </div>
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">060</p>
                          <p className="text-xl font-bold text-zinc-700 font-mono">
                            {result.reg060?.toLocaleString() || '---'}
                          </p>
                        </div>
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">070</p>
                          <p className="text-xl font-bold text-zinc-700 font-mono">
                            {result.reg070?.toLocaleString() || '---'}
                          </p>
                        </div>
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">280</p>
                          <p className="text-xl font-bold text-zinc-700 font-mono">
                            {result.reg280?.toLocaleString() || '---'}
                          </p>
                        </div>
                      </div>

                      {(result.timestamp) && (
                        <div className="col-span-2 flex items-center gap-4 text-zinc-500 pt-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar size={14} />
                            {result.timestamp}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={saveReading}
                    className="w-full bg-zinc-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    บันทึกข้อมูลลงประวัติ
                    <ArrowRight size={18} />
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาตามชื่อ, หมายเลขผู้ใช้ หรือมิเตอร์..."
                  className="w-full bg-zinc-100 border-none rounded-2xl pl-12 pr-12 py-3.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {filteredHistory.length === 0 ? (
                <div className="text-center py-20 text-zinc-400">
                  <History size={48} className="mx-auto mb-4 opacity-20" />
                  <p>{searchQuery ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีประวัติการอ่านมิเตอร์'}</p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className="glass-card p-4 flex gap-4 group cursor-pointer hover:border-emerald-200 transition-all"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-100 flex items-center justify-center">
                      {item.mimeType === 'application/pdf' ? (
                        <div className="text-red-500">
                          <FileText size={32} />
                        </div>
                      ) : (
                        <img src={item.imageUrl} alt="Meter" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-500 font-medium">
                            {new Date(item.dateAdded).toLocaleDateString('th-TH', { 
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                          </p>
                          <h4 className="font-bold text-sm truncate text-zinc-900">
                            {item.customerName || 'ไม่ระบุชื่อ'}
                          </h4>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                              <CreditCard size={10} />
                              {item.customerId || '---'}
                            </p>
                            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                              <Hash size={10} />
                              {item.peaMeterId || '---'}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.id);
                          }}
                          className="text-zinc-300 hover:text-red-500 transition-colors p-1 shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        <div className="px-2 py-1 bg-emerald-50 rounded-md border border-emerald-100">
                          <p className="text-[7px] font-bold text-emerald-600 uppercase">010</p>
                          <p className="text-[10px] font-bold font-mono text-emerald-700">{item.reg010 || '---'}</p>
                        </div>
                        <div className="px-2 py-1 bg-blue-50 rounded-md border border-blue-100">
                          <p className="text-[7px] font-bold text-blue-600 uppercase">020</p>
                          <p className="text-[10px] font-bold font-mono text-blue-700">{item.reg020 || '---'}</p>
                        </div>
                        <div className="px-2 py-1 bg-amber-50 rounded-md border border-amber-100">
                          <p className="text-[7px] font-bold text-amber-600 uppercase">030</p>
                          <p className="text-[10px] font-bold font-mono text-amber-700">{item.reg030 || '---'}</p>
                        </div>
                        <div className="px-2 py-1 bg-zinc-50 rounded-md border border-zinc-100">
                          <p className="text-[7px] font-bold text-zinc-600 uppercase">111</p>
                          <p className="text-[10px] font-bold font-mono text-zinc-700">{item.reg111 || '---'}</p>
                        </div>
                        <div className="px-2 py-1 bg-zinc-50 rounded-md border border-zinc-100">
                          <p className="text-[7px] font-bold text-zinc-600 uppercase">050</p>
                          <p className="text-[10px] font-bold font-mono text-zinc-700">{item.reg050 || '---'}</p>
                        </div>
                        <div className="px-2 py-1 bg-zinc-50 rounded-md border border-zinc-100">
                          <p className="text-[7px] font-bold text-zinc-600 uppercase">060</p>
                          <p className="text-[10px] font-bold font-mono text-zinc-700">{item.reg060 || '---'}</p>
                        </div>
                        <div className="px-2 py-1 bg-zinc-50 rounded-md border border-zinc-100">
                          <p className="text-[7px] font-bold text-zinc-600 uppercase">070</p>
                          <p className="text-[10px] font-bold font-mono text-zinc-700">{item.reg070 || '---'}</p>
                        </div>
                        <div className="px-2 py-1 bg-zinc-50 rounded-md border border-zinc-100">
                          <p className="text-[7px] font-bold text-zinc-600 uppercase">280</p>
                          <p className="text-[10px] font-bold font-mono text-zinc-700">{item.reg280 || '---'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Branding */}
      <footer className="mt-12 text-center text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold pb-8">
        Powered by Gemini AI Studio
      </footer>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">รายละเอียดการอ่านมิเตอร์</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      {new Date(selectedItem.dateAdded).toLocaleDateString('th-TH', { 
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* File Preview */}
                <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 aspect-video flex items-center justify-center">
                  {selectedItem.mimeType === 'application/pdf' ? (
                    <div className="flex flex-col items-center gap-4 text-zinc-400 p-8">
                      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-sm">
                        <FileText size={40} />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-zinc-900 truncate max-w-[250px]">{selectedItem.fileName || 'PDF Document'}</p>
                        <p className="text-xs uppercase font-bold tracking-wider mt-1">PDF Document</p>
                      </div>
                    </div>
                  ) : (
                    <img src={selectedItem.imageUrl} alt="Meter" className="max-h-full object-contain" />
                  )}
                </div>

                {/* Customer Info */}
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <User size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">ข้อมูลผู้ใช้ไฟฟ้า</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">ชื่อผู้ใช้ไฟฟ้า</p>
                      <p className="text-sm font-bold text-zinc-900">{selectedItem.customerName || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">หมายเลขผู้ใช้ไฟฟ้า</p>
                      <p className="text-sm font-bold text-zinc-900">{selectedItem.customerId || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">หมายเลขมิเตอร์ PEA</p>
                      <p className="text-sm font-bold text-zinc-900">{selectedItem.peaMeterId || '---'}</p>
                    </div>
                  </div>
                </div>

                {/* Verification Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Verification 111 */}
                  <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Verification 111</p>
                      {Math.abs(((selectedItem.reg010 || 0) + (selectedItem.reg020 || 0) + (selectedItem.reg030 || 0)) - (selectedItem.reg111 || 0)) < 0.01 ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <AlertCircle size={14} className="text-amber-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>010+020+030:</span>
                      <span className="font-mono font-bold">{((selectedItem.reg010 || 0) + (selectedItem.reg020 || 0) + (selectedItem.reg030 || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span>รหัส 111:</span>
                      <span className="font-mono font-bold">{(selectedItem.reg111 || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Verification 050 */}
                  <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Verification 050</p>
                      {Math.abs(((selectedItem.reg015_handwritten || 0) - (selectedItem.reg015_printed || 0)) - (selectedItem.reg050 || 0)) < 0.01 ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <AlertCircle size={14} className="text-amber-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>015 (ลายมือ-พิมพ์):</span>
                      <span className="font-mono font-bold">{((selectedItem.reg015_handwritten || 0) - (selectedItem.reg015_printed || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span>รหัส 050:</span>
                      <span className="font-mono font-bold">{(selectedItem.reg050 || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Verification 060 */}
                  <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Verification 060</p>
                      {Math.abs(((selectedItem.reg016_handwritten || 0) - (selectedItem.reg016_printed || 0)) - (selectedItem.reg060 || 0)) < 0.01 ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <AlertCircle size={14} className="text-amber-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>016 (ลายมือ-พิมพ์):</span>
                      <span className="font-mono font-bold">{((selectedItem.reg016_handwritten || 0) - (selectedItem.reg016_printed || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span>รหัส 060:</span>
                      <span className="font-mono font-bold">{(selectedItem.reg060 || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Verification 070 */}
                  <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Verification 070</p>
                      {Math.abs(((selectedItem.reg017_handwritten || 0) - (selectedItem.reg017_printed || 0)) - (selectedItem.reg070 || 0)) < 0.01 ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <AlertCircle size={14} className="text-amber-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>017 (ลายมือ-พิมพ์):</span>
                      <span className="font-mono font-bold">{((selectedItem.reg017_handwritten || 0) - (selectedItem.reg017_printed || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span>รหัส 070:</span>
                      <span className="font-mono font-bold">{(selectedItem.reg070 || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Verification 280 */}
                  <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white sm:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Verification 280</p>
                      {Math.abs(((selectedItem.reg118_handwritten || 0) - (selectedItem.reg118_printed || 0)) - (selectedItem.reg280 || 0)) < 0.01 ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <AlertCircle size={14} className="text-amber-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>118 (ลายมือ-พิมพ์):</span>
                      <span className="font-mono font-bold">{((selectedItem.reg118_handwritten || 0) - (selectedItem.reg118_printed || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span>รหัส 280:</span>
                      <span className="font-mono font-bold">{(selectedItem.reg280 || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* All Registers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">111 (kWh)</p>
                    <p className="text-sm font-bold font-mono">{selectedItem.reg111?.toLocaleString() || '---'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">010 (kWh)</p>
                    <p className="text-sm font-bold font-mono">{selectedItem.reg010?.toLocaleString() || '---'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">020 (kWh)</p>
                    <p className="text-sm font-bold font-mono">{selectedItem.reg020?.toLocaleString() || '---'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">030 (kWh)</p>
                    <p className="text-sm font-bold font-mono">{selectedItem.reg030?.toLocaleString() || '---'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">015 (kW)</p>
                    <p className="text-sm font-bold font-mono">{selectedItem.reg015?.toLocaleString() || '---'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">016 (kW)</p>
                    <p className="text-sm font-bold font-mono">{selectedItem.reg016?.toLocaleString() || '---'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">017 (kW)</p>
                    <p className="text-sm font-bold font-mono">{selectedItem.reg017?.toLocaleString() || '---'}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">118</p>
                    <p className="text-sm font-bold font-mono">{selectedItem.reg118?.toLocaleString() || '---'}</p>
                  </div>
                </div>

                {/* Demand Details (Printed/Handwritten) */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">รายละเอียด Demand (พิมพ์ vs ลายมือ)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex justify-between items-center">
                      <span className="text-[10px] text-zinc-500">015: พิมพ์ {selectedItem.reg015_printed || '---'}</span>
                      <span className="text-[10px] text-zinc-500">ลายมือ {selectedItem.reg015_handwritten || '---'}</span>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex justify-between items-center">
                      <span className="text-[10px] text-zinc-500">016: พิมพ์ {selectedItem.reg016_printed || '---'}</span>
                      <span className="text-[10px] text-zinc-500">ลายมือ {selectedItem.reg016_handwritten || '---'}</span>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex justify-between items-center">
                      <span className="text-[10px] text-zinc-500">017: พิมพ์ {selectedItem.reg017_printed || '---'}</span>
                      <span className="text-[10px] text-zinc-500">ลายมือ {selectedItem.reg017_handwritten || '---'}</span>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex justify-between items-center">
                      <span className="text-[10px] text-zinc-500">118: พิมพ์ {selectedItem.reg118_printed || '---'}</span>
                      <span className="text-[10px] text-zinc-500">ลายมือ {selectedItem.reg118_handwritten || '---'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-zinc-50/50 border-t border-zinc-100">
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="w-full bg-zinc-900 hover:bg-black text-white font-bold py-3 rounded-xl transition-all"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
