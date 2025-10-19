import { createServer } from './server';
import { getEnv } from './utils/env';

const env = getEnv();

const server = createServer();
const port = env.PORT;

server.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
