import type { Vector3Tuple } from "three";

import { viewportPointAtom } from "@/lib/scene/scene";
import { viewportToPyhopper } from "@/lib/scene/coordinates";
import type { SerializedAtom } from "@/lib/scene/types";

const TWO_PI = Math.PI * 2;

function subtract(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function distance(a: Vector3Tuple, b: Vector3Tuple): number {
  const delta = subtract(a, b);
  return Math.hypot(delta[0], delta[1], delta[2]);
}

function unitViewportDirection(from: Vector3Tuple, to: Vector3Tuple): Vector3Tuple {
  const delta = subtract(to, from);
  const length = Math.hypot(delta[0], delta[1], delta[2]) || 1;
  return [delta[0] / length, delta[1] / length, delta[2] / length];
}

function vectorAtom(vector: Vector3Tuple): SerializedAtom {
  const [x, y, z] = viewportToPyhopper(vector);
  return { type: "Vector3d", x, y, z };
}

function planeAtom(origin: Vector3Tuple, xDirection: Vector3Tuple = [1, 0, 0]): SerializedAtom {
  return {
    type: "Plane",
    origin: viewportPointAtom(origin),
    normal: { type: "Vector3d", x: 0, y: 0, z: 1 },
    x_axis: vectorAtom(xDirection),
  };
}

export function circleAtom(center: Vector3Tuple, radiusPoint: Vector3Tuple): SerializedAtom {
  return {
    type: "Circle",
    plane: planeAtom(center),
    radius: distance(center, radiusPoint),
  };
}

export function arcAtom(
  center: Vector3Tuple,
  radiusPoint: Vector3Tuple,
  anglePoint: Vector3Tuple,
): SerializedAtom {
  const start = viewportToPyhopper(unitViewportDirection(center, radiusPoint));
  const end = viewportToPyhopper(unitViewportDirection(center, anglePoint));
  let sweep = Math.atan2(start[0] * end[1] - start[1] * end[0], start[0] * end[0] + start[1] * end[1]);
  if (sweep <= 0) sweep += TWO_PI;

  return {
    type: "Arc",
    plane: planeAtom(center, unitViewportDirection(center, radiusPoint)),
    radius: distance(center, radiusPoint),
    angle: { type: "Interval", start: 0, end: sweep },
  };
}

export function rectangleAtom(a: Vector3Tuple, b: Vector3Tuple): SerializedAtom {
  const center: Vector3Tuple = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return {
    type: "Rectangle",
    plane: planeAtom(center),
    x_size: Math.abs(b[0] - a[0]),
    y_size: Math.abs(b[2] - a[2]) || Math.abs(b[1] - a[1]),
  };
}

export function interpolatedCurveAtom(points: Vector3Tuple[]): SerializedAtom {
  return {
    type: "InterpolatedCurve",
    points: points.map(viewportPointAtom),
    degree: 3,
  };
}

export function controlPointCurveAtom(points: Vector3Tuple[]): SerializedAtom {
  return {
    type: "ControlPointCurve",
    control_points: points.map(viewportPointAtom),
    degree: 3,
  };
}

export function ellipseAtom(
  center: Vector3Tuple,
  axisPoint: Vector3Tuple,
  radiusPoint: Vector3Tuple,
): SerializedAtom {
  const xAxis = unitViewportDirection(center, axisPoint);
  const radiusX = distance(center, axisPoint);
  const radiusY = distance(center, radiusPoint);

  return {
    type: "Ellipse",
    plane: planeAtom(center, xAxis),
    radius_x: radiusX,
    radius_y: radiusY,
  };
}
