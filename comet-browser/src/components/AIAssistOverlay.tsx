import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronRight, Search, ExternalLink, RefreshCw } from 'lucide-react';

interface AIAssistOverlayProps {
    query: string;
    result: string | null;
    isLoading: boolean;
    onClose: () => void;
}

const AIAssistOverlay = ({ query, result, isLoading, onClose }: AIAssistOverlayProps) => {
    return (
        <div className="fixed top-24 right-6 w-96 z-[60] pointer-events-none">
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="pointer-events-auto bg-deep-space-bg/90 backdrop-blur-xl border border-deep-space-accent-neon/30 p-6 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative"
            >
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-deep-space-accent-neon/10 rounded-full blur-[50px] pointer-events-none" />

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-deep-space-accent-neon/10 text-deep-space-accent-neon animate-pulse">
                            {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">AI Overview</h3>
                            <p className="text-[10px] text-white/40 mt-1 font-bold">Analysis of: <span className="text-white/80">{query}</span></p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-white/30 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="relative min-h-[100px]">
                    {isLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-2 bg-white/10 rounded-full w-3/4" />
                            <div className="h-2 bg-white/10 rounded-full w-full" />
                            <div className="h-2 bg-white/10 rounded-full w-5/6" />
                            <div className="h-2 bg-white/5 rounded-full w-1/2 mt-4" />
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-xs text-white/80 leading-relaxed font-medium">
                            {result ? (
                                <div dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>') }} />
                            ) : (
                                <p className="text-white/40 italic">Unable to generate insight for this query.</p>
                            )}
                        </div>
                    )}
                </div>

                {!isLoading && (
                    <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                        <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 transition-all flex items-center justify-center gap-2">
                            <Search size={12} /> Related
                        </button>
                        <button className="flex-1 py-3 bg-deep-space-accent-neon/10 hover:bg-deep-space-accent-neon/20 border border-deep-space-accent-neon/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-deep-space-accent-neon transition-all flex items-center justify-center gap-2">
                            <ExternalLink size={12} /> Deep Dive
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default AIAssistOverlay;
