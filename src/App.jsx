import React, { useState, useEffect } from 'react';
import metroData from './data/timetables.json';

const IconSwap = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
const IconClock = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const StarFilled = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const StarOutline = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300 hover:text-yellow-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;

const getLineColor = (line) => {
  const colors = {
    A: '#00AEEF',
    B: '#E20613',
    C: '#8FC743',
    D: '#FDB913',
    E: '#7A4B94',
    F: '#F58220'
  };
  return colors[line] || '#9CA3AF';
};

// O Azul Oficial
const BRAND_BLUE = '#00AEEF';

function App() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [datetime, setDatetime] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('metroFavorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const now = new Date();
    setDatetime(new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    localStorage.setItem('metroFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const stations = metroData.stations || [];
  const favoriteStations = stations.filter(s => favorites.includes(s));
  const otherStations = stations.filter(s => !favorites.includes(s));

  const swapStations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    setResult(null);
  };

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
          const parts = dep.split(':');
          const h = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = new Date(time); 
          d.setHours(h, m, 0, 0);
          
          if (d >= time) {
            if (!bestOption || d < bestOption.dep) {
              const duration = Math.abs(route.travel_times_from_start[endIdx] - route.travel_times_from_start[startIdx]);
              
              const pathList = [];
              const loopStep = isRev ? -1 : 1;
              
              for(let i = startIdx; (isRev ? i >= endIdx : i <= endIdx); i += loopStep) {
                 const timeDiff = Math.abs(route.travel_times_from_start[i] - route.travel_times_from_start[startIdx]);
                 const stopTime = new Date(d.getTime() + timeDiff * 60000);
                 pathList.push({ name: seq[i], time: stopTime, line: route.line });
              }

              bestOption = { 
                line: route.line, 
                dep: d, 
                arr: new Date(d.getTime() + duration * 60000), 
                dur: duration, 
                dir: isRev ? route.direction_reverse : route.direction,
                path: pathList
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
    setError(''); 
    setResult(null);

    if (origin === destination) {
        return setError('A origem e o destino têm de ser diferentes.');
    }

    const time = new Date(datetime);
    const dayType = (time.getDay() === 0 || time.getDay() === 6) ? "weekends" : "weekdays";

    const direct = getTrip(origin, destination, time, dayType);
    if (direct) {
      return setResult({ 
        type: 'direta', 
        finalLine: direct.line, 
        line: direct.line, 
        dep: direct.dep, 
        arr: direct.arr, 
        dur: direct.dur, 
        dir: direct.dir, 
        path: direct.path 
      });
    }

    let bestTransfer = null;

    for (const routeO of metroData.routes.filter(r => r.stations_sequence.includes(origin))) {
      for (const routeD of metroData.routes.filter(r => r.stations_sequence.includes(destination))) {
        if (routeO.line === routeD.line) continue; 
        
        const common = routeO.stations_sequence.filter(s => routeD.stations_sequence.includes(s));
        
        for (const station of common) {
          if (station === origin || station === destination) continue;

          const leg1 = getTrip(origin, station, time, dayType);
          if (leg1) {
            const leg2Time = new Date(leg1.arr.getTime() + 180000); 
            const leg2 = getTrip(station, destination, leg2Time, dayType);
            
            if (leg2) {
              const totalArr = leg2.arr;
              
              if (!bestTransfer || totalArr < bestTransfer.arr) {
                
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
                
                leg2.path.slice(1).forEach(step => {
                    fullPath.push(step);
                });

                bestTransfer = { 
                  type: 'transbordo', 
                  finalLine: leg2.line,
                  dep: leg1.dep,
                  arr: leg2.arr,
                  dur: Math.round((leg2.arr - leg1.dep) / 60000),
                  path: fullPath 
                };
              }
            }
          }
        }
      }
    }

    if (bestTransfer) {
      return setResult(bestTransfer);
    }

    setError('Rota não encontrada para esta hora.');
  };

  const fmt = (d) => d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-start sm:items-center justify-center sm:p-4 font-sans text-gray-900">
      <div className="bg-white sm:rounded-[2.5rem] shadow-none sm:shadow-2xl w-full max-w-md min-h-screen sm:min-h-[85vh] overflow-hidden flex flex-col relative">
        
        {/* HEADER BRANDING AZUL METRO DO PORTO */}
        <div className="pt-12 pb-8 px-6 text-center shrink-0 relative z-10" style={{backgroundColor: BRAND_BLUE}}>
           <h1 className="text-3xl font-black tracking-tight text-white">Metro do Porto</h1>
           <p className="text-sm text-blue-100 font-medium mt-1">Horários Oficiais e Transbordos</p>
        </div>
        
        <div className="px-6 pb-6 pt-6 shrink-0 z-20 bg-white">
          <form onSubmit={handleSearch} className="space-y-4">
            
            <div className="bg-[#F2F2F7] rounded-3xl p-2 relative shadow-inner border border-gray-100">
                <button type="button" onClick={swapStations} className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors z-10 border border-gray-100">
                    <IconSwap />
                </button>

                <div className="flex items-center px-4 py-3 border-b border-gray-200/60">
                    <div className="w-3 h-3 rounded-full mr-3" style={{backgroundColor: BRAND_BLUE}}></div>
                    <select className="flex-1 bg-transparent font-semibold text-gray-900 outline-none appearance-none" value={origin} onChange={e => setOrigin(e.target.value)} required>
                        <option value="" disabled className="text-gray-400">De onde partes?</option>
                        {favoriteStations.length > 0 && <optgroup label="Favoritos">{favoriteStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>}
                        <optgroup label="Estações">{otherStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                    </select>
                    <button type="button" onClick={() => setFavorites(f => f.includes(origin) ? f.filter(x => x !== origin) : [...f, origin])} className="pl-2">
                        {origin && (favorites.includes(origin) ? <StarFilled /> : <StarOutline />)}
                    </button>
                </div>

                <div className="flex items-center px-4 py-3">
                    <div className="w-3 h-3 rounded-full border-[2.5px] mr-3" style={{borderColor: BRAND_BLUE}}></div>
                    <select className="flex-1 bg-transparent font-semibold text-gray-900 outline-none appearance-none" value={destination} onChange={e => setDestination(e.target.value)} required>
                        <option value="" disabled className="text-gray-400">Para onde vais?</option>
                        {favoriteStations.length > 0 && <optgroup label="Favoritos">{favoriteStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>}
                        <optgroup label="Estações">{otherStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                    </select>
                    <button type="button" onClick={() => setFavorites(f => f.includes(destination) ? f.filter(x => x !== destination) : [...f, destination])} className="pl-2">
                        {destination && (favorites.includes(destination) ? <StarFilled /> : <StarOutline />)}
                    </button>
                </div>
            </div>

            <div className="bg-[#F2F2F7] rounded-2xl flex items-center px-6 py-4 shadow-inner border border-gray-100">
               <IconClock />
               <input type="datetime-local" className="flex-1 ml-3 bg-transparent font-semibold text-gray-900 outline-none" value={datetime} onChange={e => setDatetime(e.target.value)} required />
            </div>
            
            <button className="w-full py-4 mt-2 text-white rounded-2xl font-bold text-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition-all" style={{backgroundColor: BRAND_BLUE}}>
                Ver Viagem
            </button>
          </form>

          {error && <div className="mt-4 p-4 bg-red-50 text-red-600 font-medium rounded-2xl text-center text-sm">{error}</div>}
        </div>

        {result && (
          <div className="flex-1 bg-white border-t border-gray-100 overflow-y-auto pb-10">
            
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-5 border-b border-gray-100 z-10 shadow-sm">
               <div className="flex justify-between items-end">
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black px-2.5 py-1 rounded-md text-white shadow-sm" style={{backgroundColor: getLineColor(result.finalLine)}}>
                           Linha {result.finalLine}
                        </span>
                        <span className="text-sm font-bold text-gray-400">{result.dur} min</span>
                     </div>
                     <div className="text-2xl font-black text-gray-900 tracking-tight">
                        {fmt(result.dep)} <span className="text-gray-300 mx-1">→</span> {fmt(result.arr)}
                     </div>
                  </div>
               </div>
            </div>

            <div className="px-6 pt-6 flex flex-col">
              {result.path.map((step, idx) => {
                  
                  if (step.type === 'transfer') {
                      return (
                          <div key={idx} className="flex items-stretch my-3 bg-[#F2F2F7] rounded-2xl p-4 border border-gray-200">
                             <div className="w-12 text-right pr-4 flex flex-col justify-between py-1">
                                <span className="text-sm font-bold text-gray-500">{fmt(step.timeArrival)}</span>
                                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 my-1">Wait</span>
                                <span className="text-sm font-bold text-gray-900">{fmt(step.timeDeparture)}</span>
                             </div>
                             
                             <div className="flex flex-col items-center">
                                <div className="w-1 h-1/2 rounded-t-full" style={{backgroundColor: getLineColor(step.line1)}}></div>
                                <div className="w-1 h-1/2 rounded-b-full mt-1" style={{backgroundColor: getLineColor(step.line2)}}></div>
                             </div>
                             
                             <div className="pl-4 py-1 flex-1 flex flex-col justify-center">
                                <div className="text-sm font-bold text-gray-900 mb-1">
                                   Trocar em {step.name}
                                </div>
                                <div className="text-xs font-bold flex items-center gap-1.5" style={{color: getLineColor(step.line2)}}>
                                   <span className="w-2 h-2 rounded-full" style={{backgroundColor: getLineColor(step.line2)}}></span>
                                   Apanhar Linha {step.line2}
                                </div>
                                <div className="text-[10px] font-medium text-gray-500 mt-0.5 ml-3.5">
                                   Sentido {step.dir2}
                                </div>
                             </div>
                          </div>
                      );
                  }

                  const color = getLineColor(step.line);
                  const isFirst = idx === 0;
                  const isLast = idx === result.path.length - 1;
                  const isImportant = isFirst || isLast;
                  
                  return (
                     <div key={idx} className="flex items-stretch min-h-[44px]">
                        <div className={`w-12 text-right pr-4 text-sm pt-0.5 ${isImportant ? 'font-bold text-gray-900' : 'font-medium text-gray-400'}`}>
                           {fmt(step.time)}
                        </div>
                        
                        <div className="flex flex-col items-center relative w-4">
                           <div className={`absolute top-1.5 rounded-full z-10 ${isImportant ? 'w-3.5 h-3.5 border-[3px] bg-white' : 'w-2 h-2'}`} 
                                style={{ backgroundColor: isImportant ? 'white' : color, borderColor: color }}>
                           </div>
                           
                           {!isLast && result.path[idx + 1].type !== 'transfer' && (
                              <div className="absolute top-1.5 bottom-[-6px] w-1 rounded-full" style={{backgroundColor: color}}></div>
                           )}
                        </div>
                        
                        <div className={`pl-4 pb-4 flex-1 text-[15px] pt-0.5 ${isImportant ? 'font-bold text-gray-900' : 'font-semibold text-gray-600'}`}>
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