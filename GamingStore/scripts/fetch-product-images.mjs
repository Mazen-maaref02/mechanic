/**
 * Downloads brand images (Wikimedia Commons) and uploads them to the
 * product-images bucket on the production Supabase project.
 * Dev-only tool. Usage: node scripts/fetch-product-images.mjs "<service-key>" "<api-url>"
 */
const key = process.argv[2];
const apiUrl = process.argv[3].replace(/\/$/, "");

const UA = "TuniXpay-setupper/1.0 (deploy task; contact mazenmaaref@gmail.com)";

const IMAGES = [
  { file: "steam.png", source: "https://commons.wikimedia.org/wiki/Special:FilePath/Steam_icon_logo.svg?width=512" },
  { file: "playstation.png", source: "https://commons.wikimedia.org/wiki/Special:FilePath/PlayStation_logo.svg?width=640" },
  { file: "xbox.png", source: "https://commons.wikimedia.org/wiki/Special:FilePath/Xbox_logo.svg?width=640" },
  { file: "rockstar.png", source: "https://commons.wikimedia.org/wiki/Special:FilePath/Steam_icon_logo.svg?width=512", skip: true }, // placeholder replaced below if better found
  { file: "rockstar.png", alt: "https://commons.wikimedia.org/wiki/Special:FilePath/Red_Dead_Redemption_2%2C_cover.jpg?width=640" },
  { file: "hazelight.png", source: "https://commons.wikimedia.org/wiki/Special:FilePath/Hazelight_Studios_logo.svg?width=512" },
  { file: "fortnite.png", source: "https://commons.wikimedia.org/wiki/Special:FilePath/Fortnite_logo.svg?width=640" },
  { file: "binance.png", source: "https://commons.wikimedia.org/wiki/Special:FilePath/Binance_logo.svg?width=640" },
];

// 1) create the public bucket (ignore 409 duplicates)
{
  const r = await fetch(`${apiUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ id: "product-images", name: "product-images", public: true }),
  });
  console.log("bucket:", r.status, (await r.text()).slice(0, 200));
}

for (const img of IMAGES) {
  if (img.skip) continue;
  try {
    const res = await fetch(img.source, { headers: { "user-agent": UA }, redirect: "follow" });
    if (!res.ok) {
      console.log(`MISS  ${img.file}: HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) {
      console.log(`MISS  ${img.file}: tiny body (${buf.length}B)`);
      continue;
    }
    const up = await fetch(`${apiUrl}/storage/v1/object/product-images/${img.file}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": img.source.includes("?width") ? "image/svg+xml" : "image/*",
        "upsert": "true",
      },
      body: buf,
    });
    const txt = await up.text();
    console.log(`UPLOAD ${img.file}: HTTP ${up.status} ${txt.slice(0, 120)} (${buf.length}B)`);
  } catch (e) {
    console.log(`ERR   ${img.file}: ${String(e).slice(0, 150)}`);
  }
}
