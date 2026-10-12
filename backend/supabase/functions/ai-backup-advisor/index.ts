import { createClient } from 'npm:@supabase/supabase-js@2'
import { AdvisorFailure, createAdvisorHandler } from '../_shared/advisor-core.ts'
import { createGroqProvider } from '../_shared/groq-provider.ts'

function keysFromJson(name: string): Record<string, string> {
  try {
    const value = JSON.parse(Deno.env.get(name) ?? '{}') as Record<string, unknown>
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0))
  } catch { return {} }
}

const projectUrl = Deno.env.get('SUPABASE_URL')
const publicKeys = [Deno.env.get('SUPABASE_ANON_KEY'), ...Object.values(keysFromJson('SUPABASE_PUBLISHABLE_KEYS'))].filter((key): key is string => Boolean(key))
const secretKey = keysFromJson('SUPABASE_SECRET_KEYS').default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const rateLimitSecret = Deno.env.get('AI_RATE_LIMIT_SECRET')
const trustedIpHeader = Deno.env.get('AI_TRUSTED_IP_HEADER')?.toLowerCase()
const groq = createGroqProvider({ key: Deno.env.get('GROQ_API_KEY'), model: Deno.env.get('GROQ_MODEL') })

async function actorHash(kind: 'guest' | 'user', value: string): Promise<string> {
  if (!rateLimitSecret || rateLimitSecret.length < 32) {
    throw new AdvisorFailure('not_configured', 503, 'The advisor rate limit is not configured.')
  }
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(rateLimitSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${kind}:${value}`)))
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

const handler = createAdvisorHandler({
  authenticate: async request => {
    if (!projectUrl || publicKeys.length === 0) throw new AdvisorFailure('not_configured', 503, 'The advisor project configuration is missing.')
    const apiKey = request.headers.get('apikey')
    if (!apiKey || !publicKeys.includes(apiKey)) throw new AdvisorFailure('unauthorized', 401, 'The public project key is missing or invalid.')
    const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (bearer && !publicKeys.includes(bearer)) {
      const client = createClient(projectUrl, apiKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data, error } = await client.auth.getUser(bearer)
      if (error || !data.user) throw new AdvisorFailure('unauthorized', 401, 'Your session is invalid. Sign in again.')
      return { kind: 'user', id: data.user.id }
    }
    // The deployment must explicitly identify a header overwritten by its
    // trusted gateway. Never use caller-controlled x-forwarded-for here.
    if (!trustedIpHeader || !['cf-connecting-ip', 'x-real-ip'].includes(trustedIpHeader)) {
      throw new AdvisorFailure('not_configured', 503, 'Guest advisor access is not configured. Use the manual calculator.')
    }
    const address = request.headers.get(trustedIpHeader)?.trim()
    if (!address || address.length > 45 || !/^[0-9a-fA-F:.]+$/.test(address)) {
      throw new AdvisorFailure('unauthorized', 401, 'Guest network identification is unavailable. Use the manual calculator.')
    }
    return { kind: 'guest', networkAddress: address }
  },
  checkProviderConfiguration: () => {
    if (!Deno.env.get('GROQ_API_KEY')) throw new AdvisorFailure('not_configured', 503, 'The advisor model is not configured yet.')
    const model = Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-20b'
    if (!['openai/gpt-oss-20b', 'openai/gpt-oss-120b'].includes(model)) {
      throw new AdvisorFailure('not_configured', 503, 'The configured advisor model is not supported.')
    }
  },
  consumeQuota: async identity => {
    if (!projectUrl || !secretKey) throw new AdvisorFailure('not_configured', 503, 'The advisor quota service is not configured.')
    const key = await actorHash(identity.kind, identity.kind === 'guest' ? identity.networkAddress : identity.id)
    const admin = createClient(projectUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await admin.rpc('consume_ai_advisor_request_quota', { p_actor_kind: identity.kind, p_actor_key: key })
    if (error || typeof data !== 'boolean') throw new AdvisorFailure('provider_unavailable', 503, 'The advisor quota service is unavailable. Use the manual calculator.', true)
    return data
  },
  callProvider: groq,
})

Deno.serve(handler)
