const int2HexColor = num => `#${num.toString(16).padStart(6, '0')}`;
const rgb2Int = (r, g, b) => (r << 16) + (g << 8) + b;

export default class {
  constructor() {
    this.registry = ['__reserved for background__']; // indexed objects for rgb lookup;
  }

  register(obj) {
    const color = int2HexColor(this.registry.length);
    this.registry.push(obj);
    return color;
  }

  lookup([r, g, b]) {
    const idx = rgb2Int(r, g, b); // Convert from rgb to int (registry index)
    return idx < this.registry.length ? this.registry[idx] : null;
  }
}