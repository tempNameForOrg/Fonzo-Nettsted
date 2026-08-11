import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { BurritoCanvas } from "./DynamikkBurrito";
import Aapningstider from "./Aapningstider";
import Googleapi from "./Googleapi";

// ---- section length ----
const SECTION_HEIGHT_VH_DESKTOP = 400;
const SECTION_HEIGHT_VH_MOBILE = 160;

// ---- math primitives ----
function clamp(v: number, min = 0, max = 1) {
  return Math.min(Math.max(v, min), max);
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function remap(t: number, start: number, end: number) {
  return clamp((t - start) / (end - start || 1));
}

type Keyframe = [progress: number, value: number];

// finds the two checkpoints straddling `progress` and lerps between just those.
// this is what lets you chain slide-right -> hold -> slide-left, or
// fade-in -> hold -> fade-out, as a single array instead of separate phases.
function keyframeValue(progress: number, frames: readonly Keyframe[]): number {
  if (frames.length === 0) return 0;
  if (progress <= frames[0][0]) return frames[0][1];
  if (progress >= frames[frames.length - 1][0]) return frames[frames.length - 1][1];

  for (let i = 0; i < frames.length - 1; i++) {
    const [p0, v0] = frames[i];
    const [p1, v1] = frames[i + 1];
    if (progress >= p0 && progress <= p1) {
      return lerp(v0, v1, remap(progress, p0, p1));
    }
  }
  return frames[frames.length - 1][1];
}

// ---- per-property timelines ----
// each array is [progress, value]. Add a checkpoint anywhere to add a new beat.

const DESKTOP = {
  // burrito: center -> slides right (clears space for opening hours) ->
  // holds -> slides back past center to the left (clears space for google card on the right)
  tacoX: [
    [0, 0],
    [0.3, 28],
    [0.4, 28],
    [0.6, -28],
  ] as Keyframe[],
  titleOpacity: [
    [0.1, 1],
    [0.4, 0],
  ] as Keyframe[],
  infoOpacity: [
    [0.3, 0],
    [0.5, 1],
    [0.7, 0],
  ] as Keyframe[],
  googleOpacity: [
    [0.3, 0],
    [0.6, 1],
  ] as Keyframe[],
};

const MOBILE = {
  tacoScale: [
    [0, 1],
    [0.5, 0.55],
  ] as Keyframe[],
  titleOpacity: [
    [0, 1],
    [0.3, 0],
  ] as Keyframe[],
  infoOpacity: [
    [0.45, 0],
    [0.65, 1],
    [0.8, 0],
  ] as Keyframe[],
  googleOpacity: [
    [0.65, 0],
    [0.85, 1],
  ] as Keyframe[],
};

function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(`(max-width: ${breakpointPx}px)`).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpointPx]);
  return isMobile;
}

export default function Timeline() {
  const isMobile = useIsMobile();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const googleRef = useRef<HTMLDivElement>(null);

  useLenis(({ scroll }) => {
    const container = containerRef.current;
    if (!container) return;

    const start = container.offsetTop;
    const total = container.offsetHeight - window.innerHeight;
    const progress = clamp((scroll - start) / total);

    // burrito
    if (canvasWrapRef.current) {
      if (isMobile) {
        const scale = keyframeValue(progress, MOBILE.tacoScale);
        canvasWrapRef.current.style.transform = `scale(${scale})`;
      } else {
        const x = keyframeValue(progress, DESKTOP.tacoX);
        canvasWrapRef.current.style.transform = `translateX(${x}vw)`;
      }
    }

    // title
    if (titleRef.current) {
      const frames = isMobile ? MOBILE.titleOpacity : DESKTOP.titleOpacity;
      titleRef.current.style.opacity = `${keyframeValue(progress, frames)}`;
    }

    // opening hours
    if (infoRef.current) {
      const frames = isMobile ? MOBILE.infoOpacity : DESKTOP.infoOpacity;
      const o = keyframeValue(progress, frames);
      infoRef.current.style.opacity = `${o}`;
      infoRef.current.style.transform = `translateY(${(1 - o) * 20}px)`;
    }

    // google
    if (googleRef.current) {
      const frames = isMobile ? MOBILE.googleOpacity : DESKTOP.googleOpacity;
      const o = keyframeValue(progress, frames);
      googleRef.current.style.opacity = `${o}`;
      googleRef.current.style.transform = `translateY(${(1 - o) * 20}px)`;
    }
  });

  const sectionHeight = isMobile ? SECTION_HEIGHT_VH_MOBILE : SECTION_HEIGHT_VH_DESKTOP;

  return (
    <div
      ref={containerRef}
      id="timeline"
      className="relative"
      style={{ height: `${sectionHeight}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div ref={canvasWrapRef} className="absolute inset-0 will-change-transform">
          <BurritoCanvas />
        </div>

        <h1
          ref={titleRef}
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-bold text-forest md:text-9xl"
        >
          Fonzo Taco
        </h1>

        <div
          ref={infoRef}
          className="p-4 absolute left-8 top-1/2 max-w-md -translate-y-1/2 opacity-0 md:left-16"
        >
          <Aapningstider />
        </div>

        <div
          ref={googleRef}
          className="p-4 absolute right-8 top-1/2 max-w-md -translate-y-1/2 opacity-0 md:right-16"
        >
          <Googleapi />
        </div>
      </div>
    </div>
  );
}