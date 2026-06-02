import serverless from "serverless-http";

import { apiApp, ensureSchemaReady } from "../../server.js";

let handlerPromise;

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = ensureSchemaReady().then(() => serverless(apiApp));
  }

  return handlerPromise;
}

export async function handler(event, context) {
  const appHandler = await getHandler();
  return appHandler(event, context);
}
