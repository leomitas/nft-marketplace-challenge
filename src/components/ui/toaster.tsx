import { Toaster as Sonner, toast } from 'sonner'

/**
 * App-wide toasts for mutation feedback. Sonner renders them in an aria-live region, so
 * screen readers announce success and failure without stealing focus.
 */
function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      theme="dark"
      closeButton
      toastOptions={{
        classNames: {
          toast: '!bg-surface-card !border-border-soft !text-foreground !font-sans',
          description: '!text-text-secondary',
          closeButton: '!bg-surface-dark !border-border-soft !text-foreground',
        },
      }}
      // Bottom of the screen, clear of the mobile tab bar and the detail buy bar
      offset={{ bottom: 24 }}
      mobileOffset={{ bottom: 180 }}
      containerAriaLabel="Notificações"
    />
  )
}

export { Toaster, toast }
