/**
 * ClawPanel 入口
 */
import { registerRoute, initRouter } from './router.js'
import { renderSidebar } from './components/sidebar.js'
import { initTheme } from './lib/theme.js'

// 样式
import './style/variables.css'
import './style/reset.css'
import './style/layout.css'
import './style/components.css'
import './style/pages.css'

// 注册页面路由（懒加载）
registerRoute('/dashboard', () => import('./pages/dashboard.js'))
registerRoute('/services', () => import('./pages/services.js'))
registerRoute('/logs', () => import('./pages/logs.js'))
registerRoute('/models', () => import('./pages/models.js'))
registerRoute('/gateway', () => import('./pages/gateway.js'))
registerRoute('/memory', () => import('./pages/memory.js'))
registerRoute('/extensions', () => import('./pages/extensions.js'))
registerRoute('/about', () => import('./pages/about.js'))

// 初始化主题
initTheme()

// 初始化
const sidebar = document.getElementById('sidebar')
const content = document.getElementById('content')

renderSidebar(sidebar)
initRouter(content)

// 路由变化时刷新侧边栏高亮
window.addEventListener('hashchange', () => renderSidebar(sidebar))
