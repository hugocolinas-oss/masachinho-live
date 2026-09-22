# Masachinho web — sin base de datos

Producción: https://masachinho-live.vercel.app

1. Abre `/control` y pulsa **Crear sala privada** una vez.
2. Copia **URL de OBS** a una fuente de navegador de OBS, 1024 × 1024. Mantén esa fuente activa; evita «Cerrar fuente cuando no sea visible».
3. Comparte **Panel privado** con el otro PC. Ambos paneles deben usar el mismo enlace de sala.
4. En el PC de quien habla, pulsa **Activar micrófono** y permite el acceso. Deja la página abierta. Solo un PC puede enviar el micro a la vez.
5. Normal, Tilt, GOD, fumar, umbral, ganancia y amplitudes se sincronizan. Salir de GOD hacia Normal reactiva Tilt al gritar.

No instalar Python. No base de datos ni backend con estados persistentes. La fuente OBS mantiene el estado en memoria y los paneles se conectan mediante canales de datos WebRTC. PeerJS Cloud realiza la señalización; el proveedor puede conservar sus propios registros de servicio. Solo se envían nivel de voz y controles, nunca pistas de audio ni vídeo. Las claves van en el fragmento URL, no en peticiones HTTP. No compartas públicamente esos enlaces.

## Límites reales

- Se necesita Internet y PeerJS Cloud disponible. Su señalización es gratuita; no incluye TURN. Redes que bloquean WebRTC pueden impedir la conexión. En ese caso el panel avisa; esta versión no tiene un relay de pago ni puede garantizar conexión entre todas las redes.
- Una única fuente OBS debe ser anfitriona de una sala. Cierra «vista OBS para probar» antes de abrir el mismo enlace en OBS.
- Recargar/cerrar la fuente reinicia los ajustes en memoria. Tras una desconexión, vuelve a activar el micro en el panel.
- Las manos de juego son animación automática. La web no puede leer las teclas/ratón globales de League, ni consultar su cliente para el HUD. El paquete Windows conserva esas funciones locales; esta publicación es el personaje y sus controles.
- No hay cámara, risa automática ni reacciones archivadas.

## Desarrollo

El repositorio incluye `renderer/` y los assets: después de clonarlo basta con `npm ci`, `npm test` y `npm run build`. No necesitas el proyecto local de Windows para compilar. `prepare.mjs` solo se usa al actualizar el renderer desde ese proyecto original.

`npm ci` instala PeerJS 1.5.5 fijado en el lockfile.
`node prepare.mjs` copia solo los módulos y 16 assets necesarios del proyecto hermano `../vtuber` a `renderer/`.
`npm test` verifica transiciones de modos, silencio, propiedad del micro y validación de entradas.
`npm run build` genera `public/`; adapta solo el transporte del render original.
`vercel deploy --prod --project masachinho-live --scope xiro-s-projects` publica. No subir ZIPs Windows, logs ni datos locales.

Referencias: https://peerjs.com/server/getting-started y https://github.com/orgs/peers/discussions/1172
