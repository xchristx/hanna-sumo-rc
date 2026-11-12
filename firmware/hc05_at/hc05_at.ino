/*
 * ==================================================================
 *  PUENTE AT PARA EL HC-05  ·  Robot de Hanna
 * ==================================================================
 *
 *  Sirve para cambiarle el nombre (y el PIN) al HC-05 usando el mismo
 *  Nano y el mismo cableado del robot (HC-05 TXD -> D2, RXD <- D3).
 *  Todo lo que escribes en el Monitor Serie va al HC-05, y lo que
 *  contesta el HC-05 aparece en el Monitor Serie.
 *
 *  Pasos:
 *   1. Carga este programa en el Nano.
 *   2. Desconecta la batería del robot (o el USB) para apagar el HC-05.
 *   3. Mantén apretado el botoncito del HC-05 y vuelve a darle energía.
 *      Suelta el botón: el LED del HC-05 debe parpadear LENTO (cada 2 s).
 *      Eso significa que está en "modo AT".
 *   4. Abre el Monitor Serie a 9600 baudios con "Ambos NL & CR".
 *   5. Escribe los comandos (ver README.md):
 *        AT                    -> OK
 *        AT+NAME=HANNA-SUMO    -> OK
 *        AT+PSWD="NNNN"        -> OK   (NNNN = tu PIN secreto de 4 cifras;
 *                                     en módulos viejos: AT+PSWD=NNNN)
 *        AT+UART=9600,0,0      -> OK
 *   6. Cuando termines, vuelve a cargar minisumo_rc.ino.
 *
 *  En modo AT el HC-05 siempre habla a 38400 baudios, no importa cómo
 *  esté configurado para el uso normal.
 * ==================================================================
 */

#include <SoftwareSerial.h>

const uint8_t PIN_BT_RX = 2;  // HC-05 TXD
const uint8_t PIN_BT_TX = 3;  // HC-05 RXD (con el divisor 1k/2k)
const uint8_t PIN_STBY = 4;   // driver de motores

SoftwareSerial bt(PIN_BT_RX, PIN_BT_TX);

void setup() {
  // Motores apagados mientras configuramos.
  pinMode(PIN_STBY, OUTPUT);
  digitalWrite(PIN_STBY, LOW);

  Serial.begin(9600);
  bt.begin(38400);
  Serial.println(F("Puente AT listo. Escribe AT y pulsa Enter (Ambos NL & CR)."));
}

void loop() {
  while (bt.available() > 0) {
    Serial.write(bt.read());
  }
  while (Serial.available() > 0) {
    bt.write(Serial.read());
  }
}
