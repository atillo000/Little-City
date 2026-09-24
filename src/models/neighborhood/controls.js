export const emptyControls = () => ({ forward: false, backward: false, left: false, right: false, brake: false, run: false, jump: false, wave: false });
export function combineControls(keyboard, pointer) {
  return Object.fromEntries(Object.keys(emptyControls()).map(key => [key, Boolean(keyboard[key] || pointer[key])]));
}
