# Hanna Sumo RC · FROBOT 2026

App Android (Expo + React Native) y firmware Arduino para manejar por Bluetooth el
minisumo RC de Hanna (categoría amateur).

```text
firmware/minisumo_rc/   programa del robot (Arduino Nano + TB6612FNG + HC-05)
firmware/hc05_at/       programa auxiliar para cambiarle el nombre al HC-05
src/bluetooth/          servicio Bluetooth clásico (SPP) y protocolo
src/hooks/              ajustes, envío a 20 Hz, alerta de enlace
src/screens/            Conexión, Control y Ajustes
src/components/         sliders, joystick, flechas, STOP, TURBO, indicadores
plugins/                config plugins (permisos de Bluetooth, build en Windows)
store/                  ícono y gráfico destacado para Google Play
docs/PLAY_STORE.md      guía para publicar en Google Play
PRIVACY.md              política de privacidad (la pide Play)
```

**Protocolo:** la app manda `L,R\n` (−255 a 255) 20 veces por segundo, siempre, aunque
sea `0,0`. El robot contesta `OK\n` cada 500 ms mientras recibe. Si pasan 300 ms sin
comandos, el robot apaga los motores (STBY en LOW) y los vuelve a encender cuando
regresan los comandos.

---

## 1. Cargar el firmware

1. Abre `firmware/minisumo_rc/minisumo_rc.ino` en el Arduino IDE.
2. *Herramientas → Placa →* **Arduino Nano**; *Procesador →* **ATmega328P (Old Bootloader)**.
3. Carga el programa. No hace falta desconectar el HC-05: usa D2/D3, no los pines del USB.

Constantes que se pueden ajustar al principio del archivo: `INVERT_LEFT` / `INVERT_RIGHT`,
`MAX_STEP` (rampa de aceleración) y `REVERSE_BRAKE_MS` (freno corto antes de invertir).

LED de la placa (D13): **parpadea** = esperando a la app (motores apagados);
**fijo** = recibiendo comandos.

## 2. Ponerle nombre al HC-05 (“HANNA-SUMO”)

En el torneo va a haber muchos “HC-05”. Cámbiale el nombre y, de paso, el PIN.

1. Carga `firmware/hc05_at/hc05_at.ino` en el Nano.
2. Apaga el robot. **Mantén apretado el botón del HC-05** y vuelve a darle energía.
   Suelta el botón: el LED del HC-05 debe parpadear **lento (cada 2 s)**. Ese es el modo AT.
   Si tu módulo no tiene botón, conecta su pin EN/KEY a 3.3 V al encenderlo.
3. Abre el Monitor Serie a **9600** con **“Ambos NL & CR”** y escribe:

   | Comando | Respuesta esperada | Para qué |
   | --- | --- | --- |
   | `AT` | `OK` | probar |
   | `AT+NAME=HANNA-SUMO` | `OK` | nombre nuevo |
   | `AT+PSWD="NNNN"` | `OK` | PIN nuevo: cambia `NNNN` por 4 cifras **que no publiques** (en módulos viejos: `AT+PSWD=NNNN`) |
   | `AT+UART=9600,0,0` | `OK` | asegurar 9600 baudios |
   | `AT+ROLE=0` | `OK` | modo esclavo |
   | `AT+NAME?` | `+NAME:HANNA-SUMO` | comprobar (algunos solo responden con el botón apretado) |

4. Vuelve a cargar `minisumo_rc.ino` y reinicia el robot sin apretar el botón.

> En modo AT el HC-05 siempre habla a 38400 baudios; el puente ya lo tiene en cuenta.

## 3. Emparejar con el teléfono

1. Enciende el robot (el LED del HC-05 parpadea rápido).
2. Android: *Ajustes → Dispositivos conectados → Vincular nuevo dispositivo* → **HANNA-SUMO**.
3. PIN: **1234** (o el que pusiste con `AT+PSWD`).
4. Si antes estaba emparejado como “HC-05”, primero *Olvidar* ese dispositivo.

La app solo lista dispositivos **ya emparejados**; no empareja por sí misma.

## 4. Compilar e instalar la app

Requisitos: **Node 22.13 o más nuevo** (Expo SDK 58 lo exige), **JDK 17**, Android SDK
y un teléfono con *Depuración USB* activada. Expo Go **no sirve** (el Bluetooth clásico es
un módulo nativo).

```bash
npm install
npx expo prebuild --platform android
```

**Para desarrollar** (build de desarrollo con `expo-dev-client`; necesita la PC con Metro):

```bash
npx expo run:android          # compila, instala y abre la app
npx expo start --dev-client   # en los días siguientes, solo el servidor
```

**Para la competencia** (APK autónomo, sin PC ni Metro):

```bash
npx expo run:android --variant release
# o:  cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

**Con EAS** (compila en la nube, no necesitas Android Studio):

```bash
npx eas-cli@latest build -p android --profile development   # dev client
npx eas-cli@latest build -p android --profile preview       # APK para la competencia
npx eas-cli@latest build -p android --profile production    # AAB para Google Play
```

Para publicar en Google Play, sigue [docs/PLAY_STORE.md](docs/PLAY_STORE.md).

> ⚠️ El build de *desarrollo* no funciona sin la PC. A la competencia lleva el APK
> **release** o el de **preview** de EAS.

**Si compilas en Windows** y falla con `Filename longer than 260 characters`, el C++ que
genera React Native supera el límite de rutas de Windows (pasa aunque el proyecto esté en
una carpeta corta). Una sola vez, en PowerShell **como administrador** (si sigue fallando,
reinicia la PC):

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force
```

