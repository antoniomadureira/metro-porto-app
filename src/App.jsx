import React, { useState, useEffect } from 'react';
import metroData from './data/timetables.json';
import LiveMap from './LiveMap';

const IconSwap = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
const IconClock = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const StarFilled = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const StarOutline = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300 hover:text-yellow-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;

const getLineColor = (line) => {
  const colors = { A: '#00AEEF', B: '#E20613', BX: '#E20613', C: '#8FC743', D: '#FDB913', E: '#7A4B94', F: '#F58220' };
  return colors[line] || '#9CA3AF';
};

const BRAND_BLUE = '#00AEEF';

const LineBadge = ({ line, size = "md" }) => {
  const dims = size === "sm" ? "w-5 h-5 text-[10px]" : size === "lg" ? "w-8 h-8 text-sm" : "w-6 h-6 text-xs";
  return (
    <div className={`flex items-center justify-center rounded-full text-white font-black shrink-0 ${dims}`} style={{ backgroundColor: getLineColor(line) }}>
      {line}
    </div>
  );
};

const getRealRoutes = (routes) => {
    if (!routes) return [];
    const normalized = [];
    routes.forEach(r => {
        if (r.departures) {
            normalized.push({
                ...r,
                direction: r.stations_sequence[r.stations_sequence.length - 1],
                terminal: r.stations_sequence[0],
                departures_real: r.departures,
                isReverse: false
            });
        }
        if (r.departures_reverse) {
            const revSeq = [...r.stations_sequence].reverse();
            const maxTime = r.travel_times_from_start[r.travel_times_from_start.length - 1];
            const revTimes = r.travel_times_from_start.map(t => maxTime - t).reverse();
            normalized.push({
                ...r,
                stations_sequence: revSeq,
                travel_times_from_start: revTimes,
                direction: revSeq[revSeq.length - 1],
                terminal: revSeq[0],
                departures_real: r.departures_reverse, 
                isReverse: true
            });
        }
    });
    return normalized;
};

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [datetime, setDatetime] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(true);
  
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('metroFavorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const now = new Date();
    setDatetime(new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    if (!metroData || !metroData.routes) setIsDataLoaded(false);
  }, []);

  useEffect(() => {
    localStorage.setItem('metroFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const stations = metroData?.stations || [];
  const favoriteStations = stations.filter(s => favorites.includes(s));
  const otherStations = stations.filter(s => !favorites.includes(s));

  const swapStations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    setResult(null);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setError(''); 
    setResult(null);

    if (origin === destination) return setError('A origem e o destino têm de ser diferentes.');
    if (!isDataLoaded) return setError('Erro a carregar base de dados.');

    const searchTime = new Date(datetime);
    const realRoutes = getRealRoutes(metroData.routes);

    const getAllValidTrips = (startStation, destStation, sTime) => {
        const trips = [];
        const isWeekend = (sTime.getDay() === 0 || sTime.getDay() === 6);
        const dayType = isWeekend ? "weekends" : "weekdays";

        for (const route of realRoutes) {
            const startIdx = route.stations_sequence.indexOf(startStation);
            const endIdx = route.stations_sequence.indexOf(destStation);
            
            if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
                const terminalStation = route.terminal;
                
                let stationDepsObject = route.departures_real[terminalStation];
                if (!stationDepsObject && Object.keys(route.departures_real).length > 0) {
                    stationDepsObject = route.departures_real[Object.keys(route.departures_real)[0]];
                }
                
                const deps = stationDepsObject?.[dayType] || stationDepsObject?.["weekdays"] || [];
                
                for (const dep of deps) {
                    const [h, m] = dep.split(':').map(Number);
                    
                    let depTerminalDate = new Date(sTime.getFullYear(), sTime.getMonth(), sTime.getDate(), h, m, 0);
                    
                    if (h <= 3 && sTime.getHours() >= 20) depTerminalDate.setDate(depTerminalDate.getDate() + 1);
                    else if (h >= 20 && sTime.getHours() <= 3) depTerminalDate.setDate(depTerminalDate.getDate() - 1);

                    const timeToUserStart = route.travel_times_from_start[startIdx];
                    let userStartDate = new Date(depTerminalDate.getTime() + timeToUserStart * 60000);

                    if (userStartDate.getTime() < sTime.getTime() && (sTime.getTime() - userStartDate.getTime()) > 4 * 3600000) {
                        depTerminalDate.setDate(depTerminalDate.getDate() + 1);
                        userStartDate = new Date(depTerminalDate.getTime() + timeToUserStart * 60000);
                    }

                    if (userStartDate.getTime() >= sTime.getTime() && userStartDate.getTime() - sTime.getTime() <= 24 * 3600000) {
                        const timeToDest = route.travel_times_from_start[endIdx];
                        const arrDate = new Date(depTerminalDate.getTime() + timeToDest * 60000);
                        const duration = timeToDest - timeToUserStart;

                        const pathList = [];
                        for(let i = startIdx; i <= endIdx; i++) {
                           const tDiff = route.travel_times_from_start[i] - timeToUserStart;
                           pathList.push({ name: route.stations_sequence[i], time: new Date(userStartDate.getTime() + tDiff * 60000), line: route.line });
                        }

                        trips.push({ type: 'direta', line: route.line, dep: userStartDate, arr: arrDate, dur: duration, dir: route.direction, path: pathList });
                    }
                }
            }
        }
        
        const uniqueTrips = [];
        const seen = new Set();
        for (const t of trips) {
            const key = `${t.line}-${t.dep.getTime()}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueTrips.push(t);
            }
        }
        uniqueTrips.sort((a, b) => a.dep.getTime() - b.dep.getTime());
        return uniqueTrips;
    };

    const directTrips = getAllValidTrips(origin, destination, searchTime);
    const transferTrips = [];

    for (const routeO of realRoutes) {
        if (!routeO.stations_sequence.includes(origin)) continue;
        for (const routeD of realRoutes) {
            if (routeO.line === routeD.line) continue; 
            if (!routeD.stations_sequence.includes(destination)) continue;

            const common = routeO.stations_sequence.filter(s => routeD.stations_sequence.includes(s));
            for (const station of common) {
                if (station === origin || station === destination) continue;

                let leg1Trips = getAllValidTrips(origin, station, searchTime);
                if (leg1Trips.length === 0) continue;
                
                const candidateLeg1s = leg1Trips.slice(0, 3);
                
                for (const leg1 of candidateLeg1s) {
                    const leg2Time = new Date(leg1.arr.getTime() + 180000); 
                    let leg2Trips = getAllValidTrips(station, destination, leg2Time);
                    if (leg2Trips.length === 0) continue;
                    
                    const leg2 = leg2Trips[0];
                    
                    const fullPath = [];
                    leg1.path.forEach((step, idx) => {
                       if (idx === leg1.path.length - 1) fullPath.push({ name: station, timeArrival: step.time, timeDeparture: leg2.path[0].time, type: 'transfer', line1: leg1.line, line2: leg2.line, dir2: leg2.dir });
                       else fullPath.push(step);
                    });
                    leg2.path.slice(1).forEach(step => fullPath.push(step));

                    transferTrips.push({ type: 'transbordo', firstLine: leg1.line, finalLine: leg2.line, dep: leg1.dep, arr: leg2.arr, dur: Math.round((leg2.arr.getTime() - leg1.dep.getTime()) / 60000), path: fullPath });
                }
            }
        }
    }

    const allTrips = [...directTrips, ...transferTrips];
    
    if (allTrips.length === 0) {
        return setError('Rota não encontrada para os dados selecionados.');
    }

    allTrips.sort((a, b) => {
        if (a.arr.getTime() !== b.arr.getTime()) return a.arr.getTime() - b.arr.getTime(); 
        if (a.type === 'direta' && b.type !== 'direta') return -1;
        if (b.type === 'direta' && a.type !== 'direta') return 1;
        return a.dep.getTime() - b.dep.getTime(); 
    });

    setResult(allTrips[0]);
  };

  const fmt = (d) => d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-start sm:items-center justify-center sm:p-4 font-sans text-gray-900">
      <div className="bg-white sm:rounded-xl shadow-none sm:shadow-2xl w-full max-w-md h-[100dvh] sm:h-[85vh] overflow-hidden flex flex-col relative border border-gray-200">
        
        <div className="flex-1 overflow-hidden flex flex-col relative pb-[72px]">
          {activeTab === 'search' ? (
            <div className="flex-1 overflow-y-auto flex flex-col">
              
              <div className="pt-10 pb-6 px-6 shrink-0 relative z-10 border-b-[4px]" style={{borderColor: BRAND_BLUE}}>
                 <div className="flex items-center justify-between">
                    <div>
                       <h1 className="text-[28px] font-black tracking-tighter text-gray-900 leading-none">Metro do Porto</h1>
                       <p className="text-[13px] text-gray-500 font-bold mt-1.5 uppercase tracking-widest">Horários & Rotas</p>
                    </div>
                    <div className="w-12 h-12 bg-[#00AEEF] rounded-br-[24px] rounded-tl-[24px] flex items-center justify-center shadow-sm">
                       <span className="text-white font-black text-2xl italic pr-1">M</span>
                    </div>
                 </div>
              </div>
              
              <div className="px-6 pb-6 pt-6 shrink-0 z-20 bg-white">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="bg-white rounded-lg p-1 relative border-2 border-gray-100 shadow-sm">
                      <button type="button" onClick={swapStations} className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors z-10 border border-gray-100">
                          <IconSwap />
                      </button>

                      <div className="flex items-center px-4 py-4 border-b border-gray-100">
                          <div className="w-2 h-2 rounded-full mr-3 bg-gray-400"></div>
                          <select className="flex-1 bg-transparent font-bold text-gray-800 outline-none appearance-none text-[15px]" value={origin} onChange={e => setOrigin(e.target.value)} required>
                              <option value="" disabled>Origem</option>
                              {favoriteStations.length > 0 && <optgroup label="Favoritos">{favoriteStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>}
                              <optgroup label="Estações">{otherStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                          </select>
                          <button type="button" onClick={() => setFavorites(f => f.includes(origin) ? f.filter(x => x !== origin) : [...f, origin])} className="pl-2">
                              {origin && (favorites.includes(origin) ? <StarFilled /> : <StarOutline />)}
                          </button>
                      </div>

                      <div className="flex items-center px-4 py-4">
                          <div className="w-2 h-2 rounded-full mr-3 bg-gray-900"></div>
                          <select className="flex-1 bg-transparent font-bold text-gray-800 outline-none appearance-none text-[15px]" value={destination} onChange={e => setDestination(e.target.value)} required>
                              <option value="" disabled>Destino</option>
                              {favoriteStations.length > 0 && <optgroup label="Favoritos">{favoriteStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>}
                              <optgroup label="Estações">{otherStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                          </select>
                          <button type="button" onClick={() => setFavorites(f => f.includes(destination) ? f.filter(x => x !== destination) : [...f, destination])} className="pl-2">
                              {destination && (favorites.includes(destination) ? <StarFilled /> : <StarOutline />)}
                          </button>
                      </div>
                  </div>

                  <div className="bg-white rounded-lg flex items-center px-5 py-4 border-2 border-gray-100 shadow-sm">
                     <IconClock />
                     <input type="datetime-local" className="flex-1 ml-3 bg-transparent font-bold text-gray-800 outline-none text-[15px]" value={datetime} onChange={e => setDatetime(e.target.value)} required />
                  </div>
                  
                  <button className="w-full py-4 mt-2 text-white rounded-lg font-black text-[15px] uppercase tracking-wider shadow-md hover:opacity-90 active:scale-[0.98] transition-all" style={{backgroundColor: BRAND_BLUE}}>
                      Procurar
                  </button>
                </form>

                {error && <div className="mt-4 p-4 bg-red-50 text-red-700 font-bold rounded-lg text-center text-sm border border-red-100">{error}</div>}
              </div>

              {result && (
                <div className="flex-1 bg-white border-t-4 border-gray-100 pb-10">
                  <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-5 border-b border-gray-100 z-10 shadow-sm">
                     <div className="flex justify-between items-end">
                        <div>
                           <div className="flex items-center gap-1.5 mb-3">
                              {result.type === 'transbordo' ? (
                                 <>
                                    <LineBadge line={result.firstLine} />
                                    <span className="text-gray-300 text-[10px] font-black mx-0.5">➔</span>
                                    <LineBadge line={result.finalLine} />
                                 </>
                              ) : (
                                 <LineBadge line={result.line} />
                              )}
                              <span className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2 bg-gray-100 px-2 py-0.5 rounded-sm">{result.dur} min</span>
                           </div>

                           <div className="text-3xl font-black text-gray-900 tracking-tighter">
                              {fmt(result.dep)} <span className="text-gray-300 mx-1 font-light">→</span> {fmt(result.arr)}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="px-6 pt-5 flex flex-col">
                    {result.path.map((step, idx) => {
                        if (step.type === 'transfer') {
                            return (
                                <div key={idx} className="flex items-stretch my-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                   <div className="w-12 text-right pr-4 flex flex-col justify-between py-1">
                                      <span className="text-sm font-black text-gray-500">{fmt(step.timeArrival)}</span>
                                      <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 my-1">Troca</span>
                                      <span className="text-sm font-black text-gray-900">{fmt(step.timeDeparture)}</span>
                                   </div>
                                   <div className="flex flex-col items-center">
                                      <div className="w-1 h-1/2 rounded-t-sm" style={{backgroundColor: getLineColor(step.line1)}}></div>
                                      <div className="w-1 h-1/2 rounded-b-sm mt-1" style={{backgroundColor: getLineColor(step.line2)}}></div>
                                   </div>
                                   <div className="pl-4 py-1 flex-1 flex flex-col justify-center">
                                      <div className="text-sm font-black text-gray-900 mb-1.5">Transbordo: {step.name}</div>
                                      <div className="text-xs font-bold flex items-center gap-2 text-gray-600">
                                         <LineBadge line={step.line2} size="sm" />
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
                           <div key={idx} className="flex items-stretch min-h-[40px]">
                              <div className={`w-12 text-right pr-4 text-[13px] pt-1 ${isImportant ? 'font-black text-gray-900' : 'font-bold text-gray-400'}`}>
                                 {fmt(step.time)}
                              </div>
                              <div className="flex flex-col items-center w-4">
                                 <div className={`rounded-full z-10 shrink-0 ${isImportant ? 'w-3 h-3 border-2 bg-white mt-1' : 'w-2 h-2 mt-1.5'}`} style={{ backgroundColor: isImportant ? 'white' : color, borderColor: color }}></div>
                                 {!isLast && result.path[idx + 1].type !== 'transfer' && (
                                    <div className="w-0.5 flex-1 -my-0.5" style={{backgroundColor: color}}></div>
                                 )}
                              </div>
                              <div className={`pl-4 pb-4 flex-1 text-[14px] pt-0.5 ${isImportant ? 'font-black text-gray-900' : 'font-bold text-gray-600'}`}>
                                 {step.name}
                              </div>
                           </div>
                        );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <LiveMap />
          )}
        </div>

        <div className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex items-center justify-around pb-safe pt-2 pb-4 px-4 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] h-[72px]">
           <button onClick={() => setActiveTab('search')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'search' ? 'text-[#00AEEF]' : 'text-gray-400 hover:text-gray-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Planear</span>
           </button>

           <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'map' ? 'text-[#00AEEF]' : 'text-gray-400 hover:text-gray-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Live Map</span>
           </button>
        </div>

      </div>
    </div>
  );
}

export default App;