import {
  AllowAccess,
  AuthAccessCallback,
  AuthCallback,
  IPluginAuth,
  IPluginMiddleware,
  RemoteUser,
} from "@verdaccio/types"
import { Application } from "express"
import { logger } from "../../logger"
import { CliFlow, WebFlow } from "../flows"
import { GitHubAuthProvider } from "../github"
import { AuthCore } from "./AuthCore"
import { Cache } from "./Cache"
import { Config, PackageAccess, ParsedPluginConfig } from "./Config"
import { PatchHtml } from "./PatchHtml"
import { registerGlobalProxyAgent } from "./ProxyAgent"
import { ServeStatic } from "./ServeStatic"
import { Verdaccio } from "./Verdaccio"

/**
 * Implements the verdaccio plugin interfaces.
 */
export class Plugin implements IPluginMiddleware<any>, IPluginAuth<any> {
  private readonly parsedConfig = new ParsedPluginConfig(this.config)
  private readonly provider = new GitHubAuthProvider(this.parsedConfig)
  private readonly cache = new Cache(this.provider)
  private readonly verdaccio = new Verdaccio(this.config)
  private readonly core = new AuthCore(this.verdaccio, this.parsedConfig)

  constructor(private readonly config: Config) {
    registerGlobalProxyAgent()
  }

  /**
   * IPluginMiddleware
   */
  register_middlewares(app: Application, auth: any) {
    this.verdaccio.setAuth(auth)

    const children = [
      new ServeStatic(),
      new PatchHtml(),
      new WebFlow(this.verdaccio, this.parsedConfig, this.core, this.provider),
      new CliFlow(this.verdaccio, this.core, this.provider),
    ]

    for (const child of children) {
      child.register_middlewares(app)
    }
  }

  /**
   * IPluginAuth
   */
  async authenticate(
    userName: string,
    userToken: string,
    callback: AuthCallback,
  ): Promise<void> {
    try {
      if (!userName || !userToken) {
        callback(null, false)
        return
      }

      const userInfo = await this.cache.getUserInfo(userToken)
      if (userInfo === null || userInfo.userName !== userName) {
        logger.error("The token does not match the user name")
        callback(null, false)
        return
      }

      const user = await this.core.createAuthenticatedUser(
        userInfo.userName,
        userInfo.userGroups,
      )

      callback(null, user.real_groups)
    } catch (error) {
      callback(error, false)
    }
  }

  /**
   * IPluginAuth
   */
  allow_access(
    user: RemoteUser,
    config: AllowAccess & PackageAccess,
    callback: AuthAccessCallback,
  ): void {
    if (config.access) {
      const grant = config.access.some((group) => user.groups.includes(group))
      callback(null, grant)
    } else {
      callback(null, true)
    }
  }
}
