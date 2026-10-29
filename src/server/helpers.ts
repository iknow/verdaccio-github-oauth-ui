import { getPublicUrl } from "@verdaccio/url"
import { Application, Request } from "express"
import { ParsedPluginConfig } from "./plugin/Config"
import { authenticatedUserGroups } from "../constants"
import { logger } from "../logger"
import { User } from "./plugin/Verdaccio"

export function getBaseUrl(config: ParsedPluginConfig, req: Request) {
  const urlPrefix = config.url_prefix

  const baseUrl = getPublicUrl(urlPrefix, req)
  const baseUrlWithoutTrailingSlash = baseUrl.replace(/\/$/, "")

  return baseUrlWithoutTrailingSlash
}

export function createAuthenticatedUser(
  userName: string,
  userGroups: string[],
): User {
  const user: User = {
    name: userName,
    groups: [...authenticatedUserGroups],
    real_groups: [...userGroups],
  }

  logger.log("User successfully authenticated:", user)
  return user
}

export function organizationAllowed(
  config: ParsedPluginConfig,
  userGroups: string[],
): boolean {
  if (config.org && !userGroups.includes(`github/org/${config.org}`)) {
    return false
  }

  return true
}

export interface IPluginMiddleware {
  register_middlewares(app: Application): void
}
