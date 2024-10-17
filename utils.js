// utils.js
import { Readable } from 'stream';

export function processPath(originalPath) {
  const path = originalPath.startsWith('/') ? originalPath.slice(1) : originalPath;
  if (path.startsWith('v1beta/') || path === 'v1beta') {
    return `/${path}`;
  }
  return `/v1beta/${path}`;
}

export async function handleSSEResponse(response, res, req) {
  if (!response.body) {
    throw new Error('Response body is undefined');
  }

  const stream = Readable.from(response.body);
  const sentDataChunks = new Set();

  stream.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (sentDataChunks.has(data)) {
          continue;
        }
        sentDataChunks.add(data);

        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
        try {
          const parsedData = JSON.parse(data);
          res.write(`data: ${JSON.stringify(parsedData)}\n\n`);
        } catch (e) {
          res.write(`data: ${data}\n\n`);
        }
      }
    }
  });

  stream.on('end', () => {
    res.end();
  });

  stream.on('error', (error) => {
    console.error('Stream processing error:', error);
    res.end();
  });

  req.on('close', () => {
    stream.destroy();
  });
}

export function getApiKeys(req) {
  const keyParam = req.query.key || '';
  if (!keyParam) return [];
  return keyParam.split(';').filter(Boolean);
}
