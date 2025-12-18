import type { AstroGlobal } from "astro"

/**
 * Fetch a resource relative to the site's base URL.
 *
 * @param path - The relative path to fetch.
 * @param Astro - The Astro global object.
 * @param init - Optional fetch initialization options.
 * @returns A Promise that resolves to the fetch Response.
 */
export const serverFetch = async (path: string, Astro: AstroGlobal, init?: RequestInit | undefined) => {
    const { site } = Astro
    if (!site) {
        throw new Error("Astro.site is not defined. Make sure to set the 'site' config in your astro.config.mjs")
    }
    const url = new URL(path, site).toString()
    return await fetch(url, init)
}