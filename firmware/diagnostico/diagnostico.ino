/*
 * ==================================================================
 *  DIAGNÓSTICO DE CABLEADO  ·  Robot de Hanna
 * ==================================================================
 *
 *  Sirve para encontrar cables corridos, puentes de estaño o un HC-05
 *  mal conectado en la placa perforada. Los motores NO se mueven
 *  (STBY queda en LOW todo el tiempo).
 *
 *  Cómo usarlo:
 *   1. Saca el Nano de la placa y carga este programa.
 *   2. Ponlo de vuelta en la placa. Batería APAGADA: solo el USB.
 *   3. Abre el Monitor Serie a 115200 baudios.
 *   4. Abre la app y conéctate al robot.
 *   5. Lee los informes. Escribe "c" y Enter para repetir la búsqueda
 *      de cortos.
 *
 *  Cuando termines, vuelve a cargar minisumo_rc.ino.
 * ==================================================================
 */

#include <SoftwareSerial.h>

const uint8_t PIN_BT_RX = 2;  // aquí debe llegar el TXD del HC-05
const uint8_t PIN_BT_TX = 3;  // de aquí sale hacia el RXD del HC-05 (con divisor)
const uint8_t PIN_STBY = 4;   // driver de motores: siempre apagado

// Pines que se revisan. No se tocan D0/D1 (USB), D4 (STBY) ni D13 (LED).
const uint8_t SCAN_PINS[] = { 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, A0, A1, A2, A3, A4, A5 };
const uint8_t SCAN_COUNT = sizeof(SCAN_PINS);

SoftwareSerial bt(PIN_BT_RX, PIN_BT_TX);

void printPin(uint8_t pin) {
  if (pin >= A0) {
    Serial.print('A');
    Serial.print(pin - A0);
  } else {
    Serial.print('D');
    Serial.print(pin);
  }
}

void allPullup() {
  for (uint8_t i = 0; i < SCAN_COUNT; i++) {
    pinMode(SCAN_PINS[i], INPUT_PULLUP);
  }
}

// ------------------------------------------------------------------
//  1) Pines que están a GND o unidos entre sí
// ------------------------------------------------------------------
void scanShorts() {
  Serial.println();
  Serial.println(F("=== 1) PINES A GND O UNIDOS ENTRE SI ==="));
  bt.end();
  allPullup();
  delay(10);

  bool high[SCAN_COUNT];
  bool problems = false;

  for (uint8_t i = 0; i < SCAN_COUNT; i++) {
    high[i] = digitalRead(SCAN_PINS[i]) == HIGH;
    if (!high[i]) {
      printPin(SCAN_PINS[i]);
      if (SCAN_PINS[i] == PIN_BT_TX) {
        Serial.println(F(" esta a GND -> normal: es el divisor 1k/2k hacia el RXD del HC-05"));
      } else {
        Serial.println(F(" esta conectado a GND (o a algo que lo tira a 0 V). Revisar!"));
        problems = true;
      }
    }
  }
  bool dividerSeen = !high[1];  // D3 es SCAN_PINS[1]

  // Ponemos cada pin en LOW (de a uno) y vemos si otro "lo sigue".
  // D2 no se pone en LOW porque está conectado a la salida TXD del HC-05.
  for (uint8_t i = 0; i < SCAN_COUNT; i++) {
    if (!high[i] || SCAN_PINS[i] == PIN_BT_RX) {
      continue;
    }
    pinMode(SCAN_PINS[i], OUTPUT);
    digitalWrite(SCAN_PINS[i], LOW);
    delay(2);
    for (uint8_t j = 0; j < SCAN_COUNT; j++) {
      if (j == i || !high[j]) {
        continue;
      }
      if (digitalRead(SCAN_PINS[j]) == LOW) {
        printPin(SCAN_PINS[i]);
        Serial.print(F(" esta UNIDO con "));
        printPin(SCAN_PINS[j]);
        Serial.println(F(" -> puente de estano o cable corrido. Revisar!"));
        problems = true;
      }
    }
    pinMode(SCAN_PINS[i], INPUT_PULLUP);
  }

  if (!dividerSeen) {
    Serial.println(F("D3 NO ve el divisor: falta la de 2k a GND o la de 1k no llega a D3."));
    problems = true;
  }
  if (!problems) {
    Serial.println(F("OK: no hay pines a GND ni unidos entre si (y el divisor de D3 esta)."));
  }

  bt.begin(9600);
}

