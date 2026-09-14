import { buildClientSource } from './minified.client';

// Existing script tags can keep using data-collect without changing their URL.
// The small loader forwards that selection to the server for the actual SDK.
const loaderSource = `(function(){var current=document.currentScript;if(!current)return;var url=new URL(current.src);url.searchParams.set('collect',current.getAttribute('data-collect')||'pageview');var script=document.createElement('script');Array.prototype.forEach.call(current.attributes,function(attr){if(attr.name!=='src'&&attr.name!=='integrity')script.setAttribute(attr.name,attr.value)});if(current.nonce)script.nonce=current.nonce;script.src=url.toString();current.parentNode.insertBefore(script,current.nextSibling)})();`;

export async function GET(request: Request) {
  const collect = new URL(request.url).searchParams.get('collect');
  return new Response(collect === null ? loaderSource : buildClientSource(collect), {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
