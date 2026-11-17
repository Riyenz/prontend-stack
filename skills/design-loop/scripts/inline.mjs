import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, extname, join, relative, resolve } from 'node:path'

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const FONT_CACHE_DIR = join(homedir(), '.cache/design-loop/fonts')
const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
}
const ASSET_PATH = /(["'(])(\.{0,2}\/(?:[\w@.-]+\/)*[\w@.-]+\.(?:png|jpe?g|webp|avif|svg|gif|ico|woff2?|ttf|otf))(?=["')?#])/g

async function fetchGoogleFontCss(url) {
  const cacheFile = join(FONT_CACHE_DIR, `${createHash('sha1').update(url).digest('hex')}.css`)
  if (existsSync(cacheFile)) return readFileSync(cacheFile, 'utf8')
  const sheet = await (await fetch(url, { headers: { 'User-Agent': CHROME_UA } })).text()
  let inlined = sheet
  for (const [, fontUrl] of sheet.matchAll(/url\((https:[^)]+)\)/g)) {
    const bytes = Buffer.from(await (await fetch(fontUrl)).arrayBuffer())
    inlined = inlined.replace(fontUrl, `data:font/woff2;base64,${bytes.toString('base64')}`)
  }
  mkdirSync(FONT_CACHE_DIR, { recursive: true })
  writeFileSync(cacheFile, inlined)
  return inlined
}

async function inlineGoogleFontImports(css) {
  let out = css
  for (const match of css.matchAll(/@import\s*(?:url\()?["']?(https:\/\/fonts\.googleapis\.com\/[^"')]+)["']?\)?\s*;/g)) {
    out = out.replace(match[0], '') + await fetchGoogleFontCss(match[1])
  }
  return out
}

function listFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) listFiles(path, out)
    else out.push(path)
  }
  return out
}

export async function inlineSite(distDir, { publicDir } = {}) {
  const used = new Set([join(distDir, 'index.html')])
  const inlinedAssets = new Set()

  function resolveAsset(path, fromDir) {
    const candidates = path.startsWith('/')
      ? [join(distDir, path), publicDir && join(publicDir, path)]
      : [resolve(fromDir, path), join(distDir, path)]
    return candidates.find(file => file && existsSync(file) && statSync(file).isFile())
  }

  function inlineAssetPaths(code, fromDir) {
    return code.replace(ASSET_PATH, (whole, quote, path) => {
      const file = resolveAsset(path, fromDir)
      const mime = MIME[extname(path).toLowerCase()]
      if (!file || !mime) return whole
      used.add(file)
      inlinedAssets.add(relative(distDir, file))
      return `${quote}data:${mime};base64,${readFileSync(file).toString('base64')}`
    })
  }

  function readBuilt(href) {
    const file = resolveAsset(href.replace(/^\.\//, '/'), distDir)
    if (!file) throw new Error(`Built file not found: ${href}`)
    used.add(file)
    return { code: readFileSync(file, 'utf8'), dir: dirname(file) }
  }

  let html = readFileSync(join(distDir, 'index.html'), 'utf8')

  for (const [tag, href] of [...html.matchAll(/<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"[^>]*>/g)]) {
    const css = await fetchGoogleFontCss(href.replace(/&amp;/g, '&'))
    html = html.replace(tag, () => `<style>${css}</style>`)
  }
  html = html.replace(/<link[^>]+rel="preconnect"[^>]*>/g, '')

  for (const [tag, href] of [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>|<link[^>]*href="([^"]+\.css)"[^>]*rel="stylesheet"[^>]*>/g)].map(match => [match[0], match[1] ?? match[2]])) {
    if (/^https?:/.test(href)) continue
    const { code, dir } = readBuilt(href)
    const css = inlineAssetPaths(await inlineGoogleFontImports(code), dir)
    html = html.replace(tag, () => `<style>${css}</style>`)
  }
  html = html.replace(/<link[^>]+rel="(?:modulepreload|preload|prefetch)"[^>]*>/g, '')

  for (const match of [...html.matchAll(/<script([^>]*)\ssrc="([^"]+)"([^>]*)><\/script>/g)]) {
    const [tag, before, src, after] = match
    if (/^https?:/.test(src)) continue
    const isModule = /type="module"/.test(before + after)
    const { code, dir } = readBuilt(src)
    const js = inlineAssetPaths(code, dir).replace(/<\/script/gi, '<\\/script')
    html = html.replace(tag, '')
    html = html.replace('</body>', () => `<script${isModule ? ' type="module"' : ''}>${js}</script></body>`)
  }

  html = inlineAssetPaths(html, distDir)

  const leftovers = listFiles(distDir)
    .filter(file => /\.(js|mjs|css)$/.test(file) && !used.has(file))
    .map(file => relative(distDir, file))
  return { html, leftovers, inlinedAssets: [...inlinedAssets] }
}
