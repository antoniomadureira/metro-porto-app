import pdfplumber
import json
import re
import os

PDF_PATH = "Matosinhos.pdf"
OUTPUT_JSON = "../src/data/timetables.json"

BASE_DATA = {
    "stations": [
        "Estádio do Dragão", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", 
        "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", 
        "Vasco da Gama", "Estádio do Mar", "Pedro Hispano", "Parque Real", "Parque Maia", "Câmara de Matosinhos", "Matosinhos Sul", "Brito Capelo", "Mercado", "Senhor de Matosinhos",
        "Fonte do Cuco", "Custoias", "Esposade", "Crestins", "Verdes", "Pedras Rubras", "Lidador", "Vilar de Pinheiro", "Modivas Sul", "Modivas Centro", "Modivas Norte", "Mindelo", "Espaço Natureza", "Varziela", "Árvore", "Azurara", "Santa Clara", "Vila do Conde", "Alto de Pega", "Portas Fronhas", "São Brás", "Póvoa de Varzim",
        "Araújo", "Pias", "Mandim", "Castêlo da Maia", "ISMAI",
        "Botica", "Aeroporto",
        "Hospital São João", "IPO", "Pólo Universitário", "Salgueiros", "Combatentes", "Marquês", "Faria Guimarães", "Aliados", "São Bento", "Jardim do Morro", "General Torres", "Câmara de Gaia", "João de Deus", "D. João II", "Santo Ovídio",
        "Fânzeres", "Venda Nova", "Carreira", "Baguim", "Campainha", "Rio Tinto", "Levada", "Nau Vitória", "Nasoni", "Contumil"
    ],
    "lines": ["A", "B", "C", "D", "E", "F"],
    "routes": [
        {
            "line": "A",
            "direction": "Senhor de Matosinhos",
            "direction_reverse": "Estádio do Dragão",
            "stations_sequence": ["Estádio do Dragão", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", "Vasco da Gama", "Estádio do Mar", "Pedro Hispano", "Parque Real", "Câmara de Matosinhos", "Matosinhos Sul", "Brito Capelo", "Mercado", "Senhor de Matosinhos"],
            "travel_times_from_start": [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 25, 26, 28, 30, 32, 34, 35, 37, 39],
            "departures": {}, "departures_reverse": {}
        },
        {
            "line": "D",
            "direction": "Santo Ovídio",
            "direction_reverse": "Hospital São João",
            "stations_sequence": ["Hospital São João", "IPO", "Pólo Universitário", "Salgueiros", "Combatentes", "Marquês", "Faria Guimarães", "Trindade", "Aliados", "São Bento", "Jardim do Morro", "General Torres", "Câmara de Gaia", "João de Deus", "D. João II", "Santo Ovídio"],
            "travel_times_from_start": [0, 2, 4, 6, 7, 9, 11, 13, 14, 16, 19, 21, 23, 24, 26, 28],
            "departures": {}, "departures_reverse": {}
        }
    ]
}

def build_timetables():
    # Inicializa as matrizes para garantir que o React não rebenta
    for route in BASE_DATA["routes"]:
        for station in route["stations_sequence"]:
            route["departures"][station] = {"weekdays": [], "weekends": []}
            route["departures_reverse"][station] = {"weekdays": [], "weekends": []}

    print(f"A ler o PDF como um humano (Eixo Y)...")
    try:
        with pdfplumber.open(PDF_PATH) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue

                day_type = "weekends" if re.search(r'(Sábado|Domingo|Feriado|odabáS|ognimoD)', text, re.IGNORECASE) else "weekdays"
                header_text = "\n".join(text.split('\n')[:8])
                is_reverse = "Estádio do Dragão" in header_text and "Sentido" in header_text

                route_A = BASE_DATA["routes"][0]
                current_seq = list(reversed(route_A["stations_sequence"])) if is_reverse else route_A["stations_sequence"]
                target_departures = route_A["departures_reverse"] if is_reverse else route_A["departures"]

                # O SEGREDO ESTÁ AQUI: Cada linha iterada é UMA estação (eixo Y). 
                station_idx = 0
                for line in text.split('\n'):
                    times = re.findall(r'\b\d{2}:\d{2}\b', line)
                    if len(times) >= 3: # Encontrou uma linha com horários!
                        if station_idx < len(current_seq):
                            station = current_seq[station_idx]
                            target_departures[station][day_type].extend(times)
                            station_idx += 1 # Passa para a próxima estação!
                                    
    except Exception as e:
        print(f"Erro: {e}")
        return

    # Limpar duplicados e ordenar
    for station in BASE_DATA["routes"][0]["stations_sequence"]:
        BASE_DATA["routes"][0]["departures"][station]["weekdays"] = sorted(list(set(BASE_DATA["routes"][0]["departures"][station]["weekdays"])))
        BASE_DATA["routes"][0]["departures"][station]["weekends"] = sorted(list(set(BASE_DATA["routes"][0]["departures"][station]["weekends"])))
        BASE_DATA["routes"][0]["departures_reverse"][station]["weekdays"] = sorted(list(set(BASE_DATA["routes"][0]["departures_reverse"][station]["weekdays"])))
        BASE_DATA["routes"][0]["departures_reverse"][station]["weekends"] = sorted(list(set(BASE_DATA["routes"][0]["departures_reverse"][station]["weekends"])))

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(BASE_DATA, f, indent=4, ensure_ascii=False)
        
    print(f"✓ Ficheiro gerado com absoluta precisão no Eixo Y!")

if __name__ == "__main__":
    build_timetables()