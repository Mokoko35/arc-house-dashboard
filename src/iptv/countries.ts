import type { Channel } from './types'

/** Channels whose name has no country prefix. */
export const NO_COUNTRY = '--'

// ISO 3166 two-letter codes that list makers use as prefixes ("TR: TRT 1", "[DE] ZDF", "US | CNN").
const CODES = new Set(
  (
    'AD AE AF AL AM AO AR AT AU AZ BA BD BE BF BG BH BI BJ BN BO BR BS BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ ' +
    'DE DJ DK DO DZ EC EE EG ER ES ET FI FJ FR GA GB GE GH GM GN GQ GR GT GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP ' +
    'KE KG KH KR KW KZ LA LB LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO ' +
    'NP NZ OM PA PE PG PH PK PL PR PS PT PY QA RO RS RU RW SA SC SD SE SG SI SK SL SM SN SO SR SS SV SY SZ TD TG TH TJ TM TN ' +
    'TR TT TW TZ UA UG US UY UZ VA VE VN XK YE ZA ZM ZW'
  ).split(' '),
)

const ALIASES: Record<string, string> = { UK: 'GB' }

// "[TR] Name" and "(TR) Name": the brackets are the separator.
const BRACKETED = /^\s*[[(]\s*([A-Za-z]{2})\s*[\])]/
// "TR: Name", "TR | Name", "|TR| Name", "TR - Name", "TR/Name".
const PREFIX = /^\s*\|?\s*([A-Za-z]{2})\s*\|?\s*(?::|\||-|–|—|\/)/

function codeFrom(text: string | undefined): string | null {
  const raw = text ? (BRACKETED.exec(text) ?? PREFIX.exec(text))?.[1]?.toUpperCase() : undefined
  if (!raw) return null
  const code = ALIASES[raw] ?? raw
  return CODES.has(code) ? code : null
}

/** The country a channel belongs to, read from its name, or else from its category. Null when there is none. */
export const countryOf = (channel: Channel): string | null => codeFrom(channel.name) ?? codeFrom(channel.group)

/** 🇹🇷 for "TR". Built from the code, so no table is needed. */
export function flagOf(code: string): string {
  if (code === NO_COUNTRY || code.length !== 2) return '\u{1F310}'
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

const names = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['tr'], { type: 'region' }) : null

export function countryName(code: string): string {
  if (code === NO_COUNTRY) return 'Diğer'
  try {
    return names?.of(code) ?? code
  } catch {
    return code
  }
}
