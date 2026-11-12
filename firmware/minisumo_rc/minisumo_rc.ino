/*
 * ==================================================================
 *  MINISUMO RC  ·  Robot de Hanna  ·  FROBOT 2026 (categoría amateur)
 * ==================================================================
 *
 *  Placa ......... Arduino Nano (clon CH340, ATmega328P "Old Bootloader")
 *  Driver ........ TB6612FNG
 *  Bluetooth ..... HC-05 (Bluetooth clásico, 9600 baudios)
 *  Batería ....... 2S 18650 (7.4 a 8.4 V)
 *
 *  ¿Cómo funciona?
 *
 *   1. La app del teléfono manda 20 veces por segundo una línea con la
 *      velocidad de cada motor:   L,R  y un salto de línea.
 *        Ejemplo:  "200,-150"  -> motor izquierdo adelante, derecho atrás.
 *      Los números van de -255 (atrás a tope) a 255 (adelante a tope).
 *      Aunque Hanna no toque nada, la app sigue mandando "0,0": así el
 *      robot sabe que la conexión sigue viva (es el "latido" o heartbeat).
 *
 *   2. Mientras recibe comandos, el robot contesta "OK" cada 500 ms.
 *      La app usa ese OK para poner el indicador en verde.
 *
 *   3. FAILSAFE: si pasan 300 ms sin recibir un comando válido, el robot
 *      se detiene solo y apaga el driver (STBY en LOW). Cuando vuelven a
 *      llegar comandos, enciende el driver otra vez y sigue.
 *
 *   4. RAMPA: la velocidad no salta de golpe; sube de a poco para que las
 *      ruedas no patinen al arrancar. Si se pide girar al revés de golpe,
 *      primero frena un instante y después invierte.
 *
 *  LED de la placa (D13):
 *     encendido fijo ...... recibiendo comandos, todo bien
 *     parpadeando ......... esperando a la app (motores apagados)
 *
 *  Para cargarlo desde el Arduino IDE:
 *     Herramientas > Placa > Arduino Nano
 *     Herramientas > Procesador > ATmega328P (Old Bootloader)
 * ==================================================================
 */

#include <SoftwareSerial.h>

// ------------------------------------------------------------------
//  PINES (así está cableado el robot, no cambiar)
// ------------------------------------------------------------------

// Motor izquierdo (canal A del TB6612FNG)
const uint8_t PIN_PWMA = 5;
const uint8_t PIN_AIN1 = 7;
const uint8_t PIN_AIN2 = 8;

// Motor derecho (canal B del TB6612FNG)
const uint8_t PIN_PWMB = 6;
const uint8_t PIN_BIN1 = 9;
const uint8_t PIN_BIN2 = 10;

// STBY: en HIGH el driver funciona; en LOW apaga los dos motores.
const uint8_t PIN_STBY = 4;

// HC-05: su pata TXD va a D2 (el Arduino escucha por ahí) y su pata RXD
// recibe desde D3 a través del divisor 1k/2k (el HC-05 trabaja a 3.3 V).
const uint8_t PIN_BT_RX = 2;
const uint8_t PIN_BT_TX = 3;

// LED que viene soldado en la placa del Nano.
const uint8_t PIN_LED = LED_BUILTIN;

// ------------------------------------------------------------------
//  AJUSTES QUE SÍ SE PUEDEN CAMBIAR
// ------------------------------------------------------------------

// Si con la prueba de "ruedas al aire" una rueda gira al revés,
// cambia su constante a true y vuelve a cargar el programa.
const bool INVERT_LEFT = false;
const bool INVERT_RIGHT = false;

// RAMPA DE ACELERACIÓN
// Cuánto puede SUBIR la velocidad en cada ciclo de control (10 ms).
//   Más chico  -> arranque más suave, las ruedas patinan menos.
//   Más grande -> arranque más brusco.
// Con 20, ir de 0 a 255 tarda unos 130 ms.
const int MAX_STEP = 20;

