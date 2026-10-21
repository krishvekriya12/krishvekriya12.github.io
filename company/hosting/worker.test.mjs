import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './worker.js';

test('company, www and portfolio remain distinct; upstream receives no visitor credentials', async () => {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => { requests.push({url, options}); return new Response('site', {headers:{'Content-Type':'text/html','Set-Cookie':'upstream=1'}}); };
  try {
    const main = await worker.fetch(new Request('https://setubandhtech.digital/?campaign=launch',{headers:{Cookie:'private=1',Authorization:'private'}}));
    assert.equal(main.status,200);
    assert.equal(requests[0].url,'https://portfolio.setubandhtech.digital/company/index.html');
    assert.equal(requests[0].options.headers,undefined);
    assert.equal(main.headers.get('set-cookie'),null);
    await worker.fetch(new Request('https://setubandhtech.digital/assets/site.css'));
    assert.equal(requests[1].url,'https://portfolio.setubandhtech.digital/company/assets/site.css');
    await worker.fetch(new Request('https://setubandhtech.digital/data/apps.json'));
    assert.equal(requests[2].url,'https://portfolio.setubandhtech.digital/data/apps.json');
    const redirect = await worker.fetch(new Request('https://www.setubandhtech.digital/?campaign=launch'));
    assert.equal(redirect.status,308);
    assert.equal(redirect.headers.get('location'),'https://setubandhtech.digital/?campaign=launch');
    const untouched = await worker.fetch(new Request('https://portfolio.setubandhtech.digital/'));
    assert.equal(untouched.status,404);
    assert.equal(requests.length,3);
    assert.equal((await worker.fetch(new Request('https://setubandhtech.digital/',{method:'POST',body:'data'}))).status,405);
    assert.equal((await worker.fetch(new Request('https://setubandhtech.digital/company/hosting/worker.js'))).status,404);
    globalThis.fetch = async()=>{throw Error('Origin failed');};
    assert.equal((await worker.fetch(new Request('https://setubandhtech.digital/'))).status,503);
  } finally {globalThis.fetch = original;}
});


test('ads.txt proxies the root file for GET and HEAD with plain-text content', async () => {
  const original = globalThis.fetch;
  const requests = [];
  const content = 'google.com, pub-5832096195010647, DIRECT, f08c47fec0942fa0';
  globalThis.fetch = async (url, options) => {
    requests.push({url, options});
    return new Response(options.method === 'HEAD' ? null : content);
  };
  try {
    for (const method of ['GET', 'HEAD']) {
      const response = await worker.fetch(new Request('https://setubandhtech.digital/ads.txt', {method}));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
      assert.equal(await response.text(), method === 'HEAD' ? '' : content);
    }
    assert.deepEqual(requests.map(({url, options}) => [url, options.method]), [
      ['https://portfolio.setubandhtech.digital/ads.txt', 'GET'],
      ['https://portfolio.setubandhtech.digital/ads.txt', 'HEAD']
    ]);
    const redirect = await worker.fetch(new Request('https://www.setubandhtech.digital/ads.txt'));
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get('location'), 'https://setubandhtech.digital/ads.txt');
  } finally { globalThis.fetch = original; }
});
