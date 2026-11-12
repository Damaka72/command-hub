# Brand sheets

One JSON file per brand. Each holds what anything needs to make an on-brand social
post, presentation or infographic: colours (with what each is for), fonts, a default
card style, voice, imagery rules, where the logo is, and what not to do.

They are shown on the Creative Studio page (`/creative-studio`) and are the source
for Cowork's brand skills. Change a colour here and it changes everywhere.

- `source` says where the values were read from. They come from each site's own code,
  not from memory.
- `toConfirm` lists points only Didi can settle. Clear an item once it is decided.
- `card` is the default look for a social card: background, headline, accent and body
  colours, with an optional `alt` (the light or dark opposite) and `gradient`.

## Add a brand
1. Copy an existing file to `data/brands/<siteId>.json` and edit it. Use the same
   `siteId` as the site's tracker and its entry in `app/lib/sites.ts`.
2. Add one import line and one array entry in `app/lib/brandSheets.ts`.
