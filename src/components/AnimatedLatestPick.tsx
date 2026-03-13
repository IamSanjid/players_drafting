'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getSocket } from '@/lib/socketClient';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/ui';
import type { PickMadePayload } from '@/types/domain';
import styles from './AnimatedLatestPick.module.css';

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

    socket.on('pick_made', handlePickMade);
    return () => {
      socket.off('pick_made', handlePickMade);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [socket]);

  const handleManualClose = () => {
    if (canClose) setIsVisible(false);
  };

  const playerImageUrl = pick?.player.imageUrl || '/pfp_placeholder.png';

  return (
    <AnimatePresence>
      {isVisible && pick && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleManualClose}
          className={cn(
            'fixed inset-0 z-[100] flex items-center justify-center p-4 transition-cursor',
            styles.overlay,
            canClose ? 'cursor-pointer' : 'cursor-wait'
          )}
        >
          <motion.div
            initial={{ scale: 0.8, y: 100, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -100, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
            onClick={(e) => e.stopPropagation()} // Prevent click inside from closing
            className={cn(
              'relative flex w-full max-w-7xl cursor-default flex-col overflow-hidden rounded-[2.5rem] md:flex-row',
              styles.modal
            )}
          >
            <div className={cn('absolute inset-0 z-0', styles.baseGradient)} />

            {pick.team.bannerUrl && (
              <div className="absolute inset-0 z-10 overflow-hidden">
                <div
                  className="absolute inset-0 opacity-50"
                  style={{
                    backgroundImage: `url(${pick.team.bannerUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className={cn('absolute inset-0', styles.bannerShade)} />
              </div>
            )}

            <div
              className={cn(
                'pointer-events-none absolute top-0 left-0 z-20 h-full w-full',
                styles.glow
              )}
            />

            <div
              className={cn(
                'relative z-30 flex min-h-[400px] w-full items-center justify-center overflow-hidden md:min-h-[600px] md:w-5/12',
                styles.imagePanel
              )}
            >
              <motion.img
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 10, ease: 'linear' }}
                src={playerImageUrl}
                className="absolute inset-0 w-full h-full object-cover opacity-90"
                alt="Player"
              />

              <div className={cn('absolute inset-0', styles.imageShade)} />

              <div className="absolute top-8 left-8 flex flex-col gap-2">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className={cn(
                    'inline-block rounded-full px-4 py-1.5 font-mono text-xs font-black uppercase tracking-[0.2em] backdrop-blur-xl',
                    styles.categoryPill
                  )}
                >
                  {pick.player.category}
                </motion.div>
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className={cn(
                    'inline-block rounded-full px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-widest backdrop-blur-xl',
                    styles.subcategoryPill
                  )}
                >
                  Cat {pick.player.subCategory}
                </motion.div>
              </div>
            </div>

            <div className="w-full md:w-7/12 p-8 md:p-16 relative flex flex-col justify-center z-30">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-6 mb-4">
                  {pick.team.logoUrl && (
                    <Image
                      src={pick.team.logoUrl}
                      alt={`${pick.team.name} logo`}
                      width={80}
                      height={80}
                      className={cn(
                        'h-20 w-20 object-contain',
                        styles.teamLogoFilter
                      )}
                    />
                  )}
                  <div>
                    <p
                      className={cn(
                        'mb-1 text-xs font-black uppercase tracking-[0.3em]',
                        styles.eyebrow
                      )}
                    >
                      Franchise Secured
                    </p>
                    <h2
                      className={cn(
                        'text-4xl font-black leading-tight uppercase md:text-6xl',
                        styles.teamName
                      )}
                    >
                      {pick.team.name}
                    </h2>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="mt-8"
              >
                <div
                  className={cn(
                    'relative z-10 -ml-8 overflow-visible rounded-2xl p-8 backdrop-blur-md md:-ml-24 md:p-10',
                    styles.selectionCard
                  )}
                >
                  <p
                    className={cn(
                      'mb-4 text-sm font-black uppercase tracking-[0.4em] opacity-70',
                      styles.selectionEyebrow
                    )}
                  >
                    Official Selection
                  </p>
                  <h3
                    className={cn(
                      'break-words text-5xl font-black leading-none tracking-tight md:text-7xl',
                      styles.playerName
                    )}
                  >
                    {pick.player.name}
                  </h3>

                  <div className="flex flex-wrap gap-4 mt-8">
                    <div
                      className={cn(
                        'rounded-2xl px-6 py-3 backdrop-blur-md',
                        styles.detailCard
                      )}
                    >
                      <p
                        className={cn(
                          'mb-1 text-[10px] font-bold uppercase tracking-widest',
                          styles.detailLabel
                        )}
                      >
                        Position
                      </p>
                      <p
                        className={cn('text-lg font-black', styles.detailValue)}
                      >
                        {pick.player.position}
                      </p>
                    </div>
                    {pick.player.country && (
                      <div
                        className={cn(
                          'rounded-2xl px-6 py-3 backdrop-blur-md',
                          styles.detailCard
                        )}
                      >
                        <p
                          className={cn(
                            'mb-1 text-[10px] font-bold uppercase tracking-widest',
                            styles.detailLabel
                          )}
                        >
                          Nationality
                        </p>
                        <p
                          className={cn(
                            'text-lg font-black',
                            styles.detailValue
                          )}
                        >
                          {pick.player.country}
                        </p>
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-6 py-3 backdrop-blur-md',
                        styles.valueCard
                      )}
                    >
                      <p
                        className={cn(
                          'mb-1 text-[10px] font-bold uppercase tracking-widest',
                          styles.valueLabel
                        )}
                      >
                        Draft Value
                      </p>
                      <p
                        className={cn(
                          'font-mono text-xl font-black',
                          styles.valueAmount
                        )}
                      >
                        {pick.player.category === 'Local'
                          ? `৳${Number(pick.player.priceBDT || 0).toLocaleString()}`
                          : `$${Number(pick.player.priceUSD || 0).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {canClose && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'absolute bottom-6 right-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em]',
                    styles.dismissHint
                  )}
                >
                  Click anywhere to dismiss
                  <div
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full text-[8px]',
                      styles.dismissIcon
                    )}
                  >
                    ×
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
