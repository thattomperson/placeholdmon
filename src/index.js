const fs = require('fs/promises');
const manifest = require('./manifest.json');
const jimp = require('jimp');
const { parse } = require('url');

function getPkmn(shiny = false, name) {
  const pkmn = manifest[shiny ? 'shiny' : 'normal'];
  const names = Object.keys(pkmn);
  if (!name || !pkmn[name]) {
    return pkmn[names[Math.floor(Math.random() * names.length)]];
  }

  return pkmn[name];
}

// var item = items[Math.floor(Math.random()*items.length)];

module.exports = async (req, res) => {
  if (req.headers.accept.includes('text/html')) {
    return res
      .status(200)
      .send((await fs.readFile('./src/index.html')).toString('utf-8'));
  }

  const { query, pathname } = parse(req.url, true);
  const pkmn = getPkmn('shiny' in query, query.name);

  const [fx, fy] = (pathname.slice(1) || '500x500').split('x');

  const padding = 10;
  if (fy < 2 * padding || fx < 2 * padding) {
    padding = 0;
  }
  const ah = fy - 2 * padding;
  const aw = fx - 2 * padding;

  let file = await jimp.read(Buffer.from(pkmn.file, 'base64'));
  const image = new jimp(fx, fy, pkmn.pallet);

  let h = file.getHeight();
  let w = file.getWidth();

  // make the img smaller if we have to
  if (h > ah || w > aw) {
    file = file.scaleToFit(aw, ah);
    h = file.getHeight();
    w = file.getWidth();
  }

  // make i larger if we can (up to 4x)
  if (ah >= 4 * h && aw >= 4 * w) {
    file.scaleToFit(4 * w, 4 * h, jimp.RESIZE_NEAREST_NEIGHBOR);
    h = file.getHeight();
    w = file.getWidth();
  } else if (ah >= 3 * h && aw >= 3 * w) {
    file.scaleToFit(3 * w, 3 * h, jimp.RESIZE_NEAREST_NEIGHBOR);
    h = file.getHeight();
    w = file.getWidth();
  } else if (ah >= 2 * h && aw >= 2 * w) {
    file.scaleToFit(2 * w, 2 * h, jimp.RESIZE_NEAREST_NEIGHBOR);
    h = file.getHeight();
    w = file.getWidth();
  }

  const out = await image
    .composite(file, padding, fy - padding - h)
    .getBufferAsync('image/png');

  res.writeHead(200, { 'Content-Type': 'image/png' });
  res.write(out);
  res.end();
};
