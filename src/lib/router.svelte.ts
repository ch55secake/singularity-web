// Minimal history-API router: /, /m/<uuid>. Internal links are plain <a href="/...">.

export const route = $state({ path: location.pathname, hash: location.hash.slice(1) })

export function navigate(href: string) {
  const url = new URL(href, location.href)
  history.pushState({}, '', url)
  route.path = url.pathname
  route.hash = url.hash.slice(1)
  window.scrollTo(0, 0)
}

export function setHash(hash: string) {
  history.replaceState({}, '', hash ? `#${hash}` : location.pathname)
  route.hash = hash
}

window.addEventListener('popstate', () => {
  route.path = location.pathname
  route.hash = location.hash.slice(1)
})

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const a = (e.target as Element).closest('a')
  if (!a || a.target || !a.href.startsWith(location.origin)) return
  const url = new URL(a.href)
  if (url.pathname === location.pathname && url.hash) return
  e.preventDefault()
  navigate(a.href)
})
