# Backtest scripts

Полный гайд по запуску NestJS, backtest и live-бота находится в
[`examples/nest-sdk/README.md`](../../README.md).

Быстрый запуск mock-backtest из корня репозитория:

```bash
npx tsx examples/nest-sdk/src/backtest/pairs-arbitrage.ts --mock
```

Пример вывода:

```
# Pairs arbitrage backtest
# Mode: SANDBOX
# Lookback: 90 days, 1H candles
# z-score window=60, entry=|z|>2, exit=z=0, stop=|z|>4
# Synthetic price = 1000 + lnRatio (offset satisfies Bar(price>0)).
# All metrics computed directly from per-trade lnRatio P&L; engine's price-ratio
# criteria are NOT used here (offset would distort them).
# Transaction cost applied as 2 × fraction per round-trip in lnRatio (ln(1+f) ≈ f).

--- SBER vs SRM6: Базовый актив + фьючерс на него
=== SBER vs SRM6  [LONG] ===
  Bars (aligned): 1190
  Closed positions: 3
  Net P&L (lnRatio): 0.0008
  Net Approx %:      0.080%
  Avg per-trade %:   0.027%
  WinRate:           66.7%
  ProfitFactor:      7.433
  Sharpe (per-trade):0.927
  MaxDrawdown:       0.012%
  BuyAndHold ratio:  3.377%
  Top trades (by |pnl|):
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0006  (0.056%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0004  (0.037%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0001  (-0.012%)
=== SBER vs SRM6  [SHORT] ===
  Bars (aligned): 1190
  Closed positions: 12
  Net P&L (lnRatio): -0.0140
  Net Approx %:      -1.389%
  Avg per-trade %:   -0.116%
  WinRate:           41.7%
  ProfitFactor:      0.405
  Sharpe (per-trade):-0.359
  MaxDrawdown:       1.559%
  BuyAndHold ratio:  3.377%
  Top trades (by |pnl|):
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0070  (-0.696%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0068  (-0.682%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0037  (-0.367%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0026  (0.264%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0026  (-0.260%)

--- SRM6 vs SRU6: Календарный спред (разные экспирации одного фьюча)
=== SRM6 vs SRU6  [LONG] ===
  Bars (aligned): 1096
  Closed positions: 9
  Net P&L (lnRatio): 0.0053
  Net Approx %:      0.529%
  Avg per-trade %:   0.059%
  WinRate:           77.8%
  ProfitFactor:      2.027
  Sharpe (per-trade):0.295
  MaxDrawdown:       0.512%
  BuyAndHold ratio:  3.162%
  Top trades (by |pnl|):
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0033  (-0.332%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0029  (0.294%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0027  (0.272%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0026  (0.260%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0018  (-0.180%)
=== SRM6 vs SRU6  [SHORT] ===
  Bars (aligned): 1096
  Closed positions: 20
  Net P&L (lnRatio): 0.0129
  Net Approx %:      1.303%
  Avg per-trade %:   0.065%
  WinRate:           75.0%
  ProfitFactor:      1.950
  Sharpe (per-trade):0.302
  MaxDrawdown:       0.685%
  BuyAndHold ratio:  3.162%
  Top trades (by |pnl|):
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0036  (0.359%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0035  (0.351%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0034  (-0.343%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0032  (-0.318%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0030  (-0.296%)

--- TGLD@ vs GDM6: ETF золота + фьючерс на золото
=== TGLD@ vs GDM6  [LONG] ===
  Bars (aligned): 567
  Closed positions: 3
  Net P&L (lnRatio): -0.0743
  Net Approx %:      -7.159%
  Avg per-trade %:   -2.411%
  WinRate:           33.3%
  ProfitFactor:      0.112
  Sharpe (per-trade):-0.922
  MaxDrawdown:       7.159%
  BuyAndHold ratio:  -7.378%
  Top trades (by |pnl|):
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0559  (-5.436%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0278  (-2.741%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0094  (0.944%)
=== TGLD@ vs GDM6  [SHORT] ===
  Bars (aligned): 567
  Closed positions: 2
  Net P&L (lnRatio): -0.0100
  Net Approx %:      -0.992%
  Avg per-trade %:   -0.488%
  WinRate:           50.0%
  ProfitFactor:      0.453
  Sharpe (per-trade):-0.371
  MaxDrawdown:       1.806%
  BuyAndHold ratio:  -7.378%
  Top trades (by |pnl|):
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0182  (-1.806%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0083  (0.829%)

--- TMOS@ vs MXM6: ETF голубых фишек + фьючерс на индекс MIX
=== TMOS@ vs MXM6  [LONG] ===
  Bars (aligned): 895
  Closed positions: 7
  Net P&L (lnRatio): 0.0282
  Net Approx %:      2.864%
  Avg per-trade %:   0.405%
  WinRate:           85.7%
  ProfitFactor:      5.634
  Sharpe (per-trade):0.858
  MaxDrawdown:       0.608%
  BuyAndHold ratio:  4.426%
  Top trades (by |pnl|):
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0103  (1.040%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0067  (0.673%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0061  (0.617%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=-0.0061  (-0.608%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0046  (0.458%)
=== TMOS@ vs MXM6  [SHORT] ===
  Bars (aligned): 895
  Closed positions: 17
  Net P&L (lnRatio): 0.0539
  Net Approx %:      5.537%
  Avg per-trade %:   0.318%
  WinRate:           94.1%
  ProfitFactor:      19.641
  Sharpe (per-trade):1.578
  MaxDrawdown:       0.289%
  BuyAndHold ratio:  4.426%
  Top trades (by |pnl|):
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0064  (0.639%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0052  (0.517%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0047  (0.473%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0046  (0.464%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0046  (0.463%)

--- SBER vs SBERP: Обыкновенные vs привилегированные акции Сбербанка
=== SBER vs SBERP  [LONG] ===
  Bars (aligned): 1728
  Closed positions: 37
  Net P&L (lnRatio): 0.0677
  Net Approx %:      7.003%
  Avg per-trade %:   0.183%
  WinRate:           83.8%
  ProfitFactor:      7.037
  Sharpe (per-trade):0.899
  MaxDrawdown:       0.364%
  BuyAndHold ratio:  -0.317%
  Top trades (by |pnl|):
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0053  (0.534%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0044  (0.437%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0043  (0.428%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0041  (0.415%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0038  (0.382%)
=== SBER vs SBERP  [SHORT] ===
  Bars (aligned): 1728
  Closed positions: 19
  Net P&L (lnRatio): 0.0548
  Net Approx %:      5.629%
  Avg per-trade %:   0.289%
  WinRate:           100.0%
  ProfitFactor:      ∞
  Sharpe (per-trade):1.228
  MaxDrawdown:       0.000%
  BuyAndHold ratio:  -0.317%
  Top trades (by |pnl|):
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0088  (0.881%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0080  (0.798%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0060  (0.605%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0044  (0.440%)
    2026-05-27 13:25 → 2026-05-27 13:25  lnP&L=0.0038  (0.378%)

# Done.
```
