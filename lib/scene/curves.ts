import type { Vector3Tuple } from "three";

import { pyhopperToViewport } from "./coordinates";
import type { SerializedAtom } from "./types";

function tuple(atom: unknown): Vector3Tuple | null {
  if (!atom || typeof atom !== "object") return null;
  const value = atom as Record<string, unknown>;
  if (typeof value.x !== "number" || typeof value.y !== "number" || typeof value.z !== "number") return null;
  return [value.x, value.y, value.z];
}

function planeAxes(plane: unknown): { origin: Vector3Tuple; x: Vector3Tuple; y: Vector3Tuple } | null {
  if (!plane || typeof plane !== "object") return null;
  const value = plane as Record<string, unknown>;
  const origin = tuple(value.origin);
  const normal = tuple(value.normal);
  const x = tuple(value.x_axis);
  if (!origin || !normal || !x) return null;
  const y: Vector3Tuple = [
    normal[1] * x[2] - normal[2] * x[1],
    normal[2] * x[0] - normal[0] * x[2],
    normal[0] * x[1] - normal[1] * x[0],
  ];
  return { origin, x, y };
}

function planeCurvePoints(
  plane: unknown,
  radius: number,
  start: number,
  end: number,
): Vector3Tuple[] {
  const axes = planeAxes(plane);
  if (!axes || radius <= 0) return [];
  const segments = Math.max(12, Math.ceil(Math.abs(end - start) / (Math.PI / 32)));
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = start + ((end - start) * index) / segments;
    const cos = Math.cos(angle) * radius;
    const sin = Math.sin(angle) * radius;
    return pyhopperToViewport([
      axes.origin[0] + axes.x[0] * cos + axes.y[0] * sin,
      axes.origin[1] + axes.x[1] * cos + axes.y[1] * sin,
      axes.origin[2] + axes.x[2] * cos + axes.y[2] * sin,
    ]);
  });
}

function planePoint(plane: unknown, x: number, y: number): Vector3Tuple | null {
  const axes = planeAxes(plane);
  if (!axes) return null;
  return pyhopperToViewport([
    axes.origin[0] + axes.x[0] * x + axes.y[0] * y,
    axes.origin[1] + axes.x[1] * x + axes.y[1] * y,
    axes.origin[2] + axes.x[2] * x + axes.y[2] * y,
  ]);
}

function openUniformKnots(pointCount: number, degree: number): number[] {
  const clampedDegree = Math.max(1, Math.min(degree, pointCount - 1));
  const knotCount = pointCount - clampedDegree + 1;
  const unique = Array.from({ length: knotCount }, (_, index) => index / (knotCount - 1));
  return unique.flatMap((knot, index) =>
    Array(index === 0 || index === knotCount - 1 ? clampedDegree + 1 : 1).fill(knot),
  );
}

function interpolatedNurbs(atom: SerializedAtom): SerializedAtom | null {
  if (!Array.isArray(atom.points)) return null;
  const points = atom.points as SerializedAtom[];
  if (points.length < 2) return null;
  if (points.length === 2) {
    return {
      type: "NurbsCurve",
      control_points: points,
      weights: [1, 1],
      knots: [0, 0, 1, 1],
      degree: 1,
    };
  }
  const controls: SerializedAtom[] = [points[0]];
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = tuple(points[index - 1] ?? points[index]);
    const start = tuple(points[index]);
    const end = tuple(points[index + 1]);
    const next = tuple(points[index + 2] ?? points[index + 1]);
    if (!previous || !start || !end || !next) return null;
    const point = (value: Vector3Tuple): SerializedAtom => ({ type: "Point3d", x: value[0], y: value[1], z: value[2] });
    controls.push(
      point(start.map((value, axis) => value + (end[axis] - previous[axis]) / 6) as Vector3Tuple),
      point(end.map((value, axis) => value + (start[axis] - next[axis]) / 6) as Vector3Tuple),
      points[index + 1],
    );
  }
  const segmentCount = points.length - 1;
  const knots = [0, 0, 0, 0];
  for (let index = 1; index < segmentCount; index += 1) knots.push(index / segmentCount, index / segmentCount, index / segmentCount);
  knots.push(1, 1, 1, 1);
  return { type: "NurbsCurve", control_points: controls, weights: controls.map(() => 1), knots, degree: 3 };
}

function basis(i: number, degree: number, parameter: number, knots: number[], lastControl: number): number {
  if (degree === 0) {
    if (parameter === knots[knots.length - 1]) return i === lastControl ? 1 : 0;
    return knots[i] <= parameter && parameter < knots[i + 1] ? 1 : 0;
  }
  const leftDenominator = knots[i + degree] - knots[i];
  const rightDenominator = knots[i + degree + 1] - knots[i + 1];
  const left = leftDenominator ? ((parameter - knots[i]) / leftDenominator) * basis(i, degree - 1, parameter, knots, lastControl) : 0;
  const right = rightDenominator ? ((knots[i + degree + 1] - parameter) / rightDenominator) * basis(i + 1, degree - 1, parameter, knots, lastControl) : 0;
  return left + right;
}

