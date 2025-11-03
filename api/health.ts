// Explicit health check endpoint for /api/health
export default function handler(_req: any, res: any) {
  res.json({ status: 'ok' });
}
