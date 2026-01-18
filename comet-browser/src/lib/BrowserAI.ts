import * as tf from '@tensorflow/tfjs';

/**
 * BrowserAI - Advanced intelligence services for Comet Browser
 * Handles: URL Prediction, Cart Discovery, and Contextual Scanning
 */
export class BrowserAI {
    private static model: tf.LayersModel | null = null;
    private static localLLMActive: boolean = false;

    /**
     * Initializes a simple predictive model for URL completion
     */
    static async initURLPredictor() {
        if (this.model) return;

        try {
            const model = tf.sequential();
            model.add(tf.layers.dense({ units: 8, inputShape: [5], activation: 'relu' }));
            model.add(tf.layers.dense({ units: 4, activation: 'softmax' }));
            this.model = model;
            console.log("Comet Browser Intelligence: URL Predictor Online.");
        } catch (e) {
            console.warn("TF.js initialization failed, falling back to heuristics.");
        }
    }

    /**
     * Predictive URL Prefilling
     * Uses current input to find the most likely historical or suggested match
     */
    static async predictUrl(input: string, history: string[]): Promise<string | null> {
        if (!input || input.length < 2) return null;

        const cleanInput = input.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');

        // 1. History match (Prefix logic)
        const historyMatch = history.find(url => {
            const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
            return cleanUrl.startsWith(cleanInput) && cleanUrl !== cleanInput;
        });
        if (historyMatch) return historyMatch;

        // 2. High-probability TLD completion
        if (!input.includes('.') && input.length > 2) {
            const tlds = ['.com', '.org', '.io', '.dev', '.app', '.net'];
            return `${input}${tlds[0]}`;
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
     * Local LLM Summary Stub
     * In a production environment, this would call a Web-LLM worker
     */
    static async summarizeLocal(text: string): Promise<string> {
        return `[Local AI Response] Summarized ${text.length} characters of data. Core themes: Productivity, Infrastructure, Efficiency.`;
    }
}
