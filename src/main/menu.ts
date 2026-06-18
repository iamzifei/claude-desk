import { Menu, type MenuItemConstructorOptions } from 'electron'

/**
 * Custom application menu. We keep the Edit role (copy/paste/undo are essential
 * for text fields) and standard app/view roles, but deliberately OMIT the
 * Window > Close item so its default ⌘W accelerator doesn't get swallowed by
 * the menu — that frees ⌘W to reach the renderer for the configurable
 * "关闭对话 / 标签页" shortcut. The window can still be closed via its title bar.
 */
export function buildAppMenu(): Menu {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    { role: 'editMenu' },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }]
    }
  ]
  return Menu.buildFromTemplate(template)
}