function nurbsPoints(atom: SerializedAtom): Vector3Tuple[] {
  if (!Array.isArray(atom.control_points) || !Array.isArray(atom.knots) || typeof atom.degree !== "number") return [];
  const controls = atom.control_points.map(tuple);
  if (!controls.every((point): point is Vector3Tuple => point !== null)) return [];
  const knots = atom.knots.filter((knot): knot is number => typeof knot === "number");
  const weights = Array.isArray(atom.weights)
    ? atom.weights.map((weight) => (typeof weight === "number" ? weight : 1))
    : controls.map(() => 1);
  const degree = atom.degree;
  const start = knots[degree];
  const end = knots[controls.length];
  if (start === undefined || end === undefined) return [];
  const samples = Math.max(32, controls.length * 12);

  return Array.from({ length: samples + 1 }, (_, sampleIndex) => {
    const parameter = start + ((end - start) * sampleIndex) / samples;
    let denominator = 0;
    const point: Vector3Tuple = [0, 0, 0];
    controls.forEach((control, index) => {
      const weightedBasis = basis(index, degree, parameter, knots, controls.length - 1) * (weights[index] ?? 1);
      denominator += weightedBasis;
      point[0] += control[0] * weightedBasis;
      point[1] += control[1] * weightedBasis;
      point[2] += control[2] * weightedBasis;
    });
    return pyhopperToViewport(
      denominator ? [point[0] / denominator, point[1] / denominator, point[2] / denominator] : point,
    );
  });
}

function serializedPoints(value: unknown): Vector3Tuple[] | null {
  if (!Array.isArray(value)) return null;
  const points = value.map(tuple);
  return points.every((point): point is Vector3Tuple => point !== null)
    ? points.map(pyhopperToViewport)
    : null;
}

export function atomCurveControlPoints(atom: SerializedAtom): Vector3Tuple[] | null {
  if (atom.type === "InterpolatedCurve") return serializedPoints(atom.points);
  if (atom.type === "ControlPointCurve") return serializedPoints(atom.control_points);
  if (atom.type === "NurbsCurve") return serializedPoints(atom.control_points);
  if ((atom.type === "Circle" || atom.type === "Arc") && typeof atom.radius === "number") {
    const center = planePoint(atom.plane, 0, 0);
    const start = planePoint(atom.plane, atom.radius, 0);
    if (!center || !start) return null;
    if (atom.type === "Circle") return [center, start];
    const angle = atom.angle as Record<string, unknown> | undefined;
    const end = typeof angle?.end === "number"
      ? planePoint(atom.plane, Math.cos(angle.end) * atom.radius, Math.sin(angle.end) * atom.radius)
      : null;
    return end ? [center, start, end] : null;
  }
  if (atom.type === "Ellipse" && typeof atom.radius_x === "number" && typeof atom.radius_y === "number") {
    const center = planePoint(atom.plane, 0, 0);
    const x = planePoint(atom.plane, atom.radius_x, 0);
    const y = planePoint(atom.plane, 0, atom.radius_y);
    return center && x && y ? [center, x, y] : null;
  }
  if (atom.type === "Rectangle" && typeof atom.x_size === "number" && typeof atom.y_size === "number") {
    const a = planePoint(atom.plane, -atom.x_size / 2, -atom.y_size / 2);
    const b = planePoint(atom.plane, atom.x_size / 2, atom.y_size / 2);
    return a && b ? [a, b] : null;
  }
  return null;
}

export function atomCurvePoints(atom: SerializedAtom): Vector3Tuple[] | null {
  if (atom.type === "Circle" && typeof atom.radius === "number") {
    return planeCurvePoints(atom.plane, atom.radius, 0, Math.PI * 2);
  }
  if (atom.type === "Arc" && typeof atom.radius === "number" && atom.angle && typeof atom.angle === "object") {
    const angle = atom.angle as Record<string, unknown>;
    if (typeof angle.start === "number" && typeof angle.end === "number") {
      return planeCurvePoints(atom.plane, atom.radius, angle.start, angle.end);
    }
  }
  if (atom.type === "NurbsCurve") return nurbsPoints(atom);
  if (atom.type === "InterpolatedCurve") {
    const nurbs = interpolatedNurbs(atom);
    return nurbs ? nurbsPoints(nurbs) : null;
  }
  if (atom.type === "ControlPointCurve" && Array.isArray(atom.control_points)) {
    return nurbsPoints({
      type: "NurbsCurve",
      control_points: atom.control_points,
      weights: atom.control_points.map(() => 1),
      knots: openUniformKnots(atom.control_points.length, typeof atom.degree === "number" ? atom.degree : 3),
      degree: Math.max(1, Math.min(typeof atom.degree === "number" ? atom.degree : 3, atom.control_points.length - 1)),
    });
  }
  if (atom.type === "Ellipse" && typeof atom.radius_x === "number" && typeof atom.radius_y === "number") {
    const radiusX = atom.radius_x;
    const radiusY = atom.radius_y;
    const segments = 64;
    const points = Array.from({ length: segments + 1 }, (_, index) => {
      const angle = (index / segments) * Math.PI * 2;
      return planePoint(atom.plane, Math.cos(angle) * radiusX, Math.sin(angle) * radiusY);
    });
    return points.every((point): point is Vector3Tuple => point !== null) ? points : null;
  }
  if (atom.type === "Rectangle" && typeof atom.x_size === "number" && typeof atom.y_size === "number") {
    const xSize = atom.x_size;
    const ySize = atom.y_size;
    const points = [
      planePoint(atom.plane, -xSize / 2, -ySize / 2),
      planePoint(atom.plane, xSize / 2, -ySize / 2),
      planePoint(atom.plane, xSize / 2, ySize / 2),
      planePoint(atom.plane, -xSize / 2, ySize / 2),
      planePoint(atom.plane, -xSize / 2, -ySize / 2),
    ];
    return points.every((point): point is Vector3Tuple => point !== null) ? points : null;
  }
  return null;
}
