import * as THREE from 'three';
import { waveHeight, waveSlope, clamp, sign } from './utils.js';

export class Boat {
  constructor(scene, color = 0xffffff, isPlayer = false) {
    this.scene = scene;
    this.isPlayer = isPlayer;
    
    // Physics state
    this.x = 0;
    this.z = 0;
    this.y = 0;
    this.vy = 0;
    this.heading = 0; // angle in radians
    this.speed = 0;
    
    this.airborne = false;
    this.prevTargetY = 0;
    this.boostAmount = 100; // 0 to 100
    this.driftTime = 0;

    // Tuning
    this.maxSpeed = 40;
    this.accel = 20;
    this.brakeAccel = 15;
    this.drag = 0.98; // per second drag, will be applied via pow in update
    this.turnRate = 1.5;

    this.createMesh(color);
  }

  createMesh(color) {
    this.group = new THREE.Group();
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.2,
      metalness: 0.1,
      flatShading: true,
    });

    // Hull using ExtrudeGeometry
    const shape = new THREE.Shape();
    shape.moveTo(0, 2); // bow
    shape.lineTo(-1, -2); // port stern
    shape.lineTo(1, -2); // starboard stern
    shape.lineTo(0, 2);

    const extrudeSettings = { depth: 1, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.1, bevelThickness: 0.1 };
    const hullGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center it
    hullGeom.computeBoundingBox();
    const centerOffset = -0.5 * (hullGeom.boundingBox.max.z - hullGeom.boundingBox.min.z);
    hullGeom.translate(0, 0, centerOffset);
    // Rotate to lie flat and face -Z
    hullGeom.rotateX(Math.PI / 2);
    // Scale up
    hullGeom.scale(1.5, 1, 1.5);

    this.hull = new THREE.Mesh(hullGeom, material);
    this.group.add(this.hull);

    // Cabin
    const cabinGeom = new THREE.BoxGeometry(1.5, 0.8, 2);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x222222, flatShading: true });
    this.cabin = new THREE.Mesh(cabinGeom, cabinMat);
    this.cabin.position.set(0, 0.6, 0.5);
    this.group.add(this.cabin);

    this.scene.add(this.group);
  }

  update(dt, time, input) {
    // 1. Forward motion
    const { throttle, steer, boost, drift } = input;
    
    let currentMaxSpeed = this.maxSpeed;
    const boosting = boost && this.boostAmount > 0;
    
    if (boosting) {
      currentMaxSpeed *= 1.32;
      this.boostAmount -= 20 * dt; // Consume boost
    }

    if (throttle !== 0) {
      this.speed += throttle * this.accel * dt;
    } else {
      this.speed -= sign(this.speed) * this.brakeAccel * dt;
      if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }

    this.speed = clamp(this.speed, -this.maxSpeed * 0.35, currentMaxSpeed);
    
    // Apply drag
    this.speed *= Math.pow(this.drag, dt * 60);

    // 2. Steering
    const speedFactor = clamp(Math.abs(this.speed) / this.maxSpeed, 0.18, 1);
    let currentTurnRate = this.turnRate;
    
    let lean = 0;
    if (drift && Math.abs(this.speed) > 10) {
      currentTurnRate *= 1.5;
      this.driftTime += dt;
      lean = steer * -0.5; // Lean into the drift
      if (this.driftTime > 0.5 && !boosting) {
        this.boostAmount = Math.min(100, this.boostAmount + 30 * dt); // Refill boost
      }
    } else {
      this.driftTime = 0;
    }

    let turn = steer * currentTurnRate * speedFactor * dt;
    // Reverse steering if going backwards
    if (this.speed < 0) turn = -turn;
    
    this.heading += turn;

    // 3. Move X/Z
    if (!this.airborne) {
      this.x += Math.sin(this.heading) * this.speed * dt;
      this.z += Math.cos(this.heading) * this.speed * dt;
    } else {
      // Keep momentum while airborne
      this.x += Math.sin(this.heading) * this.speed * dt;
      this.z += Math.cos(this.heading) * this.speed * dt;
    }

    // 4. Vertical motion & Jumping
    const targetY = waveHeight(this.x, this.z, time);
    const climbRate = (targetY - this.prevTargetY) / dt;
    this.prevTargetY = targetY;

    if (!this.airborne) {
      if (Math.abs(this.speed) > this.maxSpeed * 0.5 && climbRate > 3) {
        this.airborne = true;
        this.vy = clamp(climbRate * 0.32 + Math.abs(this.speed) * 0.045, 2, 8.5);
      } else {
        this.y = targetY;
        this.vy = 0;
      }
    } else {
      this.vy -= 17 * dt; // Gravity
      this.y += this.vy * dt;

      if (this.y < targetY) {
        // Land
        this.airborne = false;
        this.y = targetY;
        // Big jump reward
        if (this.vy < -5) {
          this.boostAmount = Math.min(100, this.boostAmount + 25);
        }
      }
    }

    // 5. Pitch and Roll
    let pitch = 0;
    let roll = lean;

    if (!this.airborne) {
      const slope = waveSlope(this.x, this.z, time);
      // Project slope onto boat's axes
      const s = Math.sin(this.heading);
      const c = Math.cos(this.heading);
      
      // forward slope (pitch)
      const forwardSlope = slope.dx * s + slope.dz * c;
      // right slope (roll)
      const rightSlope = slope.dx * c - slope.dz * s;

      pitch = -Math.atan(forwardSlope);
      roll += Math.atan(rightSlope);
    } else {
      // Level out slightly when airborne
      pitch = clamp(this.vy * 0.05, -0.5, 0.5);
    }

    // Apply transforms
    this.group.position.set(this.x, this.y, this.z);
    
    // Euler order YXZ so heading is applied first, then pitch and roll relative to heading
    this.group.rotation.set(0, 0, 0); 
    this.group.rotateY(this.heading);
    this.group.rotateX(pitch);
    this.group.rotateZ(roll);
  }

  // Used by AI to navigate
  setPosition(x, z) {
    this.x = x;
    this.z = z;
  }
}
