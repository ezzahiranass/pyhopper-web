import type { Vector3Tuple } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useState } from "react";

type ViewportPointProps = {
  color: string;
  opacity?: number;
  position: Vector3Tuple;
  radius?: number;
  hitTarget?: boolean;
  hoverColor?: string;
  selected?: boolean;
  selectedColor?: string;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onContextMenu?: (event: ThreeEvent<MouseEvent>) => void;
};

export function ViewportPoint({
  color,
  hitTarget = false,
  hoverColor,
  onClick,
  onContextMenu,
  opacity = 1,
  position,
  radius = 0.06,
  selected = false,
  selectedColor,
}: ViewportPointProps) {
  const [hovered, setHovered] = useState(false);
  const displayColor = selected && selectedColor ? selectedColor : hovered && hoverColor ? hoverColor : color;
  return (
    <group
      onClick={onClick}
      onContextMenu={onContextMenu}
      onPointerOut={() => setHovered(false)}
      onPointerOver={(event) => {
        if (!hoverColor) return;
        event.stopPropagation();
        setHovered(true);
      }}
      position={position}
    >
      <mesh>
        <sphereGeometry args={[radius, 10, 10]} />
        <meshBasicMaterial color={displayColor} opacity={opacity} transparent={opacity < 1} />
      </mesh>
      {hitTarget ? (
        <mesh>
          <sphereGeometry args={[Math.max(radius * 3, 0.18), 8, 8]} />
          <meshBasicMaterial depthWrite={false} opacity={0} transparent />
        </mesh>
      ) : null}
    </group>
  );
}
