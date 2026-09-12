---
name: nextjs
description: Build Next.js apps with routing, layouts, SSR/CSR, auth, SEO, and performance optimization.
---

# Next.js Skill

## Instructions

1. **Routing**
   - Use file-based routing for pages
   - Leverage dynamic routes for parameters
   - Organize routes with folders and nested paths

2. **Layouts**
   - Create reusable layouts for consistent structure
   - Use `app/layout.tsx` or `pages/_app.tsx` depending on Next.js version
   - Support nested layouts for complex pages

3. **SSR/CSR**
   - Use `getServerSideProps` or `getStaticProps` for server-side rendering
   - Use client-side rendering for dynamic interactivity
   - Optimize data fetching to reduce load times

4. **Auth**
   - Protect pages/routes with middleware or higher-order components
   - Integrate JWT or session-based authentication
   - Redirect unauthorized users appropriately

5. **SEO**
   - Use `next/head` to set meta tags
   - Generate sitemaps and robots.txt
   - Support Open Graph and Twitter cards

6. **Performance**
   - Optimize images with `next/image`
   - Use dynamic imports for code splitting
   - Cache data and use incremental static regeneration (ISR)

## Best Practices
- Keep pages and components modular
- Minimize bundle size with tree-shaking
- Monitor Lighthouse scores and web vitals
- Use environment variables for secrets and API keys
- Ensure accessibility and responsive design

## Example Structure
```tsx
// app/layout.tsx (Next.js 13+)
import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>My Next.js App</title>
        <meta name="description" content="SEO-friendly Next.js application" />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

// pages/index.tsx
import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold">Welcome to Next.js App</h1>
      <p>Build fast, SEO-friendly, and secure applications.</p>
      <Link href="/dashboard" className="text-blue-600 mt-2 inline-block">
        Go to Dashboard
      </Link>
    </div>
  );
}

// pages/dashboard.tsx (protected)
import { getSession } from "next-auth/react";

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  return { props: { user: session.user } };
}

export default function Dashboard({ user }) {
  return <h1>Welcome, {user.name}</h1>;
}
