import assert from "node:assert/strict";
import test from "node:test";
import { invertPose, orbitPose, sourceAim } from "../src/lib/crossview/camera.ts";

test("the default camera pose keeps the source view", () => {
  const cameraToWorld = orbitPose(0, 0, 1, [0, 0, 1]);
  const worldToCamera = invertPose(cameraToWorld);
  const expected = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
  worldToCamera.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-6));
});

test("the default preview aim matches the source-axis aim used by the workflow", () => {
  const pivot = [0.2, -0.1, 2] as const;
  const worldToCamera = invertPose(orbitPose(0, 0, 1, pivot, sourceAim(pivot)));
  const identity = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
  worldToCamera.forEach((value, index) => assert.ok(Math.abs(value - identity[index]) < 1e-6));
});
