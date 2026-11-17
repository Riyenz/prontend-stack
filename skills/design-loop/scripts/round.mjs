import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { inlineSite } from './inline.mjs'

const LAB_CONFIG = '.claude/skills/design-lab/lab.json'

const roundArg = process.argv[2]
if (!roundArg) {
  console.error(`Usage: node ${process.argv[1]} <round folder>, e.g. .design-lab/settings/round-1`)
  process.exit(1)
}
const roundDir = resolve(process.cwd(), roundArg)
if (!existsSync(roundDir)) {
  console.error(`No such folder: ${roundDir}`)
  process.exit(1)
}

function findRepoRoot(from) {
  let dir = from
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, LAB_CONFIG))) return dir
    dir = dirname(dir)
  }
  return null
}

const repoDir = findRepoRoot(roundDir)
if (!repoDir) {
  console.error(`No ${LAB_CONFIG} above ${roundDir}. Run the create-design-lab skill in this repo first.`)
  process.exit(1)
}
const lab = JSON.parse(readFileSync(join(repoDir, LAB_CONFIG), 'utf8'))

const designDir = dirname(roundDir)
const workRoot = dirname(designDir)
if (basename(workRoot) === '.design-lab' && !existsSync(join(workRoot, '.gitignore'))) {
  writeFileSync(join(workRoot, '.gitignore'), '*\n')
}

const round = basename(roundDir)
const buildDir = join(designDir, '.build', round)
const distDir = join(buildDir, 'dist')
const logFile = join(buildDir, 'build.log')
rmSync(distDir, { recursive: true, force: true })
mkdirSync(buildDir, { recursive: true })

const command = lab.build
  .replaceAll('{round}', JSON.stringify(roundDir))
  .replaceAll('{dist}', JSON.stringify(distDir))
  .replaceAll('{build}', JSON.stringify(buildDir))

const started = Date.now()
try {
  const output = execSync(`${command} 2>&1`, { cwd: repoDir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  writeFileSync(logFile, output)
}
catch (error) {
  writeFileSync(logFile, String(error.stdout ?? error))
  const lines = String(error.stdout ?? error).split('\n')
  const errors = lines.filter(line => /error/i.test(line)).slice(0, 15)
  console.error(`Lab build failed. Log: ${relative(process.cwd(), logFile)}`)
  console.error((errors.length ? errors : lines.slice(-25)).join('\n'))
  process.exit(1)
}
const built = Date.now()

if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`The lab build wrote no ${relative(process.cwd(), join(distDir, 'index.html'))}. Check ${LAB_CONFIG}.`)
  process.exit(1)
}

const publicDir = lab.public ? join(repoDir, lab.public) : undefined
const { html: screen, leftovers, inlinedAssets } = await inlineSite(distDir, { publicDir })
if (leftovers.length) {
  console.warn(`Not inlined (the lab must bundle into one script and one stylesheet): ${leftovers.join(', ')}`)
}

const title = `${basename(designDir)} · ${round}`
const viewer = readFileSync(new URL('./viewer.html', import.meta.url), 'utf8')
  .replaceAll('__TITLE__', title.replace(/[<>&"]/g, ''))
  .replace('__SCREEN__', () => JSON.stringify(screen).replace(/</g, '\\u003c'))

const htmlFile = join(designDir, `${round}.html`)
writeFileSync(htmlFile, viewer)

const megabytes = (Buffer.byteLength(viewer) / 1024 / 1024).toFixed(2)
const images = inlinedAssets.length ? `, ${inlinedAssets.length} files inlined` : ''
console.log(`${relative(process.cwd(), htmlFile)}  ${megabytes} MB  built in ${((Date.now() - started) / 1000).toFixed(1)} s (lab ${((built - started) / 1000).toFixed(1)} s)${images}`)
