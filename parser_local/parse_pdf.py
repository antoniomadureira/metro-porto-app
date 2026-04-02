import pdfplumber
import json
import re
import os

PDF_PATH = "Matosinhos.pdf"
OUTPUT_JSON = "../src/data/timetables.json"

# A REDE COMPLETA (Todas as Linhas)
BASE_DATA = {
    "stations": [
        "Estádio do Dragão", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", 
        "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", 
        "Vasco da Gama", "Estádio do Mar", "Pedro Hispano", "Parque Maia", "Câmara de Matosinhos", "Matosinhos Sul", "Brito Capelo", "Mercado", "Senhor de Matosinhos",
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
            "stations_sequence": ["Estádio do Dragão", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", "Vasco da Gama", "Estádio do Mar", "Pedro Hispano", "Parque Maia", "Câmara de Matosinhos", "Matosinhos Sul", "Brito Capelo", "Mercado", "Senhor de Matosinhos"],
            "travel_times_from_start": [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 25, 26, 28, 30, 32, 34, 35, 37, 39],
            "departures": {}
        },
        {
            "line": "B",
            "direction": "Póvoa de Varzim",
            "direction_reverse": "Estádio do Dragão",
            "stations_sequence": ["Estádio do Dragão", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", "Fonte do Cuco", "Custoias", "Esposade", "Crestins", "Verdes", "Pedras Rubras", "Lidador", "Vilar de Pinheiro", "Modivas Sul", "Modivas Centro", "Modivas Norte", "Mindelo", "Espaço Natureza", "Varziela", "Árvore", "Azurara", "Santa Clara", "Vila do Conde", "Alto de Pega", "Portas Fronhas", "São Brás", "Póvoa de Varzim"],
            "travel_times_from_start": [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 25, 26, 29, 31, 33, 35, 37, 39, 41, 42, 44, 46, 48, 49, 51, 52, 54, 55, 57, 58, 60, 62],
            "departures": {}
        },
        {
            "line": "C",
            "direction": "ISMAI",
            "direction_reverse": "Campanhã",
            "stations_sequence": ["Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", "Fonte do Cuco", "Custoias", "Araújo", "Pias", "Mandim", "Castêlo da Maia", "ISMAI"],
            "travel_times_from_start": [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19, 21, 23, 24, 26, 28, 30, 32, 34],
            "departures": {}
        },
        {
            "line": "D",
            "direction": "Santo Ovídio",
            "direction_reverse": "Hospital São João",
            "stations_sequence": ["Hospital São João", "IPO", "Pólo Universitário", "Salgueiros", "Combatentes", "Marquês", "Faria Guimarães", "Trindade", "Aliados", "São Bento", "Jardim do Morro", "General Torres", "Câmara de Gaia", "João de Deus", "D. João II", "Santo Ovídio"],
            "travel_times_from_start": [0, 2, 4, 6, 7, 9, 11, 13, 14, 16, 19, 21, 23, 24, 26, 28],
            "departures": {}
        },
        {
            "line": "E",
            "direction": "Aeroporto",
            "direction_reverse": "Trindade",
            "stations_sequence": ["Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", "Fonte do Cuco", "Custoias", "Esposade", "Crestins", "Verdes", "Botica", "Aeroporto"],
            "travel_times_from_start": [0, 2, 3, 5, 7, 8, 10, 12, 14, 16, 17, 20, 22, 24, 26, 28],
            "departures": {}
        },
        {
            "line": "F",
            "direction": "Senhora da Hora",
            "direction_reverse": "Fânzeres",
            "stations_sequence": ["Fânzeres", "Venda Nova", "Carreira", "Baguim", "Campainha", "Rio Tinto", "Levada", "Nau Vitória", "Nasoni", "Contumil", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora"],
            "travel_times_from_start": [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 20, 21, 23, 25, 27, 28, 30, 32, 33, 35, 37, 39],
            "departures": {}
        }
    ]
}

def build_timetables():
    # Inicializa partidas vazias para TODAS as linhas
    for route in BASE_DATA["routes"]:
        for station in route["stations_sequence"]:
            route["departures"][station] = {"weekdays": [], "weekends": []}

    print(f"A processar o ficheiro {PDF_PATH}...")
    try:
        with pdfplumber.open(PDF_PATH) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if not text: continue

                day_type = "weekends" if re.search(r'(Sábado|Domingo|Feriado)', text, re.IGNORECASE) else "weekdays"
                
                header_text = "\n".join(text.split('\n')[:8])
                is_reverse = "Estádio do Dragão" in header_text and "Sentido" in header_text

                # Aplica apenas à Linha A (pois o PDF é de Matosinhos)
                route_A = BASE_DATA["routes"][0]
                current_seq = list(reversed(route_A["stations_sequence"])) if is_reverse else route_A["stations_sequence"]

                for line in text.split('\n'):
                    times = re.findall(r'\b\d{2}:\d{2}\b', line)
                    if len(times) > 5:
                        for idx, time_str in enumerate(times):
                            if idx < len(current_seq):
                                station = current_seq[idx]
                                if time_str not in route_A["departures"][station][day_type]:
                                    route_A["departures"][station][day_type].append(time_str)
                                    
    except Exception as e:
        print(f"Erro: {e}")
        return

    # Ordenar horas
    for route in BASE_DATA["routes"]:
        for station in route["stations_sequence"]:
            route["departures"][station]["weekdays"].sort()
            route["departures"][station]["weekends"].sort()

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(BASE_DATA, f, indent=4, ensure_ascii=False)
        
    print(f"✓ Rede completa gerada em {OUTPUT_JSON}!")

if __name__ == "__main__":
    build_timetables()