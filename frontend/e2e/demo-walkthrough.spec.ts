import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Walks the key flows against a running, seeded stack and saves fresh
 * screenshots and a video to docs/screenshots/. Run with
 * `npm run demo:capture` (see playwright.config.ts).
 *
 * The seed is a real querying wave with real agents, so nothing here
 * edits it. The advisory and event-logging flows run against a clearly
 * fictional agency and two fictional agents that the script creates
 * through the API first and deletes again at the end.
 */

// Relative to frontend/, where npm runs the script.
const SHOTS = '../docs/screenshots'
const DEMO_USER = { email: 'robert@example.test', password: 'password' }
const DEMO = {
  agency: 'Demo Literary Agency',
  passed: 'Avery Demo',
  colleague: 'Blake Demo',
  reminder: 'Nudge Blake Demo if the query goes quiet',
}

interface Named { id: number; name: string }
interface Reminder { id: number; target: string; reason: string }
interface Manuscript { id: number; title: string }

/** Calls the JSON API from inside the page, with its session cookie and XSRF token. */
async function api<T = unknown>(page: Page, method: string, url: string, body?: unknown): Promise<T> {
  return page.evaluate(async ({ method, url, body }) => {
    const xsrf = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))
    const res = await fetch(`/api${url}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': xsrf ? decodeURIComponent(xsrf.slice('XSRF-TOKEN='.length)) : '',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${await res.text()}`)
    return (res.status === 204 ? null : await res.json()) as T
  }, { method, url, body })
}

/** Deletes anything a previous run left behind. Idempotent. */
async function removeDemoData(page: Page) {
  // Reminders first: they're polymorphic, so deleting an agent (which
  // cascades its threads) would leave them orphaned.
  const { data: reminders } = await api<{ data: Reminder[] }>(page, 'GET', '/reminders?filter=all')
  for (const r of reminders.filter((r) => r.target.includes(' Demo') || r.reason === DEMO.reminder)) {
    await api(page, 'DELETE', `/reminders/${r.id}`)
  }
  const { data: agents } = await api<{ data: Named[] }>(page, 'GET', '/agents')
  for (const a of agents.filter((a) => a.name === DEMO.passed || a.name === DEMO.colleague)) {
    await api(page, 'DELETE', `/agents/${a.id}`)
  }
  const { data: agencies } = await api<{ data: Named[] }>(page, 'GET', '/agencies')
  for (const a of agencies.filter((a) => a.name === DEMO.agency)) {
    await api(page, 'DELETE', `/agencies/${a.id}`)
  }
}

/**
 * A "one no means all no" agency with two agents, and an open thread
 * with the first. Returns the manuscript title the walkthrough uses.
 */
async function createDemoData(page: Page): Promise<string> {
  const { data: manuscripts } = await api<{ data: Manuscript[] }>(page, 'GET', '/manuscripts')
  const manuscript = manuscripts.find((m) => m.title === 'UNRESOLVED') ?? manuscripts[0]
  if (!manuscript) throw new Error('No manuscripts: is the stack seeded? Run `make fresh`.')

  const { data: agency } = await api<{ data: Named }>(page, 'POST', '/agencies', {
    name: DEMO.agency,
    one_no_means_all_no: true,
    notes: 'Fictional: created and removed by the demo walkthrough.',
  })
  const { data: passed } = await api<{ data: Named }>(page, 'POST', '/agents', {
    name: DEMO.passed, agency_id: agency.id,
  })
  await api(page, 'POST', '/agents', { name: DEMO.colleague, agency_id: agency.id })
  await api(page, 'POST', '/queries', {
    manuscript_id: manuscript.id,
    agent_id: passed.id,
    wave: 2,
    sent_at: new Date(Date.now() - 21 * 86_400_000).toISOString().slice(0, 10),
    materials: 'Query + first 10 pages in body',
  })
  return manuscript.title
}

async function shoot(page: Page, name: string, fullPage = false) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage })
}

