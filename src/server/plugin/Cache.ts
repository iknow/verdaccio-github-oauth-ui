import { Cache as MemoryCache } from "memory-cache"

import { logger } from "../../logger"
import { AuthProvider } from "./AuthProvider"

export interface UserInfo {
  userName: string
  userGroups: string[]
}

/**
 * When installing packages, the CLI makes a burst of package requests.
 *
 * If we were to perform a full authentication check and fetch the provider groups
 * on each package request, this would slow down the process a lot and we would
 * likely hit a request limit with the auth provider.
 *
 * Therefore authentication is only performed once and is cached until no request
 * has been made for a short period.
 */
export class Cache {
  private readonly cache = new MemoryCache<string, UserInfo>()
  private readonly providerId = this.authProvider.getId()

  constructor(
    private readonly authProvider: AuthProvider,
    private readonly cacheTTLms = 10_000, // 10s
  ) {}

  async getUserInfo(token: string): Promise<UserInfo | null> {
    try {
      const key = `${this.providerId}/${token}`

      let userInfo = this.cache.get(key)

      if (!userInfo) {
        const userName = await this.authProvider.getUserName(token)
        const userGroups = await this.authProvider.getGroups(token)

        userInfo = {
          userName,
          userGroups,
        }
      }

      this.cache.put(key, userInfo, this.cacheTTLms)

      return userInfo
    } catch (error) {
      logger.error(error)
    }

    return null
  }

  async getGroups(token: string): Promise<string[]> {
    const userInfo = await this.getUserInfo(token)
    return userInfo?.userGroups || []
  }
}
