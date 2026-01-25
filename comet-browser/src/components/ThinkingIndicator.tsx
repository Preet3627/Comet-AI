"use client";

import { motion } from 'framer-motion';

const ThinkingIndicator = () => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-deep-space-accent-neon rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
              boxShadow: ["0 0 0px #00FFFF", "0 0 8px #00FFFF", "0 0 0px #00FFFF"], // Glowing effect
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-deep-space-accent-neon/80 filter drop-shadow-[0_0_4px_#00FFFF]">
        Assistant is thinking
      </span>
    </div>
  );
};

export default ThinkingIndicator;
