"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import path from 'path'; // Import path for path.basename
import { BrowserAI } from '@/lib/BrowserAI'; // Import BrowserAI
import { useAppStore } from '@/store/useAppStore'; // Import useAppStore

interface SpotlightSearchOverlayProps {
    show: boolean;
    onClose: () => void;
}

const SpotlightSearchOverlay: React.FC<SpotlightSearchOverlayProps> = ({ show, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [calculationResult, setCalculationResult] = useState<string | null>(null); // New state for calculation result
    const [appSearchResults, setAppSearchResults] = useState<any[]>([]); // New state for app search results
    const [alarmMessage, setAlarmMessage] = useState<string | null>(null); // New state for alarm messages
    const [urlPrediction, setUrlPrediction] = useState<string | null>(null); // New state for URL prediction
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (show) {
            // Focus the input when the overlay opens
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100); // Small delay to ensure modal is rendered
            return () => clearTimeout(timer);
        } else {
            setSearchTerm(''); // Clear search term when closed
        }
    }, [show]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Debounced Predictor for URL
    useEffect(() => {
        const timer = setTimeout(async () => {
            const trimmedSearchTerm = searchTerm.trim();
            if (trimmedSearchTerm.length > 2 && !calculationResult && appSearchResults.length === 0 && !alarmMessage) {
                const store = useAppStore(); // Get store
                const pred = await BrowserAI.predictUrl(trimmedSearchTerm, store.history.map(h => h.url));
                setUrlPrediction(pred);
            } else {
                setUrlPrediction(null);
            }
        }, 150); // Debounce time
        return () => clearTimeout(timer);
    }, [searchTerm, calculationResult, appSearchResults, alarmMessage]);

    const handleSearch = () => {
        setCalculationResult(null); // Clear previous calculation
        const trimmedSearchTerm = searchTerm.trim();

        // Basic calculation logic
        if (/^[\d\s+\-*/().]+$/.test(trimmedSearchTerm)) {
            try {
                // Using eval is generally unsafe, but for a local calculator with trusted input, it's acceptable.
                // In a production environment with untrusted input, a safer math expression parser would be used.
                const result = eval(trimmedSearchTerm);
                setCalculationResult(`${trimmedSearchTerm} = ${result}`);
            } catch (e) {
                setCalculationResult('Invalid expression');
            }
        } else if (trimmedSearchTerm.toLowerCase().startsWith('set alarm for') || trimmedSearchTerm.toLowerCase().startsWith('alarm at')) {
            setAppSearchResults([]); // Clear app search results
            setAlarmMessage(null); // Clear previous alarm message
            if (window.electronAPI) {
                const alarmMatch = trimmedSearchTerm.match(/(set alarm for|alarm at)\s+(.*)/i);
                if (alarmMatch && alarmMatch[2]) {
                    const timeString = alarmMatch[2].trim();
                    let alarmTime: Date | null = null;
                    let message = 'Comet Alarm!';

                    // Simple time parsing (e.g., "5 minutes", "10:30", "tomorrow 8am")
                    if (timeString.includes('minutes')) {
                        const minutes = parseInt(timeString.split(' ')[0], 10);
                        if (!isNaN(minutes)) {
                            alarmTime = new Date(Date.now() + minutes * 60 * 1000);
                            message = `Alarm for ${minutes} minutes: ${trimmedSearchTerm.replace(alarmMatch[1], '').trim()}`;
                        }
                    } else if (timeString.includes('hours')) {
                        const hours = parseInt(timeString.split(' ')[0], 10);
                        if (!isNaN(hours)) {
                            alarmTime = new Date(Date.now() + hours * 60 * 60 * 1000);
                            message = `Alarm for ${hours} hours: ${trimmedSearchTerm.replace(alarmMatch[1], '').trim()}`;
                        }
                    } else if (timeString.match(/\d{1,2}:\d{2}/)) { // HH:MM format
                        const [h, m] = timeString.match(/(\d{1,2}):(\d{2})/i)!.slice(1).map(Number);
                        alarmTime = new Date();
                        alarmTime.setHours(h);
                        alarmTime.setMinutes(m);
                        alarmTime.setSeconds(0);
                        if (alarmTime.getTime() < Date.now()) { // If time is in the past, set for next day
                            alarmTime.setDate(alarmTime.getDate() + 1);
                        }
                        message = `Alarm at ${timeString}: ${trimmedSearchTerm.replace(alarmMatch[1], '').trim()}`;
                    } else { // Fallback, let main process try to parse complex natural language
                        // For more complex natural language, main process would need a more advanced parser.
                        // For now, if no simple match, we default to a basic parsing attempt.
                        alarmTime = new Date(timeString);
                        message = `Alarm: ${trimmedSearchTerm.replace(alarmMatch[1], '').trim()}`;
                    }


                    if (alarmTime && !isNaN(alarmTime.getTime())) {
                        const res = await window.electronAPI.setAlarm(alarmTime.toISOString(), message);
                        if (res.success) {
                            setAlarmMessage(`✅ Alarm set for ${alarmTime.toLocaleTimeString()} (${alarmTime.toLocaleDateString()}).`);
                            onClose(); // Close on successful alarm set
                        } else {
                            setAlarmMessage(`❌ Failed to set alarm: ${res.error}`);
                        }
                    } else {
                        setAlarmMessage(`❌ Could not understand alarm time: "${timeString}". Please use "HH:MM", "X minutes", or "X hours".`);
                    }
                } else {
                    setAlarmMessage(`❌ Invalid alarm command format.`);
                }
            } else {
                setAlarmMessage('⚠️ Alarm setting not available in this environment.');
            }
        } else {
            setAppSearchResults([]); // Clear previous app search results
            if (window.electronAPI) {
                // First, try app search
                const appSearchRes = await window.electronAPI.searchApplications(trimmedSearchTerm);
                if (appSearchRes.success && appSearchRes.results.length > 0) {
                    setAppSearchResults(appSearchRes.results);
                } else {
                    // If no app results, perform web search
                    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmedSearchTerm)}`;
                    window.electronAPI.addNewTab(searchUrl); // Use existing IPC to open new tab
                    onClose(); // Close the spotlight search overlay after initiating search
                }
            } else {
                console.warn('Search functionality not available: Not in Electron environment.');
            }
        }
    };

    if (!show) return null;

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[9999] flex items-start justify-center p-4 md:p-8"
                    onClick={onClose} // Close when clicking outside the modal content
                >
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-3xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal content
                    >
                        <div className="flex items-center p-4 border-b border-white/10">
                            <Search size={18} className="text-secondary-text mr-3" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCalculationResult(null); }} // Clear result on new input
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                        if (urlPrediction) { // If there's a prediction, use it for navigation
                                            if (window.electronAPI) {
                                                window.electronAPI.addNewTab(urlPrediction);
                                                onClose();
                                            }
                                        } else { // Otherwise, perform the regular search
                                            handleSearch();
                                        }
                                    }
                                }}
                                placeholder="Search apps, web, alarms, calculations..."
                                className="flex-1 bg-transparent text-primary-text placeholder:text-secondary-text focus:outline-none text-base"
                            />
                            <button onClick={onClose} className="ml-3 p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        {urlPrediction && searchTerm.length > 0 && (
                            <div className="absolute inset-y-0 left-16 right-16 flex items-center pointer-events-none text-base text-white/20 font-medium z-10">
                                <span>{searchTerm}</span>
                                <span className="opacity-100">{urlPrediction.substring(searchTerm.length)}</span>
                            </div>
                        )}
                        {/* Search results will go here */}
                        <div className="p-4 text-secondary-text text-sm">
                            {calculationResult && (
                                <div className="mb-2 text-primary-text font-medium">
                                    {calculationResult}
                                </div>
                            )}

                            {appSearchResults.length > 0 && (
                                <div className="mb-2">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Applications</h3>
                                    {appSearchResults.map((app, index) => (
                                        <div
                                            key={index}
                                            className="cursor-pointer p-2 rounded-lg hover:bg-white/5 flex items-center gap-2"
                                            onClick={async () => {
                                                if (window.electronAPI && app.path) {
                                                    await window.electronAPI.openExternalApp(app.path);
                                                    onClose();
                                                }
                                            }}
                                        >
                                            <Search size={14} className="text-secondary-text" />
                                            <span className="text-primary-text">{app.name}</span>
                                            <span className="text-secondary-text text-xs ml-auto">{app.path ? path.basename(app.path) : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {alarmMessage && (
                                <div className={`mb-2 text-primary-text font-medium ${alarmMessage.startsWith('❌') ? 'text-red-400' : 'text-green-400'}`}>
                                    {alarmMessage}
                                </div>
                            )}
                            {searchTerm.length === 0 && !calculationResult && appSearchResults.length === 0 && !alarmMessage && (
                                <div>Type to search...</div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SpotlightSearchOverlay;
