const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const root = path.resolve(__dirname, '..');
const targetRoot = path.join(root, 'assets', 'remote', 'omoikiri.ru');
const textExts = new Set(['.html', '.css', '.js', '.json']);
const mediaPattern = /\.(png|jpe?g|webp|gif|svg|pdf)(\?|$)/i;
const originPattern = /https?:\/\/omoikiri\.ru[^"'`\s)<>]+/g;
const maxConcurrent = 12;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === '.wrangler') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (textExts.has(path.extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files;
}

function localUrl(remoteUrl) {
  const parsed = new URL(remoteUrl);
  return '/assets/remote/omoikiri.ru' + parsed.pathname;
}

function localPath(remoteUrl) {
  const parsed = new URL(remoteUrl);
  const parts = parsed.pathname.split('/').filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  return path.join(targetRoot, ...parts);
}

function getUrls(files) {
  const urls = new Set();
  for (const file of files) {
    const content = fs.readFileSync(file, 'latin1');
    const matches = content.match(originPattern) || [];
    for (const match of matches) {
      if (mediaPattern.test(match)) urls.add(match);
    }
  }
  return [...urls].sort();
}

function request(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;
    const req = client.get(parsed, { headers: { 'User-Agent': 'Mozilla/5.0 OMOIKIRI-KZ mirror' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
        res.resume();
        resolve(request(new URL(res.headers.location, parsed).href, redirects + 1));
        return;
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
  });
}

async function download(url) {
  const outPath = localPath(url);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) return { status: 'skip', url };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const data = await request(url);
  fs.writeFileSync(outPath, data);
  return { status: 'ok', url, bytes: data.length };
}

async function runQueue(urls) {
  let index = 0;
  let ok = 0;
  let skip = 0;
  let failed = 0;
  let bytes = 0;
  const failures = [];

  async function worker() {
    while (index < urls.length) {
      const current = urls[index++];
      try {
        const result = await download(current);
        if (result.status === 'skip') skip += 1;
        else {
          ok += 1;
          bytes += result.bytes || 0;
        }
      } catch (error) {
        failed += 1;
        failures.push(`${current} :: ${error.message}`);
      }

      const done = ok + skip + failed;
      if (done % 100 === 0 || done === urls.length) {
        console.log(`downloaded ${done}/${urls.length} ok=${ok} skip=${skip} failed=${failed}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(maxConcurrent, urls.length) }, worker));
  return { ok, skip, failed, bytes, failures };
}

function rewrite(files, urls) {
  const byLength = [...urls].sort((a, b) => b.length - a.length);
  let changed = 0;
  for (const file of files) {
    const before = fs.readFileSync(file, 'latin1');
    let after = before;
    for (const url of byLength) {
      after = after.split(url).join(localUrl(url));
    }
    if (after !== before) {
      fs.writeFileSync(file, after, 'latin1');
      changed += 1;
    }
  }
  return changed;
}

(async () => {
  const files = walk(root);
  const urls = getUrls(files);
  console.log(`media urls: ${urls.length}`);
  const result = await runQueue(urls);
  const changed = rewrite(files, urls);
  fs.writeFileSync(
    path.join(root, 'assets', 'remote', 'omoikiri-media-failures.txt'),
    result.failures.join('\n'),
    'utf8'
  );
  console.log(JSON.stringify({ ...result, mb: Math.round(result.bytes / 1024 / 1024), changed }, null, 2));
})();
