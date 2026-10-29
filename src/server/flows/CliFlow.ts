import { Application, Handler } from "express"
import qs from "query-string"
import { cliPort, cliProviderId } from "../../constants"
import { logger } from "../../logger"
import { getCallbackPath } from "../../redirect"
import { AuthProvider } from "../plugin/AuthProvider"
import { Verdaccio } from "../plugin/Verdaccio"
import { Cache } from "../plugin/Cache"
import { ParsedPluginConfig } from "../plugin/Config"
import {
  createAuthenticatedUser,
  IPluginMiddleware,
  organizationAllowed,
} from "../helpers"

const pluginCallbackeUrl = getCallbackPath(cliProviderId)

export class CliFlow implements IPluginMiddleware {
  private readonly verdaccio: Verdaccio
  private readonly provider: AuthProvider
  private readonly config: ParsedPluginConfig
  private readonly cache: Cache

  constructor(
    verdaccio: Verdaccio,
    provider: AuthProvider,
    config: ParsedPluginConfig,
    cache: Cache,
  ) {
    this.verdaccio = verdaccio
    this.provider = provider
    this.config = config
    this.cache = cache
  }

  /**
   * IPluginMiddleware
   */
  register_middlewares(app: Application) {
    app.get(pluginCallbackeUrl, this.callback)
  }

  callback: Handler = async (req, res) => {
    const params: Record<string, string> = {}

    try {
      const code = this.provider.getCode(req)
      const userToken = await this.provider.getToken(code)
      const userName = await this.provider.getUserName(userToken)

      const userGroups = await this.cache.getGroups(userToken)
      if (!organizationAllowed(this.config, userGroups)) {
        throw new Error("User not part of org")
      }

      const user = createAuthenticatedUser(userName, userGroups)
      const npmToken = await this.verdaccio.issueNpmToken(user, userToken)

      params.status = "success"
      params.token = encodeURIComponent(npmToken)
    } catch (error) {
      logger.error(error)

      params.status = "error"
      params.message = error.message || error
    }

    const redirectUrl =
      `http://localhost:${cliPort}` + "?" + qs.stringify(params)

    res.redirect(redirectUrl)
  }
}
