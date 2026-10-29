import { AllowAccess, PackageAccess, RemoteUser } from "@verdaccio/types"
import { Plugin } from "src/server/plugin/Plugin"
import { createTestPackage, createTestPlugin, createTestUser } from "test/utils"
import { beforeEach, describe, expect, it } from "vitest"

describe("Plugin", () => {
  let plugin: Plugin
  let user: RemoteUser
  let pkg: AllowAccess & PackageAccess

  describe("allow_publish", () => {
    beforeEach(() => {
      plugin = createTestPlugin()

    })

    it("does not grant access to unauthenticated users", async () => {
      user = {
        name: undefined,
        groups: ["$all", "$anonymous", "@all", "@anonymous"],
        real_groups: [],
      }
      pkg = createTestPackage({ access: ["any-group"] })

      await new Promise<void>((resolve) => {
        plugin.allow_publish(user, pkg, (err, granted) => {
          expect(err).toBeNull()
          expect(granted).toBe(false)
          resolve()
        })
      })
    })

    it("protected packages cannot be accessed without the required permission group", async () => {
      user = createTestUser()
      pkg = createTestPackage({
        access: ["does-not-actually-matter"],
        publish: ["required-group"],
      })

      await new Promise<void>((resolve) => {
        plugin.allow_publish(user, pkg, (err, granted) => {
          expect(err).toBeNull()
          expect(granted).toBe(false)
          resolve()
        })
      })
    })

    it("protected packages can be accessed with the required permission group", async () => {
      user = { ...createTestUser(), groups: ["required-group"] }
      pkg = createTestPackage({
        access: ["does-not-actually-matter"],
        publish: ["required-group"],
      })

      await new Promise<void>((resolve) => {
        plugin.allow_publish(user, pkg, (err, granted) => {
          expect(err).toBeNull()
          expect(granted).toBe(true)
          resolve()
        })
      })
    })
  })
})
