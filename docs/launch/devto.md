---
title: I drew my git history as tree rings instead of a heatmap
published: false
tags: showdev, javascript, typescript, canvas
---

# I drew my git history as tree rings instead of a heatmap

Every repo visualization looks the same. Contribution heatmap, commit-frequency line chart, a
grid of green squares. They are accurate and I have never once wanted to post one.

So I built [Ringwood](https://apps.charliekrug.com/ringwood/): paste a public GitHub repo and
it renders the commit history as the cross-section of a tree. One growth ring per calendar
year, ring width from that year's commit volume, color bands from the languages those commits
touched. It runs entirely in the browser against the public GitHub REST API. No backend, no
token, no signup.

The reason rings work is that nobody has to learn the format. Wide ring, good year. Thin ring,
quiet year. Dendrochronologists have been reading exactly this for a couple of centuries.
Commit history happens to have the same shape: a per-year magnitude you want to compare
against its own neighbours.

Two decisions were more interesting than I expected.

## Ring thickness has to be square-rooted

My first version scaled ring thickness linearly with a year's commit count. It looked wrong,
and it took me a while to work out why.

A ring is an annulus. Its *area* is a function of where it sits in the trunk, not just how
thick it is. A 10px ring at radius 200 covers far more pixels than a 10px ring at radius 20.
So under linear thickness scaling, a busy year late in the project reads as enormously bigger
than an equally busy year near the middle, purely because it is further out. The picture
exaggerates recent history, which is the specific thing I was trying to avoid.

Scaling by `sqrt(count / max)` compensates. Perceived growth then tracks actual commit volume
across the whole trunk instead of just the outer edge:

```ts
const normalized = Math.sqrt(y.commitCount / maxCount);
const thickness = MIN_THICKNESS + normalized * (1 - MIN_THICKNESS);
```

One `Math.sqrt` call, and the tree suddenly reads honestly.

The related choice: dormant years become thin rings rather than disappearing. If a project went
quiet for two years and came back, dropping those years would compress the timeline and lie
about the gap. Rendering them near the floor thickness gives you the scar, which is what a real
trunk does.

## Sampling languages without burning the rate limit

I wanted color bands per year showing which languages were being touched. GitHub will tell you
the files in a commit, but that is one API request per commit, and unauthenticated clients get
60 requests per hour. A repo with 40,000 commits is not going to happen.

The compromise is to sample. For each year, pick a handful of commits spread evenly across it,
always including the first and last, and aggregate the file extensions from just those:

```ts
const step = (items.length - 1) / (sampleSize - 1);
for (let i = 0; i < sampleSize; i += 1) {
  picked.push(items[Math.round(i * step)]);
}
```

Five commits per year is enough to characterize a year's language mix. It will not catch a
single afternoon spent in an unusual language, but it reliably catches "this was the year the
Python crept in," which is the thing you actually want to see.

The rate limit still exists, so the UI reads `X-RateLimit-Reset` off the 403 and tells you how
many minutes are left rather than failing silently. Being honest about a limit costs about ten
lines and is the difference between a broken toy and a working one.

## What I would do differently

The GitHub commits API is the bottleneck. Paginating full history for something the size of
`torvalds/linux` takes a while and eats most of an hour's anonymous quota. If I revisited this
I would look at whether the GraphQL API can return per-year commit counts in one request, which
would turn a hundred requests into one and make large repos instant.

I would also reconsider committing to canvas so early. Canvas gave me cheap animation and a
free `toDataURL` export, but ring hover detection meant hand-writing hit testing against
annulus geometry. SVG would have given me that for free through DOM events, at the cost of a
messier export path.

Try it on your own oldest repo. The shape is usually not what you remember.

- Live: [apps.charliekrug.com/ringwood](https://apps.charliekrug.com/ringwood/)
- Source: [github.com/ctkrug/ringwood](https://github.com/ctkrug/ringwood)
