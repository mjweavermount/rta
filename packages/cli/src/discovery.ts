import { relative } from "node:path"

const normalize = (path: string) => path.replaceAll("\\", "/")

export const isGoldenFixturePath = (path: string): boolean => {
  const normalized = normalize(path)
  return normalized === "fixtures/golden" || normalized.startsWith("fixtures/golden/")
}

export const shouldSkipWalkDir = (root: string, dir: string): boolean => {
  const rel = normalize(relative(root, dir))
  return rel === ".." || rel.startsWith("../") || isGoldenFixturePath(rel)
}
