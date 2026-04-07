import os
import csv
import json
import zipfile
from collections import defaultdict

ZIP_FILE = "gtfs.zip"
OUTPUT_JSON = "../src/data/timetables.json"

def time_to_minutes(t_str):
    h, m = map(int, t_str.split(':')[:2])
    return h * 60 + m

def process_gtfs():
    if not os.path.exists(ZIP_FILE):
        print(f"Erro: {ZIP_FILE} não encontrado.")
        return

    stops, routes, services, trips = {}, {}, {}, {}
    trip_stops = defaultdict(list)

    print("A processar a base de dados oficial GTFS...")
    with zipfile.ZipFile(ZIP_FILE, "r") as z:
        with z.open("stops.txt") as f:
            for row in csv.DictReader(f.read().decode('utf-8-sig').splitlines()):
                stops[row["stop_id"]] = row["stop_name"].strip()

        with z.open("routes.txt") as f:
            for row in csv.DictReader(f.read().decode('utf-8-sig').splitlines()):
                routes[row["route_id"]] = row["route_short_name"].upper()

        with z.open("calendar.txt") as f:
            for row in csv.DictReader(f.read().decode('utf-8-sig').splitlines()):
                services[row["service_id"]] = "weekends" if (row["saturday"] == "1" or row["sunday"] == "1") else "weekdays"

        with z.open("trips.txt") as f:
            for row in csv.DictReader(f.read().decode('utf-8-sig').splitlines()):
                if row["route_id"] in routes:
                    trips[row["trip_id"]] = {
                        "route_name": routes[row["route_id"]],
                        "direction_id": row["direction_id"],
                        "service_type": services.get(row["service_id"], "weekdays")
                    }

        with z.open("stop_times.txt") as f:
            for row in csv.DictReader(f.read().decode('utf-8-sig').splitlines()):
                t_id = row["trip_id"]
                if t_id in trips:
                    t_str = row["departure_time"]
                    h, m, _ = t_str.split(':')
                    if int(h) >= 24: h = str(int(h) - 24).zfill(2)
                    trip_stops[t_id].append({
                        "seq": int(row["stop_sequence"]),
                        "name": stops[row["stop_id"]],
                        "t_str": t_str,
                        "clean_time": f"{h.zfill(2)}:{m}"
                    })

    patterns = defaultdict(lambda: defaultdict(list))
    for t_id, s_list in trip_stops.items():
        rn, d_id = trips[t_id]["route_name"], trips[t_id]["direction_id"]
        s_list.sort(key=lambda x: x["seq"])
        patterns[(rn, d_id)][tuple(s["name"] for s in s_list)].append(t_id)

    metro_data = {"stations": sorted(list(set(stops.values()))), "routes": []}

    for (rn, d_id), seqs in patterns.items():
        if not seqs: continue

        # Extrai a rota principal ignorando fantasmas
        valid_seqs = [seq for seq, t_ids in seqs.items() if len(t_ids) > 5]
        master_seq = max(valid_seqs if valid_seqs else seqs.keys(), key=len)

        route_obj = {
            "line": rn, "direction": master_seq[-1],
            "stations_sequence": list(master_seq), "travel_times_from_start": [],
            "departures": {station: {"weekdays": set(), "weekends": set()} for station in master_seq}
        }

        # Calcula o tempo entre estações
        master_trip_stops = sorted(trip_stops[seqs[master_seq][0]], key=lambda x: x["seq"])
        start_mins = time_to_minutes(master_trip_stops[0]["t_str"])
        route_obj["travel_times_from_start"] = [time_to_minutes(s["t_str"]) - start_mins for s in master_trip_stops]

        # Agrupa TODOS os horários na rota principal
        for t_ids in seqs.values():
            for t_id in t_ids:
                srv = trips[t_id]["service_type"]
                for s in trip_stops[t_id]:
                    if s["name"] in route_obj["departures"]:
                        route_obj["departures"][s["name"]][srv].add(s["clean_time"])

        for station in master_seq:
            route_obj["departures"][station]["weekdays"] = sorted(list(route_obj["departures"][station]["weekdays"]))
            route_obj["departures"][station]["weekends"] = sorted(list(route_obj["departures"][station]["weekends"]))

        metro_data["routes"].append(route_obj)

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(metro_data, f, indent=4, ensure_ascii=False)
    print("✓ JSON gerado! Base de dados alinhada à prova de falhas.")

if __name__ == "__main__":
    process_gtfs()