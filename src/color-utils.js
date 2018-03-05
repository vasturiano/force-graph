import { schemePaired } from 'd3-scale-chromatic';

const int2HexColor = num => `#${num.toString(16).padStart(6, '0')}`;

const rgb2Int = (r, g, b) => (r << 16) + (g << 8) + b;

// Autoset attribute colorField by colorByAccessor property
// If an object has already a color, don't set it
// Objects can be nodes or links
function autoColorObjects(objects, colorByAccessor, colorField) {
  if (!colorByAccessor || typeof colorField !== 'string') return;

  const colors = schemePaired; // Paired color set from color brewer

  const uncoloredObjects = objects.filter(obj => !obj[colorField]);
  const objGroups = {};

  uncoloredObjects.forEach(obj => { objGroups[colorByAccessor(obj)] = null });
  Object.keys(objGroups).forEach((group, idx) => { objGroups[group] = idx });

  uncoloredObjects.forEach(obj => {
    obj[colorField] = colors[objGroups[colorByAccessor(obj)] % colors.length];
  });
}

export { autoColorObjects, int2HexColor, rgb2Int };
