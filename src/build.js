// @preval

const Vibrant = require('node-vibrant')
const fs = require('fs')
const path = require('path')
const jimp = require('jimp')
const fetch = require('node-fetch')
const mkdir = require('mkdirp')
const eachLimit =  require('async/eachLimit')
const ProgressBar = require('progress');


const base = path.resolve('./src/assets')
async function download(basePath, name, url) {
  if (!url) {
    return Promise.resolve()
  }
  
  await mkdir(basePath)
  return fetch(url)
    .then(res => res.body.pipe(fs.createWriteStream(path.join(basePath, `${name}.png`))))
}


async function generate() {
  const manifest = {};
  if (process.env.REBUILD) {
    const pokemon = await (await fetch(`https://pokeapi.co/api/v2/pokemon/?limit=10000`)).json()
    const bar = new ProgressBar('Downloading :current / :total', { total: pokemon.count });

    await eachLimit(pokemon.results, 20, async ({url}) => {
      const res = await (await fetch(url)).json()
      await Promise.all([
        download(path.join(base, res.name), 'normal', res.sprites.front_default),
        download(path.join(base, res.name), 'shiny', res.sprites.front_shiny)
      ])
      bar.tick()
    })
  }

  const folders = fs.readdirSync(base);
  const bar = new ProgressBar('Generating :current / :total', { total: folders.length });
  for (let i = 0; i < folders.length; i++) {
    const name = folders[i];
    const pkmn = {}

    const variants = fs.readdirSync(path.join(base, name));

    for (let j = 0; j < variants.length; j++) {
      const variant = variants[j];
    
      const image = await jimp.read(path.join(base, name, variant))
      const f = await image.autocrop().getBufferAsync("image/png")
      const pallet = await Vibrant.from(f).getPalette()
      pkmn[variant.replace('.png', '')] = {
        file: f.toString("base64"),
        pallet: jimp.rgbaToInt(...pallet.Vibrant.rgb, 255)
      }
    }

    manifest[name] = pkmn
    bar.tick()
  };

  fs.writeFileSync("src/manifest.json", JSON.stringify(manifest))
}

generate()

