/**
 * Structural Host contracts this plugin consumes.
 *
 * The authoritative types live in `@deepseek-ai/dsh-host-webserver`, which this
 * plugin reaches only for the `ctx.webServer` Context merge. Declaring the
 * narrow slice locally keeps the plugin's compile surface independent of a
 * published type version while the running installation still supplies the
 * service.
 *
 * @module dsh-mermaid-diagram/types
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

/** Route match kind: `exact` matches the pathname verbatim. */
export type WebRouteKind = 'exact' | 'prefix'

/** One named route registration. */
export interface WebRoute {
  kind: WebRouteKind
  /** Absolute pathname, no trailing slash. */
  path: string
  /** Owns the full response lifecycle. */
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
}

/** The single web-server method this plugin calls. */
export interface WebServerService {
  /**
   * Register one route.
   * @param route - match kind, pathname, and response handler.
   * @returns the disposer that unregisters the route.
   */
  register(route: WebRoute): () => void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** HTTP route registry provided by the Host web server. */
    webServer: WebServerService
  }
}
