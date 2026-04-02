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

  const stations = metroData.stations || [];
  const favoriteStations = stations.filter(s => favorites.includes(s));
  const otherStations = stations.filter(s => !favorites.includes(s));

  const getTrip = (start, end, time, dayType) => {
    for (const route of metroData.routes) {
      const seq = route.stations_sequence;
      if (seq.includes(start) && seq.includes(end)) {
        const startIdx = seq.indexOf(start), endIdx = seq.indexOf(end);
        const isRev = startIdx > endIdx;
        const departures = (isRev ? route.departures_reverse : route.departures)[start][dayType];
        
        let next = null;
        for (const dep of departures) {
          const [h, m] = dep.split(':').map(Number);
          const d = new Date(time); d.setHours(h, m, 0, 0);
          if (d >= time && (!next || d < next)) next = d;
        }
        if (next) {
          const duration = Math.abs(route.travel_times_from_start[endIdx] - route.travel_times_from_start[startIdx]);
          return { line: route.line, dep: next, arr: new Date(next.getTime() + duration * 60000), dur: duration, dir: isRev ? route.direction_reverse : route.direction };
        }
      }
    }
    return null;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setError(''); setResult(null);
    const time = new Date(datetime);
    const dayType = (time.getDay() === 0 || time.getDay() === 6) ? "weekends" : "weekdays";

    // 1. Direta
    const direct = getTrip(origin, destination, time, dayType);
    if (direct) return setResult({ type: 'direta', ...direct });

    // 2. Transbordo (Procura estação comum)
    for (const routeO of metroData.routes.filter(r => r.stations_sequence.includes(origin))) {
      for (const routeD of metroData.routes.filter(r => r.stations_sequence.includes(destination))) {
        const common = routeO.stations_sequence.filter(s => routeD.stations_sequence.includes(s));
        for (const station of common) {
          const leg1 = getTrip(origin, station, time, dayType);
          if (leg1) {
            const leg2 = getTrip(station, destination, new Date(leg1.arr.getTime() + 180000), dayType); // +3 min troca
            if (leg2) return setResult({ type: 'transbordo', leg1, leg2, station });
          }
        }
      }
    }
    setError('Não foi possível encontrar uma rota.');
  };

  const fmt = (d) => d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <h1 className="text-2xl font-bold text-blue-600 mb-6 text-center">Metro do Porto <span className="text-xs font-normal text-gray-400">GTFS Live</span></h1>
        
        <form onSubmit={handleSearch} className="space-y-4">
          {[["Origem", origin, setOrigin], ["Destino", destination, setDestination]].map(([label, val, set]) => (
            <div key={label}>
              <label className="text-xs font-semibold text-gray-500 uppercase ml-1">{label}</label>
              <div className="flex gap-2">
                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={val} onChange={e => set(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {favoriteStations.length > 0 && <optgroup label="Favoritos">{favoriteStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>}
                  <optgroup label="Estações">{otherStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                </select>
                <button type="button" onClick={() => setFavorites(f => f.includes(val) ? f.filter(x => x !== val) : [...f, val])} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  {favorites.includes(val) ? <StarFilled /> : <StarOutline />}
                </button>
              </div>
            </div>
          ))}
          <input type="datetime-local" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={datetime} onChange={e => setDatetime(e.target.value)} required />
          <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">Ver Próxima Viagem</button>
        </form>

        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-center text-sm">{error}</div>}

        {result && (
          <div className="mt-6 space-y-3">
            {result.type === 'direta' ? (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="flex justify-between text-xs font-bold text-blue-500 mb-2"><span>Linha {result.line}</span><span>Sentido {result.dir}</span></div>
                <div className="flex justify-between items-center"><span className="text-2xl font-black">{fmt(result.dep)}</span><div className="h-px flex-1 mx-4 bg-blue-200"></div><span className="text-2xl font-black">{fmt(result.arr)}</span></div>
                <div className="text-center text-xs text-blue-400 mt-2">Duração: {result.dur} min</div>
              </div>
            ) : (
              <div className="space-y-2">
                {[result.leg1, result.leg2].map((l, i) => (
                  <div key={i} className={`p-4 border rounded-2xl ${i===0?'bg-blue-50 border-blue-100':'bg-purple-50 border-purple-100'}`}>
                    <div className="text-[10px] font-bold uppercase opacity-50 mb-1">{i===0?'Partida':'Troca na '+result.station}</div>
                    <div className="flex justify-between text-xs font-bold mb-1"><span>Linha {l.line}</span><span>{fmt(l.dep)} ➔ {fmt(l.arr)}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;