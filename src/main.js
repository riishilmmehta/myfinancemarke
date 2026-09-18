import * as THREE from 'three';
import { Ocean } from './ocean.js';
import { Sky } from './sky.js';
import { Boat } from './boat.js';
import { AIRacer } from './ai.js';
import { World } from './world.js';
import { CameraRig } from './camera.js';
import { Input } from './input.js';
import { AudioSystem } from './audio.js';
import { GhostSystem } from './ghost.js';
import { waveHeight } from './utils.js';

// --- State Machine ---
const STATE_MENU = 0;
const STATE_RACE = 1;
const STATE_CRUISE = 2;
const STATE_FINISHED = 3;

class Game {
  constructor() {
    this.initThree();
    this.initSystems();
    this.initDOM();
    
    this.state = STATE_MENU;
    this.raceTime = 0;
    this.targetBeaconIndex = 0;
    
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.FIXED_DT = 1 / 120; // 120Hz physics

    // Start loop
    requestAnimationFrame((t) => this.loop(t));
  }

  initThree() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false }); // Disable antialias for performance/low-poly look
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio

    this.scene = new THREE.Scene();
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(-1, 0.5, -1).normalize();
    this.scene.add(dirLight);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 4000);
    
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initSystems() {
    this.ocean = new Ocean(this.scene);
    this.sky = new Sky(this.scene);
    this.world = new World(this.scene);
    
    // Start boat at origin
    this.player = new Boat(this.scene, 0xffffff, true);
    
    this.aiRacers = [
      new AIRacer(this.scene, 0xff3333, this.world.course, 0),
      new AIRacer(this.scene, 0x33ff33, this.world.course, Math.PI / 2),
      new AIRacer(this.scene, 0xaaaa00, this.world.course, Math.PI)
    ];

    this.cameraRig = new CameraRig(this.camera);
    this.input = new Input();
    this.input.onCameraToggle = () => this.cameraRig.toggleMode();
    
    this.audio = new AudioSystem();
    this.ghost = new GhostSystem(this.scene);
  }

  initDOM() {
    this.hud = document.getElementById('hud');
    this.menu = document.getElementById('main-menu');
    this.speedVal = document.getElementById('speed-val');
    this.boostFill = document.getElementById('boost-fill');
    this.timerVal = document.getElementById('timer-val');
    this.beaconVal = document.getElementById('beacon-val');
    
    document.getElementById('btn-race').addEventListener('click', () => this.startMode(STATE_RACE));
    document.getElementById('btn-cruise').addEventListener('click', () => this.startMode(STATE_CRUISE));
  }

  startMode(mode) {
    this.audio.init();
    this.audio.playBlip(600, 0.2);
    
    this.state = mode;
    this.menu.classList.add('hidden');
    this.hud.classList.remove('hidden');
    
    this.raceTime = 0;
    this.targetBeaconIndex = 1; // 0 is start, 1 is first target
    
    // Reset player
    this.player.x = this.world.course[0].x;
    this.player.z = this.world.course[0].z;
    this.player.heading = Math.atan2(
      this.world.course[1].x - this.world.course[0].x,
      this.world.course[1].z - this.world.course[0].z
    );
    this.player.speed = 0;
    this.player.boostAmount = 100;
    
    this.world.setActiveBeacon(this.targetBeaconIndex);
    
    if (mode === STATE_RACE) {
      this.ghost.startRecording();
      // Reset AI
      this.aiRacers.forEach(ai => {
        ai.targetIndex = 1;
        ai.finished = false;
        ai.boat.x = this.world.course[0].x + (Math.random()-0.5)*20;
        ai.boat.z = this.world.course[0].z + (Math.random()-0.5)*20;
        ai.boat.heading = this.player.heading;
        ai.boat.speed = 0;
      });
    } else {
      this.ghost.stopRecording();
    }
  }

  formatTime(ms) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const ms100 = Math.floor((ms % 1000) / 10);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms100.toString().padStart(2, '0')}`;
  }

  updateHUD() {
    this.speedVal.innerText = Math.round(Math.abs(this.player.speed));
    this.boostFill.style.width = `${this.player.boostAmount}%`;
    this.timerVal.innerText = this.formatTime(this.raceTime * 1000);
    this.beaconVal.innerText = `${this.targetBeaconIndex} / ${this.world.course.length - 1}`;
  }

  physicsTick(dt, globalTime) {
    if (this.state === STATE_MENU) {
      // Gentle auto-rotation around scene in menu
      this.player.update(dt, globalTime, { throttle: 0.1, steer: 0.2, boost: false, drift: false });
    } else {
      const inputState = this.input.getState();
      this.player.update(dt, globalTime, inputState);
      
      this.audio.update(this.player.speed, this.player.maxSpeed, inputState.throttle);
      
      if (this.state === STATE_RACE) {
        this.raceTime += dt;
        this.ghost.recordFrame(this.raceTime, this.player);
        this.ghost.updateGhost(this.raceTime);
        
        this.aiRacers.forEach(ai => ai.update(dt, globalTime));
        
        // Check beacon progression
        if (this.targetBeaconIndex < this.world.course.length) {
          const target = this.world.course[this.targetBeaconIndex];
          const dx = target.x - this.player.x;
          const dz = target.z - this.player.z;
          if (dx*dx + dz*dz < 1500) { // ~38 units radius
            this.targetBeaconIndex++;
            this.audio.playBlip(880, 0.1);
            
            if (this.targetBeaconIndex >= this.world.course.length) {
              this.finishRace();
            } else {
              this.world.setActiveBeacon(this.targetBeaconIndex);
            }
          }
        }
      }
    }
  }

  finishRace() {
    this.state = STATE_FINISHED;
    this.ghost.saveGhost();
    
    // Show menu again
    setTimeout(() => {
      this.menu.classList.remove('hidden');
      this.menu.querySelector('h1').innerText = "FINISHED";
      this.menu.querySelector('h2').innerText = `Time: ${this.formatTime(this.raceTime * 1000)}`;
      document.getElementById('btn-race').innerText = "Race Again";
    }, 2000);
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    
    const frameDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    // Cap frame time to prevent spiral of death if tab was backgrounded
    const dt = Math.min(frameDt, 0.1);
    
    const globalTime = now / 1000;

    // Fixed physics steps
    this.accumulator += dt;
    while (this.accumulator >= this.FIXED_DT) {
      this.physicsTick(this.FIXED_DT, globalTime);
      this.accumulator -= this.FIXED_DT;
    }

    // Per-frame visual updates
    this.cameraRig.update(dt, this.player);
    this.sky.update(this.camera);
    this.ocean.update(globalTime, this.camera);
    this.world.update(globalTime, waveHeight);
    
    if (this.state === STATE_RACE || this.state === STATE_CRUISE) {
      this.updateHUD();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Start
new Game();
