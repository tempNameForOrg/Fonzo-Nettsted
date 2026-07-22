import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import * as THREE from "three";

// ---- Tunables ----
const PAGE_BG = "#FFFFFF"; // must match the section background the taco sits on (cream)
const REVEAL_TIMEOUT_MS = 4000;
const SWIPE_THRESHOLD_PX = 40;

function Taco({ bitten }: { bitten: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const biteRef = useRef<THREE.Mesh>(null);

  // idle rotation
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.4;
    // animate the bite-mark scaling in/out
    if (biteRef.current) {
      const target = bitten ? 1 : 0;
      biteRef.current.scale.x = THREE.MathUtils.lerp(biteRef.current.scale.x, target, delta * 8);
      biteRef.current.scale.y = biteRef.current.scale.x;
      biteRef.current.scale.z = biteRef.current.scale.x;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Shell — half torus acting as the folded taco shell */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[1.1, 0.45, 24, 48, Math.PI]} />
        <meshStandardMaterial color="#e8b84b" roughness={0.6} />
      </mesh>

      {/* Fillings, nestled inside the shell's opening */}
      <mesh position={[0, -0.15, 0.15]}>
        <boxGeometry args={[1.6, 0.35, 0.6]} />
        <meshStandardMaterial color="#a5622f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.05, 0.25]}>
        <sphereGeometry args={[0.75, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4d7c3a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.4, 0.25, 0.35]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#c7391c" roughness={0.5} />
      </mesh>
      <mesh position={[0.35, 0.22, 0.4]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#c7391c" roughness={0.5} />
      </mesh>

      {/* Bite mark — a page-colored sphere that "erases" a corner on click */}
      <mesh ref={biteRef} position={[1.0, 0.4, 0.3]} scale={0}>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshStandardMaterial color={PAGE_BG} />
      </mesh>
    </group>
  );
}

export default function TacoHero() {
  const [bitten, setBitten] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const reveal = useCallback(() => setRevealed(true), []);

  // click = bite + reveal
  const handleClick = useCallback(() => {
    setBitten(true);
    reveal();
  }, [reveal]);

  // swipe = reveal only (no bite mark, since it wasn't a precise click)
  const bind = useDrag(({ movement: [mx, my], last }) => {
    if (last && (Math.abs(mx) > SWIPE_THRESHOLD_PX || Math.abs(my) > SWIPE_THRESHOLD_PX)) {
      reveal();
    }
  });

  // fallback: reveal after a few seconds regardless of interaction
  useEffect(() => {
    const t = setTimeout(reveal, REVEAL_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [reveal]);

  return (
    <div
      ref={containerRef}
      {...bind()}
      onClick={handleClick}
      className="relative h-[70vh] w-full touch-none select-none bg-cream"
      style={{ backgroundColor: PAGE_BG }}
    >
      <Canvas camera={{ position: [0, 0.6, 3.2], fov: 45 }} shadows>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} castShadow />
        <Taco bitten={bitten} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>

      <AnimatePresence>
        {revealed && (
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute inset-x-0 bottom-10 text-center text-5xl font-bold text-forest sm:text-7xl"
          >
            Fonzo Tacos
          </motion.h1>
        )}
      </AnimatePresence>

      {!revealed && (
        <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-sm text-forest/60">
          Ta en bit av taco'en 👆
        </p>
      )}
    </div>
  );
}