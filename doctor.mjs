/**
 * doctor.mjs —— 插件自检脚本。
 *
 * 检查项（任一失败 → exit 1）：
 *   1. cordis.patch.yml 的 name 等于 package.json 的 name
 *   2. package.json 的 exports["./client"] 指向的文件存在（需先 build）
 *   3. package.json 的 main 指向的文件存在
 *   4. host 入口的 name 等于 package.json 的 name 且导出 apply
 *
 * 跨平台：Windows 上 import() 需要 file:// URL，用 pathToFileURL 转换。
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const problems = []

function check(condition, message) {
  if (!condition) problems.push(message)
}

// 1. package.json
const pkgPath = resolve(ROOT, 'package.json')
check(existsSync(pkgPath), `package.json 不存在: ${pkgPath}`)
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

// 2. cordis.patch.yml 的 name
const patchPath = resolve(ROOT, 'cordis.patch.yml')
check(existsSync(patchPath), `cordis.patch.yml 不存在: ${patchPath}`)
if (existsSync(patchPath)) {
  const patch = readFileSync(patchPath, 'utf-8')
  check(
    patch.includes(`name: '${pkg.name}'`) || patch.includes(`name: "${pkg.name}"`),
    `cordis.patch.yml 的 name 不等于 package.json name (${pkg.name})`,
  )
}

// 3. exports["./client"]
const clientPath = pkg.exports?.['./client']?.default
check(!!clientPath, 'package.json 缺少 exports["./client"]')
if (clientPath) {
  check(
    existsSync(resolve(ROOT, clientPath)),
    `exports["./client"] 指向的文件不存在: ${clientPath}（先运行 pnpm build）`,
  )
}

// 4. main 与 host 入口
check(!!pkg.main, 'package.json 缺少 main')
if (pkg.main) {
  const mainPath = resolve(ROOT, pkg.main)
  check(existsSync(mainPath), `main 指向的文件不存在: ${pkg.main}`)
  if (existsSync(mainPath)) {
    try {
      const mod = await import(pathToFileURL(mainPath).href)
      check(
        mod.name === pkg.name,
        `host 入口 name (${mod.name}) 不等于 package.json name (${pkg.name})`,
      )
      check(typeof mod.apply === 'function', 'host 入口缺少 apply 函数')
    } catch (e) {
      problems.push(`host 入口导入失败: ${e.message}`)
    }
  }
}

if (problems.length) {
  console.error('✗ doctor 发现问题:')
  for (const p of problems) console.error('  -', p)
  process.exit(1)
} else {
  console.log('✓ doctor 全部通过')
}