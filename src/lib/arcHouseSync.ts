/**
 * Arc House sync.
 *
 * Arc House (community.arc.io) is a Gradual community. Its web app talks to one GraphQL endpoint,
 *   POST https://community.arc.io/api/graphql
 * which only accepts persisted queries (operation name + sha256 hash) and requires the member's
 * signed-in session cookie. It sends no CORS headers, so a browser cannot call it from another site.
 *
 * So the request has to run on community.arc.io itself, in the member's own signed-in browser.
 * The bookmarklet below does that and hands the responses to this dashboard with postMessage.
 * No credentials ever reach the dashboard; only the points/badge data does.
 *
 * The operation names and hashes were read from the site's public JavaScript. Their variables and
 * response shapes need a signed-in session to confirm, so extraction is deliberately loose
 * (see extractProfile / extractLeaderboard in ./arcHouse).
 */

export const ARC_HOUSE_ORIGIN = 'https://community.arc.io'
export const ARC_HOUSE_GRAPHQL_PATH = '/api/graphql'

export interface SyncOperation {
  key: string
  name: string
  hash: string
  variables: Record<string, unknown>
}

/** Edit `variables` here if DevTools shows the real requests send something other than {}. */
export const SYNC_OPERATIONS: SyncOperation[] = [
  { key: 'points', name: 'GetMyPointsInfo', hash: '52564b90cc384eaa4af3523f9efc6ed04055947a4e0c4b074efa958ac144b965', variables: {} },
  { key: 'contribution', name: 'MyContributionInfo', hash: '5bf03defb41da04098a216a3844c3596f6f63ee84d89c1cde36e70019efd2d9d', variables: {} },
  { key: 'total', name: 'MyTenantUserTotalContributions', hash: '7155e591ea036a802f22a49081c594d86ce3e952631d3838ac2e7df5aec1418b', variables: {} },
  { key: 'badges', name: 'GetBadges', hash: '6f8a5e68a853536e5728d912ea57be2e6b82e0eaaedadfd0067e104b0c893843', variables: {} },
  { key: 'leaderboard', name: 'GetTopContributionStatistics', hash: '2d82f2deed463451967903b5af2934902b3e637c971dd10e4364c91b19079dee', variables: {} },
]

export interface OperationResult {
  status: number
  body?: unknown
  error?: string
}

export interface SyncMessage {
  type: 'arc-house-sync'
  version: 1
  fetchedAt: number
  results: Record<string, OperationResult>
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

export function isSyncMessage(v: unknown): v is SyncMessage {
  return isRecord(v) && v.type === 'arc-house-sync' && v.version === 1 && isRecord(v.results)
}

/** Source of the bookmarklet. It runs on community.arc.io, so the fetch is same-origin and uses the user's session. */
export function buildBookmarklet(dashboardUrl: string): string {
  const dashOrigin = new URL(dashboardUrl).origin
  const ops = SYNC_OPERATIONS.map(({ key, name, hash, variables }) => ({ key, name, hash, variables }))
  const code = `(function(){
var ORIGIN=${JSON.stringify(ARC_HOUSE_ORIGIN)},DASH=${JSON.stringify(dashboardUrl)},DASH_ORIGIN=${JSON.stringify(dashOrigin)},OPS=${JSON.stringify(ops)};
if(location.origin!==ORIGIN){alert('Open community.arc.io and sign in first, then click this bookmark again.');return;}
var results={};
function onMsg(e){
  if(e.origin!==DASH_ORIGIN||!e.data||e.data.type!=='arc-house-ready')return;
  window.removeEventListener('message',onMsg);
  e.source.postMessage({type:'arc-house-sync',version:1,fetchedAt:Date.now(),results:results},DASH_ORIGIN);
}
var w=window.open(DASH,'arc-house-dashboard');
if(!w){alert('Allow pop-ups for community.arc.io, then try again.');return;}
Promise.all(OPS.map(function(o){
  return fetch(${JSON.stringify(ARC_HOUSE_GRAPHQL_PATH)},{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-locale':'en'},body:JSON.stringify({operationName:o.name,variables:o.variables,extensions:{persistedQuery:{version:1,sha256Hash:o.hash}}})})
  .then(function(r){return r.json().catch(function(){return null;}).then(function(b){results[o.key]={status:r.status,body:b};});})
  .catch(function(err){results[o.key]={status:0,error:String(err)};});
})).then(function(){window.addEventListener('message',onMsg);});
})();`
  return `javascript:${encodeURIComponent(code)}`
}

export interface SyncReport {
  fetchedAt: number
  statuses: { key: string; name: string; status: number }[]
  preview: string
}

export function buildReport(msg: SyncMessage): SyncReport {
  const statuses = SYNC_OPERATIONS.map((op) => ({ key: op.key, name: op.name, status: msg.results[op.key]?.status ?? 0 }))
  const preview = JSON.stringify(
    Object.fromEntries(Object.entries(msg.results).map(([k, r]) => [k, r.body ?? r.error ?? null])),
    null,
    2,
  ).slice(0, 4000)
  return { fetchedAt: msg.fetchedAt, statuses, preview }
}

/** The `data` payloads of every successful response. */
export function successfulData(msg: SyncMessage, keys?: string[]): unknown[] {
  return Object.entries(msg.results)
    .filter(([k, r]) => r.status >= 200 && r.status < 300 && (!keys || keys.includes(k)))
    .map(([, r]) => (isRecord(r.body) && 'data' in r.body ? r.body.data : r.body))
    .filter((d) => d !== undefined && d !== null)
}
