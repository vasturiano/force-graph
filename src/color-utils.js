import { schemePaired } from 'd3-scale-chromatic';
import tinyColor from 'tinycolor2';

const colorStr2Hex = str => isNaN(str) ? parseInt(tinyColor(str).toHex(), 16) : str;

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

export { autoColorObjects, colorStr2Hex };
