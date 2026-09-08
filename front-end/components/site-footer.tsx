const FOOTER_LINKS = [
  "Contacto",
  "Política de privacidad",
  "Términos de uso",
  "Política de cookies",
]

export function SiteFooter() {
  return (
    <footer className="mt-10 w-full border-t border-border pt-5 text-center text-xs text-muted-foreground">
      <nav aria-label="Enlaces informativos" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {FOOTER_LINKS.map((label) => (
          <a key={label} href="#" className="transition-colors hover:text-foreground">
            {label}
          </a>
        ))}
      </nav>
      <p className="mt-3">© {new Date().getFullYear()} Nexo Soporte</p>
    </footer>
  )
}
