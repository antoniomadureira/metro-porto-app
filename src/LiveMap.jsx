import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import metroData from './data/timetables.json';

const BRAND_BLUE = '#00AEEF';

// COORDENADAS REAIS EXTRAÍDAS DO TEU GTFS (shapes.txt)
// Fim das discrepâncias: A linha e a paragem usam agora os mesmos dados absolutos.
const STATIONS_GEO = {
  // Tronco Comum
  'Estádio do Dragão': [41.16071701, -8.58241558],
  'Campanhã': [41.15053558, -8.58624458],
  'Heroísmo': [41.14669799, -8.59297752],
  '24 de Agosto': [41.14879608, -8.59834861],
  'Bolhão': [41.14978408, -8.60590076],
  'Trindade': [41.15227890, -8.60929870],
  'Lapa': [41.15710830, -8.61672306],
  'Carolina Michaelis': [41.15858459, -8.62224578],
  'Casa da Música': [41.16057586, -8.62828159],
  'Francos': [41.16555023, -8.63634681],
  'Ramalde': [41.17296218, -8.64176559],
  'Viso': [41.17724990, -8.64649772],
  'Sete Bicas': [41.18241882, -8.65214920],
  'Senhora da Hora': [41.18810272, -8.65446567],

  // Linha A Oeste
  'Vasco da Gama': [41.19023513, -8.66103744],
  'Estádio do Mar': [41.18576812, -8.66118907],
  'Pedro Hispano': [41.18038177, -8.66623210],
  'Parque de Real': [41.17910766, -8.67354583],
  'Câmara Matosinhos': [41.18069839, -8.68122673],
  'Matosinhos Sul': [41.18017196, -8.68855285],
  'Brito Capelo': [41.18390655, -8.69146919],
  'Mercado': [41.18748474, -8.69339084],
  'Senhor de Matosinhos': [41.18820571, -8.68512344],

  // Ponto de Separação Norte
  'Fonte do Cuco': [41.19416046, -8.65577125],

  // Linhas B e E (Sentido Aeroporto)
  'Custóias': [41.20029449, -8.65555858],
  'Esposade': [41.21606826, -8.65454101],
  'Crestins': [41.23301315, -8.65659332],
  'Verdes': [41.23824691, -8.65821170],

  // Linha E (Aeroporto Extensão)
  'Botica': [41.23752212, -8.66520786],
  'Aeroporto': [41.23707580, -8.66944217],

  // Linha B (Póvoa Extensão)
  'Pedras Rubras': [41.24623489, -8.66180706],
  'Lidador': [41.25495147, -8.66801834],
  'Vilar do Pinheiro': [41.27029800, -8.67951488],
  'Modivas Sul': [41.28525161, -8.69370269],
  'Modivas Centro': [41.29368209, -8.69923782],
  'Mindelo': [41.30049133, -8.70400428],
  'Espaço Natureza': [41.31507873, -8.71420860],
  'Varziela': [41.32122039, -8.71868133],
  'Árvore': [41.33422470, -8.72072124],
  'Azurara': [41.34040069, -8.72555541],
  'Santa Clara': [41.34596633, -8.72812175],
  'Vila do Conde': [41.35398483, -8.73582553],
  'Alto de Pega': [41.35909652, -8.73987007],
  'Portas Fronhas': [41.36464309, -8.74522495],
  'São Brás': [41.36895370, -8.74955844],
  'Póvoa de Varzim': [41.37345504, -8.75412178],

  // Linha C Norte
  'Cândido dos Reis': [41.20069885, -8.64970302],
  'Pias': [41.20823287, -8.64712238],
  'Araújo': [41.21690750, -8.64097785],
  'Custió': [41.22233963, -8.63899612],
  'Parque Maia': [41.22901916, -8.62689685],
  'Fórum Maia': [41.23463439, -8.62393665],
  'Zona Industrial': [41.24396896, -8.62855529],
  'Mandim': [41.25357818, -8.62830829],
  'Castêlo da Maia': [41.26274871, -8.61698627],
  'ISMAI': [41.26890563, -8.61538696],

  // Linha D
  'Vila d\'Este': [41.09872055, -8.58871555],
  'Hospital Santos Silva': [41.10575866, -8.59107494],
  'Manuel Leão': [41.11066055, -8.59995841],
  'Santo Ovídio': [41.11554718, -8.60655498],
  'D. João II': [41.11965942, -8.60622978],
  'João de Deus': [41.12605667, -8.60562705],
  'Câmara Gaia': [41.12966537, -8.60611629],
  'General Torres': [41.13386917, -8.60748863],
  'Jardim do Morro': [41.13763809, -8.60864639],
  'São Bento': [41.14493942, -8.61081504],
  'Aliados': [41.14858245, -8.61094474],
  'Faria Guimarães': [41.15721893, -8.60914134],
  'Marquês': [41.16112136, -8.60427188],
  'Combatentes': [41.16530227, -8.59846401],
  'Salgueiros': [41.16968536, -8.59874439],
  'Pólo Universitário': [41.17424774, -8.60360717],
  'IPO': [41.18125152, -8.60452079],
  'Hospital S. João': [41.18326187, -8.60223960],

  // Linha F
  'Fânzeres': [41.17129898, -8.54293823],
  'Venda Nova': [41.17515563, -8.54196166],
  'Carreira': [41.17982482, -8.54360389],
  'Baguim': [41.18556976, -8.54589176],
  'Campainha': [41.18345260, -8.55395507],
  'Rio Tinto': [41.17942047, -8.56026363],
  'Levada': [41.17575836, -8.56212043],
  'Nau Vitória': [41.17412185, -8.57353401],
  'Nasoni': [41.17076873, -8.57731723],
  'Contumil': [41.16571044, -8.57863903]
};

