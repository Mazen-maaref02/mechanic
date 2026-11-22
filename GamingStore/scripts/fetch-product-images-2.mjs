/**
 * Pass 2: fallback filenames + content-type fix for product-images bucket.
 * Usage: node scripts/fetch-product-images-2.mjs "<service-key>" "<api-url>"
 */
const key = process.argv[2];
const apiUrl = process.argv[3].replace(/\/$/, "");
const UA = "TuniXpay-setupper/1.0 (deploy task)";

// Each entry: try sources in order until one works.
const WANT = [
  { file: "xbox.png", sources: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/Xbox.svg?width=640",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Xbox_Logo.svg?width=640",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Xbox_logo_(2019).svg?width=640",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Xbox_logo_(2012).svg?width=640",
  ]},
  { file: "rockstar.png", sources: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/Rockstar_Games,_Inc._logo.svg?width=512",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Rockstar_Games_Logo.svg?width=512",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Rockstar_Games_logo.svg?width=512",
  ]},
  { file: "fortnite.png", sources: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/Fortnite_F_logo.svg?width=640",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Epic_Games_logo.svg?width=640",
    "https://commons.wikimedia.org/wiki/Special:FilePath/It_Takes_Two_cover_art.jpg?width=640",
  ]},
  { file: "ittakestwo.png", sources: [
    "https://en.wikipedia.org/wiki/Special:FilePath/It Takes Two cover art.jpg?width=640",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Hazelight_Studios_logo.svg?width=512",
  ]},
  // content-type fix for already-uploaded files
  { file: "steam.png", refresh: "https://commons.wikimedia.org/wiki/Special:FilePath/Steam_icon_logo.svg?width=512" },
  { file: "playstation.png", refresh: "https://commons.wikimedia.org/wiki/Special:FilePath/PlayStation_logo.svg?width=640" },
  { file: "binance.png", refresh: "https://commons.wikimedia.org/wiki/Special:FilePath/Binance_logo.svg?width=640" },
];

for (const item of WANT) {
  const sources = item.sources ?? [item.refresh];
  let ok = false;
  for (const src of sources) {
    try {
      const res = await fetch(src, { headers: { "user-agent": UA }, redirect: "follow" });
      if (!res.ok) { console.log(`  miss ${item.file} <- HTTP ${res.status} ${src.slice(-60)}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 400) { console.log(`  miss ${item.file}: tiny`); continue; }
      const up = await fetch(`${apiUrl}/storage/v1/object/product-images/${item.file}`, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "image/png", "x-upsert": "true",
                   "cache-control": "public, max-age=31536000" },
        body: buf,
      });
      const txt = await up.text();
      if (up.status === 200) { console.log(`OK  ${item.file} (${buf.length}B) from ${src.slice(-50).trim()}`); ok = true; break; }
      console.log(`  upfail ${item.file}: ${up.status} ${txt.slice(0, 120)}`);
    } catch (e) { console.log(`  err ${item.file}: ${String(e).slice(0, 120)}`); }
  }
  if (!ok && !item.refresh) console.log(`MISS  ${item.file} — leave null`);
}
