import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3001');

const initialLights = [
  { id: 'table', name: 'Table Lamp', on: true },
  { id: 'floor', name: 'Floor Lamp', on: false },
  { id: 'cabinet', name: 'Cabinet', on: false },
  { id: 'kitchen', name: 'Kitchen', on: true },
  { id: 'bedroom', name: 'Bedroom', on: false },
  { id: 'bathroom', name: 'Bathroom', on: false },
];

function App() {
  const [now, setNow] = useState(new Date());
  const [lights, setLights] = useState(initialLights);
  const [fanOn, setFanOn] = useState(false);
  const [gasValue, setGasValue] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('sensorData', (data) => {
      if (data.gas !== undefined) setGasValue(data.gas);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('sensorData');
    };
  }, []);

  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const toggleLight = (id) => {
    setLights((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const newState = !l.on;
          socket.emit('toggleDevice', { deviceId: id, state: newState });
          return { ...l, on: newState };
        }
        return l;
      })
    );
  };

  const toggleFan = () => {
    const newState = !fanOn;
    socket.emit('toggleDevice', { deviceId: 'fan', state: newState });
    setFanOn(newState);
  };

  return (
    <div className="dashboard-grid">
      <div className="tile tile-datetime">
        <div className="small-text">{dateStr}</div>
        <div className="big-text">{timeStr}</div>
      </div>
      <div className="tile tile-mode">
        <div className="small-text">Current Mode</div>
        <div className="big-text">HOME</div>
      </div>

      <div className="tile tile-weather">
        <div className="label">Today</div>
        <div className="weather-main">
          <span className="weather-icon">☀️</span>
          <span className="temp">56°F</span>
        </div>
        <div className="weather-sub">139° / 56° ☔ 0%</div>
        <div className="label">Tomorrow</div>
        <div className="weather-sub-row">
          <span>☀️ 86° / 57°</span>
          <span>☔ 0%</span>
        </div>
      </div>

      {lights.slice(0, 3).map((light) => (
        <LightTile key={light.id} light={light} toggleLight={toggleLight} />
      ))}

      <div className="tile tile-room">
        <div className="label">Apartment</div>
        <div className="big-text">70°F</div>
        <div className="sub-value">47% hum</div>
      </div>

      {lights.slice(3, 6).map((light) => (
        <LightTile key={light.id} light={light} toggleLight={toggleLight} />
      ))}

      <div className="tile tile-room">
        <div className="label">Aquarium</div>
        <div className="big-text">79°F</div>
      </div>

      <div className="tile tile-room">
        <div className="label">Gas Reading</div>
        <div className="big-text">{gasValue} ppm</div>
      </div>

      <div className={`tile tile-light ${fanOn ? 'light-on' : ''}`}>
        <div className="label">Bedroom Fan</div>
        <div className="icon">🌀</div>
        <button
          className={`toggle-btn ${fanOn ? 'on' : 'off'}`}
          onClick={toggleFan}
        >
          {fanOn ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="tile tile-refresh">
        <div className={`icon ${connected ? '' : 'offline-icon'}`}>
          {connected ? '🔄' : '🔴'}
        </div>
      </div>
    </div>
  );
}

function LightTile({ light, toggleLight }) {
  return (
    <div className={`tile tile-light ${light.on ? 'light-on' : ''}`}>
      <div className="label">{light.name}</div>
      <div className="icon">💡</div>
      <button
        className={`toggle-btn ${light.on ? 'on' : 'off'}`}
        onClick={() => toggleLight(light.id)}
      >
        {light.on ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

export default App;