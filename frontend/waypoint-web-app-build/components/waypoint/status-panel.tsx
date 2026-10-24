export function StatusPanel({
  icon,
  title,
  message,
  tone = 'neutral',
  children,
}: {
  icon: React.ReactNode
  title: string
  message: string
  tone?: 'neutral' | 'error'
  children: React.ReactNode
}) {
  return (
    <section
      role={tone === 'error' ? 'alert' : undefined}
      className="mx-auto flex max-w-md flex-col items-center py-10 text-center"
    >
      <span
        className={
          tone === 'error'
            ? 'flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'
            : 'flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground'
        }
      >
        {icon}
      </span>
      <h1 className="mt-6 font-serif text-3xl font-medium text-balance">{title}</h1>
      <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{message}</p>
      <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row">{children}</div>
    </section>
  )
}
