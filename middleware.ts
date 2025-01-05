import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // 只对需要用户认证的页面和API路由启用Clerk
    "/(sign-in|sign-up|user|dashboard|history|pricing).*",
    "/api/credits.*",
    "/api/user.*",
  ],
};