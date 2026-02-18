import { cn } from "@/lib/utils"
import { Loader } from "./loader"
import { ProgressBar } from "./progress-bar"
import { useEffect, useState } from "react"

interface OverlayLoaderProps {
    text?: string
    className?: string
    show: boolean
    showProgress?: boolean
    duration?: number
    extra_info?: string
    onProgressComplete?: () => void
}

export const OverlayLoader = ({
    text,
    className,
    show,
    showProgress = false,
    duration = 10,
    onProgressComplete,
    extra_info
}: OverlayLoaderProps) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [show]);

    if (!show) return null;

    return (
        <div
            style={{
                zIndex: 1000
            }}
            className={cn(
                "fixed inset-0 bg-black/70 z-50 flex items-center justify-center transition-opacity duration-300",
                isVisible ? "opacity-100" : "opacity-0"
            )}
        >
            <div
                className={cn(
                    "flex flex-col items-center justify-center px-6  pt-0 pb-8 rounded-xl bg-[#030303] shadow-2xl",
                    "min-w-[280px] sm:min-w-[330px] border border-white/10 transition-all duration-400 ease-out",
                    isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90",
                    className
                )}

            >
                <img loading="eager" src={'/loading.gif'} alt="loading" width={250} height={250} />
                {showProgress ? (
                    <div className="w-full space-y-6 pt-4">
                        <ProgressBar
                            duration={duration}
                            onComplete={onProgressComplete}
                        />
                        {text && (
                            <div className="space-y-1">
                                <p className="text-white text-base text-center font-semibold font-inter">
                                    {text}
                                </p>
                                {extra_info && <p className="text-white/80 text-xs text-center font-semibold font-inter">{extra_info}</p>}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <p className="text-white text-base text-center font-semibold font-inter">
                            {text}
                        </p>
                        {extra_info && <p className="text-white/80 text-xs text-center font-semibold font-inter">{extra_info}</p>}
                    </>

                )}
            </div>
        </div>
    )
} 