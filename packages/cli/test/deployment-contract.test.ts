import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { checkDeploymentContract } from "../src/check-deployment-contract.js"

const repoRoot = join(import.meta.dirname, "../../..")

describe("checkDeploymentContract", () => {
  it("passes the golden fixture deployment intents", async () => {
    await expect(checkDeploymentContract(join(repoRoot, "fixtures/golden/pass"))).resolves.toBe(0)
  })

  it("fails when home-lab deployment is required instead of optional", async () => {
    await expect(
      checkDeploymentContract(join(repoRoot, "fixtures/golden/fail/deployment-contract-required-home-lab")),
    ).resolves.toBe(1)
  })
})

