import { describe, expect, it, vi } from "vitest"
import { WebFlow } from "src/server/flows/WebFlow"
import { CliFlow } from "src/server/flows/CliFlow"
import { Cache } from "src/server/plugin/Cache"
import { Plugin } from "src/server/plugin/Plugin"
import {
  createTestAuthProvider,
  createTestParsedPluginConfig,
  createTestVerdaccio,
  createTestVerdaccioConfig,
  testProviderGroups,
  testOAuthToken,
  testUserName,
} from "test/utils"

function response() {
  const res = {
    cookie: vi.fn(),
    redirect: vi.fn(),
    send: vi.fn(),
    status: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res
}

describe("original fork authentication behavior", () => {
  it.each(["web", "cli"])(
    "%s login uses the token and preserves GitHub groups",
    async (kind) => {
      const config = createTestParsedPluginConfig({ org: "TEST_ORG" })
      const provider = createTestAuthProvider()
      const cache = new Cache(provider)
      const verdaccio = createTestVerdaccio()
      const flow =
        kind === "web"
          ? new WebFlow(verdaccio, config, provider, cache)
          : new CliFlow(verdaccio, provider, config, cache)
      const res = response()

      await flow.callback({} as any, res as any, vi.fn())

      expect(verdaccio.issueNpmToken).toHaveBeenCalledWith(
        expect.objectContaining({
          name: testUserName,
          real_groups: testProviderGroups,
        }),
        testOAuthToken,
      )
      if (kind === "web")
        expect(verdaccio.issueUiToken).toHaveBeenCalledWith(
          expect.objectContaining({ real_groups: testProviderGroups }),
        )
      expect(res.redirect).toHaveBeenCalledWith(
        kind === "web" ? "/" : expect.stringContaining("status=success"),
      )
    },
  )

  it.each(["web", "cli"])("%s login rejects non-members", async (kind) => {
    const config = createTestParsedPluginConfig({ org: "OTHER_ORG" })
    const provider = createTestAuthProvider()
    const cache = new Cache(provider)
    const verdaccio = createTestVerdaccio()
    const flow =
      kind === "web"
        ? new WebFlow(verdaccio, config, provider, cache)
        : new CliFlow(verdaccio, provider, config, cache)
    const res = response()

    await flow.callback({} as any, res as any, vi.fn())

    expect(verdaccio.issueNpmToken).not.toHaveBeenCalled()
    if (kind === "web") expect(res.status).toHaveBeenCalledWith(500)
    else
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("status=error"),
      )
  })

  it("authenticates with cached user-token data and authorizes using those groups", async () => {
    const provider = createTestAuthProvider()
    const getUserName = vi.spyOn(provider, "getUserName")
    const getGroups = vi.spyOn(provider, "getGroups")
    const plugin = new Plugin(
      createTestVerdaccioConfig({}, { org: "TEST_ORG" }),
    )
    ;(plugin as any).cache = new Cache(provider)

    const authenticate = () =>
      new Promise<string[] | false>((resolve, reject) => {
        plugin.authenticate(testUserName, testOAuthToken, (error, groups) => {
          if (error) reject(error)
          else resolve(groups || false)
        })
      })
    const groups = await authenticate()
    expect(await authenticate()).toEqual(testProviderGroups)
    expect(groups).toEqual(testProviderGroups)
    expect(getUserName).toHaveBeenCalledTimes(1)
    expect(getGroups).toHaveBeenCalledTimes(1)
    expect(getGroups).toHaveBeenCalledWith(testOAuthToken)

    const user = {
      name: testUserName,
      groups: groups as string[],
      real_groups: groups as string[],
    }
    for (const action of ["access", "publish", "unpublish"] as const) {
      const result = await new Promise((resolve, reject) => {
        plugin[`allow_${action}`](
          user,
          { name: "private-package", [action]: [testProviderGroups[0]] },
          (error, granted) => {
            if (error) reject(error)
            else resolve(granted)
          },
        )
      })
      expect(result).toBe(true)
    }
    // Package checks use the authenticated groups; no username is sent to GitHub.
    expect(getGroups).toHaveBeenCalledTimes(1)
  })
})
