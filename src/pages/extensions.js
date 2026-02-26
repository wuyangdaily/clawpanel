/**
 * 扩展工具页面
 * cftunnel 隧道管理 + ClawApp 状态
 */
import { api } from '../lib/tauri-api.js'
import { toast } from '../components/toast.js'

let _delegated = false

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">扩展工具</h1>
      <p class="page-desc">管理 cftunnel 内网穿透和 ClawApp 移动客户端</p>
    </div>
    <div id="cftunnel-card" class="config-section">
      <div class="config-section-title">cftunnel 内网穿透</div>
      <div id="cftunnel-content">加载中...</div>
    </div>
    <div id="clawapp-card" class="config-section">
      <div class="config-section-title">ClawApp 移动客户端</div>
      <div id="clawapp-content">加载中...</div>
    </div>
  `

  bindEvents(page)
  loadAll(page)
  return page
}

async function loadAll(page) {
  await Promise.all([
    loadCftunnel(page),
    loadClawapp(page),
  ])
}

// ===== cftunnel =====

async function loadCftunnel(page) {
  const el = page.querySelector('#cftunnel-content')
  try {
    const status = await api.getCftunnelStatus()
    renderCftunnel(el, status)
  } catch (e) {
    el.innerHTML = `<div style="color:var(--error)">加载失败: ${e}</div>`
  }
}

function renderCftunnel(el, s) {
  if (!s.installed) {
    el.innerHTML = `
      <div style="color:var(--text-tertiary)">cftunnel 未安装</div>
      <a class="btn btn-primary btn-sm" href="https://github.com/qingchencloud/cftunnel" target="_blank" rel="noopener" style="margin-top:var(--space-md)">前往安装</a>
    `
    return
  }

  const running = s.running
  const routes = s.routes || []

  el.innerHTML = `
    <div class="stat-cards" style="margin-bottom:var(--space-md)">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">状态</span>
          <span class="status-dot ${running ? 'running' : 'stopped'}"></span>
        </div>
        <div class="stat-card-value">${running ? '运行中' : '已停止'}</div>
        <div class="stat-card-meta">${s.tunnel_name || ''}${s.pid ? ' (PID: ' + s.pid + ')' : ''}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header"><span class="stat-card-label">版本</span></div>
        <div class="stat-card-value" style="font-size:var(--font-size-md)">${s.version || '未知'}</div>
        <div class="stat-card-meta">${routes.length} 条路由</div>
      </div>
    </div>
    <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-md)">
      ${running
        ? '<button class="btn btn-danger btn-sm" data-action="cftunnel-down">停止隧道</button>'
        : '<button class="btn btn-primary btn-sm" data-action="cftunnel-up">启动隧道</button>'
      }
      <button class="btn btn-secondary btn-sm" data-action="cftunnel-logs">查看日志</button>
      <button class="btn btn-secondary btn-sm" data-action="cftunnel-refresh">刷新</button>
    </div>
    ${renderRoutes(routes)}
    <div id="cftunnel-logs-area"></div>
  `
}

function renderRoutes(routes) {
  if (!routes.length) return '<div style="color:var(--text-tertiary)">暂无路由</div>'
  return `
    <table class="data-table" style="margin-bottom:0">
      <thead><tr><th>名称</th><th>域名</th><th>本地服务</th></tr></thead>
      <tbody>
        ${routes.map(r => `
          <tr>
            <td>${r.name}</td>
            <td><a href="https://${r.domain}" target="_blank" rel="noopener">${r.domain}</a></td>
            <td><code>${r.service}</code></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

// ===== ClawApp =====

async function loadClawapp(page) {
  const el = page.querySelector('#clawapp-content')
  try {
    const status = await api.getClawappStatus()
    renderClawapp(el, status)
  } catch (e) {
    el.innerHTML = `<div style="color:var(--error)">加载失败: ${e}</div>`
  }
}

function renderClawapp(el, s) {
  const running = s.running
  el.innerHTML = `
    <div class="stat-cards" style="margin-bottom:var(--space-md)">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">状态</span>
          <span class="status-dot ${running ? 'running' : 'stopped'}"></span>
        </div>
        <div class="stat-card-value">${running ? '运行中' : '已停止'}</div>
        <div class="stat-card-meta">${s.pid ? 'PID: ' + s.pid : ''}${s.port ? ' 端口: ' + s.port : ''}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header"><span class="stat-card-label">访问地址</span></div>
        <div class="stat-card-value" style="font-size:var(--font-size-sm)">${s.url || 'http://localhost:3210'}</div>
        <div class="stat-card-meta">外网: chat.qrj.ai</div>
      </div>
    </div>
    <div style="display:flex;gap:var(--space-sm)">
      <a class="btn btn-primary btn-sm" href="${s.url || 'http://localhost:3210'}" target="_blank" rel="noopener">打开 ClawApp</a>
      <a class="btn btn-secondary btn-sm" href="https://chat.qrj.ai" target="_blank" rel="noopener">打开外网地址</a>
      <button class="btn btn-secondary btn-sm" data-action="clawapp-refresh">刷新</button>
    </div>
  `
}

// ===== 事件绑定 =====

function bindEvents(page) {
  if (_delegated) return
  _delegated = true

  page.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const action = btn.dataset.action

    switch (action) {
      case 'cftunnel-up':
        await handleCftunnelAction(page, 'up')
        break
      case 'cftunnel-down':
        await handleCftunnelAction(page, 'down')
        break
      case 'cftunnel-logs':
        await handleCftunnelLogs(page)
        break
      case 'cftunnel-refresh':
        await loadCftunnel(page)
        break
      case 'clawapp-refresh':
        await loadClawapp(page)
        break
    }
  })
}

async function handleCftunnelAction(page, action) {
  const label = action === 'up' ? '启动' : '停止'
  try {
    toast(`正在${label}隧道...`, 'info')
    await api.cftunnelAction(action)
    toast(`隧道已${label}`, 'success')
    await loadCftunnel(page)
  } catch (e) {
    toast(`${label}失败: ${e}`, 'error')
  }
}

async function handleCftunnelLogs(page) {
  const area = page.querySelector('#cftunnel-logs-area')
  if (!area) return
  // 切换显示
  if (area.innerHTML) {
    area.innerHTML = ''
    return
  }
  try {
    const logs = await api.getCftunnelLogs(30)
    area.innerHTML = `
      <div style="margin-top:var(--space-md)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm)">
          <span style="font-weight:600;font-size:var(--font-size-sm)">最近日志</span>
          <button class="btn btn-secondary btn-sm" data-action="cftunnel-logs">收起</button>
        </div>
        <pre class="log-viewer">${logs || '暂无日志'}</pre>
      </div>
    `
  } catch (e) {
    area.innerHTML = `<div style="color:var(--error);margin-top:var(--space-sm)">读取日志失败: ${e}</div>`
  }
}
