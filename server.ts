import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import checkoutHandler from './api/checkout.ts';
import verifyHandler from './api/verify.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());

app.all('/api/checkout', (req, res) => {
  void checkoutHandler(req, res);
});

app.all('/api/verify', (req, res) => {
  void verifyHandler(req, res);
});

const distDir = path.resolve(__dirname, 'dist');
app.use(express.static(distDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PolyPet Studio server listening on http://localhost:${port}`);
});
