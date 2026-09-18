import * as THREE from 'three';
import { waveHeight } from './utils.js';

export class Ocean {
  constructor(scene) {
    // 200x200 plane with 64x64 segments
    const geometry = new THREE.PlaneGeometry(300, 300, 64, 64);
    geometry.rotateX(-Math.PI / 2); // Lay flat
    
    // Convert to non-indexed for faceted look
    this.geometry = geometry.toNonIndexed();
    
    // Save original Y positions (which are 0) just in case, though we compute from world X/Z
    this.positionAttribute = this.geometry.attributes.position;

    const material = new THREE.MeshStandardMaterial({
      color: 0x006699,
      roughness: 0.1,
      metalness: 0.8,
      flatShading: true,
      transparent: true,
      opacity: 0.9,
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    scene.add(this.mesh);
  }

  update(time, camera) {
    // Re-center mesh under camera on an 8-unit grid to prevent swimming
    const camX = camera.position.x;
    const camZ = camera.position.z;
    this.mesh.position.x = Math.round(camX / 8) * 8;
    this.mesh.position.z = Math.round(camZ / 8) * 8;

    const pos = this.positionAttribute;
    const worldMatrix = this.mesh.matrixWorld;

    const vertexWorldPos = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      // Get local position
      vertexWorldPos.set(pos.getX(i), 0, pos.getZ(i));
      // Convert to world position
      vertexWorldPos.applyMatrix4(worldMatrix);

      // Compute wave height
      const y = waveHeight(vertexWorldPos.x, vertexWorldPos.z, time);
      
      // We set the local Y. Since the mesh only translates in X and Z, local Y = world Y.
      pos.setY(i, y);
    }

    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
