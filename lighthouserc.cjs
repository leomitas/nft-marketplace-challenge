// Lighthouse CI config. Pages and profiles are expanded in Phase 8 (home + NFT detail, mobile + desktop).
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm preview --port 4174 --strictPort',
      startServerReadyPattern: 'Local',
      url: ['http://localhost:4174/'],
      numberOfRuns: 3,
    },
    upload: { target: 'filesystem', outputDir: 'lighthouse/reports' },
  },
}
