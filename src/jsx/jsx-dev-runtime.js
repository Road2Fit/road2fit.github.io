// Version développement (npm run dev) du runtime JSX : même traitement des emojis (voir jsx-runtime.js).
import { Fragment, jsx, jsxs } from './jsx-runtime';

export { Fragment };
export function jsxDEV(type, props, key, isStatic) {
  return isStatic ? jsxs(type, props, key) : jsx(type, props, key);
}
