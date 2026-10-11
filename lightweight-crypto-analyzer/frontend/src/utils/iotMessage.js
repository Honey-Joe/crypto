// Parsing of the two sensor message formats produced by GET /iot/reading.

export const SENSOR_KEYS = ['temperature', 'humidity', 'soilMoisture', 'airQuality'];

/** Parses a recovered message back into reading fields; returns null if it is malformed. */
export function parseSensorMessage(message, format) {
  try {
    if (format === 'json') {
      const data = JSON.parse(message);
      return { deviceId: data.deviceId, sequence: data.seq, temperature: data.temperature, humidity: data.humidity, soilMoisture: data.soilMoisture, airQuality: data.airQuality };
    }
    const [deviceId, sequence, , temperature, humidity, soilMoisture, airQuality] = message.split(';');
    return {
      deviceId,
      sequence: Number(sequence),
      temperature: Number(temperature),
      humidity: Number(humidity),
      soilMoisture: Number(soilMoisture),
      airQuality: Number(airQuality),
    };
  } catch {
    return null;
  }
}
