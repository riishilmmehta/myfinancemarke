import * as THREE from 'three';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    
    this.modes = [
      { name: 'chase', distance: 30, height: 10, lookHeight: 2, smooth: 4 },
      { name: 'wide', distance: 60, height: 25, lookHeight: 0, smooth: 2 },
      { name: 'helm', distance: 1, height: 3, lookHeight: 2, smooth: 8 }
    ];
    
    this.currentModeIndex = 0;
    
    // Set initial position out of the way
    this.camera.position.set(0, 50, 50);
  }

  toggleMode() {
    this.currentModeIndex = (this.currentModeIndex + 1) % this.modes.length;
  }

  update(dt, target) {
    const mode = this.modes[this.currentModeIndex];
    
    // Calculate desired position
    const s = Math.sin(target.heading);
    const c = Math.cos(target.heading);
    
    const desiredX = target.x - s * mode.distance;
    const desiredZ = target.z - c * mode.distance;
    const desiredY = target.y + mode.height;
    
    const desired = new THREE.Vector3(desiredX, desiredY, desiredZ);
    
    // Frame-rate-independent lerp
    // If smooth is 6, at 60fps (dt=0.016), t = 1 - Math.pow(0.0025, 0.016) = ~0.09
    const t = 1 - Math.pow(0.0025, dt * (mode.smooth / 6));
    
    // Snap if very far away (e.g., reset or start)
    if (this.camera.position.distanceTo(desired) > 200) {
      this.camera.position.copy(desired);
    } else {
      this.camera.position.lerp(desired, t);
    }
    
    // Look at target
    const lookTarget = new THREE.Vector3(target.x, target.y + mode.lookHeight, target.z);
    
    // We also need to smooth the lookAt target to avoid jitter when boat pitches quickly
    if (!this.currentLookTarget) {
      this.currentLookTarget = lookTarget.clone();
    } else {
      this.currentLookTarget.lerp(lookTarget, t);
    }
    
    this.camera.lookAt(this.currentLookTarget);
  }
}
