// InjectorManager.js
const injectors = [];

export function registerInjector(injector) {
  injectors.push(injector);
}

export function emit(event, payload) {
  injectors.forEach(i => {
    if (i[event]) i[event](payload);
  });
}
