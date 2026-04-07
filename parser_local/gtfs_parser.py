import os
import csv
import json
import zipfile
from collections import defaultdict

ZIP_FILE = "gtfs.zip"
OUTPUT_JSON = "../src/data/timetables.json"

def time_to_minutes(t_str):
    parts = t_str.split(':')
    h, m = int(parts[0]), int(parts[1])
    return h * 60 + m

def process_gtfs():
    if not os.path.exists(ZIP_FILE):
        print(f"Erro: O ficheiro {ZIP_FILE} não foi encontrado na pasta!")
        return

    stops = {}
    routes = {}
    services = {}
    trips = {}
    metro_data = {"stations": set(), "routes": []}
    trip_stops = defaultdict(list)

    print("A processar a base de dados oficial GTFS...")
    try:
        with zipfile.ZipFile(ZIP_FILE, "r") as z:
            with z.open("stops.txt") as f:
                reader = csv.DictReader(f.read().decode('utf-8-sig').splitlines())
                for row in reader:
                    stops[row["stop_id"]] = row["stop_name"].strip()
                    metro_data["stations"].add(stops[row["stop_id"]])

            with z.open("routes.txt") as f:
                reader = csv.DictReader(f.read().decode('utf-8-sig').splitlines())
                for row in reader:
                    routes[row["route_id"]] = row["route_short_name"].upper()

            with z.open("calendar.txt") as f:
                reader = csv.DictReader(f.read().decode('utf-8-sig').splitlines())
                for row in reader:
                    services[row["service_id"]] = "weekends" if (row["saturday"] == "1" or row["sunday"] == "1") else "weekdays"

            with z.open("trips.txt") as f:
                reader = csv.DictReader(f.read().decode('utf-8-sig').splitlines())
                for row in reader:
                    if row["route_id"] in routes:
                        trips[row["trip_id"]] = {
                            "route_name": routes[row["route_id"]],
                            "service_type": services.get(row["service_id"], "weekdays")
                        }

            with z.open("stop_times.txt") as f:
                reader = csv.DictReader(f.read().decode('utf-8-sig').splitlines())
                for row in reader:
                    t_id = row["trip_id"]
                    if t_id in trips:
                        stop_name = stops[row["stop_id"]]
                        t_str = row["departure_time"]
                        
                        h, m, _ = t_str.split(':')
                        if int(h) >= 24: h = str(int(h) - 24).zfill(2)
                        clean_time = f"{h.zfill(2)}:{m}"

                        trip_stops[t_id].append({
                            "seq": int(row["stop_sequence"]), 
                            "name": stop_name, 
                            "t_str": t_str,
                            "clean_time": clean_time
                        })
    except Exception as e:
        print(f"Erro ao processar ficheiros: {e}")
        return

    patterns = defaultdict(list)
    for t_id, s_list in trip_stops.items():
        s_list.sort(key=lambda x: x["seq"])
        rn = trips[t_id]["route_name"]
        seq_tuple = tuple(s["name"] for s in s_list)
        if len(seq_tuple) < 2: continue
        patterns[(rn, seq_tuple)].append(t_id)

    metro_data["stations"] = sorted(list(metro_data["stations"]))
    
    for (rn, seq_tuple), t_ids in patterns.items():
        if len(t_ids) < 3: 
            continue

        first_trip_id = t_ids[0]
        first_trip_stops = sorted(trip_stops[first_trip_id], key=lambda x: x["seq"])
        start_mins = time_to_minutes(first_trip_stops[0]["t_str"])
        travel_times = [time_to_minutes(s["t_str"]) - start_mins for s in first_trip_stops]

        route_obj = {
            "line": rn,
            "direction": seq_tuple[-1],
            "stations_sequence": list(seq_tuple),
            "travel_times_from_start": travel_times,
            "departures": {station: {"weekdays": set(), "weekends": set()} for station in seq_tuple}
        }

        for t_id in t_ids:
            srv = trips[t_id]["service_type"]
            for s in trip_stops[t_id]:
                route_obj["departures"][s["name"]][srv].add(s["clean_time"])

        for station in seq_tuple:
            route_obj["departures"][station]["weekdays"] = sorted(list(route_obj["departures"][station]["weekdays"]))
            route_obj["departures"][station]["weekends"] = sorted(list(route_obj["departures"][station]["weekends"]))

        metro_data["routes"].append(route_obj)

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(metro_data, f, indent=4, ensure_ascii=False)
        
    print(f"✓ JSON Limpo gerado! Viagens de recolha/fantasmas eliminadas.")

if __name__ == "__main__":
    process_gtfs()