/** Short 8-bit click sound — disable by not calling */
let audioCtx: AudioContext | null = null

export function playPixelClick() {
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = 880
    g.gain.value = 0.04
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    setTimeout(() => {
      o.stop()
      o.disconnect()
      g.disconnect()
    }, 45)
  } catch {
    /* ignore */
  }
}
