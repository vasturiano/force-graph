export default function(kapsulePropNames, kapsuleType) {

  const propNames = kapsulePropNames instanceof Array ? kapsulePropNames : [kapsulePropNames];

  const dummyK = new kapsuleType(); // To extract defaults
  dummyK._destructor && dummyK._destructor();

  return {
    linkProp: function(prop) { // link property config
      return {
        default: dummyK[prop](),
        onChange(v, state) { propNames.forEach(propName => state[propName][prop](v)) },
        triggerUpdate: false
      }
    },
    linkMethod: function(method) { // link method pass-through
      return function(state, ...args) {
        const returnVals = [];
        propNames.forEach(propName => {
          const kapsuleInstance = state[propName];
          const returnVal = kapsuleInstance[method](...args);

          if (returnVal !== kapsuleInstance) {
            returnVals.push(returnVal);
          }
        });

        return returnVals.length
          ? returnVals[0]
          : this; // chain based on the parent object, not the inner kapsule
      }
    }
  }

}