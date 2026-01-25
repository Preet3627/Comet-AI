import { searchEngines } from "./SearchEngineSettings";
import { useAppStore } from "@/store/useAppStore";
import { motion } from "framer-motion";
import {
    Sparkles,
    Shield,
    Zap,
    Globe,
    LogIn,
    ArrowRight,
    Layers,
    Cpu,
    ChevronLeft,
    UserX,
    Search,
} from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import { firebaseConfigStorage, FirebaseConfig } from "@/lib/firebaseConfigStorage";

const LandingPage = () => {
    const store = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState<"home" | "dashboard">("home");
    const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
    const [showStartup, setShowStartup] = useState(true);

    useEffect(() => {
        const done = sessionStorage.getItem("comet_startup_done");
        if (done) {
            setShowStartup(false);
            return;
        }
        const t = setTimeout(() => {
            setShowStartup(false);
            sessionStorage.setItem("comet_startup_done", "true");
        }, 3000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const handleExternalAuthReturn = () => {
            const p = new URLSearchParams(window.location.search);
            const status = p.get("auth_status");
            const uid = p.get("uid");
            const email = p.get("email");
            const name = p.get("name");
            const photo = p.get("photo");
            const firebaseConfigParam = p.get("firebase_config");

            if (firebaseConfigParam) {
                try {
                    firebaseConfigStorage.save(JSON.parse(atob(firebaseConfigParam)));
                } catch {}
            }

            if (status === "success" && uid && email) {
                store.setUser({
                    uid,
                    email,
                    displayName: name || "User",
                    photoURL: photo || "",
                });

                if (email.endsWith("@ponsrischool.in")) store.setAdmin(true);
                store.setActiveView("browser");
                store.setHasSeenWelcomePage(true);
                store.startActiveSession();
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        };

        handleExternalAuthReturn();

        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === "auth-success") {
                if (e.data.firebaseConfig) {
                    firebaseConfigStorage.save(e.data.firebaseConfig);
                }

                const { uid, email, name, photo } = e.data.data || e.data;
                store.setUser({
                    uid,
                    email,
                    displayName: name || "User",
                    photoURL: photo || "",
                });

                if (email?.endsWith("@ponsrischool.in")) store.setAdmin(true);
                store.setActiveView("browser");
                store.startActiveSession();
                setIsLoading(false);
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [store]);

    const getFirebaseConfigFromEnv = (): FirebaseConfig => ({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    });

    const handleLogin = async () => {
        setIsLoading(true);
        const redirectUri = window.location.href;
        const encoded = btoa(JSON.stringify(getFirebaseConfigFromEnv()));
        const url = `https://browser.ponsrischool.in/auth?redirect_uri=${encodeURIComponent(
            redirectUri
        )}&firebase_config=${encoded}`;
        window.open(url, "_blank");
    };

    if (showStartup) {
        return (
            <div className="fixed inset-0 bg-[#020205] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1 }}
                >
                    <h1 className="text-4xl font-black text-white">Welcome To Future</h1>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#020205] text-white relative">
            {/* NAV */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between">
                    <div className="flex items-center gap-3">
                        <img src="icon.ico" className="w-8 h-8" alt="Comet Browser Logo" />
                        <span className="font-black">COMET</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogin}
                        className="px-6 py-2 border border-white/10 rounded-xl"
                        aria-label="Login"
                    >
                        <LogIn size={14} />
                    </button>
                </div>
            </nav>

            {/* MAIN */}
            <div className="flex-1 pt-24 overflow-y-auto">
                <main className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16">
                    <div>
                        <h1 className="text-7xl font-black uppercase mb-8">
                            The Next Frontier of Browsing
                        </h1>
                        <input
                            className="w-full p-5 rounded-2xl bg-white/5 border border-white/10"
                            placeholder="Ask Comet or Search..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const q = (e.target as HTMLInputElement).value;
                                    if (q) {
                                        const selectedSearchEngine = searchEngines[store.selectedEngine as keyof typeof searchEngines] || searchEngines.google;
                                        store.setGuestMode(true);
                                        store.addTab(
                                            `${selectedSearchEngine.url}${encodeURIComponent(q)}`
                                        );
                                        store.setActiveView("browser");
                                    }
                                }
                            }}
                        />
                    </div>
                </main>

                {/* FEATURES */}
                <section
                    id="features"
                    className="py-32 border-t border-white/5 mt-32"
                >
                    <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-3 gap-8">
                        {[
                            { icon: <Zap />, title: "Hyper-Link Sync" },
                            { icon: <Shield />, title: "Quantum Isolation" },
                            { icon: <Cpu />, title: "AI Orchestrator" },
                        ].map((f, i) => (
                            <div
                                key={i}
                                className="p-8 bg-white/5 rounded-2xl border border-white/10"
                            >
                                {f.icon}
                                <h3 className="mt-4 font-bold">{f.title}</h3>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* STARS */}
            <style jsx>{`
                .stars-container {
                    background-image: radial-gradient(
                        1px 1px at 20px 30px,
                        #eee,
                        rgba(0, 0, 0, 0)
                    );
                    animation: move-stars 100s linear infinite;
                }
                @keyframes move-stars {
                    from {
                        background-position: 0 0;
                    }
                    to {
                        background-position: 0 1000px;
                    }
                }
            `}</style>
        </div>
    );
};

export default LandingPage;
