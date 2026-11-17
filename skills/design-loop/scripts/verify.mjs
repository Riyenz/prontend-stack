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
const browser = await launch(chromium)
const context = await browser.newContext({ viewport: { width: 1440, height: 944 }, deviceScaleFactor: 2 })
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

const labels = await page.locator('[data-design-variants] button').allInnerTexts()
for (const device of ['desktop', 'phone']) {
  await page.click(`[data-design-devices] button[data-device="${device}"]`)
  for (const [index, label] of labels.entries()) {
    await page.locator('[data-design-variants] button').nth(index).click()
    await page.waitForTimeout(900)
    const path = join(shotsDir, `${device}-${label.trim().replace(/[^\w.-]+/g, '_')}.png`)
    await page.locator('#screen').screenshot({ path })
    shots.push(path)
  }
}
await browser.close()

console.log(shots.join('\n'))
console.log(`variants: ${labels.length}  problems: ${problems.length}`)
for (const line of problems) console.log(`  ${line}`)
process.exit(problems.length || !labels.length ? 1 : 0)
