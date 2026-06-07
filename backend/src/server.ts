import { buildApp } from './app.ts';

const app = await buildApp();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
await app.listen({ port, host: '0.0.0.0' });
