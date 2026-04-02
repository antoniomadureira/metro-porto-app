import React, { useState, useEffect } from 'react';
import metroData from './data/timetables.json';

const StarFilled = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const StarOutline = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-yellow-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;

function App() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [datetime, setDatetime] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('metroFavorites') || '[]'));

  useEffect(() => {
    const now = new Date();
    setDatetime(new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  }, []);

  useEffect(() => localStorage.setItem('metroFavorites', JSON.stringify(favorites)), [favorites]);
  const toggleFavorite = (s) => setFavorites(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const allStationsSorted = [...new Set(metroData.stations)].sort((a, b) => a.localeCompare(b, 'pt-PT'));
  const favoriteStations = allStationsSorted.filter(s => favorites.includes(s));
  const otherStations = allStationsSorted.filter(s => !favorites.includes(s));

  const getLegDetails = (route, start, end, reqTime, dayType) => {
    const seq = route.stations_sequence;
    const startIdx = seq.indexOf(start);
    const endIdx = seq.indexOf(end);
    const isReverse = startIdx > endIdx;
    const duration = Math.abs(route.travel_times_from_start[endIdx] - route.travel_times_from_start[startIdx]);
    
    const targetDepartures = isReverse ? route.departures_reverse : route.departures;
    if (!targetDepartures[start] || !targetDepartures[start][dayType] || targetDepartures[start][dayType].length === 0) return null;

    let nextTrain = null;
    for (const dep of targetDepartures[start][dayType]) {
      const [h, m] = dep.split(":").map(Number);
      const d = new Date(reqTime); d.setHours(h, m, 0, 0);
      if (d >= reqTime && (!nextTrain || d < nextTrain)) nextTrain = d;
    }
    if (!nextTrain) return null;

    const stationsPath = isReverse ? seq.slice(endIdx, startIdx + 1).reverse() : seq.slice(startIdx, endIdx + 1);
    const pathObjects = stationsPath.map(name => ({ name, type: 'station' }));

    return {
      line: route.line,
      direction: isReverse ? route.direction_reverse : route.direction,
      departureTime: nextTrain,
      arrivalTime: new Date(nextTrain.getTime() + duration * 60000),
      duration,
      path: pathObjects
    };
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setError(''); setResult(null);
    if (origin === destination) return setError("A origem e o destino devem ser diferentes.");
    
    const reqTime = new Date(datetime);
    const dayType = (reqTime.getDay() === 0 || reqTime.getDay() === 6) ? "weekends" : "weekdays";

    let bestDirect = null;
    for (const route of metroData.routes) {
      if (route.stations_sequence.includes(origin) && route.stations_sequence.includes(destination)) {
        const trip = getLegDetails(route, origin, destination, reqTime, dayType);
        if (trip && (!bestDirect || trip.arrivalTime < bestDirect.arrivalTime)) bestDirect = trip;
      }
    }

    if (bestDirect) return setResult({ type: 'direct', ...bestDirect });

    let bestTransfer = null;
    const originRoutes = metroData.routes.filter(r => r.stations_sequence.includes(origin));
    const destRoutes = metroData.routes.filter(r => r.stations_sequence.includes(destination));

    for (const oRoute of originRoutes) {
      for (const dRoute of destRoutes) {
        if (oRoute.line === dRoute.line) continue; 

        const intersections = oRoute.stations_sequence.filter(s => dRoute.stations_sequence.includes(s));
        for (const transfer of intersections) {
          if (transfer === origin || transfer === destination) continue;

          const leg1 = getLegDetails(oRoute, origin, transfer, reqTime, dayType);
          if (!leg1) continue;

          const transferTime = new Date(leg1.arrivalTime.getTime() + 4 * 60000); 
          const leg2 = getLegDetails(dRoute, transfer, destination, transferTime, dayType);
          if (!leg2) continue;

          const totalArr = leg2.arrivalTime;
          if (!bestTransfer || totalArr < bestTransfer.arrivalTime) {
            const leg1PathClean = leg1.path.slice(0, -1);
            const transferNode = { name: `Sair e mudar para a Linha ${dRoute.line} em ${transfer}`, type: 'transfer' };
            const fullPath = [...leg1PathClean, transferNode, ...leg2.path];

            bestTransfer = {
              type: 'transfer',
              departureTime: leg1.departureTime,
              arrivalTime: leg2.arrivalTime,
              duration: Math.round((totalArr - leg1.departureTime) / 60000),
              leg1, leg2,
              path: fullPath
            };
          }
        }
      }
    }

    if (bestTransfer) return setResult(bestTransfer);
    setError("⚠️ Não existem horários processados para esta rota neste momento.");
  };

  const fmtTime = (d) => d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg">
        <h1 className="text-3xl font-black text-blue-600 mb-6 text-center tracking-tight">Metro do Porto</h1>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase">Origem</label>
              <select className="mt-1 w-full rounded-md border-gray-300 bg-gray-50 p-2 border" value={origin} onChange={e => setOrigin(e.target.value)} required>
                <option value="">Selecionar</option>
                {favoriteStations.length > 0 && <optgroup label="⭐ Favoritas">{favoriteStations.map(s => <option key={`orig-fav-${s}`} value={s}>{s}</option>)}</optgroup>}
                <optgroup label="Todas as Estações">{otherStations.map(s => <option key={`orig-${s}`} value={s}>{s}</option>)}</optgroup>
              </select>
            </div>
            <button type="button" onClick={() => toggleFavorite(origin)} className="mt-5">{favorites.includes(origin) ? <StarFilled /> : <StarOutline />}</button>
          </div>

          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase">Destino</label>
              <select className="mt-1 w-full rounded-md border-gray-300 bg-gray-50 p-2 border" value={destination} onChange={e => setDestination(e.target.value)} required>
                <option value="">Selecionar</option>
                {favoriteStations.length > 0 && <optgroup label="⭐ Favoritas">{favoriteStations.map(s => <option key={`dest-fav-${s}`} value={s}>{s}</option>)}</optgroup>}
                <optgroup label="Todas as Estações">{otherStations.map(s => <option key={`dest-${s}`} value={s}>{s}</option>)}</optgroup>
              </select>
            </div>
            <button type="button" onClick={() => toggleFavorite(destination)} className="mt-5">{favorites.includes(destination) ? <StarFilled /> : <StarOutline />}</button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Data/Hora de Partida</label>
            <input type="datetime-local" className="mt-1 w-full rounded-md border-gray-300 p-2 border bg-gray-50" value={datetime} onChange={e => setDatetime(e.target.value)} required />
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 font-bold mt-4 shadow-md transition-all">Pesquisar</button>
        </form>

        {error && <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm font-medium">{error}</div>}

        {result && (
          <div className="mt-6 p-5 bg-white border border-gray-200 rounded-xl shadow-sm relative">
             <div className="absolute -top-3 right-4">
               <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-300 shadow-sm">✅ Horário Calculado</span>
            </div>

            {result.type === 'direct' ? (
              <div className="flex justify-between items-center border-b pb-3 mb-3 mt-2">
                <h3 className="font-bold text-gray-800 text-lg">Linha {result.line}</h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold uppercase text-right ml-2 leading-tight">Sentido<br/>{result.direction}</span>
              </div>
            ) : (
              <div className="flex flex-col border-b pb-3 mb-3 space-y-2 mt-2">
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-bold uppercase w-max mb-1">Viajem com Transbordo</span>
                <div className="flex items-center text-sm font-medium text-gray-600">
                  <span className="bg-gray-200 px-2 rounded mr-2">1</span> Linha {result.leg1.line} (Sentido {result.leg1.direction})
                </div>
                <div className="flex items-center text-sm font-medium text-gray-600">
                  <span className="bg-gray-200 px-2 rounded mr-2">2</span> Linha {result.leg2.line} (Sentido {result.leg2.direction})
                </div>
              </div>
            )}

            <div className="flex justify-between items-center my-3">
              <span className="text-gray-500 font-medium">Partida:</span>
              <span className="text-3xl font-black text-blue-600">{fmtTime(result.departureTime)}</span>
            </div>
            <div className="flex justify-between items-center my-3">
              <span className="text-gray-500 font-medium">Chegada:</span>
              <span className="text-xl font-bold text-gray-800">{fmtTime(result.arrivalTime)}</span>
            </div>
            
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="font-semibold text-xs text-gray-400 uppercase tracking-wider mb-4">Trajeto e Paragens ({result.duration} min)</p>
              <div className="space-y-3">
                {result.path.map((step, i) => (
                  <div key={i} className="flex items-start">
                    <div className="flex flex-col items-center mr-3 mt-1">
                      <div className={`w-3 h-3 rounded-full ${step.type === 'transfer' ? 'bg-purple-500' : 'bg-blue-400'}`}></div>
                      {i !== result.path.length - 1 && <div className="w-0.5 h-6 bg-gray-200 my-1"></div>}
                    </div>
                    <span className={`text-sm ${step.type === 'transfer' ? 'font-bold text-purple-700' : 'text-gray-700 font-medium'}`}>
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default App;