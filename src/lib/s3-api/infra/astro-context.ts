import type { APIContext } from "astro";
import type { ContextDriverDefinition, ParsedContext } from "../definitions";

export class AstroContextDriver implements ContextDriverDefinition<APIContext, Response> {
    parseContext({ request }: APIContext) {
        return {
            getJson: () => request.json(),
            getArrayBuffer: () => request.arrayBuffer(),
            getHeader: (name: string) => request.headers.get(name),
        };
    }

    buildResponse(data: any, status: number): Response {
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
            status,
        });
    }

    buildPostEndpoint<D>(contextHandler: (context: ParsedContext) => Promise<{ data: D, status: number }>) {
        return async (context: APIContext): Promise<Response> => {
            try {
                const parsedContext = this.parseContext(context);
                const { data, status } = await contextHandler(parsedContext);
                return this.buildResponse(data, status);
            } catch (error) {
                return this.buildResponse({ error: (error as Error).message }, 500);
            }
        };
    }

    buildPutEndpoint<D>(contextHandler: (context: ParsedContext) => Promise<{ data: D, status: number }>) {
        return async (context: APIContext): Promise<Response> => {
            try {
                const parsedContext = this.parseContext(context);
                const { data, status } = await contextHandler(parsedContext);
                return this.buildResponse(data, status);
            } catch (error) {
                return this.buildResponse({ error: (error as Error).message }, 500);
            }
        };
    }
}