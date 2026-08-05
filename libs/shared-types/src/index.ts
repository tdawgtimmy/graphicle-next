/**
 * Types shared between the FastAPI backend and the Next.js frontend.
 *
 * `api.d.ts` is generated from the API's OpenAPI schema — do not edit it by hand.
 * Regenerate with:
 *
 *     nx run shared-types:build
 *
 * It is committed so the web app builds without a Python toolchain.
 */
export type { components, operations, paths } from "./api.js"
