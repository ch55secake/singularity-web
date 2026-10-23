<script lang="ts">
  import Icon from './Icon.svelte'
  import { dismissToast, toasts } from '../lib/toast.svelte'
</script>

<div class="toast-region" aria-live="polite" aria-label="Notifications">
  {#each toasts as toast (toast.id)}
    <div class="toast {toast.tone}" role={toast.tone === 'error' ? 'alert' : 'status'}>
      <span class="tone"><Icon name={toast.tone === 'success' ? 'check' : toast.tone === 'error' ? 'alert' : 'info'} size={17} /></span>
      <span>{toast.message}</span>
      <button type="button" onclick={() => dismissToast(toast.id)} aria-label="Dismiss notification"><Icon name="close" size={15} /></button>
    </div>
  {/each}
</div>

<style>
  .toast-region { position: fixed; right: 1rem; bottom: 1rem; z-index: 50; display: grid; gap: 0.5rem; width: min(22rem, calc(100vw - 2rem)); pointer-events: none; }
  .toast { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.65rem; padding: 0.75rem; border: 1px solid var(--line); border-radius: 8px; background: color-mix(in srgb, var(--panel-2) 94%, transparent); box-shadow: 0 16px 40px rgb(0 0 0 / 0.4); backdrop-filter: blur(16px); font-size: 0.85rem; pointer-events: auto; animation: toast-in 220ms var(--ease-out) both; }
  .tone { width: 1.7rem; height: 1.7rem; display: grid; place-items: center; border-radius: 50%; color: var(--sapphire); background: color-mix(in srgb, var(--sapphire) 12%, transparent); }
  .success .tone { color: var(--good); background: color-mix(in srgb, var(--good) 12%, transparent); }
  .error .tone { color: var(--bad); background: color-mix(in srgb, var(--bad) 12%, transparent); }
  button { display: grid; place-items: center; padding: 0.25rem; border: 0; border-radius: 4px; background: none; color: var(--muted); cursor: pointer; }
  button:hover { color: var(--fg); background: rgb(255 255 255 / 0.05); }
  @keyframes toast-in { from { opacity: 0; transform: translateY(0.5rem) scale(0.98); } }
</style>
