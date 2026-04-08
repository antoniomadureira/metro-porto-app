import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import metroData from './data/timetables.json';

const BRAND_BLUE = '#00AEEF';

// COORDENADAS REAIS E PURAS DO GPS (Sem estações fantasma)
const STATIONS_GEO = {
  // Tronco Comum
  'Estádio do Dragão': [41.1614, -8.5836], 'Campanhã': [41.1491, -8.5818], 'Heroísmo': [41.1490, -8.5900],
  '24 de Agosto': [41.1505, -8.5980], 'Bolhão': [41.1500, -8.6040], 'Trindade': [41.1525, -8.6094],
  'Lapa': [41.1558, -8.6174], 'Carolina Michaelis': [41.1564, -8.6247], 'Casa da Música': [41.1585, -8.6305],
  'Francos': [41.1627, -8.6385], 'Ramalde': [41.1685, -8.6420], 'Viso': [41.1747, -8.6453],
  'Sete Bicas': [41.1818, -8.6477], 'Senhora da Hora': [41.1876, -8.6545],
  
  // Linha A (Azul)
  'Vasco da Gama': [41.1852, -8.6595], 'Estádio do Mar': [41.1824, -8.6653], 'Pedro Hispano': [41.1788, -8.6685],
  'Parque de Real': [41.1818, -8.6750], 'Câmara Matosinhos': [41.1812, -8.6815], 'Matosinhos Sul': [41.1790, -8.6880],
  'Brito Capelo': [41.1820, -8.6920], 'Mercado': [41.1845, -8.6915], 'Senhor de Matosinhos': [41.1866, -8.6806],
  
  // Linha B / BX / E
  'Fonte do Cuco': [41.1944, -8.6473], 'Custóias': [41.2023, -8.6439], 'Esposade': [41.2120, -8.6401],
  'Crestins': [41.2263, -8.6436], 'Verdes': [41.2372, -8.6560], 
  'Botica': [41.2400, -8.6650], 'Aeroporto': [41.2382, -8.6687], 
  'Pedras Rubras': [41.2435, -8.6616], 'Lidador': [41.2520, -8.6650], 'Vilar do Pinheiro': [41.2690, -8.6830], 
  'Modivas Sul': [41.2830, -8.6980], 'Modivas Centro': [41.2940, -8.7110], 'Mindelo': [41.3105, -8.7230], 
  'Espaço Natureza': [41.3210, -8.7320], 'Varziela': [41.3320, -8.7400], 'Árvore': [41.3400, -8.7420], 
  'Azurara': [41.3470, -8.7400], 'Santa Clara': [41.3520, -8.7420], 'Vila do Conde': [41.3550, -8.7440], 
  'Alto de Pega': [41.3650, -8.7470], 'Portas Fronhas': [41.3730, -8.7500], 'São Brás': [41.3800, -8.7540], 
  'Póvoa de Varzim': [41.3860, -8.7600], 
  
  // Linha C (Verde)
  'Cândido dos Reis': [41.1960, -8.6430], 'Pias': [41.2010, -8.6380], 'Araújo': [41.2060, -8.6320],
  'Custió': [41.2120, -8.6250], 'Parque Maia': [41.2250, -8.6200], 'Fórum Maia': [41.2320, -8.6220],
  'Zona Industrial': [41.2380, -8.6180], 'Mandim': [41.2450, -8.6150], 'Castêlo da Maia': [41.2580, -8.6100],
  'ISMAI': [41.2647, -8.6080],
  
  // Linha D (Amarela)
  'Hospital S. João': [41.1816, -8.6015], 'IPO': [41.1780, -8.6025], 'Pólo Universitário': [41.1730, -8.6010],
  'Salgueiros': [41.1680, -8.5990], 'Combatentes': [41.1630, -8.5980], 'Marquês': [41.1580, -8.6010],
  'Faria Guimarães': [41.1550, -8.6060], 'Aliados': [41.1470, -8.6110], 'São Bento': [41.1420, -8.6090],
  'Jardim do Morro': [41.1380, -8.6095], 'General Torres': [41.1320, -8.6080], 'Câmara Gaia': [41.1280, -8.6070],
  'João de Deus': [41.1230, -8.6060], 'D. João II': [41.1180, -8.6050], 'Santo Ovídio': [41.1147, -8.6033],
  'Manuel Leão': [41.1080, -8.5990], 'Hospital Santos Silva': [41.1030, -8.5950], 'Vila d\'Este': [41.0975, -8.5910],
  
  // Linha F (Laranja)
  'Contumil': [41.1605, -8.5775], 'Nasoni': [41.1618, -8.5750], 'Nau Vitória': [41.1630, -8.5720], 
  'Levada': [41.1650, -8.5630], 'Rio Tinto': [41.1680, -8.5550], 'Campainha': [41.1720, -8.5450], 
  'Baguim': [41.1750, -8.5350], 'Carreira': [41.1780, -8.5250], 'Venda Nova': [41.1820, -8.5150], 
  'Fânzeres': [41.1850, -8.5050]
};

