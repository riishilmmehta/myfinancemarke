import { Boat } from './boat.js';
import { lerp } from './utils.js';

export class GhostSystem {
  constructor(scene) {
    this.scene = scene;
    
    // Transparent blueish ghost boat
    this.boat = new Boat(scene, 0x00ccff, false);
    this.boat.group.children.forEach(mesh => {
      mesh.material.transparent = true;
      mesh.material.opacity = 0.4;
      mesh.material.depthWrite = false;
    });
    
    this.boat.group.visible = false;

    this.currentRecording = [];
    this.loadedGhost = [];
    
    this.loadGhost();
  }

  loadGhost() {
    try {
      const saved = localStorage.getItem('aquarift_ghost');
      if (saved) {
        this.loadedGhost = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load ghost", e);
    }
  }

  saveGhost() {
    if (this.currentRecording.length > 0) {
      try {
        localStorage.setItem('aquarift_ghost', JSON.stringify(this.currentRecording));
        this.loadedGhost = this.currentRecording;
      } catch (e) {
        console.warn("Failed to save ghost", e);
      }
    }
  }

  startRecording() {
    this.currentRecording = [];
    if (this.loadedGhost.length > 0) {
      this.boat.group.visible = true;
    }
  }

  stopRecording() {
    this.boat.group.visible = false;
  }

  recordFrame(t, boat) {
    this.currentRecording.push({
      t,
      x: boat.x,
      y: boat.y,
      z: boat.z,
      heading: boat.heading,
      pitch: boat.group.rotation.x,
      roll: boat.group.rotation.z
    });
  }

  updateGhost(t) {
    if (this.loadedGhost.length === 0) return;
    
    // Find samples using binary search
    let lo = 0;
    let hi = this.loadedGhost.length - 1;
    
    if (t <= this.loadedGhost[lo].t) {
      this.applySample(this.loadedGhost[lo]);
      return;
    }
    if (t >= this.loadedGhost[hi].t) {
      this.applySample(this.loadedGhost[hi]);
      return;
    }

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (this.loadedGhost[mid].t < t) {
        lo = mid + 1;
      } else if (this.loadedGhost[mid].t > t) {
        hi = mid - 1;
      } else {
        this.applySample(this.loadedGhost[mid]);
        return;
      }
    }

    // lo is now the index of the first sample > t
    // hi is lo - 1 (sample < t)
    const a = this.loadedGhost[hi];
    const b = this.loadedGhost[lo];
    
    const f = (t - a.t) / (b.t - a.t);
    
    this.boat.group.position.set(
      lerp(a.x, b.x, f),
      lerp(a.y, b.y, f),
      lerp(a.z, b.z, f)
    );
    
    // Angle lerp needs to handle wrap-around, but for simplicity assuming small frame deltas
    this.boat.group.rotation.set(0,0,0);
    this.boat.group.rotateY(lerp(a.heading, b.heading, f));
    this.boat.group.rotateX(lerp(a.pitch, b.pitch, f));
    this.boat.group.rotateZ(lerp(a.roll, b.roll, f));
  }

  applySample(s) {
    this.boat.group.position.set(s.x, s.y, s.z);
    this.boat.group.rotation.set(0,0,0);
    this.boat.group.rotateY(s.heading);
    this.boat.group.rotateX(s.pitch);
    this.boat.group.rotateZ(s.roll);
  }
}
