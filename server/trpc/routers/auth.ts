import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

const localUser = {
  id: "local-user",
  email: "local@course-creator.local",
  name: "Local User",
};

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().optional() }))
    .mutation(() => ({ user: localUser })),
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(() => ({ user: localUser })),
  logout: publicProcedure.mutation(() => ({ success: true })),
  session: publicProcedure.query(() => ({ user: localUser })),
});
