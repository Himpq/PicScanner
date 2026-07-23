export function call(name, ...args) {
  const api = window.pywebview && window.pywebview.api;
  if (!api || !api[name]) {
    return Promise.reject(new Error('pywebview bridge not ready: ' + name));
  }
  return api[name](...args);
}
