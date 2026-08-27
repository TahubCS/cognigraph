'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Braces,
  Check,
  FileText,
  Github,
  MessageSquareText,
  Network,
  Search,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

const GITHUB_URL = 'https://github.com/TahubCS/cognigraph';

const features = [
  {
    icon: FileText,
    title: 'Ingest once',
    description: 'Upload source material and turn unstructured documents into reusable knowledge.',
  },
  {
    icon: Network,
    title: 'See connections',
    description: 'Explore entities and relationships in an interactive, navigable knowledge graph.',
  },
  {
    icon: MessageSquareText,
    title: 'Ask with context',
    description: 'Get focused answers grounded in the material already inside your workspace.',
  },
];

const graphNodes = [
  { x: 50, y: 50, r: 9, label: 'Research', tone: 'blue' },
  { x: 24, y: 25, r: 6, label: 'Reports', tone: 'violet' },
  { x: 78, y: 22, r: 7, label: 'Entities', tone: 'cyan' },
  { x: 82, y: 68, r: 6, label: 'Insights', tone: 'violet' },
  { x: 28, y: 77, r: 7, label: 'Sources', tone: 'cyan' },
  { x: 53, y: 88, r: 5, label: 'Claims', tone: 'blue' },
];

const graphLinks = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [3, 5], [4, 5]];

function ProductPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="relative mx-auto w-full max-w-2xl"
      aria-label="Preview of the CogniGraph knowledge workspace"
    >
      <div className="absolute -inset-10 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
        <div className="flex h-12 items-center gap-2 border-b border-white/10 px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Knowledge workspace</span>
        </div>
        <div className="grid min-h-96 md:grid-cols-[1.35fr_1fr]">
          <div className="relative min-h-72 border-b border-white/10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_58%)] md:border-b-0 md:border-r">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label="Connected research topics">
              {graphLinks.map(([from, to]) => (
                <line key={`${from}-${to}`} x1={graphNodes[from].x} y1={graphNodes[from].y} x2={graphNodes[to].x} y2={graphNodes[to].y} stroke="rgba(148,163,184,.28)" strokeWidth=".5" />
              ))}
              {graphNodes.map((node, index) => (
                <g key={node.label}>
                  <motion.circle
                    cx={node.x} cy={node.y} r={node.r}
                    fill={node.tone === 'blue' ? '#2563eb' : node.tone === 'violet' ? '#7c3aed' : '#0891b2'}
                    initial={reduceMotion ? false : { scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.45 + index * 0.08 }}
                    style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                  />
                  <text x={node.x} y={node.y + node.r + 6} textAnchor="middle" fill="#a1a1aa" fontSize="3.5">{node.label}</text>
                </g>
              ))}
            </svg>
            <span className="absolute left-4 top-4 rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 text-[10px] font-medium text-blue-300">6 concepts · 8 links</span>
          </div>
          <div className="flex flex-col p-5">
            <div className="mb-5 flex items-center gap-2 text-xs font-medium text-zinc-300"><Sparkles className="h-4 w-4 text-violet-400" /> Ask your sources</div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-zinc-300">What connects the latest reports to our core research?</div>
            <div className="mt-3 rounded-xl border border-blue-400/10 bg-blue-500/5 p-3 text-xs leading-relaxed text-zinc-400">
              <div className="mb-2 flex items-center gap-1.5 font-medium text-blue-300"><Braces className="h-3.5 w-3.5" /> Synthesizing sources</div>
              The reports reinforce three recurring themes across your research and link them to five supporting claims.
            </div>
            <div className="mt-auto flex items-center gap-2 pt-5 text-[10px] text-zinc-500"><Check className="h-3.5 w-3.5 text-emerald-400" /> Grounded in your workspace</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="overflow-hidden">
      <section className="relative isolate flex min-h-screen items-center px-5 pb-20 pt-28 sm:px-8 lg:px-12" aria-labelledby="hero-heading">
        <div className="absolute inset-0 -z-20 bg-[#08090c]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-size-[48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        <div className="absolute left-[8%] top-28 -z-10 h-72 w-72 rounded-full bg-blue-600/15 blur-[110px]" />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[.9fr_1.1fr]">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/8 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Graph-enhanced retrieval
            </p>
            <h1 id="hero-heading" className="max-w-3xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Turn scattered documents into <span className="bg-linear-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">connected answers.</span>
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-zinc-400">
              CogniGraph transforms your source material into an explorable knowledge graph, then grounds every AI conversation in the context that matters.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 font-semibold text-zinc-950 transition hover:bg-blue-50">
                Build your graph <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href={GITHUB_URL} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-white/10">
                <Github className="h-4 w-4" aria-hidden="true" /> Explore the code
              </Link>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-500" aria-label="Product highlights">
              {['Source-grounded', 'Interactive graph', 'Exportable data'].map((item) => <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />{item}</li>)}
            </ul>
          </motion.div>
          <ProductPreview />
        </div>
      </section>

      <section id="features" className="border-y border-white/8 bg-zinc-950 px-5 py-24 sm:px-8 lg:px-12" aria-labelledby="features-heading">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-blue-400">One connected workflow</p>
            <h2 id="features-heading" className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">From raw files to useful context.</h2>
            <p className="mt-4 text-lg leading-8 text-zinc-400">A focused workspace for understanding a collection, not another place to lose information.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="group rounded-2xl border border-white/10 bg-white/3 p-6 transition hover:-translate-y-1 hover:border-blue-400/25 hover:bg-white/5">
                <div className="mb-8 flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="font-mono text-xs text-zinc-600">0{index + 1}</span></div>
                <h3 className="text-xl font-semibold text-white">{title}</h3><p className="mt-3 leading-7 text-zinc-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-[#08090c] px-5 py-24 text-center sm:px-8" aria-labelledby="cta-heading">
        <Search className="mx-auto h-6 w-6 text-blue-400" aria-hidden="true" />
        <h2 id="cta-heading" className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Find the signal hidden across your sources.</h2>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-400">Create a workspace, add your documents, and start exploring the relationships inside them.</p>
        <Link href="/sign-up" className="focus-ring mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-blue-500 px-6 font-semibold text-white transition hover:bg-blue-400">Get started <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </section>
    </div>
  );
}
