import { Euler, Matrix4, Quaternion, Vector3, type Vector3Tuple } from "three";

import type { SceneObjectTransform } from "./types";

const VIEWPORT_TO_PYHOPPER = new Matrix4().set(
  1, 0, 0, 0,
  0, 0, -1, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
);
const PYHOPPER_TO_VIEWPORT = VIEWPORT_TO_PYHOPPER.clone().invert();

function rowMajor(matrix: Matrix4): number[] {
  const elements = matrix.elements;
  return [
    elements[0], elements[4], elements[8], elements[12],
    elements[1], elements[5], elements[9], elements[13],
    elements[2], elements[6], elements[10], elements[14],
    elements[3], elements[7], elements[11], elements[15],
  ];
}

export function effectivePyhopperMatrix(
  position: Vector3Tuple,
  rotation: Vector3Tuple,
  scale: Vector3Tuple,
  pivot: Vector3Tuple,
): number[] {
  const viewportMatrix = new Matrix4()
    .compose(
      new Vector3(...position),
      new Quaternion().setFromEuler(new Euler(...rotation)),
      new Vector3(...scale),
    )
    .multiply(new Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2]));
  const pyhopperMatrix = VIEWPORT_TO_PYHOPPER.clone()
    .multiply(viewportMatrix)
    .multiply(PYHOPPER_TO_VIEWPORT);
  return rowMajor(pyhopperMatrix);
}

export function createSceneObjectTransform(pivot: Vector3Tuple): SceneObjectTransform {
  const position: Vector3Tuple = [...pivot];
  const rotation: Vector3Tuple = [0, 0, 0];
  const scale: Vector3Tuple = [1, 1, 1];
  return {
    matrix: effectivePyhopperMatrix(position, rotation, scale, pivot),
    pivot: [...pivot],
    position,
    rotation,
    scale,
  };
}

export function updateSceneObjectTransform(
  transform: SceneObjectTransform,
  position: Vector3Tuple,
  rotation: Vector3Tuple,
  scale: Vector3Tuple,
): SceneObjectTransform {
  return {
    ...transform,
    matrix: effectivePyhopperMatrix(position, rotation, scale, transform.pivot),
    position: [...position],
    rotation: [...rotation],
    scale: [...scale],
  };
}
