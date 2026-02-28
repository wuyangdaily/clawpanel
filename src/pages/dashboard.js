/**
 * 仪表盘页面
 */
import { api } from '../lib/tauri-api.js'
import { toast } from '../components/toast.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">仪表盘</h1>
      <p class="page-desc">OpenClaw 运行状态概览</p>
    </div>
    <div class="stat-cards" id="stat-cards">
      <div class="stat-card loading-placeholder"></div>
      <div class="stat-card loading-placeholder"></div>
      <div class="stat-card loading-placeholder"></div>
      <div class="stat-card loading-placeholder"></div>
    </div>
    <div class="quick-actions">
      <button class="btn btn-secondary" id="btn-restart-gw">重启 Gateway</button>
      <button class="btn btn-secondary" id="btn-check-update">检查更新</button>
    </div>
    <div class="config-section">
      <div class="config-section-title">最近日志</div>
      <div class="log-viewer" id="recent-logs" style="max-height:300px">加载中...</div>
    </div>
  `

  // 异步加载数据
  loadDashboardData(page)
  return page
}

async function loadDashboardData(page) {
  const [servicesRes, versionRes, logsRes] = await Promise.allSettled([
    api.getServicesStatus(),
    api.getVersionInfo(),
    api.readLogTail('gateway', 20),
  ])

  const services = servicesRes.status === 'fulfilled' ? servicesRes.value : []
  const version = versionRes.status === 'fulfilled' ? versionRes.value : {}
  const logs = logsRes.status === 'fulfilled' ? logsRes.value : ''

  if (servicesRes.status === 'rejected') toast('服务状态加载失败', 'error')
  if (versionRes.status === 'rejected') toast('版本信息加载失败', 'error')
  if (logsRes.status === 'rejected') toast('日志加载失败', 'error')

  renderStatCards(page, services, version)
  renderLogs(page, logs)
  bindActions(page)
}

function renderStatCards(page, services, version) {
  const cardsEl = page.querySelector('#stat-cards')
  const gw = services.find(s => s.label === 'ai.openclaw.gateway')
  const runningCount = services.filter(s => s.running).length

  cardsEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">Gateway</span>
        <span class="status-dot ${gw?.running ? 'running' : 'stopped'}"></span>
      </div>
      <div class="stat-card-value">${gw?.running ? '运行中' : '已停止'}</div>
      <div class="stat-card-meta">${gw?.pid ? 'PID: ' + gw.pid : '未启动'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">版本 · ${version.source === 'official' ? '官方' : '汉化'}</span>
      </div>
      <div class="stat-card-value">${version.current || '未知'}</div>
      <div class="stat-card-meta">${version.update_available ? '有新版本: ' + version.latest : '已是最新'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">服务</span>
      </div>
      <div class="stat-card-value">${runningCount}/${services.length}</div>
      <div class="stat-card-meta">运行中</div>
    </div>
  `
}

function renderLogs(page, logs) {
  const logsEl = page.querySelector('#recent-logs')
  if (!logs) { logsEl.textContent = '暂无日志'; return }
  const lines = logs.trim().split('\n')
  logsEl.innerHTML = lines.map(l => `<div class="log-line">${escapeHtml(l)}</div>`).join('')
  logsEl.scrollTop = logsEl.scrollHeight
}

function bindActions(page) {
  const btnRestart = page.querySelector('#btn-restart-gw')
  const btnUpdate = page.querySelector('#btn-check-update')

  btnRestart?.addEventListener('click', async () => {
    btnRestart.disabled = true
    btnRestart.textContent = '重启中...'
    try {
      await api.restartService('ai.openclaw.gateway')
      toast('Gateway 已重启', 'success')
      setTimeout(() => loadDashboardData(page), 500)
    } catch (e) {
      toast('重启失败: ' + e, 'error')
    } finally {
      btnRestart.disabled = false
      btnRestart.textContent = '重启 Gateway'
    }
  })

  btnUpdate?.addEventListener('click', async () => {
    btnUpdate.disabled = true
    btnUpdate.textContent = '检查中...'
    try {
      const info = await api.getVersionInfo()
      if (info.update_available) {
        toast(`发现新版本: ${info.latest}`, 'info')
      } else {
        toast('已是最新版本', 'success')
      }
    } catch (e) {
      toast('检查更新失败: ' + e, 'error')
    } finally {
      btnUpdate.disabled = false
      btnUpdate.textContent = '检查更新'
    }
  })
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
