import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const htmlArg = process.argv[2]
if (!htmlArg) {
  console.error(`Usage: node ${process.argv[1]} <round html>, e.g. .design-lab/settings/round-1.html`)
  process.exit(1)
}

const TOOL_DIR = join(homedir(), '.cache/design-loop/playwright')

async function findChromium(fromDir) {
  const require = createRequire(join(fromDir, 'package.json'))
  for (const name of ['playwright', '@playwright/test', 'playwright-core']) {
    try {
      const module = await import(pathToFileURL(require.resolve(name)).href)
      const chromium = module.chromium ?? module.default?.chromium
      if (chromium) return chromium
    }
    catch {}
  }
  return null
}

async function loadChromium() {
  const found = await findChromium(process.cwd()) ?? await findChromium(TOOL_DIR)
  if (found) return found
  console.error(`Playwright is not in this repo. Installing it once into ${TOOL_DIR} (about 150 MB with Chromium)`)
  mkdirSync(TOOL_DIR, { recursive: true })
  execSync('npm init -y && npm i playwright && npx playwright install chromium', { cwd: TOOL_DIR, stdio: ['ignore', 2, 2] })
  const installed = await findChromium(TOOL_DIR)
  if (installed) return installed
  console.error(`Install failed. Run in ${TOOL_DIR}: npm i playwright && npx playwright install chromium`)
  process.exit(1)
}

async function launch(chromium) {
  try {
    return await chromium.launch()
  }
  catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error
    console.error('Installing the Chromium build this Playwright expects')
    execSync('npx playwright install chromium', { cwd: existsSync(join(TOOL_DIR, 'node_modules')) ? TOOL_DIR : process.cwd(), stdio: ['ignore', 2, 2] })
    return await chromium.launch()
  }
}

const chromium = await loadChromium()
const htmlFile = resolve(process.cwd(), htmlArg)
const fileUrl = pathToFileURL(htmlFile).href
const shotsDir = join(dirname(htmlFile), `${basename(htmlFile, '.html')}-shots`)
mkdirSync(shotsDir, { recursive: true })

const problems = []
const shots = []
const slop = new Map()

// Runs inside the screen. The 4 tells of references/ui-slop.md that computed styles can show.
function findSlop() {
  const found = []
  const describe = (element) => {
    const text = (element.innerText || element.textContent || '').trim().replace(/\s+/g, ' ')
    const classes = typeof element.className === 'string' ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : []
    return element.tagName.toLowerCase() + classes.map(name => `.${name}`).join('') + (text ? ` "${text.slice(0, 50)}${text.length > 50 ? '…' : ''}"` : '')
  }
  const shown = (style, box) => box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  const alpha = (color) => {
    if (color === 'transparent') return 0
    const slash = color.match(/\/\s*([\d.]+)(%?)\s*\)$/)
    if (slash) return Number(slash[1]) / (slash[2] ? 100 : 1)
    const rgba = color.match(/^rgba\((?:[^,]+,){3}\s*([\d.]+)\)$/)
    return rgba ? Number(rgba[1]) : 1
  }
  for (const element of document.body.querySelectorAll('*')) {
    const style = getComputedStyle(element)
    const box = element.getBoundingClientRect()
    if (!shown(style, box)) continue
    for (const [side, opposite] of [['left', 'right'], ['right', 'left']]) {
      const width = Number.parseFloat(style.getPropertyValue(`border-${side}-width`))
      const oppositeWidth = Number.parseFloat(style.getPropertyValue(`border-${opposite}-width`))
      const visible = style.getPropertyValue(`border-${side}-style`) !== 'none' && alpha(style.getPropertyValue(`border-${side}-color`)) > 0
      if (visible && width >= 2 && width > oppositeWidth && box.width >= 40 && box.height >= 24) found.push(`side stripe (${width}px ${side} border) on ${describe(element)}`)
    }
    const clip = `${style.getPropertyValue('background-clip')} ${style.getPropertyValue('-webkit-background-clip')}`
    if (clip.includes('text') && style.backgroundImage.includes('gradient')) found.push(`gradient text on ${describe(element)}`)
    const backdrop = `${style.getPropertyValue('backdrop-filter')} ${style.getPropertyValue('-webkit-backdrop-filter')}`
    // A see-through panel in the page flow. Sticky bars and modal overlays have content behind them, so blur is fair there.
    const seeThrough = alpha(style.backgroundColor) > 0.05 && alpha(style.backgroundColor) < 0.85
    const floating = style.position === 'fixed' || style.position === 'sticky'
    if (backdrop.includes('blur') && seeThrough && !floating) found.push(`frosted glass on ${describe(element)}`)
  }
  const emoji = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    if (parent && emoji.test(node.data) && shown(getComputedStyle(parent), parent.getBoundingClientRect())) found.push(`emoji as icon in ${describe(parent)}`)
  }
  return found
}
const browser = await launch(chromium)
const context = await browser.newContext({ viewport: { width: 1760, height: 1100 }, deviceScaleFactor: 2 })
const page = await context.newPage()

page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') problems.push(`console.${message.type()}: ${message.text().slice(0, 300)}`)
})
page.on('pageerror', error => problems.push(`page error: ${error.message.slice(0, 300)}`))
page.on('request', (request) => {
  const url = request.url()
  if (/^(data|blob|about):/.test(url) || url.split('#')[0] === fileUrl) return
  problems.push(`network: ${request.method()} ${url}`)
})

await page.goto(fileUrl)
try {
  await page.waitForSelector('body[data-ready="true"]', { timeout: 20000 })
}
catch {
  problems.push('the screen never sent design-lab:ready (blank or crashed lab page)')
}

// Every screen of every variant: a variant button, then each of its screen buttons when the round has screens.
const labels = new Set()
const variantButtons = page.locator('[data-design-variants] button')
const screenButtons = page.locator('[data-design-screens] button')
for (const device of ['desktop', 'phone']) {
  await page.click(`[data-design-devices] button[data-device="${device}"]`)
  for (let variant = 0; variant < await variantButtons.count(); variant++) {
    await variantButtons.nth(variant).click()
    const screens = await screenButtons.count()
    for (let screen = 0; screen < Math.max(screens, 1); screen++) {
      if (screens) await screenButtons.nth(screen).click()
      await page.waitForTimeout(900)
      const label = await page.evaluate(() => document.body.dataset.variant)
      labels.add(label)
      const path = join(shotsDir, `${device}-${label.trim().replace(/[^\w.-]+/g, '_')}.png`)
      await page.locator('#screen').screenshot({ path })
      shots.push(path)
      if (device === 'desktop') {
        const screenFrame = await (await page.$('#screen')).contentFrame()
        for (const line of await screenFrame.evaluate(findSlop)) {
          if (!slop.has(line)) slop.set(line, label)
        }
      }
    }
  }
}
await browser.close()

console.log(shots.join('\n'))
console.log(`screens: ${labels.size}  problems: ${problems.length}  slop: ${slop.size}`)
for (const line of problems) console.log(`  ${line}`)
for (const [line, label] of slop) console.log(`  slop: ${line}  (first in ${label})`)
process.exit(problems.length || !labels.size ? 1 : 0)
