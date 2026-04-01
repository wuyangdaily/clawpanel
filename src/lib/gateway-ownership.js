import { api } from './tauri-api.js'
import { showContentModal } from '../components/modal.js'
import { t } from './i18n.js'

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cliSourceLabel(source) {
  if (source === 'standalone') return t('dashboard.cliSourceStandalone')
  if (source === 'npm-zh') return t('dashboard.cliSourceNpmZh')
  if (source === 'npm-official') return t('dashboard.cliSourceNpmOfficial')
  if (source === 'npm-global') return t('dashboard.cliSourceNpmGlobal')
  return t('dashboard.cliSourceUnknown')
}

function openclawInstallationIdentity(installation) {
  const rawPath = String(installation?.path || '').trim()
  if (!rawPath) return ''
  const isWin = navigator.platform?.startsWith('Win') || navigator.userAgent?.includes('Windows')
  if (!isWin) return rawPath
  return rawPath
    .replace(/\//g, '\\')
    .replace(/\\openclaw(?:\.exe|\.ps1)?$/i, '\\openclaw.cmd')
    .toLowerCase()
}

function dedupeOpenclawInstallations(list = []) {
  const map = new Map()
  const preferCmd = inst => /openclaw\.cmd$/i.test(String(inst?.path || ''))
  for (const installation of Array.isArray(list) ? list : []) {
    const key = openclawInstallationIdentity(installation)
    if (!key) continue
    const existing = map.get(key)
    if (!existing || (!existing.active && installation.active) || (!preferCmd(existing) && preferCmd(installation))) {
      map.set(key, installation)
    }
  }
  return [...map.values()]
}

function readBoundCliPath(panelConfig) {
  return String(panelConfig?.openclawCliPath || '').trim()
}

let _foreignGatewayPromptKey = ''

export function isForeignGatewayService(service) {
  return service?.ownership === 'foreign' || (service?.running === true && service?.owned_by_current_instance === false)
}

export function isForeignGatewayError(error) {
  const text = String(error?.message || error || '')
  return text.includes('不属于当前面板实例')
    || text.includes('误接管')
    || text.includes('其他 OpenClaw Gateway')
}

export async function maybeShowForeignGatewayBindingPrompt({ service = null, onRefresh = null } = {}) {
  if (!isForeignGatewayService(service)) {
    _foreignGatewayPromptKey = ''
    return false
  }
  const panelConfig = await api.readPanelConfig().catch(() => null)
  if (readBoundCliPath(panelConfig)) {
    return false
  }
  const promptKey = `${service?.label || 'ai.openclaw.gateway'}::${service?.pid || 'unknown'}::${service?.ownership || 'foreign'}`
  if (_foreignGatewayPromptKey === promptKey) {
    return false
  }
  _foreignGatewayPromptKey = promptKey
  await showGatewayConflictGuidance({ service, onRefresh })
  return true
}

export async function showGatewayConflictGuidance({ error = null, service = null, onRefresh = null, reason = null } = {}) {
  const [versionInfo, dirInfo, panelConfig] = await Promise.all([
    api.getVersionInfo().catch(() => null),
    api.getOpenclawDir().catch(() => null),
    api.readPanelConfig().catch(() => null),
  ])

  const currentCli = versionInfo?.cli_path || t('common.unknown')
  const currentCliSource = cliSourceLabel(versionInfo?.cli_source)
  const currentDir = dirInfo?.path || t('common.unknown')
  const boundCliPath = readBoundCliPath(panelConfig)
  const displayBoundCliPath = boundCliPath || t('services.guidanceCliBindingAuto')
  const installations = dedupeOpenclawInstallations(Array.isArray(versionInfo?.all_installations) ? versionInfo.all_installations : [])
  const message = error ? escapeHtml(String(error.message || error)) : ''
  const pid = service?.pid || null
  const hasForeignGateway = reason === 'foreign-gateway'
    || (!!error && reason !== 'multiple-installations')
    || (reason !== 'multiple-installations' && isForeignGatewayService(service))
  const hasUnboundForeignGateway = hasForeignGateway && !boundCliPath
  const hasMultiInstall = reason === 'multiple-installations' || installations.length > 1
  const settingsLabel = t('sidebar.settings')
  const title = hasUnboundForeignGateway
    ? t('services.guidanceTitleForeignUnbound')
    : hasForeignGateway
      ? t('services.guidanceTitleForeign')
    : hasMultiInstall
      ? t('services.guidanceTitleMultiInstall')
      : t('services.guidanceTitleCheck')
  const summaryText = hasUnboundForeignGateway
    ? t('services.guidanceSummaryForeignUnbound')
    : hasForeignGateway
      ? t('services.guidanceSummaryForeign')
    : hasMultiInstall
      ? t('services.guidanceSummaryMultiInstall')
      : t('services.guidanceSummaryCheck')
  const suggestionOne = hasUnboundForeignGateway
    ? t('services.guidanceSuggestionBindAutoDetected', { settings: settingsLabel })
    : hasForeignGateway
      ? t('services.guidanceSuggestionBindForeign', { settings: settingsLabel })
    : t('services.guidanceSuggestionBind', { settings: settingsLabel })
  const suggestionTwo = hasForeignGateway
    ? t('services.guidanceSuggestionStopForeign')
    : t('services.guidanceSuggestionRefresh')
  const suggestionThree = t('services.guidanceSuggestionInstallations')
  const settingsButtonLabel = hasUnboundForeignGateway ? t('services.guidanceBindCliBtn') : t('sidebar.settings')

  const installationHtml = installations.length
    ? installations.map(inst => {
        const badges = [
        inst.active ? `<span class="clawhub-badge" style="font-size:11px">${escapeHtml(t('settings.cliActive'))}</span>` : '',
        inst.version ? `<span class="clawhub-badge" style="font-size:11px">${escapeHtml(t('settings.cliVersion'))}: ${escapeHtml(inst.version)}</span>` : '',
        inst.source ? `<span class="clawhub-badge" style="font-size:11px">${escapeHtml(cliSourceLabel(inst.source))}</span>` : '',
      ].filter(Boolean).join(' ')
      return `
        <div style="padding:10px 12px;border:1px solid var(--border-light);border-radius:10px;background:var(--bg-secondary);margin-top:8px">
          <div style="font-size:12px;word-break:break-all;font-family:var(--font-mono)">${escapeHtml(inst.path)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${badges}</div>
        </div>`
    }).join('')
    : `<div style="padding:10px 12px;border:1px dashed var(--border-light);border-radius:10px;background:var(--bg-secondary);margin-top:8px;color:var(--text-secondary)">${escapeHtml(t('services.guidanceNoInstallations', { settings: settingsLabel }))}</div>`

  const content = `
    <div style="display:flex;flex-direction:column;gap:12px;font-size:var(--font-size-sm);color:var(--text-secondary);line-height:1.7">
      <div style="padding:12px;border-radius:10px;background:rgba(245,158,11,0.12);color:var(--warning)">
        ${escapeHtml(summaryText)}
      </div>
      ${message ? `<div style="padding:10px 12px;border-radius:10px;background:var(--bg-secondary);font-family:var(--font-mono);word-break:break-all">${message}</div>` : ''}
      <div style="display:grid;grid-template-columns:1fr;gap:8px">
        <div><strong>${escapeHtml(t('services.guidanceCurrentBindingTitle'))}</strong><div style="margin-top:4px;font-family:var(--font-mono);word-break:break-all">${escapeHtml(displayBoundCliPath)}</div></div>
        <div><strong>${escapeHtml(t('settings.openclawCli'))}</strong><div style="margin-top:4px;font-family:var(--font-mono);word-break:break-all">${escapeHtml(currentCli)}</div><div style="margin-top:4px;color:var(--text-tertiary)">${escapeHtml(currentCliSource)}</div></div>
        <div><strong>${escapeHtml(t('settings.openclawDir'))}</strong><div style="margin-top:4px;font-family:var(--font-mono);word-break:break-all">${escapeHtml(currentDir)}</div></div>
        ${pid ? `<div><strong>PID</strong><div style="margin-top:4px">${escapeHtml(pid)}</div></div>` : ''}
      </div>
      <div>
        <strong>${escapeHtml(t('services.guidanceHandlingTitle'))}</strong>
        <div style="margin-top:6px">
          ${escapeHtml(suggestionOne)}
        </div>
        <div style="margin-top:6px">
          ${escapeHtml(suggestionTwo)}
        </div>
        <div style="margin-top:6px">
          ${escapeHtml(suggestionThree)}
        </div>
      </div>
      <div>
        <strong>${escapeHtml(t('services.guidanceInstallationsTitle'))}</strong>
        ${installationHtml}
      </div>
    </div>
  `

  const overlay = showContentModal({
    title,
    content,
    width: 760,
    buttons: [
      { id: 'gateway-conflict-open-settings', label: settingsButtonLabel, className: 'btn btn-primary btn-sm' },
      { id: 'gateway-conflict-refresh', label: t('services.refreshStatus'), className: 'btn btn-secondary btn-sm' },
    ],
  })

  overlay.querySelector('#gateway-conflict-open-settings')?.addEventListener('click', () => {
    overlay.close()
    window.location.hash = '#/settings'
  })

  overlay.querySelector('#gateway-conflict-refresh')?.addEventListener('click', async () => {
    overlay.close()
    if (typeof onRefresh === 'function') {
      await onRefresh()
    }
  })

  return overlay
}
