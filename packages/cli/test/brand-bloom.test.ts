import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { checkBrandBloom } from "../src/check-brand-bloom.js"

const repoRoot = join(import.meta.dirname, "../../..")

describe("checkBrandBloom", () => {
  it("passes the golden fixture brand manifest and adapter fittings", async () => {
    await expect(checkBrandBloom(join(repoRoot, "fixtures/golden/pass"))).resolves.toBe(0)
  })

  it("fails when an adapter binding uses a boundary schema that does not fit its port", async () => {
    await expect(
      checkBrandBloom(join(repoRoot, "fixtures/golden/fail/brand-bloom-wrong-fitting")),
    ).resolves.toBe(1)
  })
})

