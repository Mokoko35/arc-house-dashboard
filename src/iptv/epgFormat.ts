export const clock = (ms: number): string => new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

export const dateTime = (ms: number): string => new Date(ms).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const megabytes = (bytes: number): string => `${(bytes / 1_048_576).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`
