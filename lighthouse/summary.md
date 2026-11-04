# Lighthouse — mediana de 3 execuções

Gerado por `pnpm lighthouse` em 2026-11-04T22:13:45.313Z.

- Lighthouse 13.6.0; Chrome: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
- Windows_NT 10.0.26200 (x64); AMD Ryzen 7 5700X3D 8-Core Processor ; Node v24.15.0; benchmarkIndex 1560.5
- vite preview (production build, mocks on, default scenario) at http://localhost:4174
- Mobile: perfil padrão do Lighthouse (Moto G Power, 4G lento simulado, CPU 4×). Desktop: `--preset=desktop`.

| Página  | Perfil  | Performance | Accessibility | Best Practices | SEO |     LCP |   CLS |    TBT |
| ------- | ------- | ----------: | ------------: | -------------: | --: | ------: | ----: | -----: |
| inicio  | mobile  |          74 |           100 |            100 | 100 | 4613 ms | 0.016 | 391 ms |
| inicio  | desktop |          99 |           100 |            100 | 100 | 1011 ms | 0.002 |   1 ms |
| detalhe | mobile  |          72 |           100 |            100 | 100 | 4730 ms | 0.000 | 436 ms |
| detalhe | desktop |          97 |           100 |            100 | 100 | 1205 ms | 0.007 |  14 ms |

Relatório HTML/JSON da execução mediana de cada página/perfil em `lighthouse/reports/`; as notas das 3 execuções estão em `lighthouse/summary.json`.
