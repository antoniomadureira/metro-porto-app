import os
import csv
import json
import zipfile
import urllib.request
from collections import defaultdict

# URL Oficial dos dados abertos do Metro do Porto
GTFS_URL = "https://www.metrodoporto.pt/metrodoporto/uploads/document/file/386/google_transit.zip"
ZIP_FILE = "gtfs.zip"
OUTPUT_JSON = "../src/data/timetables.json"

def time_to_minutes(t_str):
    h, m, s = map(int, t_str.split(':'))
    return h * 60 + m

def process_gtfs():
    print("--- MOTOR GTFS OFICIAL METRO DO PORTO ---")
    
    # 1. Download Automático
    if not os.path.exists(ZIP_FILE):
        print(f"A descarregar a base de dados oficial de: {GTFS_URL}")
        try:
            req = urllib.request.Request(GTFS_URL, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response, open(ZIP_FILE, 'wb') as out_file:
                out_file.write(response.read())
            print("✓ Download concluído com sucesso!")
        except Exception as e:
            print(f"❌ O servidor bloqueou o download automático: {e}")
            print("Solução: Vai a https://transitfeeds.com/p/metro-do-porto/760 ou ao portal do Metro, descarrega o 'gtfs.zip' manualmente e coloca-o nesta pasta.")
            return

    stops = {}
    routes = {}
    services = {}
    trips = {}
    
    metro_data = {"stations": set(), "lines": ["A", "F"], "routes": []}
    timetable = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(list))))
    trip_stops = defaultdict(list)
    longest_trip_stops = defaultdict(lambda: defaultdict(list))

    print("A analisar tabelas de paragens e calendários...")
    try:
        with zipfile.ZipFile(ZIP_FILE, "r") as z:
            # Ler Estações
            with z.open("stops.txt") as f:
                reader = csv.DictReader(f.read().decode('utf-8-sig').splitlines())
                for row in reader:
                    stops[row["stop_id"]] = row["stop_name"].replace("  ", " ").strip()
                    metro_data["stations"].add(stops[row["stop_id"]])

            # Ler Linhas (Vamos focar na A e F nesta Fase 1)
            with z.open("routes.txt") as f:
                reader = csv.DictReader(f.read().decode('utf-8-sig').splitlines())
                for row in reader:
                    sn = row["route_short_name"].upper()
                    if sn in ["A", "F"]:
                        routes[row["route_id"]] = sn

            # Ler Calendários (Dias Úteis vs Fim de Semana)
            with z.open("calendar.txt") as f:
                reader = csv.DictReader(f.read().decode('utf-8-sig').splitlines())
                for row in reader:
                    if row["saturday"] == "1" or row["sunday"] == "1":
                        services[row["service_id"]] = "weekends"
                    else:
                        services[row["service_id"]] = "weekdays"

            # Associar Viagens às Linhas
            with z.open("trips.txt") as f:
                reader = csv.DictReader(f.read().decode('utf-8-sig').splitlines())
                for row in reader:
                    if row["route_id"] in routes and row["service_id"] in services:
                        trips[row["trip_id"]] = {
                            "route_name": routes[row["route_id"]],
                            "direction_id": row["direction_id"],
                            "service_type": services[row["service_id"]]
                        }

            print("A processar e a cruzar os horários reais (Isto pode demorar alguns segundos)...")
            # Ler Horários Exatos de cada Paragem
            with z.open("stop_times.txt") as f:
                reader = csv.DictReader(f.read().decode('utf-8-sig').splitlines())
                for row in reader:
                    t_id = row["trip_id"]
                    if t_id in trips:
                        trip = trips[t_id]
                        stop_name = stops[row["stop_id"]]
                        t_str = row["departure_time"]
                        
                        # O Metro por vezes usa "24:xx" ou "25:xx" para viagens de madrugada
                        h, m, s = t_str.split(':')
                        if int(h) >= 24: h = str(int(h) - 24).zfill(2)
                        clean_time = f"{h.zfill(2)}:{m}"

                        timetable[trip["route_name"]][trip["direction_id"]][stop_name][trip["service_type"]].append(clean_time)
                        trip_stops[t_id].append((int(row["stop_sequence"]), stop_name, t_str))

    except Exception as e:
        print(f"Erro a processar o ficheiro GTFS: {e}")
        return

    print("A compilar o JSON Final para a Aplicação...")
    # Encontrar as viagens mais longas para mapear a sequência certa de estações de ponta a ponta
    for t_id, s_list in trip_stops.items():
        trip = trips[t_id]
        rn = trip["route_name"]
        d_id = trip["direction_id"]
        
        s_list.sort(key=lambda x: x[0])
        if len(s_list) > len(longest_trip_stops[rn][d_id]):
            longest_trip_stops[rn][d_id] = s_list

    metro_data["stations"] = sorted(list(metro_data["stations"]))
    
    for rn in ["A", "F"]:
        if rn in longest_trip_stops:
            dir_0_data = longest_trip_stops[rn].get("0", [])
            dir_1_data = longest_trip_stops[rn].get("1", [])
            
            dir_0_seq = [s[1] for s in dir_0_data]
            dir_1_seq = [s[1] for s in dir_1_data]
            
            # Calcular Tempos Reais de Viagem para o React não dar erros nas durações
            travel_times = []
            if dir_0_data:
                start_mins = time_to_minutes(dir_0_data[0][2])
                travel_times = [time_to_minutes(s[2]) - start_mins for s in dir_0_data]

            route_obj = {
                "line": rn,
                "direction": dir_0_seq[-1] if dir_0_seq else "Sentido 1",
                "direction_reverse": dir_1_seq[-1] if dir_1_seq else "Sentido 2",
                "stations_sequence": dir_0_seq,
                "travel_times_from_start": travel_times,
                "departures": {},
                "departures_reverse": {}
            }

            # Inserir horas (removendo duplicações e ordenando)
            for station in dir_0_seq:
                route_obj["departures"][station] = {
                    "weekdays": sorted(list(set(timetable[rn]["0"][station]["weekdays"]))),
                    "weekends": sorted(list(set(timetable[rn]["0"][station]["weekends"])))
                }
            for station in dir_1_seq:
                route_obj["departures_reverse"][station] = {
                    "weekdays": sorted(list(set(timetable[rn]["1"][station]["weekdays"]))),
                    "weekends": sorted(list(set(timetable[rn]["1"][station]["weekends"])))
                }

            metro_data["routes"].append(route_obj)

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(metro_data, f, indent=4, ensure_ascii=False)

    print(f"✓ JSON perfeito e blindado gerado em {OUTPUT_JSON}")

if __name__ == "__main__":
    process_gtfs()