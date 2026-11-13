// Showcase: an address that answers and then never finishes. The stage's check uses it as a picture that
// does not arrive, to see that `renderAt` gives up and says which picture it was waiting for.

export function GET(request: Request): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // Nothing is ever sent. When the browser stops waiting, the stream is closed.
      request.signal.addEventListener("abort", () => {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      });
    },
  });
  return new Response(body, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}
