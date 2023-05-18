import { Plugin } from "src/server/plugin/Plugin"
import {
  createTestPlugin,
  createTestVerdaccioConfig,
  testOAuthToken,
  testProviderGroups,
  testUserName,
} from "test/utils"
import { beforeEach, describe, expect, it } from "vitest"

describe("Plugin", () => {
  describe("authenticate", () => {
    let plugin: Plugin

    beforeEach(() => {
      plugin = createTestPlugin()
    })

    it("empty user name cannot authenticate", async () => {
      await plugin.authenticate("", testOAuthToken, (err, groups) => {
        expect(err).toBeNull()
        expect(groups).toBe(false)
      })
    })

    it("empty token cannot authenticate", async () => {
      await plugin.authenticate(testUserName, "", (err, groups) => {
        expect(err).toBeNull()
        expect(groups).toBe(false)
      })
    })

    it("invalid token cannot authenticate", async () => {
      await plugin.authenticate(testUserName, "invalidToken", (err, groups) => {
        expect(err).toBeNull()
        expect(groups).toBe(false)
      })
    })

    it("valid user name and token can authenticate", async () => {
      await plugin.authenticate(testUserName, testOAuthToken, (err, groups) => {
        expect(err).toBeNull()
        expect(groups).toEqual(expect.arrayContaining(testProviderGroups))
      })
    })

    it("user outside of org cannot authenticate", async () => {
      plugin = createTestPlugin(
        createTestVerdaccioConfig(
          {},
          {
            org: "someorg",
          },
        ),
      )
      await plugin.authenticate(testUserName, testOAuthToken, (err, groups) => {
        expect(err).not.toBeNull()
        expect(err).toMatch(/User not part of org/)
      })
    })
  })
})