// Cuánto puede BAJAR la velocidad en cada ciclo.
// 255 significa "frenar al instante", que es lo que conviene en sumo.
const int MAX_STEP_DOWN = 255;

// Freno corto antes de invertir el sentido de giro, en milisegundos.
// Protege la caja de engranajes y evita que el robot "salte".
const unsigned long REVERSE_BRAKE_MS = 40;

// Cada cuánto se recalcula la rampa (ciclo de control).
const unsigned long CONTROL_PERIOD_MS = 10;

// Tiempo máximo sin comandos antes de detener los motores (failsafe).
const unsigned long FAILSAFE_MS = 300;

// Cada cuánto el robot contesta "OK" a la app.
const unsigned long OK_PERIOD_MS = 500;

// Velocidad del HC-05 (la de fábrica es 9600).
const long BT_BAUD = 9600;

// Ponlo en true para ver mensajes en el Monitor Serie (115200 baudios)
// con el Nano conectado por USB. En competencia déjalo en false.
const bool DEBUG = false;

// ------------------------------------------------------------------
//  ESTADO DEL PROGRAMA
// ------------------------------------------------------------------

SoftwareSerial bt(PIN_BT_RX, PIN_BT_TX);

// Todo lo que necesitamos saber de cada motor.
struct Motor {
  uint8_t pinPwm;
  uint8_t pinIn1;
  uint8_t pinIn2;
  bool invert;
  int target;                // velocidad que pide la app (-255 a 255)
  int current;               // velocidad que tiene ahora (la rampa la acerca a target)
  bool braking;              // true mientras hace el freno corto antes de invertir
  unsigned long brakeStart;  // cuándo empezó ese freno
};

Motor leftMotor = { PIN_PWMA, PIN_AIN1, PIN_AIN2, INVERT_LEFT, 0, 0, false, 0 };
Motor rightMotor = { PIN_PWMB, PIN_BIN1, PIN_BIN2, INVERT_RIGHT, 0, 0, false, 0 };

// Buffer donde se van juntando las letras hasta que llega el salto de línea.
// La línea válida más larga es "-255,-255" (9 letras), así que 16 sobra.
const uint8_t LINE_MAX = 15;
char lineBuf[LINE_MAX + 1];
uint8_t lineLen = 0;
bool lineOverflow = false;  // true si la línea actual ya es demasiado larga (basura)

bool failsafe = true;  // el robot arranca quieto hasta que la app hable
unsigned long lastCommandMs = 0;
unsigned long lastOkMs = 0;
unsigned long lastControlMs = 0;

// ------------------------------------------------------------------
//  MOTORES
// ------------------------------------------------------------------

// Freno corto: IN1 e IN2 en HIGH. El driver une los cables del motor
// y la rueda se clava.
void brakeMotor(const Motor &m) {
  digitalWrite(m.pinIn1, HIGH);
  digitalWrite(m.pinIn2, HIGH);
  analogWrite(m.pinPwm, 0);
}

// Rueda libre: IN1 e IN2 en LOW. El motor queda suelto.
void coastMotor(const Motor &m) {
  digitalWrite(m.pinIn1, LOW);
  digitalWrite(m.pinIn2, LOW);
  analogWrite(m.pinPwm, 0);
}

// Manda una velocidad (-255 a 255) al driver.
// Positivo = adelante, negativo = atrás, 0 = freno.
void writeMotor(const Motor &m, int speed) {
  if (m.invert) {
    speed = -speed;
  }

  if (speed > 0) {
    digitalWrite(m.pinIn1, HIGH);
    digitalWrite(m.pinIn2, LOW);
    analogWrite(m.pinPwm, speed);
  } else if (speed < 0) {
    digitalWrite(m.pinIn1, LOW);
    digitalWrite(m.pinIn2, HIGH);
    analogWrite(m.pinPwm, -speed);
  } else {
    brakeMotor(m);
  }
}

