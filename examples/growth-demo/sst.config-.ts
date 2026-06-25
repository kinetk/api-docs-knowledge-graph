/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./.sst/platform/config.d.ts" />

// Deploys the Growth Demo demo to AWS (CloudFront + Lambda) via SST v3,
// matching the kinetk-main-website stack.
//
// First time:
//   pnpm install
//   npx sst secret set KinetkApiKey "sk_..." --stage prod
//   npx sst secret set GeminiApiKey "AIza..." --stage prod
//   npx sst deploy --stage prod
//
// The /api/agent route is short-request + client polling (start → poll →
// synthesize): the browser drives the ~60-110s insights job and the Gemini
// synthesis step, so every individual request returns fast.

export default $config({
  app(input) {
    const stage = input?.stage ?? "dev";
    return {
      name: "kinetk-growth-demo",
      home: "aws",
      // Pin the AWS account/region so deploys always target kinetk-prod
      // (account 640585661833), never the `kinetk` (dev) account.
      providers: { aws: { profile: "kinetk-prod", region: "us-east-1" } },
      removal: stage === "prod" ? "retain" : "remove",
      protect: ["prod"].includes(stage),
    };
  },
  async run() {
    const kinetkApiKey = new sst.Secret("KinetkApiKey");
    const geminiApiKey = new sst.Secret("GeminiApiKey");

    new sst.aws.Nextjs("GrowthDemo", {
      environment: {
        KINETK_API_KEY: kinetkApiKey.value,
        GEMINI_API_KEY: geminiApiKey.value,
        // Read from the app's .env at deploy time (the deploy script exports it);
        // falls back to production if unset.
        KINETK_API_BASE: process.env.KINETK_API_BASE ?? "https://api.kinetk.ai/graph",
      },
      transform: {
        server: (args) => {
          args.timeout = "60 seconds";
        },
      },
      // To attach a custom domain:
      // domain: { name: "growth.kinetk.ai", dns: sst.aws.dns({ zone: "kinetk.ai" }) },
    });
  },
});
