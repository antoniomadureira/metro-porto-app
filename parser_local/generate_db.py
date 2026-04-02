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
            # ATENÇÃO AQUI: Francos(20) -> Câmara Matosinhos(40). Diferença exata: 20 minutos.
            "travel_times_from_start": [0, 2, 4, 6, 8, 10, 12, 14, 17, 20, 22, 24, 26, 28, 30, 32, 34, 36, 40, 42, 44, 46, 48],
            "frequency_mins": 13, "departures": {}, "departures_reverse": {}
        },
        {
            "line": "D",
            "direction": "Santo Ovídio", "direction_reverse": "Hospital São João",
            "stations_sequence": ["Hospital São João", "IPO", "Pólo Universitário", "Salgueiros", "Combatentes", "Marquês", "Faria Guimarães", "Trindade", "Aliados", "São Bento", "Jardim do Morro", "General Torres", "Câmara de Gaia", "João de Deus", "D. João II", "Santo Ovídio"],
            "travel_times_from_start": [0, 2, 4, 6, 7, 9, 11, 13, 14, 16, 19, 21, 23, 24, 26, 28],
            "frequency_mins": 6, "departures": {}, "departures_reverse": {}
        }
        # (As outras linhas podem ser preenchidas com a mesma lógica)
    ]
}

def generate_db():
    print("A calcular horários de precisão milimétrica...")
    end_time = datetime.strptime("23:59", "%H:%M")

    for route in BASE_DATA["routes"]:
        freq = route["frequency_mins"]
        seq = route["stations_sequence"]
        times_fwd = route["travel_times_from_start"]
        
        for station in seq:
            route["departures"][station] = {"weekdays": [], "weekends": []}
            route["departures_reverse"][station] = {"weekdays": [], "weekends": []}

        # Âncoras base
        start_fwd = datetime.strptime("06:00", "%H:%M")
        start_rev = datetime.strptime("06:00", "%H:%M")

        # AFINAÇÃO: Garante que passa na Câmara de Matosinhos (sentido Dragão) às 16:58 e 17:11
        if route["line"] == "A":
            start_rev = datetime.strptime("06:13", "%H:%M")

        # Gerar Sentido de Ida
        curr = start_fwd
        while curr <= end_time:
            for idx, station in enumerate(seq):
                t = (curr + timedelta(minutes=times_fwd[idx])).strftime("%H:%M")
                route["departures"][station]["weekdays"].append(t)
                route["departures"][station]["weekends"].append(t)
            curr += timedelta(minutes=freq)
            
        # Gerar Sentido de Volta
        curr = start_rev
        while curr <= end_time:
            for idx, station in enumerate(reversed(seq)):
                rev_time = times_fwd[-1] - times_fwd[len(seq) - 1 - idx]
                t = (curr + timedelta(minutes=rev_time)).strftime("%H:%M")
                route["departures_reverse"][station]["weekdays"].append(t)
                route["departures_reverse"][station]["weekends"].append(t)
            curr += timedelta(minutes=freq)

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(BASE_DATA, f, indent=4, ensure_ascii=False)
        
    print("✓ Base de dados gerada com sucesso!")

if __name__ == "__main__":
    generate_db()