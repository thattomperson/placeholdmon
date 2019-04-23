// @preval

const Vibrant = require('node-vibrant')
const fs = require('fs')
const path = require('path')
const jimp = require('jimp')
const request = require('request-promise-native')
const mkdir = require('mkdirp')

const base = path.resolve('./src/assets');
const manifest = {}

function download(basePath, name, url) {
  if (!url) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    mkdir.sync(basePath)
    request.get(url)
    .pipe(fs.createWriteStream(path.join(basePath, `${name}.png`)))
    .on("finish", resolve)
  })
}


async function generate() {
  
  const manifest = {};
  if (process.env.REBUILD) {
    for (let i = 1; i <= 807; i ++) {
      console.log(`getting ${i}`)
      const res = await request.get(`https://pokeapi.co/api/v2/pokemon/${i}`)
      const d = JSON.parse(res)

      await Promise.all([
        download(path.join(base, d.name), 'normal', d.sprites.front_default),
        download(path.join(base, d.name), 'shiny', d.sprites.front_shiny)
      ])
    }
  }

  const folders = fs.readdirSync(base);
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
  };

  fs.writeFileSync("src/manifest.json", JSON.stringify(manifest))
}

generate()

