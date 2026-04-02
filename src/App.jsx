import React, { useState } from 'react';
// Importamos os dados diretamente do ficheiro local
import metroData from './data/timetables.json';

function App() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [datetime, setDatetime] = useState('2026-04-02T18:10');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const stations = metroData.stations || [];

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

    // 0 = Domingo, 6 = Sábado
    const isWeekend = reqTime.getDay() === 0 || reqTime.getDay() === 6;
    const dayType = isWeekend ? "weekends" : "weekdays";

    let routeFound = false;

    for (const route of metroData.routes) {
      const seq = route.stations_sequence || [];
      
      if (seq.includes(origin) && seq.includes(destination)) {
        const originIdx = seq.indexOf(origin);
        const destIdx = seq.indexOf(destination);

        // Verifica se a direção está correta (origem vem antes do destino na lista)
        if (originIdx < destIdx) {
          routeFound = true;
          const times = route.travel_times_from_start;
          const duration = times[destIdx] - times[originIdx];
          
          // Vai buscar as partidas da estação de origem para o tipo de dia
          const departures = (route.departures[origin] && route.departures[origin][dayType]) || [];
          
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
            departure_time: nextTrain.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            arrival_time: arrivalTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            duration_minutes: duration
          });
          return; // Termina a pesquisa assim que encontra o resultado
        }
      }
    }

    if (!routeFound) {
      setError("Não foi possível encontrar uma ligação direta entre estas estações.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-blue-600 mb-6 text-center">Metro do Porto</h1>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Origem</label>
            <select 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              value={origin} onChange={e => setOrigin(e.target.value)} required>
              <option value="">Selecione uma estação</option>
              {stations.map(s => <option key={`orig-${s}`} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Destino</label>
            <select 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              value={destination} onChange={e => setDestination(e.target.value)} required>
              <option value="">Selecione uma estação</option>
              {stations.map(s => <option key={`dest-${s}`} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Data e Hora</label>
            <input 
              type="datetime-local" 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              value={datetime} onChange={e => setDatetime(e.target.value)} required />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition">
            Pesquisar Próxima Viagem
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-800 mb-2">Resumo da Viagem (Linha {result.line})</h3>
            <div className="flex justify-between items-center my-2">
              <span className="text-gray-600">Próximo metro:</span>
              <span className="text-xl font-bold text-gray-900">{result.departure_time}</span>
            </div>
            <div className="flex justify-between items-center my-2">
              <span className="text-gray-600">Chegada prevista:</span>
              <span className="text-xl font-bold text-gray-900">{result.arrival_time}</span>
            </div>
            <div className="flex justify-between items-center my-2">
              <span className="text-gray-600">Duração:</span>
              <span className="font-medium text-gray-900">{result.duration_minutes} min</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;