const normalizeName = (name) => {
  if (!name) return '';
  const n = name.trim();
  if (STATIONS_GEO[n]) return n;
  const aliases = {
    'Campo 24 de Agosto': '24 de Agosto', 'Carolina Michaëlis': 'Carolina Michaelis',
    'Câmara de Matosinhos': 'Câmara Matosinhos', 'Camara de Matosinhos': 'Câmara Matosinhos',
    'Camara Matosinhos': 'Câmara Matosinhos', 'Castelo da Maia': 'Castêlo da Maia',
    'Hospital Sao Joao': 'Hospital S. João', 'Hospital São João': 'Hospital S. João',
    'Polo Universitário': 'Pólo Universitário', 'Pólo Universitario': 'Pólo Universitário',
    'Câmara de Gaia': 'Câmara Gaia', 'Camara de Gaia': 'Câmara Gaia', 'Povoa de Varzim': 'Póvoa de Varzim'
  };
  return aliases[n] || n;
};

const getLineColor = (line) => {
  const colors = { A: '#00AEEF', B: '#E20613', BX: '#E20613', C: '#8FC743', D: '#FDB913', E: '#7A4B94', F: '#F58220' };
  return colors[line] || '#9CA3AF';
};

const createStationIcon = (isSelected) => L.divIcon({
  className: 'custom-station-icon',
  html: `<div style="
    background-color: white; 
    border: ${isSelected ? '4px' : '2px'} solid ${isSelected ? BRAND_BLUE : '#6B7280'}; 
    border-radius: 50%; 
    width: ${isSelected ? '18px' : '12px'}; 
    height: ${isSelected ? '18px' : '12px'}; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.2); 
    margin-left: ${isSelected ? '-9px' : '-6px'}; 
    margin-top: ${isSelected ? '-9px' : '-6px'};
    transition: all 0.2s ease-out;
  "></div>`,
  iconSize: [0, 0]
});

const createMetroIcon = (lineColor, lineLetter) => L.divIcon({
  className: 'custom-metro-icon',
  html: `<div style="
    background-color: white; border: 3px solid ${lineColor}; border-radius: 50%; 
    width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; 
    font-weight: 900; color: ${lineColor}; box-shadow: 0 3px 6px rgba(0,0,0,0.4); 
    font-size: ${lineLetter.length > 1 ? '9px' : '11px'}; margin-left: -11px; margin-top: -11px;
  ">${lineLetter}</div>`,
  iconSize: [0, 0] 
});

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

