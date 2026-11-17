// Yalnızca geliştirme sunucusunda: video editörünün src/content/videos.json'u okuyup yazması için küçük uç nokta.
// Production build'e girmez (apply: 'serve').
import fs from 'node:fs/promises';
import path from 'node:path';

export function videosApi() {
  return {
    name: 'videos-api',
    apply: 'serve',
    configureServer(server) {
      const file = path.resolve(server.config.root, 'src/content/videos.json');
      server.middlewares.use('/__videos', async (req, res) => {
        try {
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(await fs.readFile(file, 'utf8'));
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            for await (const chunk of req) body += chunk;
            const data = JSON.parse(body);
            if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('geçersiz veri');
            await fs.writeFile(file, JSON.stringify(data, null, 1) + '\n', 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.end('{"ok":true}');
            return;
          }
          res.statusCode = 405;
          res.end();
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: String(e) }));
        }
      });
    },
  };
}
