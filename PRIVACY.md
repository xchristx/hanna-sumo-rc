# Política de privacidad · Hanna Sumo RC

_Última actualización: 12 de noviembre de 2026_

Hanna Sumo RC es una app para manejar un robot minisumo por Bluetooth clásico
(módulo HC-05). Esta política explica qué datos usa la app.

## Resumen

**La app no recopila, no guarda en servidores ni comparte ningún dato personal.**
No tiene cuentas, publicidad, analíticas ni conexión a internet.

## Qué datos usa y para qué

| Dato | Para qué | Dónde queda |
| --- | --- | --- |
| Lista de dispositivos Bluetooth **ya emparejados** (nombre y dirección MAC) | Mostrar los robots disponibles y conectarse al elegido | Solo en el teléfono |
| Dirección del **último robot** conectado | Reconectar automáticamente al abrir la app | Solo en el teléfono (almacenamiento local de la app) |
| **Ajustes** de manejo (modo, trim, sensibilidad, etc.) | Recordar la configuración del piloto | Solo en el teléfono |

Los comandos de velocidad de los motores se envían únicamente al robot por Bluetooth y
no salen del teléfono hacia ningún otro lugar.

## Permisos

- **Dispositivos cercanos / Bluetooth** (`BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`): para
  listar los dispositivos emparejados y conectarse al robot. La búsqueda está marcada como
  _no usada para ubicación_.
- **Ubicación** (`ACCESS_FINE_LOCATION`), **solo en Android 11 o anterior**: en esas
  versiones Android exige este permiso para usar Bluetooth. La app **no lee ni guarda la
  ubicación** del teléfono.
- **Vibración**: para avisar cuando se pierde el enlace con el robot.

## Borrar los datos

Todos los datos están en el teléfono. Se borran al desinstalar la app o desde
_Ajustes de Android → Apps → Hanna Sumo RC → Almacenamiento → Borrar datos_.

## Niños

La app no recopila datos de nadie, incluidos menores de edad.

## Cambios y contacto

Si esta política cambia, se actualizará este archivo con una nueva fecha. Para dudas,
abre un _issue_ en el repositorio de GitHub del proyecto.
