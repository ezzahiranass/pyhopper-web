import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { Vector3Tuple } from "three";

import { ViewportPoint } from "@/components/molecules/ViewportPoint";

type ViewportPolylineProps = {
  color: string;
  lineWidth?: number;
  hitTarget?: boolean;
  opacity?: number;
  points: Vector3Tuple[];
  markerPoints?: Vector3Tuple[];
  constructionPoints?: Vector3Tuple[];
  pointRadius?: number;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onContextMenu?: (event: ThreeEvent<MouseEvent>) => void;
  markerKeyPrefix?: string;
  onMarkerClick?: (key: string, event: ThreeEvent<MouseEvent>) => void;
  selectedMarkerKeys?: string[];
  markerHoverColor?: string;
  markerSelectedColor?: string;
};

export function ViewportPolyline({
  color,
  hitTarget = false,
  lineWidth = 2,
  onClick,
  onContextMenu,
  opacity = 1,
  points,
  markerPoints = points,
  constructionPoints = [],
  pointRadius = 0.06,
  markerHoverColor,
  markerKeyPrefix = "",
  markerSelectedColor,
  onMarkerClick,
  selectedMarkerKeys = [],
}: ViewportPolylineProps) {
  return (
    <group onClick={onClick} onContextMenu={onContextMenu}>
      {points.length > 1 ? (
        <>
          <Line color={color} lineWidth={lineWidth} opacity={opacity} points={points} transparent={opacity < 1} />
          {hitTarget ? (
            <Line
              color="#ffffff"
              depthWrite={false}
              lineWidth={14}
              opacity={0}
              points={points}
              transparent
            />
          ) : null}
        </>
      ) : null}
      {constructionPoints.length > 1 ? (
        <Line
          color={color}
          dashed
          dashScale={1}
          dashSize={0.12}
          gapSize={0.08}
          lineWidth={1}
          opacity={Math.min(opacity, 0.72)}
          points={constructionPoints}
          transparent
        />
      ) : null}
      {markerPoints.map((point, index) => (
        <ViewportPoint
          color={color}
          hitTarget={hitTarget}
          hoverColor={markerHoverColor}
          key={index}
          onClick={
            onMarkerClick
              ? (event) => {
                  event.stopPropagation();
                  onMarkerClick(`${markerKeyPrefix}${index}`, event);
                }
              : undefined
          }
          opacity={opacity}
          position={point}
          radius={pointRadius}
          selected={selectedMarkerKeys.includes(`${markerKeyPrefix}${index}`)}
          selectedColor={markerSelectedColor}
        />
      ))}
    </group>
  );
}
