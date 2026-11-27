import { assistant } from '../server.mjs';

export default {
  fetch(request) {
    return assistant(request, process.env);
  },
};
