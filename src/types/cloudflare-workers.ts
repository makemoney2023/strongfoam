declare module "cloudflare:workers" {
  export class DurableObject<Env = unknown> {
    env: Env;
    constructor(ctx: unknown, env: Env);
  }

  export class WorkflowEntrypoint<Env = unknown> {
    env: Env;
    constructor(ctx: unknown, env: Env);
  }

  export type WorkflowEvent<Params> = {
    payload: Params;
    instanceId: string;
  };

  export type WorkflowStep = {
    do<T>(name: string, callback: () => Promise<T>): Promise<T>;
    sleep(name: string, duration: string): Promise<void>;
  };
}