// Se llama cada 10 ms: acerca la velocidad actual a la pedida respetando
// la rampa, y hace el freno corto si hay que cambiar de sentido.
void updateMotor(Motor &m, unsigned long now) {
  // 1) Si está en medio del freno corto, esperamos a que termine.
  if (m.braking) {
    if (now - m.brakeStart < REVERSE_BRAKE_MS) {
      return;
    }
    m.braking = false;
    m.current = 0;
  }

  int target = m.target;

  // 2) ¿Cambio brusco de sentido? (va hacia adelante y piden atrás, o al revés)
  //    Entonces frenamos primero; la rampa arrancará desde 0 en el nuevo sentido.
  if ((m.current > 0 && target < 0) || (m.current < 0 && target > 0)) {
    m.braking = true;
    m.brakeStart = now;
    m.current = 0;
    brakeMotor(m);
    return;
  }

  // 3) Rampa: trabajamos con el tamaño de la velocidad (sin signo).
  int speedNow = abs(m.current);
  int speedWanted = abs(target);

  if (speedWanted > speedNow) {
    speedNow = min(speedWanted, speedNow + MAX_STEP);       // acelerar de a poco
  } else {
    speedNow = max(speedWanted, speedNow - MAX_STEP_DOWN);  // desacelerar
  }

  // El sentido lo da lo que pide la app; si pide 0, mantenemos el sentido
  // que traía mientras termina de desacelerar.
  int direction = (target != 0) ? target : m.current;
  m.current = (direction >= 0) ? speedNow : -speedNow;

  writeMotor(m, m.current);
}

// Apaga todo: motores en 0 y driver en standby.
void enterFailsafe() {
  failsafe = true;

  leftMotor.target = 0;
  leftMotor.current = 0;
  leftMotor.braking = false;
  rightMotor.target = 0;
  rightMotor.current = 0;
  rightMotor.braking = false;

  coastMotor(leftMotor);
  coastMotor(rightMotor);
  digitalWrite(PIN_STBY, LOW);

  if (DEBUG) {
    Serial.println(F("FAILSAFE: sin comandos, motores apagados"));
  }
}

// Vuelve a encender el driver cuando llegan comandos otra vez.
void exitFailsafe() {
  failsafe = false;
  digitalWrite(PIN_STBY, HIGH);

  if (DEBUG) {
    Serial.println(F("Conexion recuperada, driver encendido"));
  }
}

// ------------------------------------------------------------------
//  LECTURA DE COMANDOS
// ------------------------------------------------------------------

// Lee un número entero con signo opcional ("-120", "+35", "0") y deja
// el puntero p justo después del número.
// Devuelve false si no hay cifras o si hay demasiadas (línea basura).
bool parseNumber(const char *&p, int &out) {
  bool negative = false;
  if (*p == '-' || *p == '+') {
    negative = (*p == '-');
    p++;
  }

  int value = 0;
  uint8_t digits = 0;
  while (*p >= '0' && *p <= '9') {
    digits++;
    if (digits > 4) {
      return false;  // más de 4 cifras no tiene sentido: descartamos
    }
    value = value * 10 + (*p - '0');
    p++;
  }

  if (digits == 0) {
    return false;
  }

  out = negative ? -value : value;
  return true;
}

// Revisa que la línea tenga exactamente la forma "número,número".
// Si algo no cuadra, devuelve false y la línea se ignora.
bool parseLine(const char *line, int &left, int &right) {
  const char *p = line;

  if (!parseNumber(p, left)) {
    return false;
  }
  if (*p != ',') {
    return false;
  }
  p++;
  if (!parseNumber(p, right)) {
    return false;
  }
  if (*p != '\0') {
    return false;  // sobra algo al final
  }

  // Por si acaso, dejamos los valores dentro del rango permitido.
  left = constrain(left, -255, 255);
  right = constrain(right, -255, 255);
  return true;
}