Además, el plugin `plugins/withWindowsCMake.js` hace que en Windows el build use
**CMake 3.31.6** (cuyo ninja sí soporta rutas largas). Gradle no lo descarga solo: si no
está, instálalo desde Android Studio → *SDK Manager → SDK Tools → Show Package Details →
CMake 3.31.6*. Con EAS no hace falta nada de esto: compila en Linux.

## 5. Cómo se usa

- **Conexión:** lista los emparejados (HANNA/HC-05 primero), toca uno para conectar.
  Recuerda el último robot y, con *Reconexión automática*, se conecta solo al abrir la app
  y si se corta. Al conectar pasa directo al control.
- **Control (horizontal):**
  - *Tanque:* un slider por rueda. El cero es **donde apoyas el pulgar**: empuja hacia
    arriba para avanzar y hacia abajo para retroceder. Al soltar vuelve a 0.
  - *Joystick:* un solo stick (avance + giro). Derecha a fondo = gira en el lugar.
  - *Flechas:* **▲ ▼** con el pulgar izquierdo (avance) y **◀ ▶** con el derecho (giro).
    Una flecha de giro sola = gira en el lugar; junto con ▲ o ▼ hace una curva. Son
    botones de todo o nada: la potencia la ponen PRECISO/NORMAL/TURBO y la rampa del robot.
  - **PRECISO 50 %** / **NORMAL 80 %**, y **TURBO 100 %** mientras lo mantienes.
  - **STOP:** manda `0,0` al instante y queda *DETENIDO* hasta que vuelvas a tocar un slider.
  - Indicador: **verde** si llegó un `OK` hace menos de 1 s; **rojo** si no. Al perder el
    enlace, el teléfono vibra y la pantalla se enmarca en rojo.
  - *AJUSTES* y *CONEXIÓN* hay que **mantenerlos** 0,6 s (para no salir por accidente).
    El botón *Atrás* de Android no sale del control.
- **Ajustes:** modo tanque/joystick/flechas, trim (−20 a +20 %), zona muerta, invertir cada motor
  y reconexión automática. Se guardan en el teléfono.

## 6. Prueba con el robot levantado (ruedas al aire)

Pon el robot sobre una caja o taza para que **las ruedas no toquen nada**. Batería cargada.

1. **Encender.** El LED D13 del Nano parpadea (esperando) y el del HC-05 parpadea rápido.
2. **Conectar** desde la app. Debe pasar al control con el indicador **ENLACE OK** en verde.
   El LED D13 queda fijo.
3. **Rueda izquierda.** En NORMAL, sube despacio el slider IZQ. Debe girar **solo la
   izquierda, hacia adelante**, y arriba debe marcar `L +…`.
   - Gira al revés → *Ajustes → Invertir motor izquierdo* (o `INVERT_LEFT = true`).
   - Gira la derecha → los motores están cruzados: intercambia los cables A/B del driver.
4. **Rueda derecha.** Igual con el slider DER.
5. **Atrás.** Baja los dos sliders: ambas ruedas hacia atrás (`L −…`, `R −…`).
6. **Rampa.** Lleva un slider de 0 a tope de golpe: la rueda debe acelerar suave (~0,1 s),
   no de un salto.
7. **Freno al invertir.** Con una rueda a tope adelante, pasa de golpe a tope atrás: se
   nota un frenazo corto antes de invertir.
8. **Potencias.** Con un slider a tope: PRECISO → `128`, NORMAL → `204`,
   TURBO apretado → `255`.
9. **STOP.** Con las dos ruedas girando, toca STOP: se detienen al instante y aparece
   *DETENIDO*. Toca un slider para seguir.
10. **Failsafe.** Mantén una rueda girando y apaga el Bluetooth del teléfono. La rueda debe
    **parar en menos de medio segundo**, el LED D13 vuelve a parpadear y el teléfono vibra.
    Enciende el Bluetooth: la app reconecta sola y el indicador vuelve a verde.
11. **Joystick.** En Ajustes elige JOYSTICK. Arriba = las dos adelante; derecha a fondo =
    izquierda adelante y derecha atrás.
12. **Flechas.** En Ajustes elige FLECHAS. ▲ = las dos adelante (`204` en NORMAL); ▶ sola =
    izquierda adelante y derecha atrás; ▲ + ▶ = las dos adelante, la derecha más lenta.

Recién después, al piso: si en NORMAL con los dos sliders iguales el robot se desvía,
corrige con el **trim**.

## Problemas comunes

| Síntoma | Qué revisar |
| --- | --- |
| No aparece en la lista | Emparejarlo antes en Ajustes de Android; tocar *ACTUALIZAR*. |
| Conecta pero queda en rojo (“SIN RESPUESTA”) | Cable RXD/TXD del HC-05 invertido, divisor 1k/2k, o el firmware no está cargado. |
| Se corta al arrancar fuerte | Caída de batería que reinicia el Nano: cargar batería, revisar cables, bajar `MAX_STEP`. |
| Las ruedas tiemblan sin tocar nada | Subir la *zona muerta* en Ajustes. |
| “Faltan permisos” | Aceptar “Dispositivos cercanos” (Android 12+) o Ubicación (Android 11 o menos). |

> Nota técnica: `react-native-bluetooth-classic` todavía no figura como probada en la New
> Architecture (la única disponible desde React Native 0.82); funciona a través de la capa
> de compatibilidad de React Native. Si algo del Bluetooth falla tras actualizar Expo,
> revisar primero esa librería.
