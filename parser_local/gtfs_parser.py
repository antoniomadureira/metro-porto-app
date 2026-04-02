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
    timetable = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(list))))
    trip_stops = defaultdict(list)
    longest_trip_stops = defaultdict(lambda: defaultdict(list))

    print("A abrir base de dados oficial...")
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
                            "direction_id": row["direction_id"],
                            "service_type": services.get(row["service_id"], "weekdays")
                        }

            with z.open("stop_times.txt") as f:
                reader = csv.DictReader(f.read().decode('utf-8-sig').splitlines())
                for row in reader:
                    t_id = row["trip_id"]
                    if t_id in trips:
                        trip = trips[t_id]
                        stop_name = stops[row["stop_id"]]
                        t_str = row["departure_time"]
                        h, m, _ = t_str.split(':')
                        if int(h) >= 24: h = str(int(h) - 24).zfill(2)
                        clean_time = f"{h.zfill(2)}:{m}"

                        timetable[trip["route_name"]][trip["direction_id"]][stop_name][trip["service_type"]].append(clean_time)
                        trip_stops[t_id].append((int(row["stop_sequence"]), stop_name, t_str))

    except Exception as e:
        print(f"Erro: {e}")
        return

    for t_id, s_list in trip_stops.items():
        trip = trips[t_id]
        rn, d_id = trip["route_name"], trip["direction_id"]
        s_list.sort(key=lambda x: x[0])
        if len(s_list) > len(longest_trip_stops[rn][d_id]):
            longest_trip_stops[rn][d_id] = s_list

    metro_data["stations"] = sorted(list(metro_data["stations"]))
    
    for rn in sorted(longest_trip_stops.keys()):
        dir_0_data = longest_trip_stops[rn].get("0", [])
        dir_1_data = longest_trip_stops[rn].get("1", [])
        if not dir_0_data or not dir_1_data: continue

        dir_0_seq = [s[1] for s in dir_0_data]
        dir_1_seq = [s[1] for s in dir_1_data]
        start_mins = time_to_minutes(dir_0_data[0][2])
        
        route_obj = {
            "line": rn,
            "direction": dir_0_seq[-1],
            "direction_reverse": dir_1_seq[-1],
            "stations_sequence": dir_0_seq,
            "travel_times_from_start": [time_to_minutes(s[2]) - start_mins for s in dir_0_data],
            "departures": {},
            "departures_reverse": {}
        }

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

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(metro_data, f, indent=4, ensure_ascii=False)
    print(f"✓ Todas as linhas processadas em {OUTPUT_JSON}")

if __name__ == "__main__":
    process_gtfs()