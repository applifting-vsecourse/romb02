import { expect, test, type Page } from "@playwright/test"

import { signIn } from "./signIn"

const API = "http://localhost:4050/api"

async function findQuackNotBy(page: Page, username: string): Promise<{ id: string }> {
  const quacks: { id: string; user: { username: string } }[] = await (
    await page.request.get(`${API}/quacks`)
  ).json()
  return quacks.find((quack) => quack.user.username !== username)!
}

test("author can post a quack and delete it", async ({ page }) => {
  const text = `E2E quack ${Date.now()}`
  await signIn(page, "caffeinatedduck@example.com", "password1")
  await page.goto("/quacks")

  await page.getByLabel("New quack").fill(text)
  await page.getByRole("button", { name: "Quack", exact: true }).click()
  const quack = page.getByRole("article").filter({ hasText: text })
  await expect(quack).toBeVisible()

  await quack.getByRole("button", { name: "Delete quack" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Delete this quack?" })
  await dialog.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(quack).toHaveCount(0)
})

// Admins can moderate too. The seeded admin's credentials come from the
// backend's SUPERADMIN_* config; the fallbacks are the .env.example defaults.
const moderators = [
  { role: "moderator", email: "moderator@example.com", password: "password6" },
  {
    role: "admin",
    email: process.env.SUPERADMIN_EMAIL ?? "admin@example.com",
    password: process.env.SUPERADMIN_PASSWORD ?? "adminpassword",
  },
]

for (const { role, email, password } of moderators) {
  test(`${role} can delete someone else's quack`, async ({ browser, page }) => {
    // The author posts in their own browser context, so both sessions stay signed in.
    const text = `E2E nasty quack for ${role} ${Date.now()}`
    const authorContext = await browser.newContext()
    const authorPage = await authorContext.newPage()
    await signIn(authorPage, "caffeinatedduck@example.com", "password1")
    await authorPage.goto("/quacks")
    await authorPage.getByLabel("New quack").fill(text)
    await authorPage.getByRole("button", { name: "Quack", exact: true }).click()
    await expect(authorPage.getByRole("article").filter({ hasText: text })).toBeVisible()

    await signIn(page, email, password)
    await page.goto("/quacks")
    const quack = page.getByRole("article").filter({ hasText: text })
    await quack.getByRole("button", { name: "Delete quack" }).click()

    const dialog = page.getByRole("alertdialog", { name: "Delete @CaffeinatedDuck's quack?" })
    await expect(dialog).toContainText("You're removing it as a moderator.")
    await dialog.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(quack).toHaveCount(0)

    // Gone for the author too, not just hidden from the moderator.
    await authorPage.reload()
    await expect(authorPage.getByRole("article").filter({ hasText: text })).toHaveCount(0)
    await authorContext.close()
  })
}

test("nobody can delete someone else's quack", async ({ page }) => {
  await signIn(page, "deepduckthoughts@example.com", "password2")
  await page.goto("/quacks")

  const othersQuack = page.getByRole("article").filter({ hasNotText: "@DeepDuckThoughts" }).first()
  await expect(othersQuack.getByRole("button", { name: "Delete quack" })).toHaveCount(0)

  // The button is hidden. Now skip the UI and ask the server directly.
  const notMine = await findQuackNotBy(page, "DeepDuckThoughts")
  const response = await page.request.delete(`${API}/quacks/${notMine.id}`)
  expect(response.status()).toBe(403)
})
