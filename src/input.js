export class Input {
  constructor() {
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      w: false,
      a: false,
      s: false,
      d: false,
      ' ': false, // drift
      Shift: false // boost
    };

    this.onCameraToggle = null;

    window.addEventListener('keydown', (e) => this.handleKey(e, true));
    window.addEventListener('keyup', (e) => this.handleKey(e, false));
  }

  handleKey(e, isDown) {
    const key = e.key === ' ' ? ' ' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (this.keys.hasOwnProperty(key)) {
      this.keys[key] = isDown;
    }

    if (isDown && key === 'c' && this.onCameraToggle) {
      this.onCameraToggle();
    }
  }

  getState() {
    let throttle = 0;
    if (this.keys.ArrowUp || this.keys.w) throttle += 1;
    if (this.keys.ArrowDown || this.keys.s) throttle -= 1;

    let steer = 0;
    if (this.keys.ArrowLeft || this.keys.a) steer += 1;
    if (this.keys.ArrowRight || this.keys.d) steer -= 1;

    return {
      throttle,
      steer,
      boost: this.keys.Shift,
      drift: this.keys[' ']
    };
  }
}