test('demo walkthrough', async ({ page }) => {
  // ── Sign in ────────────────────────────────────────────────────────
  await page.goto('/login')
  await page.getByLabel('Email').pressSequentially(DEMO_USER.email, { delay: 30 })
  await page.getByLabel('Password').pressSequentially(DEMO_USER.password, { delay: 30 })
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Queries' })).toBeVisible()

  try {
    await removeDemoData(page)

    // ── The ledger, with a correspondence log open ───────────────────
    const nadol = page.getByRole('button', { name: /Jen Nadol/ })
    await expect(nadol, 'seeded thread missing: run `make fresh`').toBeVisible()
    await nadol.click()
    await expect(page.locator('.ledger__line').first()).toBeVisible()
    await shoot(page, 'queries', true)
    await nadol.click()

    // ── Reminders as seeded ──────────────────────────────────────────
    await page.getByRole('link', { name: /Reminders/ }).click()
    await expect(page.getByRole('heading', { name: 'Due' })).toBeVisible()
    await shoot(page, 'reminders', true)

    // ── Log an event: a pass from the first demo agent ───────────────
    const manuscript = await createDemoData(page)
    await page.getByRole('link', { name: 'Queries' }).click()
    const avery = page.getByRole('button', { name: new RegExp(DEMO.passed) })
    await avery.click()
    const caseFile = page.locator('.thread--open')
    await caseFile.getByLabel('Event').selectOption('rejected_form')
    await caseFile.getByLabel('Notes').pressSequentially('Form pass, same day', { delay: 25 })
    await caseFile.getByRole('button', { name: 'Record event' }).click()
    await expect(avery.locator('.badge')).toHaveText('Rejected')
    await expect(caseFile.getByText('Form pass, same day')).toBeVisible()
    await shoot(page, 'log-event')
    await avery.click()

    // ── The advisory: querying her colleague at the same agency ──────
    await page.getByRole('button', { name: 'Log query' }).click()
    const form = page.locator('form.newquery')
    await form.getByLabel('Manuscript').selectOption({ label: manuscript })
    await form.getByLabel('Agent').selectOption({ label: `${DEMO.colleague} — ${DEMO.agency}` })
    await form.getByLabel('Wave').fill('2')
    await form.getByLabel('Personalization')
      .pressSequentially('Loved her panel on quiet noir', { delay: 20 })
    await form.getByRole('button', { name: 'Log query' }).click()
    const advisory = page.locator('.warnbox')
    await expect(advisory).toContainText('one no means all no')
    await page.evaluate(() => window.scrollTo(0, 0))
    await shoot(page, 'advisory')

    // The new thread opens by default: set a reminder on it.
    const blakeCase = page.locator('.thread--open')
    await blakeCase.getByRole('button', { name: 'Set reminder' }).click()
    await blakeCase.getByLabel('Due').fill(new Date().toLocaleDateString('en-CA'))
    await blakeCase.getByLabel('Reason').pressSequentially(DEMO.reminder, { delay: 15 })
    await blakeCase.getByRole('button', { name: 'Set', exact: true }).click()
    await expect(blakeCase.getByText(/Reminder set for/)).toBeVisible()

    // ── Snooze it from the reminders desk ────────────────────────────
    await page.getByRole('link', { name: /Reminders/ }).click()
    const row = page.locator('.remrow', { hasText: DEMO.reminder })
    await row.getByRole('button', { name: 'Snooze 1w' }).click()
    await expect(page.locator('.toast', { hasText: 'Snoozed' })).toBeVisible()
    await page.waitForTimeout(1500)
  } finally {
    await removeDemoData(page)
  }

  // ── Stats, back on the seeded data only ────────────────────────────
  await page.getByRole('link', { name: 'Stats' }).click()
  await expect(page.getByText('Running the numbers…')).toBeHidden()
  await expect(page.locator('main')).not.toContainText('Demo')
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 10_000 })
  await shoot(page, 'stats', true)
  await page.waitForTimeout(1000)

  const video = page.video()
  await page.close()
  await video?.saveAs(`${SHOTS}/walkthrough.webm`)
})
