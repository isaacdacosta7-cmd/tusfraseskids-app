This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Juegos bíblicos

Los juegos viven en `public/juegos`: HTML, CSS y JavaScript independientes.

- Ocho juegos, tres niveles cada uno, pistas, sonido y 24 estrellas.
- Progreso local en el navegador; acceso por enlace.
- Los cuentos PDF se venden por separado y quedan fuera del repositorio de juegos.
- Entradas directas: `/juegos#david`, `/juegos#daniel`, `/juegos#jonas`, `/juegos#jesus`.

### Vercel

El proyecto `tusfraseskids-app` sirve exclusivamente los juegos desde la raíz `public/juegos`, con Framework Other, Build Command e Install Command vacíos y Output Directory `.`. Usa el `vercel.json` de esa carpeta.

El proyecto Next.js conserva la raíz del repositorio y puede servir `/juegos` mediante el rewrite de `next.config.ts`.

Para probar los juegos por separado: `python3 -m http.server 8080 --directory public`. Abrir `/juegos/index.html`.
