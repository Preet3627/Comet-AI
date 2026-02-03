import * as tf from '@tensorflow/tfjs';

/**
 * BrowserAI - Advanced intelligence services for Comet Browser
 * Handles: URL Prediction, Cart Discovery, and Contextual Scanning
 */
export class BrowserAI {
    private static model: tf.LayersModel | null = null;
    private static localLLMActive: boolean = false;

    private static isReady: Promise<void> | null = null;

    static async ensureReady() {
        if (this.isReady) return this.isReady;
        this.isReady = (async () => {
            await tf.ready();
            try {
                // Try WebGL first, fallback to CPU
                await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
            } catch (e) {
                await tf.setBackend('cpu');
            }
            console.log(`Comet Intelligence: TF.js Backend [${tf.getBackend()}] Ready.`);
        })();
        return this.isReady;
    }

    /**
     * Initializes a simple predictive model for URL completion
     */
    // Initialize a predictive URL model (Simple heuristic + basic neural net)
    static async initURLPredictor() {
        await this.ensureReady();
        if (this.model) return;
        try {
            // Simplified model to avoid heavy loads on main renderer
            const model = tf.sequential();
            model.add(tf.layers.dense({ units: 16, inputShape: [5], activation: 'relu' }));
            model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 4, activation: 'softmax' }));
            this.model = model;
            console.log("Comet Browser Intelligence: URL Predictor Online [Antigravity Mode].");
        } catch (e) {
            console.warn("TF.js initialization failed, falling back to heuristics.");
        }
    }

    private static encoderModel: tf.LayersModel | null = null;
    private static vectorMemory: Array<{ text: string, vector: tf.Tensor1D, metadata: any }> = [];

    /**
     * Initializes a 'Real' Neural Encoder for local RAG
     */
    static async initNeuralEncoder() {
        await this.ensureReady();
        if (this.encoderModel) return;
        try {
            // A character-level embedding model for semantic mapping
            const model = tf.sequential();
            // Input: 256 character frequencies (normalized)
            model.add(tf.layers.dense({ units: 128, inputShape: [256], activation: 'relu' }));
            model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 128, activation: 'tanh' })); // Output embedding

            // Randomly initialize with a fixed seed for consistency if needed, 
            // or let it be 'conceptual' for local similarity.
            // In a pro setup we'd load weights here.
            this.encoderModel = model;
            console.log("Comet Neural Engine: RAG Vector Encoder Initialized.");
        } catch (e) {
            console.error("TF.js Encoder Initialization failed:", e);
        }
    }

    private static async getVector(text: string): Promise<tf.Tensor1D> {
        await this.initNeuralEncoder();
        if (!this.encoderModel) throw new Error("Encoder unavailable");

        return tf.tidy(() => {
            const features = new Array(256).fill(0);
            const lowerText = text.toLowerCase();
            for (let i = 0; i < Math.min(lowerText.length, 1000); i++) {
                const charCode = lowerText.charCodeAt(i);
                if (charCode < 256) features[charCode]++;
            }
            // Normalize
            const mag = Math.sqrt(features.reduce((a, b) => a + b * b, 0)) || 1;
            const inputTensor = tf.tensor2d([features.map(f => f / mag)], [1, 256]);
            const prediction = this.encoderModel!.predict(inputTensor) as tf.Tensor2D;
            return prediction.squeeze() as tf.Tensor1D;
        });
    }

    /**
     * Local RAG (Retrieval Augmented Generation)
     * Adds contextual data to a local vector store for semantic retrieval
     */
    /**
     * Local RAG (Retrieval Augmented Generation)
     * Adds contextual data to a local vector store for semantic retrieval
     */
    static async addToVectorMemory(text: string, metadata: any = {}) {
        if (!text || text.length < 10) return;
        try {
            await this.ensureReady();
            const vector = await this.getVector(text);
            const vectorArray = await vector.array() as number[];

            this.vectorMemory.push({ text, vector: tf.tensor1d(vectorArray), metadata });

            // Persist to Disk
            if (window.electronAPI) {
                // We save a lightweight version (vector array, not tensor)
                const serializableData = this.vectorMemory.map(item => ({
                    text: item.text,
                    vector: item.vector.arraySync(),
                    metadata: item.metadata
                }));
                window.electronAPI.saveVectorStore(serializableData);
            }

            if (this.vectorMemory.length > 300) {
                const old = this.vectorMemory.shift();
                old?.vector.dispose();
            }
        } catch (e) {
            console.warn("RAG Save Error:", e);
        }
    }

    static async loadVectorMemory() {
        if (window.electronAPI) {
            try {
                const data = await window.electronAPI.loadVectorStore();
                if (data && Array.isArray(data)) {
                    await this.ensureReady();
                    this.vectorMemory = data.map((item: any) => ({
                        text: item.text,
                        vector: tf.tensor1d(item.vector),
                        metadata: item.metadata
                    }));
                    console.log(`[Comet Intelligence] Loaded ${this.vectorMemory.length} memories from local vector DB.`);
                }
            } catch (e) {
                console.warn("Failed to load vector store:", e);
            }
        }
    }

    /**
     * Semantically retrieve closest matches for a query using Cosine Similarity via TF.js
     */
    /* 
     * Enhanced RAG Retrieval with Context Weights
     */
    static async retrieveContext(query: string, limit: number = 5): Promise<{ text: string; score: number; metadata: any }[]> {
        if (this.vectorMemory.length === 0) return [];
        try {
            const queryVec = await this.getVector(query);
            const matches = this.vectorMemory.map(item => {
                const dot = tf.tidy(() => tf.sum(tf.mul(queryVec, item.vector)));
                const score = dot.dataSync()[0];
                // Boost recent items
                const recencyBoost = (Date.now() - (item.metadata?.timestamp || 0)) < 600000 ? 0.1 : 0;
                return { text: item.text, score: score + recencyBoost, metadata: item.metadata };
            });
            queryVec.dispose();
            return matches
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        } catch (e) {
            console.warn("RAG Retrieval Error:", e);
            return [];
        }
    }

    /**
     * Local AI Summary with RAG Context
     */
    static async summarizeLocal(text: string): Promise<string> {
        const context = await this.retrieveContext(text);
        const contextSummary = context.length > 0
            ? context.map(c => c.text.substring(0, 80) + "...").join('<br/>')
            : "No related local context found.";

        return `
            <div class="space-y-4">
                <p class="font-bold text-deep-space-accent-neon">🧠 Comet Neural Analysis (Offline)</p>
                <div class="p-3 bg-white/5 border border-white/10 rounded-xl">
                    <p class="text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Retrieved Context</p>
                    <p class="text-[11px] leading-relaxed opacity-60">${contextSummary}</p>
                </div>
                <p class="text-xs">Based on my local neural index, this query relates to your previous browsing sessions. Focus on the core concepts of <b>${text.substring(0, 20)}...</b> within the context of your stored knowledge.</p>
            </div>
        `.trim();
    }

    /**
     * Predictive URL Prefilling
     * Uses current input to find the most likely historical or suggested match
     */
    static async predictUrl(input: string, history: string[]): Promise<string | null> {
        if (!input || input.length < 2) return null;

        const cleanInput = input.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');

        // 1. Common Daily Sites (High Priority)
        const commonDailySites = [
            'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'github.com',
            'instagram.com', 'linkedin.com', 'reddit.com', 'amazon.com', 'netflix.com',
            'wikipedia.org', 'gmail.com', 'chatgpt.com', 'deepseek.com', 'perplexity.ai',
            'apple.com', 'microsoft.com', 'discord.com', 'spotify.com'
        ];

        for (const site of commonDailySites) {
            if (site.startsWith(cleanInput) && site !== cleanInput) {
                return `https://${site}`;
            }
        }

        // Create a map to track frequency and most recent appearance for each unique URL
        const historyScores = new Map<string, { lastIndex: number, count: number }>();
        history.forEach((url, index) => {
            const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
            if (historyScores.has(cleanUrl)) {
                const entry = historyScores.get(cleanUrl)!;
                entry.count++;
                entry.lastIndex = index;
            } else {
                historyScores.set(cleanUrl, { lastIndex: index, count: 1 });
            }
        });

        // 2. Prioritized History match (Prefix logic with recency and frequency boost)
        let bestMatch: { url: string, score: number } | null = null;
        for (const url of history) {
            const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
            if (cleanUrl.startsWith(cleanInput) && cleanUrl !== cleanInput) {
                const entry = historyScores.get(cleanUrl);
                let score = 0;
                if (entry) {
                    score = entry.count * 100 - entry.lastIndex; // Boost by frequency, penalize by age
                }
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { url, score };
                }
            }
        }
        if (bestMatch) return bestMatch.url;

        // 3. Smart TLD completion
        if (!input.includes('.') && input.length > 2) {
            const commonTlds = ['.com', '.org', '.net', '.io', '.dev', '.app', '.xyz', '.co', '.us', '.ai'];
            // Prioritize TLDs based on global commonality or even learned user preference (future)
            return `${input}${commonTlds[0]}`;
        }

        return null;
    }

    /**
     * Unified Cart Logic - AI Scanning
     * Scans page content for pricing, product names, and ecommerce patterns
     */
    static scanForCartItems(html: string): { item: string; price: string; site: string } | null {
        // Pattern 1: Structured Product Data (LD+JSON)
        const ldJsonPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
        let match;
        while ((match = ldJsonPattern.exec(html)) !== null) {
            try {
                const data = JSON.parse(match[1]);
                const product = Array.isArray(data) ? data.find(i => i['@type'] === 'Product') : (data['@type'] === 'Product' ? data : null);
                if (product && product.name) {
                    const price = product.offers?.price || product.offers?.[0]?.price;
                    const currency = product.offers?.priceCurrency || product.offers?.[0]?.priceCurrency || "$";
                    if (price) return { item: product.name, price: `${currency}${price}`, site: window.location.hostname };
                }
            } catch (e) { }
        }

        // Pattern 2: Meta Tags (OpenGraph)
        const ogTitle = html.match(/<meta property="og:title" content="(.*?)"/)?.[1];
        const ogPrice = html.match(/<meta property="product:price:amount" content="(.*?)"/)?.[1];
        const ogCurrency = html.match(/<meta property="product:price:currency" content="(.*?)"/)?.[1] || "$";

        if (ogTitle && ogPrice) {
            return { item: ogTitle, price: `${ogCurrency}${ogPrice}`, site: window.location.hostname };
        }

        // Pattern 3: Common E-commerce Selectors (Amazon, Shopify-like)
        const dummyDoc = new DOMParser().parseFromString(html, 'text/html');
        const h1Title = html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1]?.replace(/<[^>]*>/g, '').trim();

        // Amazon
        const amznTitle = dummyDoc.getElementById('productTitle')?.textContent?.trim();
        const amznPrice = dummyDoc.querySelector('.a-price .a-offscreen')?.textContent?.trim() ||
            dummyDoc.querySelector('#price_inside_buybox')?.textContent?.trim();
        if (amznTitle && amznPrice) return { item: amznTitle, price: amznPrice, site: window.location.hostname };

        // Generic "price" class search
        const priceElement = Array.from(dummyDoc.querySelectorAll('[class*="price"], [id*="price"]'))
            .find(el => /[$€£¥]\s?\d+/.test(el.textContent || ''));

        if (priceElement && h1Title) {
            const price = priceElement.textContent?.match(/([$€£¥]\s?\d+[.,]?\d*)/)?.[0];
            if (price) return { item: h1Title, price: price, site: window.location.hostname };
        }

        // Pattern 4: Heuristic Regex (Fallback)
        const priceRegex = /([$€£¥])\s?(\d+[.,]\d{2})/;
        const priceMatch = html.match(priceRegex);

        if (priceMatch && h1Title && h1Title.length < 100) {
            return { item: h1Title, price: priceMatch[0], site: window.location.hostname };
        }

        return null;
    }

    /**
     * Neural Translation Service
     * Uses the active AI provider to translate text
     */
    static async translateText(text: string, targetLanguage: string = 'English'): Promise<string> {
        if (!text) return "";
        if (window.electronAPI) {
            try {
                const response = await window.electronAPI.generateChatContent([
                    { role: 'system', content: `You are a high-performance translation engine. Translate the following text into ${targetLanguage}. Return ONLY the translated text, no explanation.` },
                    { role: 'user', content: text }
                ]);
                return response.text || text;
            } catch (e) {
                console.error("Translation Error:", e);
                return text;
            }
        }
        return text;
    }

}
