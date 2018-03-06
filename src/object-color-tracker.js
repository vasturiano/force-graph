const int2HexColor = num => `#${Math.min(num, Math.pow(2, 24)).toString(16).padStart(6, '0')}`;
const rgb2Int = (r, g, b) => (r << 16) + (g << 8) + b;

const CS_BITS = 6; // How many bits to reserve for checksum. Will eat away into the usable size of the registry.

export default class {
  constructor() {
    this.registry = ['__reserved for background__']; // indexed objects for rgb lookup;
  }

  register(obj) {
    if (this.registry.length >= Math.pow(2, 24 - CS_BITS)) { // color has 24 bits (-checksum)
      return null; // Registry is full
    }

    const idx = this.registry.length;
    const cs = idx % Math.pow(2, CS_BITS);

    const color = int2HexColor(idx + (cs << (24 - CS_BITS)));

    this.registry.push(obj);
    return color;
  }

  lookup([r, g, b]) {
    const n = rgb2Int(r, g, b);

    const idx = n & (Math.pow(2, 24 - CS_BITS) - 1); // registry index
    const cs = (n >> (24 - CS_BITS)) & (Math.pow(2, CS_BITS) - 1); // extract bits reserved for checksum

    if ((idx % Math.pow(2, CS_BITS)) !== cs || idx >= this.registry.length) return null; // failed checksum or registry out of bounds

    return this.registry[idx];
  }
}