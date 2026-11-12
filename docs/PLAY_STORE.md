# Publicar en Google Play

Guía para subir **Hanna Sumo RC** a Google Play con EAS (compila en la nube, no hace falta
Android Studio).

## 0. Antes de empezar

- **Package name:** `com.chrisreactdev.hannasumorc` (en `app.json`, cuenta de Play «Chris React Dev»). **No se puede cambiar** después de
  la primera subida a Play. Si lo quieres distinto, cámbialo ahora.
- **Cuenta de desarrollador de Google Play** (pago único de 25 USD).
- **Cuentas personales nuevas:** Google exige una **prueba cerrada con al menos 12
  testers durante 14 días seguidos** antes de poder publicar en producción. Planifica
  esto con tiempo (amigos, familia, compañeros del club de robótica).
- Cuenta de Expo: `npx eas-cli@latest login`.

## 1. Primer build de producción (AAB)

```bash
npx eas-cli@latest build -p android --profile production
```

- Genera un **.aab** (Play ya no acepta APK para apps nuevas).
- La primera vez, EAS ofrece **generar la llave de firma (keystore)**: acepta. Queda
  guardada en los servidores de Expo; descárgala como respaldo con
  `npx eas-cli@latest credentials`. **Si se pierde, no se pueden publicar actualizaciones.**
- El `versionCode` lo maneja EAS (`appVersionSource: "remote"`) y sube solo en cada build.
  La versión visible (`version` en `app.json`, ahora `1.0.0`) la cambias tú a mano.

> El perfil `preview` sigue generando un **APK** instalable directo, para la competencia.

## 2. Crear la app en Play Console

1. [play.google.com/console](https://play.google.com/console) → *Crear app*.
2. Nombre: **Hanna Sumo RC** · Idioma: Español · App · Gratis.
3. Completa las secciones de *Configurar tu app* (abajo están las respuestas).

## 3. Subir el build

**Opción A — a mano (más simple la primera vez):** *Pruebas → Prueba interna → Crear
versión* y sube el `.aab` que descargas desde el enlace del build de EAS.

**Opción B — con `eas submit`:**

1. En Google Cloud crea una **cuenta de servicio** con una llave JSON e invítala en Play
   Console (*Usuarios y permisos*) con permiso para publicar versiones.
   Guía: <https://docs.expo.dev/submit/android/>
2. Guarda la llave como `google-play-service-account.json` en la raíz del proyecto
   (ya está en `.gitignore`, **nunca la subas a GitHub**).
3. Ejecuta:

   ```bash
   npx eas-cli@latest submit -p android --profile production
   ```

   Sube a la pista **interna** como **borrador** (ver `submit.production` en `eas.json`).

Atajo para compilar y subir en un paso:

```bash
npx eas-cli@latest build -p android --profile production --auto-submit
```

## 4. Ficha de Play Store

**Recursos gráficos** (en `store/`):

| Recurso | Archivo | Tamaño |
| --- | --- | --- |
| Ícono | `store/icon-512.png` | 512 × 512 |
| Gráfico destacado | `store/feature-graphic.png` | 1024 × 500 |
| Capturas de teléfono | _faltan_: sácalas del teléfono en horizontal | mínimo 2 |

Para las capturas: abre la app, pon cada pantalla (Conexión, Control en Tanque / Joystick /
Flechas, Ajustes) y toma captura con *encendido + bajar volumen*.

**Nombre de la app** (máx. 30): `Hanna Sumo RC`

**Descripción breve** (máx. 80):

```text
Control Bluetooth para robots minisumo con HC-05: tanque, joystick o flechas.
```

**Descripción completa:**

```text
Hanna Sumo RC es un control remoto para robots minisumo y robots de dos motores que usan un módulo Bluetooth clásico HC-05 o HC-06.

TRES FORMAS DE MANEJAR
• Tanque: un slider por rueda, con el cero donde apoyas el pulgar.
• Joystick: un solo stick para avance y giro.
• Flechas: ▲▼ con un pulgar y ◀▶ con el otro; combínalas para hacer curvas.

PENSADA PARA COMPETIR
• STOP grande que detiene los motores al instante.
• Modos PRECISO (50 %) y NORMAL (80 %), y TURBO al 100 % mientras lo mantienes.
• Indicador de enlace: verde si el robot responde, rojo y vibración si se corta.
• Reconexión automática al último robot.
• Los botones de salida hay que mantenerlos, para no dejar el control por accidente.

AJUSTABLE
Trim para compensar motores, sensibilidad de giro, suavidad (expo), zona muerta e inversión de cada motor.

PROTOCOLO ABIERTO
La app envía "L,R" (−255 a 255) 20 veces por segundo y el robot contesta "OK". El firmware para Arduino Nano + TB6612FNG + HC-05 y el código de la app son libres en GitHub.

Requiere emparejar el robot antes desde los Ajustes de Bluetooth de Android. No usa internet ni recopila datos.
```

**Categoría:** Herramientas (o *Educación*). **Etiquetas:** robótica, Arduino, Bluetooth.

## 5. Respuestas para *Configurar tu app*

| Sección | Respuesta |
| --- | --- |
| **Política de privacidad** | <https://github.com/xchristx/hanna-sumo-rc/blob/main/PRIVACY.md> |
| **Acceso a la app** | Toda la funcionalidad está disponible sin restricciones (no hay login). Aclara en notas que necesita un robot con HC-05 emparejado. |
| **Anuncios** | No contiene anuncios |
| **Clasificación de contenido** | Cuestionario IARC: categoría *Utilidad/Herramienta*, todo "No" → clasificación para todos |
| **Público objetivo** | Elige **13+** (o mayor). Si incluyes menores de 13, la app entra en el programa *Familias* y hay requisitos extra. |
| **Seguridad de los datos** | ¿Recopila o comparte datos? **No.** (Los datos de Bluetooth y ajustes no salen del teléfono.) |
| **App gubernamental / financiera / salud** | No |
| **Permisos de ubicación** | Solo se pide en Android ≤ 11 por requisito de Bluetooth; no hay ubicación en segundo plano, así que no requiere declaración especial. |

## 6. Actualizaciones

1. Sube `version` en `app.json` (por ejemplo `1.1.0`).
2. `npx eas-cli@latest build -p android --profile production --auto-submit`
3. En Play Console promueve la versión de *interna* → *cerrada* → *producción*.
