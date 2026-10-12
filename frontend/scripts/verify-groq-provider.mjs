import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

async function localSecret(name) {
  if (process.env[name]) return process.env[name]
  let content
  try {
    content = await readFile(join(frontendRoot, '../backend/supabase/functions/.env'), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw error
  }
  const entry = content.split(/\r?\n/).find(line => line.trimStart().startsWith(`${name}=`))
  if (!entry) return undefined
  const value = entry.slice(entry.indexOf('=') + 1).trim()
  return value.replace(/^(['"])(.*)\1$/, '$2') || undefined
}

const key = await localSecret('GROQ_API_KEY')
if (!key) {
  console.error('GROQ_API_KEY is missing. Set it in the ignored backend/supabase/functions/.env file or this process environment.')
  process.exitCode = 1
} else {
  const vite = await createServer({ configFile: resolve(frontendRoot, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'custom' })
  try {
    const advisorShared = resolve(frontendRoot, '../backend/supabase/functions/_shared')
    const { createAdvisorHandler } = await vite.ssrLoadModule(resolve(advisorShared, 'advisor-core.ts'))
    const { createGroqProvider } = await vite.ssrLoadModule(resolve(advisorShared, 'groq-provider.ts'))
    const handler = createAdvisorHandler({
      authenticate: async () => ({ kind: 'user', id: 'local-verification' }),
      consumeQuota: async () => true,
      callProvider: createGroqProvider({ key, model: await localSecret('GROQ_MODEL') }),
    })
    const response = await handler(new Request('http://localhost/functions/v1/ai-backup-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        action: 'intake',
        locale: 'en',
        turns: [{ role: 'user', content: 'I need backup for a router during a four-hour outage.' }],
        confirmedInputs: {},
      }),
    }))
    const result = await response.json()
    if (!response.ok || result.action !== 'intake' || !Array.isArray(result.proposedChanges)) {
      const reason = typeof result.error?.message === 'string' ? ` ${result.error.message}` : ''
      console.error(`Groq provider check failed: HTTP ${response.status}, code ${result.error?.code || 'invalid_response'}.${reason}`)
      process.exitCode = 1
    } else {
      console.log('Groq provider check passed: structured intake response accepted.')
    }
  } catch {
    console.error('Groq provider check failed before a valid intake response was received.')
    process.exitCode = 1
  } finally {
    await vite.close()
  }
}
