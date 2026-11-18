#!/usr/bin/env python3
"""Junta os arquivos de src/ numa página só: index.html."""
from pathlib import Path
aqui = Path(__file__).parent
src = aqui / "src"
ORDEM = ["dados.js", "base.js", "relevo.js", "caminhos.js", "ocupacao.js", "regiao.js", "territorio.js",
         "rotas.js", "soldados.js", "catalogo.js", "simulacao.js", "combate.js", "economia.js", "comida.js", "recrutamento.js", "armas.js", "acao.js", "missoes.js", "logistica.js", "diplomacia.js", "batalhoes.js", "estoques.js", "veiculos.js", "comando.js", "comandante.js", "ordens.js",
         "tela/retratos.js", "tela/edificios.js", "tela/terreno.js", "tela/territorio.js", "tela/tropas.js", "tela/cena.js", "tela/paineis.js", "tela/janelas.js", "tela/tutorial.js", "tela/principal.js"]
js = "\n".join((src / f).read_text(encoding="utf-8") for f in ORDEM)

# ícones embutidos (Material Design Icons, Apache 2.0): nada vem da internet
import re, json, sys
sys.path.insert(0, str(aqui / "icones"))
from mapa import MAPA
PASTA_MDI = Path("/usr/local/lib/python3.13/dist-packages/material/templates/.icons/material")
cache = aqui / "icones" / "icones.json"
if PASTA_MDI.exists():
    icones = {k: re.sub(r"^<svg[^>]*>|</svg>$", "", (PASTA_MDI / (v + ".svg")).read_text().strip()) for k, v in MAPA.items()}
    cache.write_text(json.dumps(icones, ensure_ascii=False), encoding="utf-8")
icones = json.loads(cache.read_text(encoding="utf-8"))
js = "const ICONES = " + json.dumps(icones, ensure_ascii=False) + ";\n" + js
def svg_ico(m):
    return '<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">' + icones[m.group(1)] + '</svg></span>'
corpo = re.sub(r'<span class="ico">([a-z0-9_]+)</span>', svg_ico, (src / "corpo.html").read_text(encoding="utf-8"))
pagina = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jogo de facções: protótipo do mapa</title>
<style>
{(src / "estilo.css").read_text(encoding="utf-8")}
</style>
</head>
<body>
{corpo}
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
{js}
</script>
</body>
</html>
"""
(aqui / "index.html").write_text(pagina, encoding="utf-8")
print("index.html:", len(pagina) // 1024, "KB")
