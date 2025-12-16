import type { APIContext } from "astro";
import type { ContextDriverDefinition, ContextHandler, ContextHandlerFn, ParsedContext } from "../definitions";

export class AstroContextDriver implements ContextDriverDefinition<APIContext, Response> {
    parseContext({ request }: APIContext): ParsedContext {
        return {
            getJson: () => request.json(),
            getArrayBuffer: () => request.arrayBuffer(),
            getHeader: (name: string) => request.headers.get(name),
            isAuthorized: (type) => {
                switch (type) {
                    case 'headers': {
                        const authHeader = request.headers.get('Authorization');
                        return authHeader === 'Bearer my-secret-token';
                    }
                    case 'locals':
                    default: {

                        const fakeAstroLocals = {
                            isLoggedIn: true,
                        }
                        return fakeAstroLocals.isLoggedIn;
                    }
                }
            },
        };
    }

    buildResponse(opts: { data: any, status: number }): Response {
        return new Response(JSON.stringify(opts.data), {
            headers: { 'Content-Type': 'application/json' },
            status: opts.status,
        });
    }

    buildErrorResponse(error: unknown) {
        return { data: { error: (error as Error).message }, status: 500 };
    }

    handleEndpoint(contextHandler: ContextHandler): ContextHandlerFn<APIContext, Response> {
        return async (rawContext: APIContext): Promise<Response> => {
            try {
                const context = this.parseContext(rawContext);
                const opts = await contextHandler(context);
                return this.buildResponse(opts);
            } catch (error) {
                const errorResponse = this.buildErrorResponse(error);
                return this.buildResponse(errorResponse);
            }
        }
    }
}