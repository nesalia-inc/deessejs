import { toNextJsHandler } from 'better-auth/next-js';

export function REST_GET(auth: any) {
  return toNextJsHandler(auth).GET;
}

export function REST_POST(auth: any) {
  return toNextJsHandler(auth).POST;
}
