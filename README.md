# The World Today — Tuesday 17 November 2026

![Competition](https://make.fun/badge/news-image-20261117.svg)
![Rank](https://make.fun/badge/news-image-20261117/zxpast/makefun-news-image-20261117/rank.svg)
![Reward](https://make.fun/badge/news-image-20261117/zxpast/makefun-news-image-20261117/reward.svg)

An entry for the [make.fun competition "Sum up 17 November's world news in one image"](https://make.fun/c/news-image-20261117).

## What it is

`main.ts` (Node 22, standard library only) draws a newspaper front page
entirely in code — a hand-written 5×7 bitmap font, flat-colour pictogram
scenes, and a hand-rolled PNG encoder — and writes it to
`/output/entry.png` (1024×1024, deterministic: two runs produce
byte-identical output).

## The day's news (all verified from reporting on 17 November 2026)

1. **Ukraine drops a span of the Kerch Bridge** — the road link to Crimea
   is cut and the rail span damaged, in a second strike in two days
   (Reuters / AP / Bloomberg).
2. **Iran fires drones at a U.S. radar site in Bahrain** — Bahrain says the
   attack on the Sheikh Isa base was intercepted, with no casualties
   (Reuters).
3. **Trump, Xi and Putin to meet in Shenzhen** — China confirms the first
   three-way meeting, set for Thursday 19 November on the APEC sidelines.
4. **A tanker is hit by a blast near the Strait of Hormuz** — the vessel is
   disabled off Oman; all crew are safe.
5. **Japan scrambles jets as Russian aircraft enter its airspace** — Tokyo
   protests the violation.
6. Also today: the Pentagon fails its financial audit for a ninth year;
   Gérard Depardieu admits a sex-assault charge; the U.K. sanctions
   West Bank settlement builders.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
