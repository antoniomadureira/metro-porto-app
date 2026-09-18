import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.abspath(os.path.join(BASE_DIR, "../src/data/timetables.json"))

def run_tests():
    if not os.path.exists(JSON_PATH):
        print("❌ ERRO: timetables.json não existe!")
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("🔍 A iniciar testes de validação do GTFS...\n")
    
    # Teste 1: Verificar se existem linhas
    assert len(data.get("routes", [])) > 0, "❌ ERRO: Nenhuma rota encontrada!"
    print(f"✓ Teste 1 Passou: {len(data['routes'])} linhas encontradas.")

    # Teste 2: Verificar se a Linha A contém partidas em Matosinhos
    line_a = next((r for r in data["routes"] if r["line"] == "A"), None)
    assert line_a is not None, "❌ ERRO: Linha A não encontrada!"
    
    matosinhos_deps = line_a["departures"].get("Câmara Matosinhos") or line_a["departures"].get("Câmara de Matosinhos")
    assert matosinhos_deps and len(matosinhos_deps["weekdays"]) > 0, "❌ ERRO: Sem horários para Câmara de Matosinhos!"
    print(f"✓ Teste 2 Passou: {len(matosinhos_deps['weekdays'])} horários encontrados para Câmara de Matosinhos.")

    # Teste 3: Verificar consistência de formato de hora (HH:MM)
    sample_time = matosinhos_deps["weekdays"][0]
    assert len(sample_time) == 5 and ":" in sample_time, "❌ ERRO: Formato de hora inválido!"
    print(f"✓ Teste 3 Passou: Formato de hora correto ({sample_time}).")

    print("\n✅ TODOS OS TESTES PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    run_tests()