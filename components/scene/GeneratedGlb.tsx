"use client";

import { useGLTF } from "@react-three/drei";

type GeneratedGlbProps = {
  url: string;
};

export function GeneratedGlb({ url }: GeneratedGlbProps) {
  const { scene } = useGLTF(url);

  return <primitive object={scene.clone()} />;
}
