import React, { useState, useEffect } from 'react';
import metroData from './data/timetables.json';

const StarFilled = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const StarOutline = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-yellow-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;

// Cores Oficiais das Linhas do Metro do Porto
const getLineColor = (line) => {
  const colors = {
    A: '#00AEEF', // Azul
    B: '#E20613', // Vermelho
    C: '#8FC743', // Verde
    D: '#FDB913', // Amarelo
    E: '#7A4B94', // Violeta
    F: '#F58220'  // Laranja
  };
  return colors[line] || '#9CA3AF'; // Cinza como fallback
};

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
    let bestOption = null;

    for (const route of metroData.routes) {
      const seq = route.stations_sequence;
      
      if (seq.includes(start) && seq.includes(end)) {
        const startIdx = seq.indexOf(start);
        const endIdx = seq.indexOf(end);
        const isRev = startIdx > endIdx;
        
        const departuresData = isRev ? route.departures_reverse : route.departures;
        if (!departuresData[start] || !departuresData[start][dayType]) continue;
        
        const departures = departuresData[start][dayType];
        
        for (const dep of departures) {
          const [h, m] = dep.split(':').map(Number);
          const d = new Date(time); 
          d.setHours(h, m, 0, 0);
          
          if (d >= time) {
            if (!bestOption || d < bestOption.dep) {
              const duration = Math.abs(route.travel_times_from_start[endIdx] - route.travel_times_from_start[startIdx]);
              
              // Gerar os tempos paragem a paragem
              const path = [];
              const step = isRev ? -1 : 1;
              for(let i = startIdx; isRev ? i >= endIdx : i <= endIdx; i += step) {
                 const timeDiff = Math.abs(route.travel_times_from_start[i] - route.travel_times_from_start[startIdx]);
                 const stopTime = new Date(d.getTime() + timeDiff * 60000);
                 path.push({ name: seq[i], time: stopTime, line: route.line });
              }

              bestOption = { 
                line: route.line, 
                dep: d, 
                arr: new Date(d.getTime() + duration * 60000), 
                dur: duration, 
                dir: isRev ? route.direction_reverse : route.direction,
                path
              };
            }
            break; 
          }
        }
      }
    }
    return bestOption;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setError(''); setResult(null);
    const time = new Date(datetime);
    const dayType = (time.getDay() === 0 || time.getDay() === 6) ? "weekends" : "weekdays";

    const direct = getTrip(origin, destination, time, dayType);
    if (direct) {
      return setResult({ type: 'direta', finalLine: direct.line, ...direct });
    }

    for (const routeO of metroData.routes.filter(r => r.stations_sequence.includes(origin))) {
      for (const routeD of metroData.routes.filter(r => r.stations_sequence.includes(destination))) {
        if (routeO.line === routeD.line) continue; 
        
        const common = routeO.stations_sequence.filter(s => routeD.stations_sequence.includes(s));
        for (const station of common) {
          if (station === origin || station === destination) continue;

          const leg1 = getTrip(origin, station, time, dayType);
          if (leg1) {
            const leg2Time = new Date(leg1.arr.getTime() + 180000); // 3 mins troca
            const leg2 = getTrip(station, destination, leg2Time, dayType);
            if (leg2) {
              
              // Fundir as duas viagens numa timeline única
              const fullPath = [];
              leg1.path.forEach((step, idx) => {
                 if (idx === leg1.path.length - 1) {
                     fullPath.push({
                         name: station,
                         timeArrival: step.time,
                         timeDeparture: leg2.path[0].time,
                         type: 'transfer',
                         line1: leg1.line,
                         line2: leg2.line,
                         dir2: leg2.dir
                     });
                 } else {
                     fullPath.push(step);
                 }
              });
              leg2.path.slice(1).forEach(step => fullPath.push(step));

              return setResult({ 
                type: 'transbordo', 
                finalLine: leg2.line,
                dep: leg1.dep,
                arr: leg2.arr,
                dur: Math.round((leg2.arr - leg1.dep) / 60000),
                path: fullPath 
              });
            }
          }
        }
      }
    }
    setError('Não foi possível encontrar uma rota para este trajeto e hora.');
  };

  const fmt = (d) => d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        
        {/* HEADER ESTILO APP */}
        <div className="bg-gray-900 text-white p-6 pb-8 text-center relative">
           <h1 className="text-xl font-black tracking-widest uppercase mb-1">Metro do Porto</h1>
           <p className="text-xs text-gray-400">Horários Oficiais Live</p>
        </div>
        
        <div className="p-6 -mt-4 bg-white rounded-t-2xl relative z-10">
          <form onSubmit={handleSearch} className="space-y-4">
            {[["Origem", origin, setOrigin], ["Destino", destination, setDestination]].map(([label, val, set]) => (
              <div key={label}>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</label>
                <div className="flex gap-2 mt-1">
                  <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={val} onChange={e => set(e.target.value)} required>
                    <option value="">Selecione a estação...</option>
                    {favoriteStations.length > 0 && <optgroup label="Favoritos">{favoriteStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>}
                    <optgroup label="Estações">{otherStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                  </select>
                  <button type="button" onClick={() => setFavorites(f => f.includes(val) ? f.filter(x => x !== val) : [...f, val])} className="p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition">
                    {favorites.includes(val) ? <StarFilled /> : <StarOutline />}
                  </button>
                </div>
              </div>
            ))}
            
            <div className="pt-2">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Partida a partir de</label>
               <input type="datetime-local" className="w-full p-3 mt-1 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500" value={datetime} onChange={e => setDatetime(e.target.value)} required />
            </div>
            
            <button className="w-full py-4 mt-2 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-wide hover:bg-black transition-all">Pesquisar Viagem</button>
          </form>

          {error && <div className="mt-4 p-4 bg-red-50 text-red-600 font-medium rounded-xl text-center text-sm">{error}</div>}
        </div>

        {/* SECÇÃO DE RESULTADOS COM VISUAL METRO DO PORTO */}
        {result && (
          <div className="bg-gray-50 p-6 border-t border-gray-100">
            
            {/* CABEÇALHO DO RESULTADO (Resumo igual à imagem) */}
            <div className="mb-6 flex flex-col">
               <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-gray-800">{origin}</span>
                  <span className="text-xs font-bold text-gray-400 px-2">➔</span>
                  <span className="text-sm font-bold text-gray-800">{destination}</span>
               </div>
               <div className="flex justify-between items-end mt-2">
                  <div className="flex items-center gap-2">
                     <span className="text-white text-xs font-black px-2 py-1 rounded shadow-sm" style={{backgroundColor: getLineColor(result.finalLine)}}>
                        Linha {result.finalLine}
                     </span>
                     <span className="text-xs font-bold text-gray-500">{result.dur} min</span>
                  </div>
                  <div className="text-right">
                     <span className="text-lg font-black text-gray-900">{fmt(result.dep)}</span>
                     <span className="text-gray-400 font-bold mx-1">-</span>
                     <span className="text-lg font-black text-gray-900">{fmt(result.arr)}</span>
                  </div>
               </div>
            </div>

            <hr className="border-gray-200 mb-6" />

            {/* TIMELINE (Lista de paragens com horas) */}
            <div className="flex flex-col">
              {result.path.map((step, idx) => {
                  
                  // Bloco de Transbordo
                  if (step.type === 'transfer') {
                      return (
                          <div key={idx} className="flex items-stretch min-h-[60px] my-2">
                             <div className="w-14 text-right pr-3 flex flex-col justify-between py-2 text-xs font-bold text-gray-500">
                                <span>{fmt(step.timeArrival)}</span>
                                <span className="text-[10px] text-gray-400 my-1">espera</span>
                                <span>{fmt(step.timeDeparture)}</span>
                             </div>
                             <div className="flex flex-col items-center">
                                <div className="w-1 h-3" style={{backgroundColor: getLineColor(step.line1)}}></div>
                                <div className="w-4 h-4 rounded-full border-[3px] border-white shadow-sm z-10" style={{backgroundColor: '#111827'}}></div>
                                <div className="w-1 flex-grow mt-0" style={{backgroundColor: getLineColor(step.line2)}}></div>
                             </div>
                             <div className="pl-4 py-1 flex-1">
                                <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                                   <div className="text-sm font-black text-gray-900 mb-1">
                                      Transbordo em {step.name}
                                   </div>
                                   <div className="text-xs font-bold flex items-center gap-1" style={{color: getLineColor(step.line2)}}>
                                      Mudar para Linha {step.line2} <span className="text-gray-500 font-medium">({step.dir2})</span>
                                   </div>
                                </div>
                             </div>
                          </div>
                      );
                  }

                  // Paragem Normal
                  const color = getLineColor(step.line);
                  const isFirst = idx === 0;
                  const isLast = idx === result.path.length - 1;
                  const isImportant = isFirst || isLast;

                  return (
                     <div key={idx} className="flex items-stretch min-h-[36px]">
                        <div className={`w-14 text-right pr-3 text-xs ${isImportant ? 'font-black text-gray-900' : 'font-bold text-gray-500'} py-1.5`}>
                           {fmt(step.time)}
                        </div>
                        <div className="flex flex-col items-center">
                           <div className={`rounded-full shadow-sm z-10 ${isImportant ? 'w-3 h-3 mt-1.5 border-2 border-white' : 'w-2 h-2 mt-2'}`} style={{backgroundColor: color}}></div>
                           {!isLast && (
                              <div className="w-1 flex-grow -mt-2 pt-2" style={{backgroundColor: color}}></div>
                           )}
                        </div>
                        <div className={`pl-4 py-1.5 flex-1 text-sm ${isImportant ? 'font-black text-gray-900' : 'font-medium text-gray-600'}`}>
                           {step.name}
                        </div>
                     </div>
                  );
              })}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default App;