// Contesta "OK" si ya pasaron 500 ms desde el último.
// Lo hacemos justo después de recibir un comando completo: en ese
// momento la app está en silencio (manda cada 50 ms) y SoftwareSerial
// puede transmitir sin pisar lo que entra.
void sendOkIfDue(unsigned long now) {
  if (now - lastOkMs >= OK_PERIOD_MS) {
    lastOkMs = now;
    bt.print(F("OK\n"));
  }
}

// Llegó un comando válido.
void onCommand(int left, int right) {
  unsigned long now = millis();
  lastCommandMs = now;

  if (failsafe) {
    exitFailsafe();
    lastOkMs = now - OK_PERIOD_MS;  // contestar OK enseguida para que la app se ponga verde
  }

  leftMotor.target = left;
  rightMotor.target = right;

  sendOkIfDue(now);

  if (DEBUG) {
    Serial.print(F("L="));
    Serial.print(left);
    Serial.print(F(" R="));
    Serial.println(right);
  }
}

// Saca todas las letras que llegaron por Bluetooth y las va juntando.
// Cuando llega el salto de línea, intenta leer el comando.
void readBluetooth() {
  while (bt.available() > 0) {
    char c = (char)bt.read();

    if (c == '\n') {
      lineBuf[lineLen] = '\0';
      int left, right;
      if (!lineOverflow && lineLen > 0 && parseLine(lineBuf, left, right)) {
        onCommand(left, right);
      } else if (DEBUG) {
        Serial.println(F("Linea descartada"));
      }
      lineLen = 0;
      lineOverflow = false;
    } else if (c == '\r') {
      // Algunos programas mandan "\r\n": ignoramos el \r.
    } else if (lineLen < LINE_MAX) {
      lineBuf[lineLen] = c;
      lineLen++;
    } else {
      lineOverflow = true;  // demasiado larga: se descartará al llegar el \n
    }
  }
}

// ------------------------------------------------------------------
//  LED DE ESTADO
// ------------------------------------------------------------------

void updateLed(unsigned long now) {
  if (failsafe) {
    digitalWrite(PIN_LED, (now / 250) % 2 ? HIGH : LOW);  // parpadeo
  } else {
    digitalWrite(PIN_LED, HIGH);  // fijo
  }
}

// ------------------------------------------------------------------
//  PROGRAMA PRINCIPAL
// ------------------------------------------------------------------

void setup() {
  // Lo primero: driver apagado, para que el robot no se mueva al encender.
  pinMode(PIN_STBY, OUTPUT);
  digitalWrite(PIN_STBY, LOW);

  pinMode(PIN_PWMA, OUTPUT);
  pinMode(PIN_AIN1, OUTPUT);
  pinMode(PIN_AIN2, OUTPUT);
  pinMode(PIN_PWMB, OUTPUT);
  pinMode(PIN_BIN1, OUTPUT);
  pinMode(PIN_BIN2, OUTPUT);
  pinMode(PIN_LED, OUTPUT);

  coastMotor(leftMotor);
  coastMotor(rightMotor);

  bt.begin(BT_BAUD);

  if (DEBUG) {
    Serial.begin(115200);
    Serial.println(F("Minisumo RC listo. Esperando a la app..."));
  }

  failsafe = true;
  lastControlMs = millis();
}

void loop() {
  readBluetooth();

  unsigned long now = millis();

  // ¿Hace mucho que no llega nada? -> failsafe
  if (!failsafe && now - lastCommandMs > FAILSAFE_MS) {
    enterFailsafe();
  }

  // Ciclo de control cada 10 ms: rampa y freno corto.
  if (now - lastControlMs >= CONTROL_PERIOD_MS) {
    lastControlMs = now;
    if (!failsafe) {
      updateMotor(leftMotor, now);
      updateMotor(rightMotor, now);
    }
  }

  updateLed(now);
}
