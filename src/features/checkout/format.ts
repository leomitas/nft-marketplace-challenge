/** "0xA91F…E82C": enough to recognize an address or hash without the full 42+ characters. */
export function shortHex(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso))
}
