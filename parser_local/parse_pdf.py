import pdfplumber
import json
import re
import os

PDF_PATH = "Matosinhos.pdf"
OUTPUT_JSON = "../src/data/timetables.json"

# REDE COM A ESTAÇÃO "PARQUE REAL" CORRIGIDA
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
            "departures": {},
            "departures_reverse": {}
        }
        # (As outras linhas podem ser adicionadas no futuro, mantemos o foco na Linha A para já)
    ]
}

def build_timetables():
    # Inicializa partidas VAZIAS e SEPARADAS por direção
    route_A = BASE_DATA["routes"][0]
    for station in route_A["stations_sequence"]:
        route_A["departures"][station] = {"weekdays": [], "weekends": []}
        route_A["departures_reverse"][station] = {"weekdays": [], "weekends": []}

    print(f"A processar o ficheiro {PDF_PATH}...")
    try:
        with pdfplumber.open(PDF_PATH) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue

                day_type = "weekends" if re.search(r'(Sábado|Domingo|Feriado)', text, re.IGNORECASE) else "weekdays"
                
                # Descobre o sentido do cabeçalho
                header_text = "\n".join(text.split('\n')[:8])
                is_reverse = "Estádio do Dragão" in header_text and "Sentido" in header_text

                # Escolhe a lista correta consoante a direção
                current_seq = list(reversed(route_A["stations_sequence"])) if is_reverse else route_A["stations_sequence"]
                target_departures = route_A["departures_reverse"] if is_reverse else route_A["departures"]

                # Lógica de extração
                for line in text.split('\n'):
                    times = re.findall(r'\b\d{2}:\d{2}\b', line)
                    if len(times) > 5:
                        for idx, time_str in enumerate(times):
                            if idx < len(current_seq):
                                station = current_seq[idx]
                                if time_str not in target_departures[station][day_type]:
                                    target_departures[station][day_type].append(time_str)
                                    
    except Exception as e:
        print(f"Erro: {e}")
        return

    # Ordenar as horas
    for station in route_A["stations_sequence"]:
        route_A["departures"][station]["weekdays"].sort()
        route_A["departures"][station]["weekends"].sort()
        route_A["departures_reverse"][station]["weekdays"].sort()
        route_A["departures_reverse"][station]["weekends"].sort()

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(BASE_DATA, f, indent=4, ensure_ascii=False)
        
    print(f"✓ Base de dados gerada com IDA e VOLTA separadas em {OUTPUT_JSON}!")

if __name__ == "__main__":
    build_timetables()