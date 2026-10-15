type SaveError = { code?: string; message?: string }
type SaveResponse = { data: { id: string } | null; error: SaveError | null }

export function toPlanSaveError(error: SaveError): Error {
  const detail = [error.message, error.code ? `(${error.code})` : null].filter(Boolean).join(' ')
  if (error.code === '23514') {
    if (/backup_plans_\d+_(configuration|appliances|results)_size_check/.test(error.message ?? '')) {
      return new Error('This backup plan is too large to save. Shorten long custom appliance details or reduce the list, then try again. No plan was saved.')
    }
    return new Error('This backup plan contains invalid saved data. Review its equipment and appliance details, then try again. No plan was saved.')
  }
  if (error.code === 'PGRST205') {
    return new Error(`PowerUp cannot find the backup_plans table in the Supabase project configured for this app. Verify VITE_SUPABASE_URL points to the intended project and that the saved-plan migrations have been applied. No plan was saved. ${detail}`)
  }
  if (error.code === '42501') {
    return new Error(`Supabase denied saving this plan. Confirm that the plan ID insert grant migration 20261012020000 has been applied to this project and that the signed-in user owns the plan. ${detail}`)
  }
  return new Error(detail || 'Supabase returned an unknown plan save error. No plan was saved.')
}

export function requireSavedPlanId(response: SaveResponse, missingMessage = 'The plan save returned no record. No plan was saved.'): string {
  if (response.error) throw toPlanSaveError(response.error)
  if (!response.data?.id) throw new Error(missingMessage)
  return response.data.id
}
