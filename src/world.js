import * as THREE from 'three';

export class World {
  constructor(scene) {
    this.scene = scene;
    
    // Beacon positions for the race course
    this.course = [
      { x: 0, z: -200 },
      { x: 300, z: -500 },
      { x: 800, z: -400 },
      { x: 1000, z: 0 },
      { x: 600, z: 400 },
      { x: 0, z: 600 },
      { x: -500, z: 300 },
      { x: -200, z: 0 },
    ];
    
    this.beacons = [];
    this.createBeacons();
  }

  createBeacons() {
    const poleGeom = new THREE.CylinderGeometry(1, 1, 10, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    const lampGeom = new THREE.SphereGeometry(3, 8, 8);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // active color
    const lampInactiveMat = new THREE.MeshBasicMaterial({ color: 0x440000 }); // inactive
    
    const ringGeom = new THREE.TorusGeometry(38, 1, 8, 24);
    ringGeom.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
    const ringInactiveMat = new THREE.MeshBasicMaterial({ color: 0x440000, transparent: true, opacity: 0.2 });

    for (let i = 0; i < this.course.length; i++) {
      const pos = this.course[i];
      const group = new THREE.Group();
      
      const pole = new THREE.Mesh(poleGeom, poleMat);
      pole.position.y = 5;
      
      const lamp = new THREE.Mesh(lampGeom, lampInactiveMat);
      lamp.position.y = 10;
      
      const ring = new THREE.Mesh(ringGeom, ringInactiveMat);
      ring.position.y = 0; // Float on water

      group.add(pole);
      group.add(lamp);
      group.add(ring);
      
      group.position.set(pos.x, 0, pos.z);
      
      this.beacons.push({
        group,
        lamp,
        ring,
        lampActiveMat: lampMat,
        lampInactiveMat: lampInactiveMat,
        ringActiveMat: ringMat,
        ringInactiveMat: ringInactiveMat
      });
      
      this.scene.add(group);
    }
  }

  setActiveBeacon(index) {
    for (let i = 0; i < this.beacons.length; i++) {
      const b = this.beacons[i];
      if (i === index) {
        b.lamp.material = b.lampActiveMat;
        b.ring.material = b.ringActiveMat;
        // Optionally add a point light
      } else {
        b.lamp.material = b.lampInactiveMat;
        b.ring.material = b.ringInactiveMat;
      }
    }
  }

  update(time, waveHeightFn) {
    // Make rings and poles bob with waves
    for (let i = 0; i < this.course.length; i++) {
      const b = this.beacons[i];
      const pos = this.course[i];
      const y = waveHeightFn(pos.x, pos.z, time);
      b.group.position.y = y;
    }
  }
}
