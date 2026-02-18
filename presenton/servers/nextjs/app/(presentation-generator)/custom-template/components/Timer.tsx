'use client'
import React, { useEffect, useRef, useState } from 'react'

interface TimerProps {
  duration: number // seconds
}

const Timer = ({ duration }: TimerProps) => {
  const [progress, setProgress] = useState<number>(0)
  const rafIdRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    // Guard against invalid durations
    const totalMs = Math.max(0, duration * 1000)

    const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
    const easeOutSine = (x: number) => Math.sin((x * Math.PI) / 2)

    const tick = (now: number) => {
      if (startTimeRef.current === null) startTimeRef.current = now
      const elapsed = now - startTimeRef.current
      const t = totalMs === 0 ? 1 : Math.min(elapsed / totalMs, 1)

      // Piecewise progression:
      // - Reach ~75% around 60% of the total duration (faster start)
      // - Then ease slowly towards 99% for the remainder
      let nextProgress: number
      if (t <= 0.6) {
        nextProgress = 75 * easeOutCubic(t / 0.6)
      } else {
        nextProgress = 75 + 24 * easeOutSine((t - 0.6) / 0.4)
      }

      // Clamp and ensure we never hit 100
      nextProgress = Math.min(99, nextProgress)

      setProgress(prev => (nextProgress < prev ? prev : nextProgress))

      if (t < 1 && nextProgress < 99) {
        rafIdRef.current = requestAnimationFrame(tick)
      } else {
        // End at 99 and stop
        setProgress(99)
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }

    // Initialize animation
    setProgress(0)
    startTimeRef.current = null
    rafIdRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
      startTimeRef.current = null
    }
  }, [duration])

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-end items-center text-gray-800 text-sm">
        <span className="font-inter text-end font-semibold text-xs">{Math.round(progress)}%</span>
      </div>
      <div
        className="w-full rounded-full h-3 overflow-hidden shadow-inner"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div className="relative h-full rounded-full" style={{
          width: `${progress}%`,
          backgroundImage: 'linear-gradient(90deg, #9034EA, #5146E5, #9034EA)',
          backgroundSize: '200% 100%',
          animation: 'gradient 2s linear infinite'
        }}>
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage:
              'linear-gradient(45deg, rgba(255,255,255,.8) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.8) 50%, rgba(255,255,255,.8) 75%, transparent 75%, transparent)',
            backgroundSize: '16px 16px',
            animation: 'stripes 1s linear infinite'
          }} />
        </div>
        <div className="absolute inset-0" />
      </div>
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes stripes {
          to { background-position: 16px 0; }
        }
      `}</style>
    </div>
  )
}

export default Timer
