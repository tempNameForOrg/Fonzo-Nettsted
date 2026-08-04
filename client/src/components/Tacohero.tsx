import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";

function Taco(){
  const tacoRef = useRef(null);

  // Anything here will be run every Frame
  useFrame(() => {
    tacoRef.current.rotation.x += 0.005;
    tacoRef.current.rotation.y += 0.005;
    tacoRef.current.rotation.z += 0.005;
  });

  return (
    <>
      <mesh ref={tacoRef}>
        <boxGeometry args={[2,2,2]} />
        <meshBasicMaterial color={"green"} /> 
      </mesh>
    </>


  );
}

export default function TacoHero() {
return (
  <>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="w-100 bg-cream">
        <Canvas>
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