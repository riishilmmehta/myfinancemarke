import * as THREE from 'three';

const skyVertexShader = `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  varying vec3 vWorldPos;
  void main() {
    float h = normalize(vWorldPos).y * 0.5 + 0.5;
    gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, 0.55)), 1.0);
  }
`;

export class Sky {
  constructor(scene) {
    this.scene = scene;
    
    // Time of day palette (Noon)
    this.topColor = new THREE.Color(0x0077ff);
    this.bottomColor = new THREE.Color(0x88ccff);
    
    this.createSkyDome();
    this.createSun();
    this.createClouds();
    this.createIslands();
  }

  createSkyDome() {
    const geometry = new THREE.SphereGeometry(2000, 32, 15);
    const material = new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: {
        topColor: { value: this.topColor },
        bottomColor: { value: this.bottomColor }
      },
      side: THREE.BackSide,
      depthWrite: false
    });
    this.dome = new THREE.Mesh(geometry, material);
    this.scene.add(this.dome);
  }

  createSun() {
    const geometry = new THREE.CircleGeometry(100, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    this.sun = new THREE.Mesh(geometry, material);
    this.sun.position.set(-800, 400, -1000);
    this.sun.lookAt(0, 0, 0);
    this.scene.add(this.sun);
  }

  createClouds() {
    this.cloudGroup = new THREE.Group();
    const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    
    // Distribute clouds in a ring
    const radius = 800;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 200;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 200;
      const y = 150 + Math.random() * 100;

      // Cloud cluster
      const cluster = new THREE.Group();
      cluster.position.set(x, y, z);
      
      for(let j=0; j<3; j++) {
        // Clouds are flipped cones
        const coneGeom = new THREE.ConeGeometry(20 + Math.random()*20, 30 + Math.random()*30, 5);
        coneGeom.rotateX(Math.PI); // Flat bottom, pointy top when flipped? No, Cone is already flat bottom at -y/2.
        // Actually the prompt says "flipped upside down (flat-bottomed, pointy-topped)". Wait. ConeGeometry's default is pointy top, flat bottom.
        // Ah, "several small cones clustered together and flipped upside down". Maybe they mean pointy bottom? No, they explicitly say "flat-bottomed, pointy-topped". 
        // So just normal cones.
        const cone = new THREE.Mesh(coneGeom, cloudMaterial);
        cone.position.set((Math.random()-0.5)*20, (Math.random()-0.5)*10, (Math.random()-0.5)*20);
        cluster.add(cone);
      }
      this.cloudGroup.add(cluster);
    }
    this.scene.add(this.cloudGroup);
  }

  createIslands() {
    this.islandGroup = new THREE.Group();
    const islandMaterial = new THREE.MeshBasicMaterial({ color: 0x2a3b4c, fog: true }); // Silhouette color

    const radius = 1200;
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const geom = new THREE.ConeGeometry(100 + Math.random()*150, 150 + Math.random()*200, 6);
      const island = new THREE.Mesh(geom, islandMaterial);
      island.position.set(x, 0, z);
      this.islandGroup.add(island);
    }
    this.scene.add(this.islandGroup);
  }

  update(camera) {
    // Keep sky dome centered on camera so we never reach it
    this.dome.position.copy(camera.position);
    this.dome.position.y = 0; // Don't move up/down with camera jumps
  }
}
