// Both sites live in krishvekriya12/krishvekriya12.github.io.
// GitHub Pages serves the existing portfolio and publishes /company/ as well.
// Cloudflare routes the company hosts to that folder; portfolio is untouched.
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
      const origin = await fetch('https://portfolio.setubandhtech.digital' + originPath, {method:request.method,redirect:'error'});
      const headers = new Headers(origin.headers);
      headers.delete('set-cookie');
      headers.set('Cache-Control','public, max-age=60, must-revalidate');
      headers.set('X-Content-Type-Options','nosniff');
      headers.set('Referrer-Policy','strict-origin-when-cross-origin');
      headers.set('X-Setubandh-Source','krishvekriya12.github.io/company');
      return new Response(origin.body,{status:origin.status,headers});
    } catch {
      return new Response('The company website is temporarily unavailable. Please contact setubandhtech@gmail.com.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Retry-After':'60'}});
    }
  }
};
