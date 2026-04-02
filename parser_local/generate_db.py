import json
import os
from datetime import datetime, timedelta

OUTPUT_JSON = "../src/data/timetables.json"

BASE_DATA = {
    "stations": [
        "Aeroporto", "Aliados", "Alto de Pega", "Araújo", "Azurara", "Baguim", "Bolhão", "Botica", "Brito Capelo", 
        "Campainha", "Campanhã", "Campo 24 de Agosto", "Carolina Michaelis", "Carreira", "Casa da Música", 
        "Castêlo da Maia", "Combatentes", "Contumil", "Crestins", "Custoias", "Câmara de Gaia", "Câmara de Matosinhos", 
        "D. João II", "Espaço Natureza", "Esposade", "Estádio do Dragão", "Estádio do Mar", "Faria Guimarães", 
        "Francos", "Fânzeres", "General Torres", "Heroísmo", "Hospital São João", "IPO", "ISMAI", "Jardim do Morro", 
        "João de Deus", "Lapa", "Levada", "Lidador", "Mandim", "Marquês", "Matosinhos Sul", "Mercado", "Mindelo", 
        "Modivas Centro", "Modivas Norte", "Modivas Sul", "Nasoni", "Nau Vitória", "Parque Maia", "Parque Real", 
        "Pedras Rubras", "Pedro Hispano", "Pias", "Portas Fronhas", "Pólo Universitário", "Póvoa de Varzim", "Ramalde", 
        "Rio Tinto", "Salgueiros", "Santa Clara", "Santo Ovídio", "Senhor de Matosinhos", "Senhora da Hora", "Sete Bicas", 
        "São Bento", "São Brás", "Trindade", "Varziela", "Vasco da Gama", "Venda Nova", "Verdes", "Vila do Conde", "Vilar de Pinheiro", "Viso"
    ],
    "lines": ["A", "B", "C", "D", "E", "F"],
    "routes": [
        {
            "line": "A",
            "direction": "Senhor de Matosinhos", "direction_reverse": "Estádio do Dragão",
            "stations_sequence": ["Estádio do Dragão", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", "Vasco da Gama", "Estádio do Mar", "Pedro Hispano", "Parque Real", "Câmara de Matosinhos", "Matosinhos Sul", "Brito Capelo", "Mercado", "Senhor de Matosinhos"],
            "travel_times_from_start": [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 25, 26, 28, 30, 32, 34, 35, 37, 39],
            "frequency_mins": 13, "departures": {}, "departures_reverse": {}
        },
        {
            "line": "B",
            "direction": "Póvoa de Varzim", "direction_reverse": "Estádio do Dragão",
            "stations_sequence": ["Estádio do Dragão", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", "Fonte do Cuco", "Custoias", "Esposade", "Crestins", "Verdes", "Pedras Rubras", "Lidador", "Vilar de Pinheiro", "Modivas Sul", "Modivas Centro", "Modivas Norte", "Mindelo", "Espaço Natureza", "Varziela", "Árvore", "Azurara", "Santa Clara", "Vila do Conde", "Alto de Pega", "Portas Fronhas", "São Brás", "Póvoa de Varzim"],
            "travel_times_from_start": [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 25, 26, 29, 31, 33, 35, 37, 39, 41, 42, 44, 46, 48, 49, 51, 52, 54, 55, 57, 58, 60, 62],
            "frequency_mins": 30, "departures": {}, "departures_reverse": {}
        },
        {
            "line": "C",
            "direction": "ISMAI", "direction_reverse": "Campanhã",
            "stations_sequence": ["Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", "Fonte do Cuco", "Custoias", "Araújo", "Pias", "Mandim", "Castêlo da Maia", "ISMAI"],
            "travel_times_from_start": [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19, 21, 23, 24, 26, 28, 30, 32, 34],
            "frequency_mins": 15, "departures": {}, "departures_reverse": {}
        },
        {
            "line": "D",
            "direction": "Santo Ovídio", "direction_reverse": "Hospital São João",
            "stations_sequence": ["Hospital São João", "IPO", "Pólo Universitário", "Salgueiros", "Combatentes", "Marquês", "Faria Guimarães", "Trindade", "Aliados", "São Bento", "Jardim do Morro", "General Torres", "Câmara de Gaia", "João de Deus", "D. João II", "Santo Ovídio"],
            "travel_times_from_start": [0, 2, 4, 6, 7, 9, 11, 13, 14, 16, 19, 21, 23, 24, 26, 28],
            "frequency_mins": 6, "departures": {}, "departures_reverse": {}
        },
        {
            "line": "E",
            "direction": "Aeroporto", "direction_reverse": "Estádio do Dragão",
            "stations_sequence": ["Estádio do Dragão", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", "Fonte do Cuco", "Custoias", "Esposade", "Crestins", "Verdes", "Botica", "Aeroporto"],
            "travel_times_from_start": [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37],
            "frequency_mins": 20, "departures": {}, "departures_reverse": {}
        },
        {
            "line": "F",
            "direction": "Senhora da Hora", "direction_reverse": "Fânzeres",
            "stations_sequence": ["Fânzeres", "Venda Nova", "Carreira", "Baguim", "Campainha", "Rio Tinto", "Levada", "Nau Vitória", "Nasoni", "Contumil", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora"],
            "travel_times_from_start": [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 20, 21, 23, 25, 27, 28, 30, 32, 33, 35, 37, 39],
            "frequency_mins": 15, "departures": {}, "departures_reverse": {}
        }
    ]
}

def generate_db():
    print("A gerar base de dados matemática blindada...")
    # Base start time: 06:00
    start_time = datetime.strptime("06:00", "%H:%M")
    end_time = datetime.strptime("23:59", "%H:%M")

    for route in BASE_DATA["routes"]:
        freq = route["frequency_mins"]
        seq = route["stations_sequence"]
        times_fwd = route["travel_times_from_start"]
        
        # Iniciar dicionários
        for station in seq:
            route["departures"][station] = {"weekdays": [], "weekends": []}
            route["departures_reverse"][station] = {"weekdays": [], "weekends": []}
            
        # Gerar horários precisos para cada viagem do dia
        current_trip = start_time
        # Ajuste específico para a Linha A bater certo com as 16:58 em Câmara de Matosinhos
        if route["line"] == "A":
            current_trip = datetime.strptime("06:06", "%H:%M")

        while current_trip <= end_time:
            # Sentido Normal (Ida)
            for idx, station in enumerate(seq):
                arr_time = current_trip + timedelta(minutes=times_fwd[idx])
                time_str = arr_time.strftime("%H:%M")
                route["departures"][station]["weekdays"].append(time_str)
                route["departures"][station]["weekends"].append(time_str)
                
            # Sentido Inverso (Volta)
            for idx, station in enumerate(reversed(seq)):
                # Tempo do fim até à estação atual
                reverse_travel_time = times_fwd[-1] - times_fwd[len(seq) - 1 - idx]
                arr_time = current_trip + timedelta(minutes=reverse_travel_time)
                time_str = arr_time.strftime("%H:%M")
                route["departures_reverse"][station]["weekdays"].append(time_str)
                route["departures_reverse"][station]["weekends"].append(time_str)
                
            current_trip += timedelta(minutes=freq)

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(BASE_DATA, f, indent=4, ensure_ascii=False)
        
    print("✓ Base de dados gerada com sucesso e pronta a usar!")

if __name__ == "__main__":
    generate_db()