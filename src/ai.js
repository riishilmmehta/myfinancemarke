import { Boat } from './boat.js';

function normalizeAngle(angle) {
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

export class AIRacer {
  constructor(scene, color, course, seedOffset) {
    this.boat = new Boat(scene, color, false);
    this.course = course; // array of {x, z} points
    this.targetIndex = 1; // start aiming for the second beacon
    
    // Position at start
    if (this.course.length > 0) {
      this.boat.setPosition(this.course[0].x, this.course[0].z);
    }
    
    this.seed = seedOffset;
    this.time = 0;
    
    this.finished = false;
  }

  update(dt, globalTime) {
    if (this.finished || this.course.length === 0) {
      this.boat.update(dt, globalTime, { throttle: 0, steer: 0, boost: false, drift: false });
      return;
    }

    this.time += dt;

    const target = this.course[this.targetIndex];
    const dx = target.x - this.boat.x;
    const dz = target.z - this.boat.z;
    const distSq = dx * dx + dz * dz;

    // Check if reached target
    if (distSq < 1500) { // ~38 units radius
      this.targetIndex++;
      if (this.targetIndex >= this.course.length) {
        this.finished = true;
        this.boat.update(dt, globalTime, { throttle: 0, steer: 0, boost: false, drift: false });
        return;
      }
    }

    // Desired angle
    const desiredHeading = Math.atan2(dx, dz);
    let angleDiff = normalizeAngle(desiredHeading - this.boat.heading);

    // Add wobble
    const wobble = Math.sin(this.time * 0.5 + this.seed) * 0.3;
    angleDiff += wobble;

    // Proportional steering
    let steer = 0;
    if (angleDiff > 0.1) steer = 1;
    else if (angleDiff < -0.1) steer = -1;
    else steer = angleDiff * 10; // ease in

    // Smooth throttle, slow down slightly for tight turns
    let throttle = 1;
    if (Math.abs(angleDiff) > 1.0) throttle = 0.5;

    // Occasional boost
    const boost = (Math.sin(this.time * 0.2 + this.seed) > 0.8) && Math.abs(angleDiff) < 0.2;

    this.boat.update(dt, globalTime, { throttle, steer, boost, drift: false });
  }
}
