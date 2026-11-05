# Barras Singapur

PWA educativa para aprender las cuatro operaciones básicas (1° a 5° básico) con el **Método Singapur** y el enfoque **CPA**: Concreto → Pictórico → Abstracto. Usa modelos de barras interactivos.

- 4 niveles y 16 problemas: parte-todo, grupos iguales, comparación multiplicativa, fracciones y problemas de varias etapas.
- Funciona sin conexión e instalable en Android, iOS y PC.
- HTML, CSS y JavaScript puros: sin dependencias ni proceso de build.

## Publicar en GitHub Pages

1. Sube todos los archivos a la raíz del repositorio (rama `main`).
2. En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
3. La app quedará en `https://<usuario>.github.io/<repositorio>/`.

## Actualizar la app

El Service Worker guarda los archivos en caché. Cada vez que cambies algo, sube el número de versión en la primera línea de `sw.js` (`barras-singapur-v1.0.0` → `v1.0.1`). Los dispositivos tomarán la versión nueva al recargar.

## Agregar problemas

Los problemas están en el arreglo `PROBLEMS` de `app.js`. Cada uno define su fase concreta (`concrete`), las barras (`bars`, `brackets`, `brace`), los pasos guiados (`steps`) y las operaciones finales (`equations`). Copia un problema del mismo nivel y cambia los números.
