import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

// Deterministic pseudo-random so fillings don't reshuffle on re-render
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function TacoShell() {
  // Half-pipe cylinder bent into a folded taco shell shape
  return (
    <mesh rotation={[0, 0, -Math.PI / 2]} castShadow receiveShadow>
      <cylinderGeometry args={[0.5, 0.5,2.4, 32, 1, true, 0, Math.PI * 2]} />
      <meshStandardMaterial
        color="#e0a952"
        roughness={0.85}
        metalness={0}
        side={2}
      />
    </mesh>
  );
}
function TacoEnd() {
  // Half-pipe cylinder bent into a folded taco shell shape
  return (
    <mesh rotation={[0, 0, -Math.PI / 2]} position={[-1.1,0,0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.5, 0.5,0.1, 32, 1, false, 0, Math.PI * 2]} />
      <meshStandardMaterial
        color="#e0a952"
        roughness={0.85}
        metalness={0}
        side={2}
      />
    </mesh>
  );
}

function GroundBeef() {
  const rand = useMemo(() => seededRandom(42), []);
  const chunks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 24; i++) {
      const x = (rand() - 0.5) * 2.1 + rand()*0.5;
      const y = rand() * 0.35 - 0.2;
      const z = (rand() - 0.5) * 1.1;
      const scale = 0.12 + rand() * 0.1-0.3;
      arr.push({
        position: [x, y, z],
        scale,
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI],
      });
    }
    return arr;
  }, [rand]);

  return (
    <group>
      {chunks.map((c, i) => (
        <mesh key={i} position={c.position} rotation={c.rotation} castShadow>
          <icosahedronGeometry args={[c.scale, 0]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? "#6b3a24" : "#8a4a2b"}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

function Lettuce() {
  const rand = useMemo(() => seededRandom(7), []);
  const strands = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 11; i++) {
      const x = (rand() - 0.5) * 2.3 + rand();
      const y = rand() * 0.5 - 0.3;
      const z = 0;
      arr.push({
        position: [x, y, z],
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI],
        scale: 0.18 + rand() * 0.12,
      });
    }
    return arr;
  }, [rand]);

  return (
    <group>
      {strands.map((s, i) => (
        <mesh key={i} position={s.position} rotation={s.rotation} castShadow>
          <boxGeometry args={[s.scale, s.scale * 0.15, s.scale * 0.5]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#4f9e3a" : "#6bbf4a"}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

function Tomato() {
  const rand = useMemo(() => seededRandom(19), []);
  const cubes = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 14; i++) {
      const x = (rand() - 0.5) * 2;
      const spread = 1 - Math.abs(x) / 1.3;
      const y = -0.1 + rand() * 0.4;
      const z = (rand() - 0.5) * 1.0 * spread;
      arr.push({
        position: [x, y, z],
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI],
        scale: 0.13 + rand() * 0.06,
      });
    }
    return arr;
  }, [rand]);

  return (
    <group>
      {cubes.map((c, i) => (
        <mesh key={i} position={c.position} rotation={c.rotation} castShadow>
          <boxGeometry args={[c.scale, c.scale, c.scale]} />
          <meshStandardMaterial color="#d43a2f" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Cheese() {
  const rand = useMemo(() => seededRandom(31), []);
  const strips = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 30; i++) {
      const x = (rand() - 0.5) * 2.3;
      const spread = 1 - Math.abs(x) / 1.3;
      const y = 0.1 + rand() * 0.2;
      const z = (rand() - 0.5) * 1.1 * spread;
      arr.push({
        position: [x, y, z],
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI],
        length: 0.15 + rand() * 0.15,
      });
    }
    return arr;
  }, [rand]);

  return (
    <group>
      {strips.map((s, i) => (
        <mesh key={i} position={s.position} rotation={s.rotation} castShadow>
          <boxGeometry args={[s.length, 0.04, 0.04]} />
          <meshStandardMaterial color="#f4c542" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function SourCreamDrizzle() {
  const rand = useMemo(() => seededRandom(55), []);
  const dots = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 10; i++) {
      const x = (rand() - 0.5) * 1.8;
      const spread = 1 - Math.abs(x) / 1.3;
      const z = (rand() - 0.5) * 0.6 * spread;
      arr.push({ position: [x, 0.35, z], scale: 0.06 + rand() * 0.05 });
    }
    return arr;
  }, [rand]);

  return (
    <group>
      {dots.map((d, i) => (
        <mesh key={i} position={d.position} castShadow>
          <sphereGeometry args={[d.scale, 8, 8]} />
          <meshStandardMaterial color="#fdfaf3" roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Taco() {
  const tacoRef = useRef(null);

  // useFrame(() => {
  //   tacoRef.current.rotation.y += 0.006;
  //   tacoRef.current.rotation.z += 0.006;
  //   tacoRef.current.rotation.x += 0.006;
  // });

  return (
    <group ref={tacoRef}>
      <TacoEnd />
      <TacoShell />
      <GroundBeef />
      <Lettuce />
      <Tomato />
      <Cheese />
      <SourCreamDrizzle />
    </group>
  );
}

export default function TacoHero() {
  return (
    <>
      <div className="mx-auto min-h-screen max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        <div className="aspect-video min-h-screen bg-cream">
          <Canvas camera={{ position: [2.5, 0, 0], fov: 90 }}>
            <axesHelper args={[20]} />
            <gridHelper args={[20, 20, "red", "blue"]} />
            <GizmoHelper alignment="bottom-right" margin={[50, 50]}>
              <GizmoViewport />
            </GizmoHelper>
            <OrbitControls />
            <ambientLight intensity={2} position={[2, 2, 2]} />
            <Taco />
          </Canvas>
        </div>
      </div>
    </>
  );
}