// ------------------------------------------------------------------
//  2) ¿En qué pin hay señal? (el TXD del HC-05 cambia muy rápido)
// ------------------------------------------------------------------

// Pines que no entran en la búsqueda de cortos pero donde podría haber
// quedado soldado el TXD del HC-05. Se leen solo como entrada.
const uint8_t EXTRA_COUNT = 6;  // D0, D1, D4, D13, A6, A7

// Los datos del HC-05 producen cientos de cambios por segundo. Menos que
// esto es ruido (por ejemplo, el LED de D13 descargándose al cambiar el pin).
const uint16_t MIN_EDGES = 20;

uint8_t readExtra(uint8_t k) {
  switch (k) {
    case 0: return PIND & 1;                     // D0 (RX0 del USB)
    case 1: return (PIND >> 1) & 1;              // D1 (TX1 del USB)
    case 2: return digitalRead(PIN_STBY);        // D4
    case 3: return digitalRead(LED_BUILTIN);     // D13
    case 4: return analogRead(A6) > 400 ? 1 : 0;  // A6 (solo analógica)
    default: return analogRead(A7) > 400 ? 1 : 0; // A7 (solo analógica)
  }
}

void printExtra(uint8_t k) {
  switch (k) {
    case 0: Serial.print(F("D0/RX0")); break;
    case 1: Serial.print(F("D1/TX1")); break;
    case 2: Serial.print(F("D4/STBY")); break;
    case 3: Serial.print(F("D13/LED")); break;
    case 4: Serial.print(F("A6")); break;
    default: Serial.print(F("A7")); break;
  }
}

void scanActivity(unsigned long durationMs) {
  bt.end();
  allPullup();

  // Soltamos el USB un momento para poder escuchar también D1 (TX1).
  // D4 queda como entrada sin pull-up: el TB6612 lo mantiene en LOW (motores apagados).
  Serial.flush();
  Serial.end();
  pinMode(1, INPUT);
  pinMode(PIN_STBY, INPUT);
  pinMode(LED_BUILTIN, INPUT);

  uint16_t edges[SCAN_COUNT];
  uint8_t last[SCAN_COUNT];
  uint16_t extraEdges[EXTRA_COUNT];
  uint8_t extraLast[EXTRA_COUNT];
  for (uint8_t i = 0; i < SCAN_COUNT; i++) {
    edges[i] = 0;
    last[i] = digitalRead(SCAN_PINS[i]);
  }
  for (uint8_t k = 0; k < EXTRA_COUNT; k++) {
    extraEdges[k] = 0;
    extraLast[k] = readExtra(k);
  }

  unsigned long start = millis();
  while (millis() - start < durationMs) {
    for (uint8_t i = 0; i < SCAN_COUNT; i++) {
      uint8_t v = digitalRead(SCAN_PINS[i]);
      if (v != last[i] && edges[i] < 60000) {
        edges[i]++;
      }
      last[i] = v;
    }
    for (uint8_t k = 0; k < EXTRA_COUNT; k++) {
      uint8_t v = readExtra(k);
      if (v != extraLast[k] && extraEdges[k] < 60000) {
        extraEdges[k]++;
      }
      extraLast[k] = v;
    }
  }

  pinMode(PIN_STBY, OUTPUT);
  digitalWrite(PIN_STBY, LOW);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);

  Serial.println();
  Serial.println(F("=== 2) SENAL EN LOS PINES (cambios en 0,6 s) ==="));
  bool any = false;
  for (uint8_t i = 0; i < SCAN_COUNT; i++) {
    if (edges[i] >= MIN_EDGES) {
      Serial.print(F("  "));
      printPin(SCAN_PINS[i]);
      Serial.print(F(": "));
      Serial.println(edges[i]);
      any = true;
    }
  }
  for (uint8_t k = 0; k < EXTRA_COUNT; k++) {
    if (extraEdges[k] >= MIN_EDGES) {
      Serial.print(F("  "));
      printExtra(k);
      Serial.print(F(": "));
      Serial.print(extraEdges[k]);
      if (k <= 1) {
        Serial.print(F("  <- el TXD del HC-05 esta en un pin del USB: por eso no sube el codigo!"));
      } else {
        Serial.print(F("  <- el TXD del HC-05 llega aqui en vez de a D2"));
      }
      Serial.println();
      any = true;
    }
  }
  if (!any) {
    Serial.println(F("  Ningun pin tiene senal (revisados TODOS: D0-D13 y A0-A7)."));
    Serial.println(F("  -> Mira el LED del HC-05: con la app conectada debe hacer 2 destellos"));
    Serial.println(F("     cada ~2 s. Si parpadea rapido, la app no esta conectada."));
    Serial.println(F("  -> Si esta conectado, su pin TXD no llega a ningun pin del Nano"));
    Serial.println(F("     (cable cortado, soldadura fria o TXD/RXD del modulo confundidos)."));
  } else if (edges[0] < MIN_EDGES) {
    Serial.println(F("  D2 no tiene senal: el TXD del HC-05 NO llega a D2."));
  }

  bt.begin(9600);
}

