import { z } from "zod";

export const PricingDataSchema = z.object({
  id: z.string(),
  version: z.string(),
  lastUpdated: z.coerce.date(),
  source: z.enum(["default", "custom", "api"]),
  github: z.object({
    actions: z.object({
      UBUNTU: z.number().positive(),
      WINDOWS: z.number().positive(),
      MACOS: z.number().positive(),
    }),
    lfs: z.object({
      storage: z.number().positive(),
      bandwidth: z.number().positive(),
    }),
    codespaces: z.object({
      "2-core": z.number().positive(),
      "4-core": z.number().positive(),
      "8-core": z.number().positive(),
    }),
  }),
  azureDevOps: z.object({
    parallelJobs: z.object({
      hosted: z.number().positive(),
      selfHosted: z.number().positive(),
    }),
    licenses: z.object({
      basic: z.number().positive(),
      basicTestPlans: z.number().positive(),
    }),
  }),
});

export type PricingData = z.infer<typeof PricingDataSchema>;
