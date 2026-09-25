import test from "node:test";
import assert from "node:assert/strict";
import { createActiveClock } from "./clock.js";

test("active clock advances monotonically only while running", () => {
  let time = 100;
  const clock = createActiveClock(() => time);
  clock.start();
  time += 1500;
  assert.equal(clock.elapsed(), 1500);
  clock.stop();
  time += 8000;
  assert.equal(clock.elapsed(), 1500);
  clock.start();
  time += 500;
  assert.equal(clock.elapsed(), 2000);
});
test("active clock supports lifecycle stops and restored elapsed time", () => {
  let time = 0;
  const clock = createActiveClock(() => time);
  clock.setElapsed(60000);
  clock.start();
  time += 1200;
  clock.stop(); // hidden or page leave
  time += 50000;
  assert.equal(clock.elapsed(), 61200);
  clock.start(); // visible again
  time += 800;
  assert.equal(clock.elapsed(), 62000);
});