// NORMALIZADOR: Garante que os nomes do JSON dão sempre match com o mapa (Tolerância a acentos/espaços)
const normalizeName = (name) => {
  if (!name) return '';
  const n = name.trim();
  if (STATIONS_GEO[n]) return n;
  const aliases = {
    'Campo 24 de Agosto': '24 de Agosto',
    'Carolina Michaëlis': 'Carolina Michaelis',
    'Câmara de Matosinhos': 'Câmara Matosinhos',
    'Camara de Matosinhos': 'Câmara Matosinhos',
    'Camara Matosinhos': 'Câmara Matosinhos',
    'Castelo da Maia': 'Castêlo da Maia',
    'Hospital Sao Joao': 'Hospital S. João',
    'Hospital São João': 'Hospital S. João',
    'Polo Universitário': 'Pólo Universitário',
    'Pólo Universitario': 'Pólo Universitário',
    'Câmara de Gaia': 'Câmara Gaia',
    'Camara de Gaia': 'Câmara Gaia',
    'Povoa de Varzim': 'Póvoa de Varzim'
  };
  return aliases[n] || n;
};

const getLineColor = (line) => {
  const colors = { A: '#00AEEF', B: '#E20613', BX: '#E20613', C: '#8FC743', D: '#FDB913', E: '#7A4B94', F: '#F58220' };
  return colors[line] || '#9CA3AF';
};

// MARCADOR HTML: A prova de bala contra o evento "furar" para o mapa
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

// Ícone Dinâmico das Linhas (A, B, BX...)
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

// Extrai Ida e Volta diretamente do JSON
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

// Controlador de Geolocalização Seguro
function LocationControl() {
  const map = useMap();
  const [position, setPosition] = useState(null);

  useEffect(() => {
    map.on('locationfound', (e) => {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 15, { animate: true, duration: 1.5 });
    });
  }, [map]);

  return (
    <>
      <div className="absolute bottom-24 right-4 z-[400]">
        <button 
          onClick={() => map.locate()} 
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-[#00AEEF] hover:bg-gray-50 active:scale-95 transition-all border border-gray-100"
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
          className: 'user-gps-marker',
          html: `<div style="background-color: #00AEEF; border: 3px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 0 10px rgba(0,174,239,0.5); margin-left: -8px; margin-top: -8px;"></div>`,
          iconSize: [0,0]
        })}>
          <Popup className="font-bold text-gray-900 text-center">Estás Aqui</Popup>
        </Marker>
      )}
    </>
  );
}

// Interação para fechar a Bottom Sheet
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

  // RENDERIZAÇÃO ESTREITA: Apenas liga os pontos exatos
  const routeLines = useMemo(() => {
    const lines = [];
    const drawn = new Set();
    realRoutes.forEach(route => {
        if (drawn.has(route.line)) return; 
        const coords = route.stations_sequence.map(st => {
            const base = STATIONS_GEO[normalizeName(st)];
            if(!base) return null;
            return [base[0], base[1]]; // Coordenas puras sem desvios matemáticos
        }).filter(Boolean);
        lines.push({ line: route.line, color: getLineColor(route.line), coords });
        drawn.add(route.line);
    });
    return lines;
  }, [realRoutes]);

  // Buffer de animação fluida para o painel inferior
  useEffect(() => {
      if (selectedStation) {
          setDisplayStation(selectedStation);
      } else {
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

                     // FÍSICA ESTRITA DO METRO NO MAPA
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

                            // Interpolação linear pura sem margens
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

                     // ATUALIZAÇÃO DOS PAINÉIS DE PARAGENS
                     if (arrDate.getTime() > nowTime && depDate.getTime() - nowTime < 2 * 3600000) {
                         seq.forEach((stationName, idx) => {
                            const normName = normalizeName(stationName);
                            if (STATIONS_GEO[normName]) {
                                const passTime = depDate.getTime() + times[idx] * 60000;
                                const diffMins = Math.round((passTime - nowTime) / 60000);

                                if (diffMins >= 0 && diffMins <= 120) {
                                    if (!timers[normName][finalDestination]) {
                                        timers[normName][finalDestination] = [];
                                    }
                                    
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
                       if (!seen.has(key)) {
                           seen.add(key);
                           unique.push(t);
                       }
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

          {/* Linhas cruzam os pontos exatos. Cores fundem-se no tronco comum pela opacidade */}
          {routeLines.map((rl, idx) => (
             <Polyline key={idx} positions={rl.coords} pathOptions={{ color: rl.color, weight: 5, opacity: 0.7 }} />
          ))}

          {/* MARCADORES HTML: Clicáveis e isolados contra o "efeito bolha" */}
          {Object.entries(STATIONS_GEO).map(([name, pos]) => {
             const isSelected = selectedStation === name || displayStation === name;
             return (
                 <Marker 
                    key={name} 
                    position={pos} 
                    icon={createStationIcon(isSelected)}
                    eventHandlers={{
                        click: () => {
                            setSelectedStation(name);
                        },
                    }}
                 />
             );
          })}

          {/* METROS EM MOVIMENTO NO MAPA */}
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

        {/* BOTTOM SHEET - DESLIZE SUAVE COM RETENÇÃO DE ESTADO */}
        <div 
            className={`absolute bottom-0 left-0 w-full bg-white rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[1000] transition-transform duration-300 ease-out flex flex-col max-h-[65%] ${selectedStation ? 'translate-y-0' : 'translate-y-[120%]'}`}
        >
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