// Showcase: map tiles drawn here as SVG, so geo-tiles can be shown without a tile server or the network.
// Each tile is a light ground with a grid and its own address.

export async function GET(_request: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }): Promise<Response> {
  const { z, x, y } = await params;
  const shade = (Number(x) + Number(y)) % 2 === 0 ? "#e9edf1" : "#dfe5ea";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="${shade}"/><path d="M0 64H256M0 128H256M0 192H256M64 0V256M128 0V256M192 0V256" stroke="#c5ced6" stroke-width="1"/><rect x="0.5" y="0.5" width="255" height="255" fill="none" stroke="#aab6c0"/><text x="8" y="20" font-family="sans-serif" font-size="12" fill="#5b6872">${z}/${x}/${y}</text></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
}
