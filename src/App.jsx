import React, { useState, useEffect } from 'react';
import metroData from './data/timetables.json';

// Ícones SVG para a Estrela (Preenchida e Vazia)
const StarFilled = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);
const StarOutline = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-yellow-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

function App() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [datetime, setDatetime] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  // Estado dos Favoritos guardado no LocalStorage
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('metroFavorites');
    return saved ? JSON.parse(saved) : [];
  });

  const stations = metroData.stations || [];

  // Definir hora atual do sistema ao iniciar
  useEffect(() => {
    const now = new Date();
    // Ajuste de fuso horário para garantir que o formato YYYY-MM-DDTHH:mm bate certo
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    setDatetime(localISOTime);
  }, []);

  // Guardar favoritos sempre que mudarem
  useEffect(() => {
    localStorage.setItem('metroFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (station) => {
    if (!station) return;
    setFavorites(prev => 
      prev.includes(station) ? prev.filter(s => s !== station) : [...prev, station]
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (origin === destination) {
      setError("A origem e o destino devem ser diferentes.");
      return;
    }

    const reqTime = new Date(datetime);
    if (isNaN(reqTime.getTime())) {
      setError("Formato de data inválido.");
      return;
    }

    const isWeekend = reqTime.getDay() === 0 || reqTime.getDay() === 6;
    const dayType = isWeekend ? "weekends" : "weekdays";

    let routeFound = false;

    for (const route of metroData.routes) {
      const seq = route.stations_sequence || [];
      
      if (seq.includes(origin) && seq.includes(destination)) {
        routeFound = true;
        const originIdx = seq.indexOf(origin);
        const destIdx = seq.indexOf(destination);

        // Identifica se é viagem normal ou em sentido inverso
        const isReverse = originIdx > destIdx;
        const times = route.travel_times_from_start;
        const duration = Math.abs(times[destIdx] - times[originIdx]);
        
        // Vai buscar o horário consoante a direção
        const directionKey = isReverse ? route.direction_reverse : route.direction;
        
        let departures = [];
        // Se a estação de origem tiver horários mapeados (simplificação da demo)
        if (route.departures[origin] && route.departures[origin][dayType]) {
             departures = route.departures[origin][dayType];
        } else {
             // Horário dinâmico simulado a cada 15 min caso não esteja explícito no JSON
             departures = ["06:00", "06:15", "06:30", "07:00", "07:15", "07:30", "08:00", "08:15", "08:30", "09:00", "09:15", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "17:15", "17:30", "18:00", "18:15", "18:30", "19:00", "20:00", "21:00", "22:00", "23:00"];
        }
        
        let nextTrain = null;

        for (const dep of departures) {
          const [depHour, depMin] = dep.split(":").map(Number);
          const depDate = new Date(reqTime);
          depDate.setHours(depHour, depMin, 0, 0);

          if (depDate >= reqTime) {
            if (!nextTrain || depDate < nextTrain) {
              nextTrain = depDate;
            }
          }
        }

        if (!nextTrain) {
          setError("Não existem mais viagens disponíveis após esta hora hoje.");
          return;
        }

        const arrivalTime = new Date(nextTrain.getTime() + duration * 60000);

        setResult({
          line: route.line,
          direction: directionKey,
          departure_time: nextTrain.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
          arrival_time: arrivalTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
          duration_minutes: duration
        });
        return; 
      }
    }

    if (!routeFound) {
      setError("Ligação direta não encontrada. O sistema atual requer que as estações partilhem a mesma linha.");
    }
  };

  // Organizar paragens: Favoritas no topo, restantes depois.
  const favoriteStations = stations.filter(s => favorites.includes(s)).sort();
  const otherStations = stations.filter(s => !favorites.includes(s)).sort();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-blue-600 mb-6 text-center">Metro do Porto</h1>
        
        <form onSubmit={handleSearch} className="space-y-4">
          
          {/* Origem */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Origem</label>
            <div className="mt-1 flex items-center space-x-2">
              <select 
                className="block w-full rounded-md border-gray-300 shadow-sm p-2 border flex-1"
                value={origin} onChange={e => setOrigin(e.target.value)} required>
                <option value="">Selecione uma estação</option>
                {favoriteStations.length > 0 && (
                  <optgroup label="⭐ Favoritas">
                    {favoriteStations.map(s => <option key={`orig-fav-${s}`} value={s}>{s}</option>)}
                  </optgroup>
                )}
                <optgroup label="Todas as Estações">
                  {otherStations.map(s => <option key={`orig-${s}`} value={s}>{s}</option>)}
                </optgroup>
              </select>
              <button type="button" onClick={() => toggleFavorite(origin)} className="p-2 focus:outline-none" title="Marcar/Desmarcar Favorito">
                {favorites.includes(origin) ? <StarFilled /> : <StarOutline />}
              </button>
            </div>
          </div>

          {/* Destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Destino</label>
            <div className="mt-1 flex items-center space-x-2">
              <select 
                className="block w-full rounded-md border-gray-300 shadow-sm p-2 border flex-1"
                value={destination} onChange={e => setDestination(e.target.value)} required>
                <option value="">Selecione uma estação</option>
                {favoriteStations.length > 0 && (
                  <optgroup label="⭐ Favoritas">
                    {favoriteStations.map(s => <option key={`dest-fav-${s}`} value={s}>{s}</option>)}
                  </optgroup>
                )}
                <optgroup label="Todas as Estações">
                  {otherStations.map(s => <option key={`dest-${s}`} value={s}>{s}</option>)}
                </optgroup>
              </select>
              <button type="button" onClick={() => toggleFavorite(destination)} className="p-2 focus:outline-none" title="Marcar/Desmarcar Favorito">
                {favorites.includes(destination) ? <StarFilled /> : <StarOutline />}
              </button>
            </div>
          </div>

          {/* Data e Hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Data e Hora</label>
            <input 
              type="datetime-local" 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              value={datetime} onChange={e => setDatetime(e.target.value)} required />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition font-semibold text-lg mt-2">
            Pesquisar Próxima Viagem
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 p-5 bg-blue-50 border border-blue-200 rounded-md shadow-sm">
            <div className="flex justify-between items-center border-b border-blue-200 pb-3 mb-3">
              <h3 className="font-bold text-blue-800 text-lg">Linha {result.line}</h3>
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-semibold uppercase tracking-wide">
                Sentido {result.direction}
              </span>
            </div>
            <div className="flex justify-between items-center my-2">
              <span className="text-gray-600">Próximo metro:</span>
              <span className="text-2xl font-black text-gray-900">{result.departure_time}</span>
            </div>
            <div className="flex justify-between items-center my-2">
              <span className="text-gray-600">Chegada prevista:</span>
              <span className="text-xl font-bold text-gray-800">{result.arrival_time}</span>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-100">
              <span className="text-gray-500 text-sm">Tempo de viagem estimado:</span>
              <span className="font-semibold text-gray-900">{result.duration_minutes} min</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;