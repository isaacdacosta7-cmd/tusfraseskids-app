# Tus Frases Inspiradoras Store

Tienda separada de Aventuras Bíblicas. Se publica en Vercel usando la carpeta `store` como directorio raíz.

- Catálogo inicial de seis cuentos.
- Postgres dedicado en Neon; todas las compras quedan pendientes hasta verificación manual.
- PDF privados alojados en Vercel Blob; solo los pedidos aprobados reciben enlaces firmados y temporales.
- Administración: `/admin`. La contraseña se configura con `STORE_ADMIN_PASSWORD` y sesiones HMAC firmadas con `STORE_SESSION_SECRET`.
- `DATABASE_URL` y almacenamiento privado con `BLOB_STORE_ID` mediante conexión de Vercel.
- La recepción de pedidos inicia desactivada. Primero cargar PDFs y portadas, después configurar instrucciones bancarias y activar desde el panel.
- La plataforma de juegos existente permanece intacta.

Los PDFs originales pertenecen al propietario y se incorporan exclusivamente mediante la carga privada desde el panel administrador, nunca en este repositorio público.
