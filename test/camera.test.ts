import assert from "node:assert/strict";
import test from "node:test";
import { invertPose, orbitPose } from "../src/lib/crossview/camera.ts";

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
