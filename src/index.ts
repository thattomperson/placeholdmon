import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pokemon, homePage } from './manifest.json'
import jimp from 'jimp';
import { parse } from 'url'

function shinyChance() {
  return Math.round(Math.random()*100) === 1
}

function genderChance(variant) {
  return Math.round(Math.random()) === 1
}

function getPkmn(shiny = false, gender, name) {

  const names = Object.keys(pokemon);
  const pkmn = pokemon[name] ?? pokemon[names[Math.floor(Math.random()*names.length)]];
  const variant = pkmn['shiny'] && (shinyChance() || shiny) ? pkmn['shiny'] : pkmn['normal'];
  return variant['female'] && (genderChance(variant) || gender === 'female') && (gender !== 'male') ? variant['female'] : variant['default'];
}


module.exports = async (req: VercelRequest, res: VercelResponse) => {
  const html = req.headers.accept.includes('text/html');

  console.log(req.url)
  if (html && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(homePage);
    res.end()
    return;
  }

  const { query, pathname } = parse(req.url, true)

  if ('female' in query) {
    query.gender = 'female'
  } else if ('male' in query) {
    query.gender = 'male'
  }

  const names = Object.keys(query)
    .filter(key => pokemon[key])

  if (names.length > 0) {
    query.name = names[0];
  }

  const pkmn = getPkmn('shiny' in query, query.gender, query.name)

  const [fx, fy] = (pathname.slice(1) || '500x500').split('x').map(v => parseInt(v));

  let padding = 10;
  if (fy < 2*padding || fx < 2*padding) {
    padding = 0;
  }
  const ah = fy - 2*padding
  const aw = fx - 2*padding


  let file = await jimp.read(Buffer.from(pkmn.file, "base64"))
  const image = new jimp(fx, fy, pkmn.pallet)

  let h = file.getHeight();
  let w = file.getWidth();

  // make the img smaller if we have to
  if (h > ah || w > aw) {
    file = file.scaleToFit(aw, ah)
    h = file.getHeight();
    w = file.getWidth();
  }

  // make i larger if we can (up to 4x)
  if (ah >= 4*h && aw >= 4*w)  {
    file.scaleToFit(4*w, 4*h, jimp.RESIZE_NEAREST_NEIGHBOR)
    h = file.getHeight();
    w = file.getWidth();
  } else if (ah >= 3*h && aw >= 3*w)  {
    file.scaleToFit(3*w, 3*h, jimp.RESIZE_NEAREST_NEIGHBOR)
    h = file.getHeight();
    w = file.getWidth();
  } else if (ah >= 2*h && aw >= 2*w)  {
    file.scaleToFit(2*w, 2*h, jimp.RESIZE_NEAREST_NEIGHBOR)
    h = file.getHeight();
    w = file.getWidth();
  }


  const out = await image
    .composite(file, padding, fy-padding-h)
    .getBufferAsync("image/png")

  res.writeHead(200, { 'Content-Type': 'image/png' });
  res.write(out)
  res.end()
}
