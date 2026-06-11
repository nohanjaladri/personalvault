'use client'
import { useEffect, useRef } from 'react'

const PALETTE = [
  '#8b5cf6','#a855f7','#ec4899','#f43f5e','#3b82f6','#06b6d4',
  '#10b981','#f59e0b','#6366f1','#e879f9','#22d3ee','#fb7185',
  '#c084fc','#f472b6','#38bdf8','#4ade80',
]
const SHAPES = ['circle','square','triangle','diamond','star','hexagon','cross'] as const

function rnd(a: number, b: number) { return a + Math.random() * (b - a) }
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

class Shape {
  x!: number; y!: number; type!: typeof SHAPES[number]
  color!: string; baseSize!: number; size!: number
  alpha!: number; speed!: { x: number; y: number }
  rotation!: number; rotSpeed!: number
  pulseSpeed!: number; pulsePhase!: number; pulseAmp!: number
  filled!: boolean; strokeWidth!: number
  glowIntensity!: number; glowState!: string
  glowTimer!: number; glowDuration!: number; glowColor!: string; glowProgress!: number

  constructor(private w: number, private h: number) { this.reset(true) }

  reset(init: boolean) {
    this.x = rnd(0, this.w)
    this.y = init ? rnd(0, this.h) : rnd(-100, this.h + 100)
    this.type = pick(SHAPES); this.color = pick(PALETTE); this.glowColor = pick(PALETTE)
    this.baseSize = rnd(18, 65); this.size = this.baseSize
    this.alpha = rnd(0.12, 0.42)
    this.speed = { x: rnd(-0.5, 0.5), y: rnd(-0.6, 0.6) }
    this.rotation = rnd(0, Math.PI * 2); this.rotSpeed = rnd(-0.008, 0.008)
    this.pulseSpeed = rnd(0.008, 0.025); this.pulsePhase = rnd(0, Math.PI * 2); this.pulseAmp = rnd(0.15, 0.45)
    this.filled = Math.random() > 0.4; this.strokeWidth = rnd(1.5, 3.5)
    this.glowIntensity = 0; this.glowState = 'idle'; this.glowProgress = 0
    this.glowTimer = Math.floor(rnd(60, 360)); this.glowDuration = Math.floor(rnd(40, 90))
  }

  update(t: number) {
    this.x += this.speed.x; this.y += this.speed.y; this.rotation += this.rotSpeed
    this.size = this.baseSize * (1 + this.pulseAmp * Math.sin(t * this.pulseSpeed + this.pulsePhase))
    const pad = 100
    if (this.x < -pad) this.x = this.w + pad
    if (this.x > this.w + pad) this.x = -pad
    if (this.y < -pad) this.y = this.h + pad
    if (this.y > this.h + pad) this.y = -pad

    const rise = Math.floor(this.glowDuration * 0.25)
    const peak = Math.floor(this.glowDuration * 0.20)
    const fade = this.glowDuration - rise - peak

    if (this.glowState === 'idle') {
      if (--this.glowTimer <= 0) { this.glowState = 'rising'; this.glowProgress = 0; this.glowColor = pick(PALETTE) }
    } else if (this.glowState === 'rising') {
      this.glowIntensity = ++this.glowProgress / rise
      if (this.glowProgress >= rise) { this.glowState = 'peak'; this.glowProgress = 0 }
    } else if (this.glowState === 'peak') {
      this.glowIntensity = 1
      if (++this.glowProgress >= peak) { this.glowState = 'fading'; this.glowProgress = 0 }
    } else if (this.glowState === 'fading') {
      this.glowIntensity = 1 - ++this.glowProgress / fade
      if (this.glowProgress >= fade) {
        this.glowIntensity = 0; this.glowState = 'idle'
        this.glowTimer = Math.floor(rnd(180, 720)); this.glowDuration = Math.floor(rnd(40, 90))
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.translate(this.x, this.y); ctx.rotate(this.rotation)
    ctx.globalAlpha = this.alpha + this.glowIntensity * (0.75 - this.alpha)
    const base = this.filled ? 12 : 18
    const blur = (base + this.glowIntensity * 55) * (this.glowIntensity > 0.5 ? 1.6 : 1)
    ctx.shadowColor = this.glowIntensity > 0 ? this.glowColor : this.color
    ctx.shadowBlur = blur
    const r = this.size / 2

    ctx.beginPath()
    if (this.type === 'circle') { ctx.arc(0, 0, r, 0, Math.PI * 2) }
    else if (this.type === 'square') { ctx.rect(-r, -r, this.size, this.size) }
    else if (this.type === 'triangle') { ctx.moveTo(0, -r); ctx.lineTo(r, r * 0.7); ctx.lineTo(-r, r * 0.7); ctx.closePath() }
    else if (this.type === 'diamond') { ctx.moveTo(0, -r); ctx.lineTo(r * 0.65, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.65, 0); ctx.closePath() }
    else if (this.type === 'star') {
      const s = Math.PI / 5
      for (let i = 0; i < 10; i++) { const rad = i % 2 === 0 ? r : r * 0.45; const a = i * s - Math.PI / 2; i === 0 ? ctx.moveTo(rad * Math.cos(a), rad * Math.sin(a)) : ctx.lineTo(rad * Math.cos(a), rad * Math.sin(a)) }
      ctx.closePath()
    } else if (this.type === 'hexagon') {
      for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 6; i === 0 ? ctx.moveTo(r * Math.cos(a), r * Math.sin(a)) : ctx.lineTo(r * Math.cos(a), r * Math.sin(a)) }
      ctx.closePath()
    } else {
      const arm = r * 0.35
      ctx.moveTo(-arm,-r); ctx.lineTo(arm,-r); ctx.lineTo(arm,-arm); ctx.lineTo(r,-arm); ctx.lineTo(r,arm); ctx.lineTo(arm,arm); ctx.lineTo(arm,r); ctx.lineTo(-arm,r); ctx.lineTo(-arm,arm); ctx.lineTo(-r,arm); ctx.lineTo(-r,-arm); ctx.lineTo(-arm,-arm); ctx.closePath()
    }

    if (this.filled) { ctx.fillStyle = this.color; ctx.fill() }
    else { ctx.strokeStyle = this.color; ctx.lineWidth = this.strokeWidth; ctx.stroke() }
    ctx.restore()
  }
}

export default function ShapeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const shapes = Array.from({ length: 55 }, () => new Shape(canvas.width, canvas.height))
    let frame = 0
    let raf: number

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++
      shapes.forEach(s => { s.update(frame); s.draw(ctx) })
      raf = requestAnimationFrame(animate)
    }
    animate()

    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf) }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />
}
