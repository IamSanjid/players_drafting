"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { getSocket } from "@/lib/socketClient";
import { motion, AnimatePresence } from "framer-motion";
import type { PickMadePayload } from "@/types/domain";

export default function AnimatedLatestPick() {
  const [pick, setPick] = useState<PickMadePayload | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const socket = getSocket();

  // Refs to track timers across multiple pick events
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handlePickMade = (data: PickMadePayload) => {
      // 1. Cancel any existing timers from previous picks
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

      setPick(data);
      setIsVisible(true);
      setCanClose(false);

      // 2. Allow closing after 2 seconds
      closeTimerRef.current = setTimeout(() => {
        setCanClose(true);
      }, 2000);

      // 3. Auto-hide after 12 seconds
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 12000);
    };

    socket.on("pick_made", handlePickMade);
    return () => {
      socket.off("pick_made", handlePickMade);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [socket]);

  const handleManualClose = () => {
    if (canClose) setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && pick && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleManualClose}
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-cursor ${canClose ? 'cursor-pointer' : 'cursor-wait'}`}
        >
          <motion.div
            initial={{ scale: 0.8, y: 100, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -100, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
            onClick={(e) => e.stopPropagation()} // Prevent click inside from closing
            className="bg-indigo-950 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(30,58,138,0.5)] max-w-7xl w-full border-4 border-white/10 flex flex-col md:flex-row relative cursor-default"
          >
            {/* 1. Base Fallback Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-blue-950 to-black z-0"></div>

            {/* 2. Team Banner (Primary Background) */}
            {pick.team.bannerUrl && (
              <div
                className="absolute inset-0 z-10 overflow-hidden"
              >
                <div
                  className="absolute inset-0 opacity-50"
                  style={{
                    backgroundImage: `url(${pick.team.bannerUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                {/* Darken the banner for text contrast */}
                <div className="absolute inset-0 bg-black/40" />
              </div>
            )}

            {/* 3. Animated Glows & Lighting */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(59,130,246,0.3)_0%,_transparent_70%)] opacity-70 pointer-events-none z-20"></div>

            {/* Image Side */}
            <div className="w-full md:w-5/12 relative bg-black flex items-center justify-center overflow-hidden min-h-[400px] md:min-h-[600px] z-30">
              {pick.player.imageUrl ? (
                <motion.img
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 10, ease: "linear" }}
                  src={pick.player.imageUrl}
                  className="absolute inset-0 w-full h-full object-cover opacity-90"
                  alt="Player"
                />
              ) : (
                <div className="text-[15rem] font-black text-white/5 absolute select-none tracking-tighter">
                  {pick.player.name.charAt(0)}
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

              <div className="absolute top-8 left-8 flex flex-col gap-2">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="font-mono text-cyan-400 font-black uppercase tracking-[0.2em] text-xs bg-black/60 px-4 py-1.5 rounded-full border border-cyan-400/30 backdrop-blur-xl inline-block"
                >
                  {pick.player.category}
                </motion.div>
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="font-mono text-white/70 font-bold uppercase tracking-widest text-[10px] bg-white/10 px-4 py-1 rounded-full backdrop-blur-xl inline-block"
                >
                  Cat {pick.player.subCategory}
                </motion.div>
              </div>
            </div>

            {/* Info Side */}
            <div className="w-full md:w-7/12 p-8 md:p-16 relative flex flex-col justify-center z-30">
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                <div className="flex items-center gap-6 mb-4">
                  {pick.team.logoUrl && (
                    <Image
                      src={pick.team.logoUrl}
                      alt={`${pick.team.name} logo`}
                      width={80}
                      height={80}
                      className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    />
                  )}
                  <div>
                    <p className="text-cyan-400 uppercase tracking-[0.3em] font-black text-xs mb-1">Franchise Secured</p>
                    <h2 className="text-4xl md:text-6xl font-black text-white drop-shadow-2xl leading-tight uppercase">
                      {pick.team.name}
                    </h2>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="mt-8"
              >
                <div className="bg-gradient-to-r from-blue-600/20 to-transparent border-l-8 border-cyan-400 rounded-2xl p-8 md:p-10 backdrop-blur-md -ml-8 md:-ml-24 relative z-10 shadow-2xl overflow-visible">
                  <p className="text-cyan-200 text-sm font-black uppercase tracking-[0.4em] mb-4 opacity-70">Official Selection</p>
                  <h3 className="text-5xl md:text-7xl font-black text-white break-words leading-none tracking-tight">
                    {pick.player.name}
                  </h3>

                  <div className="flex flex-wrap gap-4 mt-8">
                    <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
                      <p className="text-[10px] uppercase font-bold text-white/40 mb-1 tracking-widest">Position</p>
                      <p className="text-white font-black text-lg">{pick.player.position}</p>
                    </div>
                    {pick.player.country && (
                      <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
                        <p className="text-[10px] uppercase font-bold text-white/40 mb-1 tracking-widest">Nationality</p>
                        <p className="text-white font-black text-lg">{pick.player.country}</p>
                      </div>
                    )}
                    <div className="bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 rounded-2xl backdrop-blur-md">
                      <p className="text-[10px] uppercase font-bold text-emerald-400/60 mb-1 tracking-widest">Draft Value</p>
                      <p className="text-emerald-400 font-black text-xl font-mono">
                        {pick.player.category === "Local" ?
                          `৳${Number(pick.player.priceBDT || 0).toLocaleString()}` :
                          `$${Number(pick.player.priceUSD || 0).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {canClose && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute bottom-6 right-8 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] flex items-center gap-2"
                >
                  Click anywhere to dismiss
                  <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-[8px]">×</div>
                </motion.div>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
