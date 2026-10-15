import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vite = await createServer({ configFile: resolve(frontendRoot, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'custom' })
after(() => vite.close())
const { requireSavedPlanId, toPlanSaveError } = await vite.ssrLoadModule('/src/lib/plan-save.ts')

test('database size rejection gives clear guidance and no success result', () => {
  const error = { code: '23514', message: 'new row for relation "backup_plans" violates check constraint "backup_plans_01_appliances_size_check"' }
  assert.throws(() => requireSavedPlanId({ data: { id: 'should-not-be-used' }, error }), /too large to save.*No plan was saved/)
})

test('malformed saved JSON gives a clear error', () => {
  const error = { code: '23514', message: 'new row for relation "backup_plans" violates check constraint "backup_plans_10_configuration_shape_check"' }
  assert.throws(() => requireSavedPlanId({ data: null, error }), /invalid saved data.*No plan was saved/)
})

test('a missing insert or update result never counts as a saved plan', () => {
  assert.throws(() => requireSavedPlanId({ data: null, error: null }), /No plan was saved/)
  assert.equal(requireSavedPlanId({ data: { id: 'stable-plan-id' }, error: null }), 'stable-plan-id')
})

test('existing missing-table and access errors remain specific', () => {
  assert.match(toPlanSaveError({ code: 'PGRST205', message: 'missing table' }).message, /cannot find the backup_plans table/)
  assert.match(toPlanSaveError({ code: '42501', message: 'permission denied' }).message, /Supabase denied saving this plan/)
})
