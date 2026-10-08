// Both sites live in krishvekriya12/krishvekriya12.github.io.
// GitHub Pages serves the portfolio and publishes the company folder.
// Cloudflare routes the company hosts to that folder.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const companyHosts = ['setubandhtech.digital', 'www.setubandhtech.digital'];
    if (!companyHosts.includes(url.hostname) && !url.hostname.endsWith('.workers.dev')) return new Response('Not found', {status:404});
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405,headers:{Allow:'GET, HEAD'}});
    if (url.hostname === 'www.setubandhtech.digital') return Response.redirect('https://setubandhtech.digital' + url.pathname + url.search, 308);
    let originPath;
    if (url.pathname === '/' || url.pathname === '/index.html') originPath = '/company/index.html';
    else if (url.pathname === '/data/apps.json') originPath = '/data/apps.json';
    else if (url.pathname.startsWith('/assets/') || ['/robots.txt','/sitemap.xml'].includes(url.pathname)) originPath = '/company' + url.pathname;
    else return new Response('Not found', {status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    try {
      const origin = await fetch('https://portfolio.setubandhtech.digital' + originPath, {method:request.method,redirect:'manual'});
      if (origin.status >= 300 && origin.status < 400) throw new Error('Unexpected origin redirect');
      const headers = new Headers(origin.headers);
      headers.delete('set-cookie');
      headers.set('Cache-Control','public, max-age=60, must-revalidate');
      headers.set('X-Content-Type-Options','nosniff');
      headers.set('Referrer-Policy','strict-origin-when-cross-origin');
      headers.set('X-Setubandh-Source','krishvekriya12.github.io/company');
      const type = originPath.endsWith('.html') ? 'text/html; charset=utf-8' : originPath.endsWith('.css') ? 'text/css; charset=utf-8' : originPath.endsWith('.js') ? 'text/javascript; charset=utf-8' : originPath.endsWith('.svg') ? 'image/svg+xml' : originPath.endsWith('.json') ? 'application/json; charset=utf-8' : originPath.endsWith('.xml') ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8';
      headers.set('Content-Type', type);
      return new Response(origin.body,{status:origin.status,headers});
    } catch (error) {
      console.error('Company origin fetch failed:', error.message);
      return new Response('The company website is temporarily unavailable. Please contact setubandhtech@gmail.com.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Retry-After':'60'}});
    }
  }
};