function LocationControl() {
  const map = useMap();
  const [position, setPosition] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    let watchId;
    if (isTracking) {
        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newPos = [pos.coords.latitude, pos.coords.longitude];
                setPosition(newPos);
            },
            (err) => console.error("Erro GPS:", err),
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
        );
        navigator.geolocation.getCurrentPosition((pos) => {
            map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { animate: true });
        });
    } else {
        setPosition(null);
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isTracking, map]);

  return (
    <>
      <div className="absolute bottom-24 right-4 z-[400]">
        <button 
          onClick={() => setIsTracking(!isTracking)} 
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all border ${isTracking ? 'bg-[#00AEEF] text-white border-[#00AEEF]' : 'bg-white text-[#00AEEF] border-gray-100 hover:bg-gray-50'}`}
          aria-label="Minha Localização"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      
      {position && (
        <Marker position={position} icon={L.divIcon({
          className: 'user-gps-live',
          html: `
            <div style="position: relative; width: 18px; height: 18px;">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #00AEEF; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,174,239,0.6); z-index: 2;"></div>
                <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background-color: #00AEEF; border-radius: 50%; opacity: 0.4; animation: gps-pulse 1.5s infinite ease-out; z-index: 1;"></div>
                <style>@keyframes gps-pulse { 0% { transform: scale(0.5); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }</style>
            </div>
          `,
          iconSize: [0,0]
        })} />
      )}
    </>
  );
}

function MapInteraction({ onMapClick }) {
  useMapEvents({ click: () => onMapClick() });
  return null;
}

export default function LiveMap() {
  const portoCenter = [41.1659, -8.6291];
  const [liveMetros, setLiveMetros] = useState([]);
  const [stationTimers, setStationTimers] = useState({});
  const [selectedStation, setSelectedStation] = useState(null);
  const [displayStation, setDisplayStation] = useState(null);

  const realRoutes = useMemo(() => getRealRoutes(metroData?.routes || []), []);

  // MATEMÁTICA PURA: A linha é desenhada ligando diretamente as paragens da STATIONS_GEO
  const routeLines = useMemo(() => {
    const lines = [];
    const drawn = new Set();
    realRoutes.forEach(route => {
        if (drawn.has(route.line)) return; 
        const coords = route.stations_sequence.map(st => {
            const base = STATIONS_GEO[normalizeName(st)];
            return base ? [base[0], base[1]] : null;
        }).filter(Boolean);

        lines.push({ line: route.line, color: getLineColor(route.line), coords });
        drawn.add(route.line);
    });
    return lines;
  }, [realRoutes]);

  useEffect(() => {
      if (selectedStation) setDisplayStation(selectedStation);
      else {
          const timer = setTimeout(() => setDisplayStation(null), 300);
          return () => clearTimeout(timer);
      }
  }, [selectedStation]);

  useEffect(() => {
    if (realRoutes.length === 0) return;

    const updatePositionsAndTimers = () => {
       try {
           const now = new Date();
           const nowTime = now.getTime();
           const active = [];
           const timers = {};

           Object.keys(STATIONS_GEO).forEach(s => timers[s] = {});

           realRoutes.forEach((route) => {
              const seq = route.stations_sequence;
              const times = route.travel_times_from_start;
              
              const finalDestination = route.direction; 
              const startStation = route.terminal;
              const isWeekend = (now.getDay() === 0 || now.getDay() === 6);
              const dayType = isWeekend ? "weekends" : "weekdays";

              let stationDepsObject = route.departures_real[startStation];
              if (!stationDepsObject && Object.keys(route.departures_real).length > 0) {
                  stationDepsObject = route.departures_real[Object.keys(route.departures_real)[0]];
              }

              const deps = stationDepsObject?.[dayType] || stationDepsObject?.["weekdays"] || [];

              deps.forEach((depStr) => {
                 const [h, m] = depStr.split(':').map(Number);
                 
                 for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
                     let depDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h, m, 0);

                     if (h <= 3 && now.getHours() >= 20) depDate.setDate(depDate.getDate() + 1);
                     else if (h >= 20 && now.getHours() <= 3) depDate.setDate(depDate.getDate() - 1);

                     if (depDate.getTime() < nowTime - (4 * 3600000)) depDate.setDate(depDate.getDate() + 1);

                     const totalDur = times[times.length - 1];
                     const arrDate = new Date(depDate.getTime() + totalDur * 60000);

                     if (nowTime >= depDate.getTime() && nowTime <= arrDate.getTime()) {
                        const elapsedMins = (nowTime - depDate.getTime()) / 60000;
                        let currentIdx = 0;
                        while (currentIdx < times.length - 1 && times[currentIdx + 1] < elapsedMins) {
                           currentIdx++;
                        }

                        const stA = normalizeName(seq[currentIdx]);
                        const stB = normalizeName(seq[currentIdx + 1]);

                        if (STATIONS_GEO[stA] && STATIONS_GEO[stB]) {
                            const tA = times[currentIdx];
                            const tB = times[currentIdx + 1];
                            const progress = tB === tA ? 0 : (elapsedMins - tA) / (tB - tA);

                            const latA = STATIONS_GEO[stA][0];
                            const lngA = STATIONS_GEO[stA][1];
                            const latB = STATIONS_GEO[stB][0];
                            const lngB = STATIONS_GEO[stB][1];

                            const currentLat = latA + (latB - latA) * progress;
                            const currentLng = lngA + (lngB - lngA) * progress;

                            active.push({
                               id: `${route.line}-${finalDestination}-${depStr}-${dayOffset}`,
                               line: route.line,
                               dest: finalDestination,
                               pos: [currentLat, currentLng],
                               nextStation: stB,
                               color: getLineColor(route.line)
                            });
                        }
                     }

                     if (arrDate.getTime() > nowTime && depDate.getTime() - nowTime < 2 * 3600000) {
                         seq.forEach((stationName, idx) => {
                            const normName = normalizeName(stationName);
                            if (STATIONS_GEO[normName]) {
                                const passTime = depDate.getTime() + times[idx] * 60000;
                                const diffMins = Math.round((passTime - nowTime) / 60000);

                                if (diffMins >= 0 && diffMins <= 120) {
                                    if (!timers[normName][finalDestination]) timers[normName][finalDestination] = [];
                                    
                                    timers[normName][finalDestination].push({
                                       line: route.line,
                                       mins: diffMins,
                                       color: getLineColor(route.line),
                                       timeValue: passTime
                                    });
                                }
                            }
                         });
                     }
                 }
              });
           });
           
           Object.keys(timers).forEach(s => {
               Object.keys(timers[s]).forEach(dest => {
                   timers[s][dest].sort((a, b) => a.timeValue - b.timeValue);
                   const unique = [];
                   const seen = new Set();
                   for (const t of timers[s][dest]) {
                       const key = `${t.line}-${t.timeValue}`;
                       if (!seen.has(key)) { seen.add(key); unique.push(t); }
                   }
                   timers[s][dest] = unique.slice(0, 2);
               });
           });

           setLiveMetros(active);
           setStationTimers(timers);
       } catch (error) {
           console.error("Erro a calcular mapa:", error);
       }
    };

    updatePositionsAndTimers();
    const interval = setInterval(updatePositionsAndTimers, 5000); 
    return () => clearInterval(interval);
  }, [realRoutes]);

  return (
    <div className="h-full w-full flex flex-col bg-white relative overflow-hidden">
      <div className="bg-white px-6 py-4 border-b-4 shadow-sm z-10 shrink-0 relative" style={{borderColor: BRAND_BLUE}}>
         <h2 className="text-[22px] font-black text-gray-900 tracking-tighter">Rede Live</h2>
         <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Veículos em Circulação</p>
      </div>

      <div className="flex-1 w-full relative z-0">
        <MapContainer center={portoCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />

          <LocationControl />
          <MapInteraction onMapClick={() => setSelectedStation(null)} />

          {/* O ALINHAMENTO PERFEITO: A linha passa estritamente nos pontos das paragens */}
          {routeLines.map((rl, idx) => (
             <Polyline key={idx} positions={rl.coords} pathOptions={{ color: rl.color, weight: 6, opacity: 0.6 }} />
          ))}

          {Object.entries(STATIONS_GEO).map(([name, pos]) => {
             const isSelected = selectedStation === name || displayStation === name;
             return (
                 <Marker key={name} position={pos} icon={createStationIcon(isSelected)} eventHandlers={{ click: () => setSelectedStation(name) }} />
             );
          })}

          {liveMetros.map((metro) => (
             <Marker key={metro.id} position={metro.pos} icon={createMetroIcon(metro.color, metro.line)}>
                <Popup>
                   <div className="font-black text-sm" style={{color: metro.color}}>Linha {metro.line}</div>
                   <div className="text-xs font-bold text-gray-600">➔ {metro.dest}</div>
                   <div className="text-[10px] text-gray-400 mt-1.5 uppercase tracking-widest bg-gray-50 inline-block px-1.5 py-0.5 rounded-sm border border-gray-100">
                     Próxima: {metro.nextStation}
                   </div>
                </Popup>
             </Marker>
          ))}

        </MapContainer>

        <div className={`absolute bottom-0 left-0 w-full bg-white rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[1000] transition-transform duration-300 ease-out flex flex-col max-h-[65%] ${selectedStation ? 'translate-y-0' : 'translate-y-[120%]'}`}>
            {displayStation && (
                <>
                    <div className="flex justify-center pt-4 pb-2 cursor-pointer shrink-0" onClick={() => setSelectedStation(null)}>
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                    </div>

                    <div className="px-6 pb-8 pt-2 overflow-y-auto flex-1">
                        <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{displayStation}</h3>
                            <button onClick={() => setSelectedStation(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {Object.keys(stationTimers[displayStation] || {}).length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {Object.entries(stationTimers[displayStation]).map(([dest, trips]) => (
                                    <div key={dest} className="flex flex-col gap-2">
                                        <div className="text-[11px] uppercase tracking-widest text-gray-400 font-black flex items-center">
                                            <span className="mr-1.5 text-gray-300">➔</span> {dest}
                                        </div>
                                        <div className="flex flex-wrap gap-2.5">
                                            {trips.map((t, i) => (
                                                <div key={i} className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0" style={{backgroundColor: t.color}}>
                                                        {t.line}
                                                    </div>
                                                    <span className="text-[14px] font-black text-gray-800">{t.mins <= 0 ? 'Agora' : `${t.mins}m`}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[13px] font-bold text-gray-400 py-6 text-center bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                                Sem comboios próximos.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
}