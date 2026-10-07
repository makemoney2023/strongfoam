declare module "cloudflare:workers" {
  export class DurableObject<Env = unknown> {
    env: Env;
    ctx: unknown;
    constructor(ctx: unknown, env: Env);
  }

  export class RpcTarget {}

  export class WorkflowStep {}

  export class WorkflowEvent<T = unknown> {
    payload: T;
  }

  export type WorkflowSleepDuration = number | string;
}
