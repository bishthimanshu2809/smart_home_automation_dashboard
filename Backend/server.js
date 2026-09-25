const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ⚠️ Apna Arduino ka sahi port yahan daalo
// Linux: /dev/ttyUSB0 ya /dev/ttyACM0
// Windows: COM3, COM4 etc.
const ARDUINO_PORT = '/dev/ttyUSB0';
const BAUD_RATE = 9600;

let arduinoConnected = false;
let port;
let parser;

function connectArduino() {
  port = new SerialPort({ path: ARDUINO_PORT, baudRate: BAUD_RATE });
  parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  port.on('open', () => {
    arduinoConnected = true;
    console.log('✅ Arduino connected on', ARDUINO_PORT);
  });

  port.on('error', (err) => {
    arduinoConnected = false;
    console.log('❌ Serial error:', err.message);
  });

  port.on('close', () => {
    arduinoConnected = false;
    console.log('⚠️ Arduino disconnected, retrying in 3s...');
    setTimeout(connectArduino, 3000);
  });

  // Arduino se data aane pe
  parser.on('data', (line) => {
    line = line.trim();
    console.log('From Arduino:', line);

    try {
      const data = JSON.parse(line);
      // expected format: {"gas": 120}
      if (data.gas !== undefined) {
        io.emit('sensorData', { gas: data.gas });
      }
    } catch (e) {
      // agar Arduino plain number bhej raha hai JSON ke bajaye
      const num = parseInt(line);
      if (!isNaN(num)) {
        io.emit('sensorData', { gas: num });
      }
    }
  });
}

connectArduino();

// Frontend se connection
io.on('connection', (socket) => {
  console.log('🖥️ Frontend connected:', socket.id);

  socket.emit('arduinoStatus', arduinoConnected);

  // Frontend se light/fan toggle command aane pe
  socket.on('toggleDevice', ({ deviceId, state }) => {
    console.log(`Toggle command: ${deviceId} -> ${state ? 'ON' : 'OFF'}`);

    if (port && port.writable) {
      // Arduino ko command bhejo, format: "table:1\n" ya "table:0\n"
      const command = `${deviceId}:${state ? 1 : 0}\n`;
      port.write(command, (err) => {
        if (err) console.log('Write error:', err.message);
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🖥️ Frontend disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});