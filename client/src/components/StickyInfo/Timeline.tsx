import { useRef } from "react";
import { useLenis } from "lenis/react";
import { BurritoCanvas } from "./DynamikkBurrito";
import Aapningstider from "./Aapningstider";
import Googleapi from "./Googleapi";

// tune these to taste
const SECTION_HEIGHT_VH = 250; // how long the pin lasts
const START_X = 0; // vw offset at scroll start (centered)
const END_X = 28; // vw offset once fully scrolled (over near Aapningstider)

export default function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  useLenis(({ scroll }) => {
    const container = containerRef.current;
    if (!container) return;

    const start = container.offsetTop;
    const total = container.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max((scroll - start) / total, 0), 1);

    if (canvasWrapRef.current) {
      const x = START_X + (END_X - START_X) * progress;
      canvasWrapRef.current.style.transform = `translateX(${x}vw)`;
    }
    if (titleRef.current) {
      titleRef.current.style.opacity = `${1 - progress * 1.3}`;
    }
    if (infoRef.current) {
      infoRef.current.style.opacity = `${Math.min(progress * 1.6, 1)}`;
      infoRef.current.style.transform = `translateY(${(1 - progress) * 20}px)`;
    }
  });

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: `${SECTION_HEIGHT_VH}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-cream">
        {/* taco, slides from center to right */}
        <div
          ref={canvasWrapRef}
          className="absolute inset-0 will-change-transform"
        >
          <BurritoCanvas />
        </div>

        {/* hero title, fades out as you scroll */}
        <h1
          ref={titleRef}
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-9xl font-bold text-forest transition-opacity"
        >
          Fonzo Taco
        </h1>

        {/* opening hours content, fades in on the left */}
        <div
          ref={infoRef}
          className="absolute left-8 top-1/2 max-w-md -translate-y-1/2 opacity-0 md:left-16"
        >
          <Aapningstider />

          {/* Google, fades in on the left */}
          <div
            ref={infoRef}
            className="absolute right-8 top-1/2 max-w-md translate-y-1/2 opacity-0 md:right-16"
          >
            <Googleapi />
          </div>
        </div>
      </div>
    </div>
  );
}
