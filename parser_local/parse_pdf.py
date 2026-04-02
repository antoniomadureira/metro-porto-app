import pdfplumber
import json
import re
import os

PDF_PATH = "Matosinhos.pdf"
OUTPUT_JSON = "../src/data/timetables.json"

# A estrutura de base limpa que a nossa aplicação React entende
BASE_DATA = {
    "stations": [
        "Estádio do Dragão", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", 
        "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", 
        "Vasco da Gama", "Estádio do Mar", "Pedro Hispano", "Parque Maia", "Câmara de Matosinhos", "Matosinhos Sul", "Brito Capelo", "Mercado", "Senhor de Matosinhos"
    ],
    "lines": ["A"],
    "routes": [
        {
            "line": "A",
            "direction": "Senhor de Matosinhos",
            "direction_reverse": "Estádio do Dragão",
            "stations_sequence": ["Estádio do Dragão", "Campanhã", "Heroísmo", "Campo 24 de Agosto", "Bolhão", "Trindade", "Lapa", "Carolina Michaelis", "Casa da Música", "Francos", "Ramalde", "Viso", "Sete Bicas", "Senhora da Hora", "Vasco da Gama", "Estádio do Mar", "Pedro Hispano", "Parque Maia", "Câmara de Matosinhos", "Matosinhos Sul", "Brito Capelo", "Mercado", "Senhor de Matosinhos"],
            "travel_times_from_start": [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 25, 26, 28, 30, 32, 34, 35, 37, 39],
            "departures": {}
        }
    ]
}

def build_timetables():
    # Inicializar os dicionários de partidas vazios para cada estação
    seq = BASE_DATA["routes"][0]["stations_sequence"]
    for station in seq:
        BASE_DATA["routes"][0]["departures"][station] = {
            "weekdays": [],
            "weekends": []
        }

    print(f"A processar o ficheiro {PDF_PATH}...")
    
    try:
        with pdfplumber.open(PDF_PATH) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if not text:
                    continue

                # 1. Detetar o tipo de dia
                day_type = "weekdays"
                if re.search(r'(Sábado|Domingo|Feriado|Weekends|Holidays)', text, re.IGNORECASE):
                    day_type = "weekends"

                # 2. Detetar a direção pela análise das primeiras linhas da página
                header_text = "\n".join(text.split('\n')[:8])
                is_reverse = False
                
                # Se o destino for Estádio do Dragão, a viagem é no sentido inverso
                if "Estádio do Dragão" in header_text and "Sentido" in header_text:
                    is_reverse = True

                # Definir a sequência de estações a usar para mapear as colunas
                current_seq = list(reversed(seq)) if is_reverse else seq

                # 3. Extrair as horas
                for line in text.split('\n'):
                    # Procura todos os padrões do tipo HH:MM na linha
                    times = re.findall(r'\b\d{2}:\d{2}\b', line)
                    
                    # Se tiver várias horas, é uma linha de horários real
                    if len(times) > 5:
                        for idx, time_str in enumerate(times):
                            # Prevenção: garantir que não excedemos o número de estações
                            if idx < len(current_seq):
                                station = current_seq[idx]
                                # Adicionar a hora à lista se ainda não existir
                                if time_str not in BASE_DATA["routes"][0]["departures"][station][day_type]:
                                    BASE_DATA["routes"][0]["departures"][station][day_type].append(time_str)
                                    
        print("✓ Leitura do PDF concluída com sucesso!")

    except Exception as e:
        print(f"❌ Erro durante a leitura: {e}")
        return

    # 4. Ordenar as horas cronologicamente e gravar o ficheiro
    for station in seq:
        BASE_DATA["routes"][0]["departures"][station]["weekdays"].sort()
        BASE_DATA["routes"][0]["departures"][station]["weekends"].sort()

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(BASE_DATA, f, indent=4, ensure_ascii=False)
        
    print(f"✓ Ficheiro gravado em {OUTPUT_JSON}. O teu Frontend já tem os dados reais!")

if __name__ == "__main__":
    build_timetables()