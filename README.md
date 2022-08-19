# SQLite DB of all Stable Diffusion generated images

Not too long ago, someone in the Stable Diffusion Discord server shared a text file containing links to every image generated with the tool. This repository contains some code to convert that file to a SQLite database for easy querying. [Prebuild ImageLinks.db file provided here](https://drive.google.com/file/d/1ZtoB-dsaVj_gv_EqZIbR71s_P4Cdkcih/view?usp=sharing) (2.9gb)

Structure of the database is two tables:

- `prompts`, with a primary key `id` and a string `prompt`
- `data` which has a `promptId` and a `url`, among extra metadata columns

The converter is written using Node.js and better-sqlite3, and took 162 seconds to convert on my desktop.

There is also an implementation with Bun, but it doesn't work for me due to a bug. Were it to work, it would run over 3x faster than the node implementation.

To run, you need an extracted copy of [ImageLinks.zip](https://drive.google.com/file/d/14_CRrWMw20OSSd5ZA-7epXdWF3DlwM8g/view) (2.5gb). Then you can run `bun convert.ts` or `node convert.mjs`.

Maybe in the future, a web app / public web api will be made to query the database without storing a local copy. I could do this but I wouldn't be able to fund a server to hold the database (ideally use postgres instead of sqlite).
