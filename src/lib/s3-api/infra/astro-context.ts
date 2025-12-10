import type { APIContext } from "astro";
import type { ContextDriverDefinition, ContextHandler, ContextHandlerFn, ParsedContext } from "../definitions";

export class AstroContextDriver implements ContextDriverDefinition<APIContext, Response> {
    parseContext({ request }: APIContext): ParsedContext {
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

    buildPostEndpoint(contextHandler: ContextHandler): ContextHandlerFn<APIContext, Response> {
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

    buildPutEndpoint(contextHandler: ContextHandler): ContextHandlerFn<APIContext, Response> {
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