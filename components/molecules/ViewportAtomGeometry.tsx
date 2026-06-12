import type { ThreeEvent } from "@react-three/fiber";

import { ViewportPoint } from "@/components/molecules/ViewportPoint";
import { ViewportPolyline } from "@/components/molecules/ViewportPolyline";
import { atomCurveControlPoints, atomCurvePoints } from "@/lib/scene/curves";
import { atomPoint, atomPolyline } from "@/lib/scene/scene";
import type { SerializedAtom } from "@/lib/scene/types";

type ViewportAtomGeometryProps = {
  atom: SerializedAtom;
  color: string;
  ghost?: boolean;
  hitTarget?: boolean;
  showConstruction?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onContextMenu?: (event: ThreeEvent<MouseEvent>) => void;
  atomIndex?: number;
  editMode?: boolean;
  markerHoverColor?: string;
  markerSelectedColor?: string;
  onSelectPoint?: (key: string) => void;
  selectedPointKeys?: string[];
  opacity?: number;
};

export function ViewportAtomGeometry({
  atom,
  color,
  ghost = false,
  hitTarget = false,
  showConstruction = false,
  onClick,
  onContextMenu,
  atomIndex = 0,
  editMode = false,
  markerHoverColor,
  markerSelectedColor,
  onSelectPoint,
  selectedPointKeys = [],
  opacity = 1,
}: ViewportAtomGeometryProps) {
  const point = atomPoint(atom);
  const polylinePoints = atomPolyline(atom);
  const curvePoints = atomCurvePoints(atom);
  const curveControlPoints = atomCurveControlPoints(atom) ?? [];
  const points = polylinePoints ?? curvePoints;
  if (point) {
    return (
      <ViewportPoint
        color={color}
        hitTarget={hitTarget}
        onClick={onClick}
        onContextMenu={onContextMenu}
        opacity={ghost ? Math.min(opacity, 0.55) : opacity}
        position={point}
        radius={ghost ? 0.045 : 0.06}
      />
    );
  }
  if (points) {
    return (
      <ViewportPolyline
        color={color}
        hitTarget={hitTarget}
        lineWidth={ghost ? 1 : 2}
        constructionPoints={
          showConstruction
            ? curvePoints
              ? curveControlPoints
              : ghost
                ? polylinePoints ?? []
                : []
            : []
        }
        markerPoints={showConstruction ? polylinePoints ?? curveControlPoints : []}
        markerHoverColor={editMode ? markerHoverColor : undefined}
        markerKeyPrefix={`${atomIndex}:`}
        markerSelectedColor={markerSelectedColor}
        onMarkerClick={editMode && onSelectPoint ? (key) => onSelectPoint(key) : undefined}
        onClick={onClick}
        onContextMenu={onContextMenu}
        opacity={ghost ? Math.min(opacity, 0.48) : opacity}
        points={points}
        pointRadius={ghost ? 0.035 : 0.06}
        selectedMarkerKeys={selectedPointKeys}
      />
    );
  }
  return null;
}
