// Showcase: short sounds made here as WAV, so narration cues can be shown without a sound file or the network.
// /sounds/<seconds>s-<hertz>hz.wav: a soft tone of that length and pitch.

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }): Promise<Response> {
  const { name } = await params;
  const match = /^(\d+(?:\.\d+)?)s-(\d+)hz\.wav$/.exec(name);
  if (!match) return new Response("Not found", { status: 404 });
  const seconds = Math.min(10, Number(match[1]));
  const hertz = Math.min(2000, Number(match[2]));
  const rate = 8000;
  const samples = Math.round(seconds * rate);
  const data = Buffer.alloc(44 + samples * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + samples * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const fade = Math.min(1, i / 400, (samples - i) / 400);
    data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hertz * i) / rate) * 6000 * fade), 44 + i * 2);
  }
  return new Response(data, { headers: { "content-type": "audio/wav", "cache-control": "public, max-age=86400" } });
}
