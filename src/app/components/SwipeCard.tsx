"use client";

import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import Image from "next/image";
import { Sparkles } from "lucide-react";

const SWIPE_THRESHOLD = 120;

export type SwipeItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  imageType: "upload" | "ai" | "none";
};

// A small set of gradients so "no image" cards still feel distinct from
// each other instead of all looking identical.
const PLACEHOLDER_GRADIENTS = [
  "from-brand/60 via-ink to-ink",
  "from-coral/50 via-ink to-ink",
  "from-lime/40 via-ink to-ink",
  "from-brand-soft/50 via-ink to-ink",
];

function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length];
}

export default function SwipeCard({
  item,
  onSwiped,
  active,
  stackPosition,
  forcedDirection,
}: {
  item: SwipeItem;
  onSwiped: (direction: "like" | "skip") => void;
  active: boolean;
  stackPosition: number;
  forcedDirection: "like" | "skip" | null;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -20], [1, 0]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwiped("like");
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwiped("skip");
    }
  }

  const exitX = forcedDirection === "like" ? 500 : forcedDirection === "skip" ? -500 : 0;

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x: active ? x : 0,
        rotate: active ? rotate : 0,
        zIndex: 50 - stackPosition,
      }}
      initial={false}
      animate={
        forcedDirection
          ? { x: exitX, rotate: exitX > 0 ? 20 : -20, opacity: 0 }
          : {
              scale: 1 - stackPosition * 0.04,
              y: stackPosition * 12,
              opacity: stackPosition > 2 ? 0 : 1,
            }
      }
      transition={
        forcedDirection
          ? { duration: 0.35, ease: "easeIn" }
          : { type: "spring", stiffness: 300, damping: 28 }
      }
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[28px] border border-hairline bg-ink shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)]">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 480px) 100vw, 420px"
            className="object-cover"
            draggable={false}
            priority={stackPosition === 0}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientFor(item.id)}`} />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

        {item.imageType === "ai" && (
          <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 font-mono text-[10px] text-brand-soft backdrop-blur-sm">
            <Sparkles size={11} />
            AI generated
          </div>
        )}

        {active && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute left-6 top-8 rotate-[-12deg] rounded-lg border-4 border-lime px-4 py-1 font-display text-3xl font-extrabold tracking-wide text-lime"
            >
              LIKE
            </motion.div>
            <motion.div
              style={{ opacity: nopeOpacity }}
              className="absolute right-6 top-8 rotate-[12deg] rounded-lg border-4 border-coral px-4 py-1 font-display text-3xl font-extrabold tracking-wide text-coral"
            >
              NOPE
            </motion.div>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 p-6">
          <h2 className="font-display text-3xl font-extrabold leading-tight text-surface">
            {item.title}
          </h2>
          {item.description && (
            <p className="mt-2 text-sm text-surface/80">{item.description}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
