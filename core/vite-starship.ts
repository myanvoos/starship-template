import fs from 'fs'
import { transform as esbuildTransform } from 'esbuild'
import { compile } from './compiler'

export function starshipPlugin() {
  return {
    name: 'vite-plugin-starship',
    async transform(src: string, id: string) {
      if (id.endsWith('.uss')) {
        const fileContent = fs.readFileSync(id, 'utf-8')

        const scriptMatch = fileContent.match(/<script>([\s\S]*?)<\/script>/)
        const styleMatch = fileContent.match(/<style>([\s\S]*?)<\/style>/)
        const templateMatch = fileContent.replace(/<script>([\s\S]*?)<\/script>|<style>([\s\S]*?)<\/style>/g, '')

        const templateContent = compile(templateMatch)

        const scriptContent = scriptMatch ? scriptMatch[1] : ''
        const styleContent = styleMatch ? styleMatch[1] : ''

        const styleInjectionCode = styleContent
          ? `
            const style = document.createElement('style')
            style.textContent = \`${styleContent}\`
            document.head.appendChild(style)
          `
          : ''

        const code = `
import { h, Show, Fragment, For } from "@dom"
import { createSignals, createSignal } from "@reactivity"
import { 
  effect, match, when, _, range,
  some, Some, None, ok, none, err, guard,
  Option, Result, Ok, Err, Pattern,
  unwrap, unwrapOr
} from "@framework"

${scriptContent}

${styleInjectionCode}

export default function Component() {
  return (
    <>
      ${templateContent}
    </>
  );
}
        `

        const result = await esbuildTransform(code, {
          loader: 'tsx',
          sourcemap: true,
          sourcefile: id,
          jsxFactory: 'h',
          jsxFragment: 'Fragment',
        })

        return {
          code: result.code,
          map: result.map,
        }
      }
    },
  }
}