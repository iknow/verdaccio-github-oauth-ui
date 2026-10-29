import { pluginKey } from "src/constants"
import { ParsedPluginConfig } from "src/server/plugin/Config"
import { createTestPluginConfig } from "test/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

describe("Config", () => {
  describe("validate config", () => {
    const enabledPluginConfig = { enabled: true } as any
    const pluginConfig = createTestPluginConfig()

    function createConfig(config: any) {
      new ParsedPluginConfig(config)
    }

    beforeEach(() => {
      vi.mocked(process.exit).mockClear()
    })

    it("reads plugin settings from the 'auth' node only", () => {
      createConfig({
        auth: { [pluginKey]: enabledPluginConfig },
        middlewares: { [pluginKey]: pluginConfig },
      })
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it("accepts an empty 'middlewares' node as long as it is enabled", () => {
      createConfig({
        auth: { [pluginKey]: pluginConfig },
        middlewares: { [pluginKey]: enabledPluginConfig },
      })
      expect(process.exit).not.toHaveBeenCalled()
    })

    it("treats 'enterprise-origin' as optional", () => {
      createConfig({
        auth: {
          [pluginKey]: { ...pluginConfig, "enterprise-origin": undefined },
        },
        middlewares: {
          [pluginKey]: enabledPluginConfig,
        },
      })
      expect(process.exit).not.toHaveBeenCalled()
    })

    it.fails("throws an error if 'auth' node is not enabled", () => {
      createConfig({
        middlewares: { [pluginKey]: pluginConfig },
      })
    })

    it.fails("throws an error if 'middlewares' node is not enabled", () => {
      createConfig({
        auth: { [pluginKey]: pluginConfig },
      })
    })

    it("exits if 'client-id' is missing", () => {
      createConfig({
        auth: {
          [pluginKey]: { ...pluginConfig, ["client-id"]: undefined },
        },
        middlewares: {
          [pluginKey]: { enabled: true },
        },
      })
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it("exits if 'client-secret' is missing", () => {
      createConfig({
        auth: {
          [pluginKey]: { ...pluginConfig, ["client-secret"]: undefined },
        },
        middlewares: {
          [pluginKey]: { enabled: true },
        },
      })
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })
})
