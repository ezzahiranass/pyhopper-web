"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Box3,
  CanvasTexture,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  Vector3,
} from "three";
import type { RenderManifest } from "@/components/flow/types";

type GeneratedGlbProps = {
  renderManifest?: RenderManifest | null;
  selectedNodeIds: string[];
  url: string;
};

export function GeneratedGlb({ renderManifest, selectedNodeIds, url }: GeneratedGlbProps) {
  const { scene } = useGLTF(url);
  const pointMaterial = useMemo(() => {
    const buildCrossTexture = (strokeColor: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;

      const context = canvas.getContext("2d");
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = strokeColor;
        context.lineWidth = 8;
        context.lineCap = "round";

        context.beginPath();
        context.moveTo(14, 14);
        context.lineTo(50, 50);
        context.moveTo(50, 14);
        context.lineTo(14, 50);
        context.stroke();
      }

      const texture = new CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    };

    const redCrossTexture = buildCrossTexture("#d63d32");
    const greenCrossTexture = buildCrossTexture("#2ca86c");

    return {
      defaultMaterial: new PointsMaterial({
        alphaTest: 0.2,
        color: "#d63d32",
        map: redCrossTexture,
        size: 18,
        sizeAttenuation: false,
        transparent: true,
      }),
      selectedMaterial: new PointsMaterial({
        alphaTest: 0.2,
        color: "#2ca86c",
        map: greenCrossTexture,
        size: 18,
        sizeAttenuation: false,
        transparent: true,
      }),
    };
  }, []);
  const lineMaterials = useMemo(
    () => ({
      defaultMaterial: new LineBasicMaterial({ color: "#d63d32" }),
      selectedMaterial: new LineBasicMaterial({ color: "#2ca86c" }),
    }),
    [],
  );
  const meshMaterials = useMemo(
    () => ({
      defaultMaterial: new MeshStandardMaterial({
        color: "#d63d32",
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: 2, // DoubleSide
      }),
      selectedMaterial: new MeshStandardMaterial({
        color: "#2ca86c",
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: 2, // DoubleSide
      }),
    }),
    [],
  );
  const selectedObjectNames = useMemo(() => {
    if (!renderManifest || !selectedNodeIds.length) {
      return new Set<string>();
    }

    const selectedNodeIdSet = new Set(selectedNodeIds);
    return new Set(
      renderManifest.objects
        .filter((entry) => selectedNodeIdSet.has(entry.nodeId))
        .map((entry) => entry.objectName),
    );
  }, [renderManifest, selectedNodeIds]);
  const sceneClone = useMemo(() => {
    const clone = scene.clone();

    clone.traverse((object) => {
      const isSelected = selectedObjectNames.has(object.name);
      if (object instanceof Points) {
        object.material = (isSelected ? pointMaterial.selectedMaterial : pointMaterial.defaultMaterial).clone();
      } else if (object instanceof Line || object instanceof LineSegments) {
        object.material = (isSelected ? lineMaterials.selectedMaterial : lineMaterials.defaultMaterial).clone();
      } else if (object instanceof Mesh) {
        object.material = (isSelected ? meshMaterials.selectedMaterial : meshMaterials.defaultMaterial).clone();
      }
    });

    return clone;
  }, [lineMaterials, meshMaterials, pointMaterial, scene, selectedObjectNames]);

  useEffect(() => {
    const bounds = new Box3().setFromObject(sceneClone);
    const size = new Vector3();
    const center = new Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);

    console.log("GeneratedGlb loaded:", {
      url,
      center: center.toArray(),
      size: size.toArray(),
    });
  }, [sceneClone, url]);

  useEffect(() => {
    return () => {
      lineMaterials.defaultMaterial.dispose();
      lineMaterials.selectedMaterial.dispose();
      meshMaterials.defaultMaterial.dispose();
      meshMaterials.selectedMaterial.dispose();
      pointMaterial.defaultMaterial.dispose();
      pointMaterial.defaultMaterial.map?.dispose();
      pointMaterial.selectedMaterial.dispose();
      pointMaterial.selectedMaterial.map?.dispose();
    };
  }, [lineMaterials, meshMaterials, pointMaterial]);

  return <primitive object={sceneClone} />;
}
