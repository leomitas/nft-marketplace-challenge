// Lighthouse audit: Início and NFT detail, mobile and desktop, 3 runs each, median per category.
// Runs against the production build (`vite preview`) with the default mock scenario, same as the
// deploy. Reports: lighthouse/reports/*.html|json; summary: lighthouse/summary.{md,json}.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import { dirname, join } from 'node:path'

const PORT = 4174
const BASE = `http://localhost:${PORT}`
const RUNS = 3
const PAGES = [
  { name: 'inicio', path: '/' },
  { name: 'detalhe', path: '/nfts/emerald-ape-042' },
]
const PROFILES = ['mobile', 'desktop']
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const METRICS = {
  LCP: 'largest-contentful-paint',
  CLS: 'cumulative-layout-shift',
  TBT: 'total-blocking-time',
}
const OUT = 'lighthouse/reports'

// Chromium from Playwright, unless CHROME_PATH points elsewhere
const require = createRequire(import.meta.url)
const chromePath = process.env.CHROME_PATH ?? require('@playwright/test').chromium.executablePath()

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function startPreview() {
  // Something already answering on the port (e.g. a leftover preview of an older build) would be
  // audited instead of the build just made: refuse instead of measuring the wrong thing
  const busy = await fetch(BASE).then(
    () => true,
    () => false,
  )
  if (busy) throw new Error(`port ${PORT} is already in use; stop that server and run again`)
  // Node + vite directly (no shell): with `shell: true`, kill() only ended the shell and left the
  // preview server running in the background
  const viteBin = join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')
  const server = spawn(
    process.execPath,
    [viteBin, 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore' },
  )
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return server
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  server.kill()
  throw new Error('vite preview did not start')
}

function audit(url, profile, outputPath) {
  const args = [
    'exec',
    'lighthouse',
    url,
    '--quiet',
    '--output=json',
    '--output=html',
    `--output-path=${outputPath}`,
    `--chrome-path=${chromePath}`,
    '--chrome-flags=--headless=new',
    `--only-categories=${CATEGORIES.join(',')}`,
    ...(profile === 'desktop' ? ['--preset=desktop'] : []),
  ]
  const report = `${outputPath}.report.json`
  for (let attempt = 1; attempt <= 2; attempt++) {
    rmSync(report, { force: true })
    const result = spawnSync('pnpm', args, { shell: true, stdio: 'inherit' })
    // On Windows Lighthouse may exit non-zero only because it could not delete Chrome's temp
    // profile (EPERM) after writing the report: a complete report is accepted
    if (existsSync(report)) {
      const json = JSON.parse(readFileSync(report, 'utf8'))
      if (!json.runtimeError) return json
    }
    console.warn(`  run failed (exit ${result.status}), attempt ${attempt}/2`)
  }
  throw new Error(`lighthouse failed for ${url} (${profile})`)
}

mkdirSync(OUT, { recursive: true })
const server = await startPreview()
const results = []
let meta
try {
  for (const page of PAGES) {
    for (const profile of PROFILES) {
      const runs = []
      for (let run = 1; run <= RUNS; run++) {
        console.log(`> ${page.name} · ${profile} · run ${run}/${RUNS}`)
        const report = audit(
          `${BASE}${page.path}`,
          profile,
          `${OUT}/${page.name}-${profile}-${run}`,
        )
        meta ??= {
          lighthouseVersion: report.lighthouseVersion,
          userAgent: report.environment.hostUserAgent,
          benchmarkIndex: report.environment.benchmarkIndex,
        }
        runs.push({
          scores: Object.fromEntries(
            CATEGORIES.map((c) => [c, Math.round(report.categories[c].score * 100)]),
          ),
          metrics: Object.fromEntries(
            Object.entries(METRICS).map(([k, id]) => [k, report.audits[id].numericValue]),
          ),
          throttling: report.configSettings.throttling,
          formFactor: report.configSettings.formFactor,
        })
      }
      // Only the run with the median performance is kept as HTML/JSON (each pair is ~1.5 MB);
      // the scores of all runs stay in summary.json
      const kept = runs.findIndex(
        (r) => r.scores.performance === median(runs.map((x) => x.scores.performance)),
      )
      for (let run = 1; run <= RUNS; run++) {
        for (const ext of ['html', 'json']) {
          const file = `${OUT}/${page.name}-${profile}-${run}.report.${ext}`
          if (run === kept + 1) renameSync(file, `${OUT}/${page.name}-${profile}.report.${ext}`)
          else rmSync(file, { force: true })
        }
      }
      results.push({
        report: `${OUT}/${page.name}-${profile}.report.html (execução ${kept + 1})`,
        page: page.name,
        path: page.path,
        profile,
        runs,
        median: {
          scores: Object.fromEntries(
            CATEGORIES.map((c) => [c, median(runs.map((r) => r.scores[c]))]),
          ),
          metrics: Object.fromEntries(
            Object.keys(METRICS).map((k) => [k, median(runs.map((r) => r.metrics[k]))]),
          ),
        },
      })
    }
  }
} finally {
  server.kill()
}

const environment = {
  date: new Date().toISOString(),
  ...meta,
  chrome: chromePath,
  node: process.version,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: os.cpus()[0]?.model,
  server: `vite preview (production build, mocks on, default scenario) at ${BASE}`,
  runsPerPage: RUNS,
}
writeFileSync('lighthouse/summary.json', JSON.stringify({ environment, results }, null, 2))

const ms = (v) => `${Math.round(v)} ms`
const lines = [
  '# Lighthouse — mediana de 3 execuções',
  '',
  `Gerado por \`pnpm lighthouse\` em ${environment.date}.`,
  '',
  `- Lighthouse ${environment.lighthouseVersion}; Chrome: ${environment.userAgent}`,
  `- ${environment.os}; ${environment.cpu}; Node ${environment.node}; benchmarkIndex ${environment.benchmarkIndex}`,
  `- ${environment.server}`,
  '- Mobile: perfil padrão do Lighthouse (Moto G Power, 4G lento simulado, CPU 4×). Desktop: `--preset=desktop`.',
  '',
  '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
  '| ------ | ------ | ----------: | ------------: | -------------: | --: | --: | --: | --: |',
  ...results.map(
    ({ page, profile, median: m }) =>
      `| ${page} | ${profile} | ${m.scores.performance} | ${m.scores.accessibility} | ${m.scores['best-practices']} | ${m.scores.seo} | ${ms(m.metrics.LCP)} | ${m.metrics.CLS.toFixed(3)} | ${ms(m.metrics.TBT)} |`,
  ),
  '',
  'Relatório HTML/JSON da execução mediana de cada página/perfil em `lighthouse/reports/`; as notas das 3 execuções estão em `lighthouse/summary.json`.',
  '',
]
writeFileSync('lighthouse/summary.md', lines.join('\n'))
console.log(lines.join('\n'))