// ------------------------------------------------------------------
//  3) Lo que llega por D2 y respuesta OK por D3
// ------------------------------------------------------------------
void listenBluetooth(unsigned long durationMs) {
  char line[24];
  uint8_t len = 0;
  uint16_t lines = 0;
  uint16_t validLines = 0;
  uint8_t shown = 0;
  unsigned long start = millis();
  unsigned long lastOk = 0;

  bt.listen();
  while (millis() - start < durationMs) {
    while (bt.available() > 0) {
      char c = (char)bt.read();
      if (c == '\n') {
        line[len] = '\0';
        lines++;
        if (strchr(line, ',') != nullptr) {
          validLines++;
        }
        if (shown < 3) {
          Serial.print(F("  recibido: \""));
          Serial.print(line);
          Serial.println('"');
          shown++;
        }
        len = 0;
        digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
      } else if (c != '\r' && len < sizeof(line) - 1) {
        line[len++] = c;
      }
    }
    if (millis() - lastOk >= 400) {
      lastOk = millis();
      bt.print(F("OK\n"));
    }
  }

  Serial.println();
  Serial.println(F("=== 3) LO QUE LLEGA A D2 (9600 baudios) ==="));
  Serial.print(F("  Lineas en 1,5 s: "));
  Serial.print(lines);
  Serial.print(F(" (validas: "));
  Serial.print(validLines);
  Serial.println(F(")  -> lo normal son unas 30"));
  if (lines == 0) {
    Serial.println(F("  No llega nada por D2."));
  } else if (validLines < lines / 2) {
    Serial.println(F("  Llegan datos pero raros: velocidad del HC-05 distinta de 9600 o ruido."));
  } else {
    Serial.println(F("  D2 recibe bien los comandos de la app."));
  }
  Serial.println(F("  Mande OK por D3 cada 0,4 s: si la app se pone VERDE (aunque parpadee),"));
  Serial.println(F("  el cable D3 -> 1k -> RXD funciona. Si sigue en rojo, revisar ese camino."));
}

void setup() {
  pinMode(PIN_STBY, OUTPUT);
  digitalWrite(PIN_STBY, LOW);
  pinMode(LED_BUILTIN, OUTPUT);

  Serial.begin(115200);
  bt.begin(9600);

  Serial.println();
  Serial.println(F("##################################################"));
  Serial.println(F("  DIAGNOSTICO DE CABLEADO - Robot de Hanna"));
  Serial.println(F("  Motores apagados. Conecta la app al robot."));
  Serial.println(F("  Escribe c + Enter para repetir la busqueda de cortos."));
  Serial.println(F("##################################################"));

  scanShorts();
}

void loop() {
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == 'c' || c == 'C') {
      scanShorts();
    }
  }

  scanActivity(600);
  listenBluetooth(1500);
  Serial.println(F("--------------------------------------------------"));
}
