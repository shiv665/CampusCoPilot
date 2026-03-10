import { useState } from "react";
import { api } from "../api/client";
import { motion } from "framer-motion";

export default function ScanNotes() {
    const [file, setFile] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [formattedResult, setFormattedResult] = useState(null);
    const [formatting, setFormatting] = useState(false);
    const [error, setError] = useState("");

    // TTS State
    const [speaking, setSpeaking] = useState(false);
    const [paused, setPaused] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleScan = async () => {
        if (!file) return;
        setScanning(true);
        setError("");
        setResult(null);
        stopSpeaking();

        try {
            const res = await api.scanNotes(file);
            const rawText = res.text || res.extracted_text || "No text could be extracted.";
            setResult(rawText);
            // Auto-format with AI
            setFormatting(true);
            try {
                const fmtRes = await api.formatNotes(rawText);
                setFormattedResult(fmtRes.formatted_text || rawText);
            } catch {
                setFormattedResult(null);
            } finally {
                setFormatting(false);
            }
        } catch (e) {
            setError(e.message || "Failed to scan notes. Ensure backend supports OCR endpoint.");
        } finally {
            setScanning(false);
        }
    };

    // TTS (Text-to-Speech) using Web Speech API
    const displayText = formattedResult || result;

    const handleTTS = () => {
        if (!displayText) return;
        if (speaking && !paused) {
            window.speechSynthesis.pause();
            setPaused(true);
            return;
        }
        if (speaking && paused) {
            window.speechSynthesis.resume();
            setPaused(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(displayText);
        utterance.onend = () => {
            setSpeaking(false);
            setPaused(false);
        };
        window.speechSynthesis.speak(utterance);
        setSpeaking(true);
        setPaused(false);
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        setPaused(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight">📸 Notes Scanner (OCR & TTS)</h1>
                <p className="text-slate-400 mt-1">Upload a picture of your handwritten notes or a document to extract text and listen to it.</p>
            </div>

            <div className="glass p-8 rounded-2xl border border-slate-700/50 flex flex-col items-center">
                <div
                    className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer relative ${file ? "border-indigo-400 bg-indigo-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50 bg-white shadow-sm"
                        }`}
                >
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                    />
                    {file ? (
                        <div className="space-y-2">
                            <span className="text-4xl">📄</span>
                            <p className="text-indigo-300 font-medium break-all">{file.name}</p>
                            <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <span className="text-5xl text-slate-500">📷</span>
                            <p className="text-slate-300 font-medium">Drag & drop your note image here</p>
                            <p className="text-sm text-slate-500">Supports JPG, PNG, PDF</p>
                        </div>
                    )}
                </div>

                {error && <p className="text-rose-400 mt-4 text-sm">{error}</p>}

                <button
                    onClick={handleScan}
                    disabled={!file || scanning}
                    className="mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/25"
                >
                    {scanning ? "🔍 Scanning Notes (AI Vision/OCR)..." : "Extract Text"}
                </button>
            </div>

            {result && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <span>📝</span> {formattedResult ? "AI-Formatted Notes" : "Extracted Content"}
                            {formatting && <span className="text-xs text-indigo-500 animate-pulse ml-2">✨ AI is formatting...</span>}
                        </h2>
                        <div className="flex gap-2">
                            {formattedResult && (
                                <button
                                    onClick={() => setFormattedResult(null)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors border border-slate-200"
                                >
                                    Show Raw
                                </button>
                            )}
                            {!formattedResult && result && !formatting && (
                                <button
                                    onClick={async () => {
                                        setFormatting(true);
                                        try {
                                            const fmtRes = await api.formatNotes(result);
                                            setFormattedResult(fmtRes.formatted_text || result);
                                        } catch { /* ignore */ }
                                        finally { setFormatting(false); }
                                    }}
                                    className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-medium transition-colors border border-indigo-200"
                                >
                                    ✨ Format with AI
                                </button>
                            )}
                            {speaking ? (
                                <button onClick={stopSpeaking} className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-sm font-medium transition-colors border border-rose-500/30">
                                    ⏹️ Stop
                                </button>
                            ) : null}
                            <button
                                onClick={handleTTS}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-2"
                            >
                                {speaking && !paused ? "⏸️ Pause" : speaking && paused ? "▶️ Resume" : "🔊 Read Aloud (TTS)"}
                            </button>
                        </div>
                    </div>
                    <div className="p-6 bg-white">
                        {formattedResult ? (
                            <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                                {formattedResult}
                            </div>
                        ) : (
                            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-mono text-sm">
                                {result}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
